import { Campaign } from '@dos/shared';
import type { Db } from './db.js';
import type { Player } from './auth.js';
import { ACTIONS_PER_DAY, VALFEBER_PARTIES, currentDay, eventForDay, type World } from './world.js';
import { getDebateFor, scoreDebate, type DebateResult } from './debate.js';
import { scoreViral, type Angle, type Emotion, type PostFormat, type ViralResult } from './viral.js';
import { scoreRegional, type Demographic, type RegionalResult } from './regional.js';
import { scoreCrisis, type CrisisResult, type CrisisStep } from './crisis.js';
import { scoreAlliance, type AllianceResult } from './alliance.js';

export type ActionKind = 'debate' | 'viral' | 'regional' | 'crisis' | 'alliance';

export interface ActionResult {
  ok: boolean;
  error?: string;
  points?: number;
  text?: string;
  viral?: boolean;
  player?: Player;
  newAchievements?: string[];
  /** Full debattresultat for dramatisk avslojning i klienten. */
  debateResult?: DebateResult & { opponentPartyId: string };
  viralResult?: ViralResult;
  regionalResult?: RegionalResult;
  crisisResult?: CrisisResult;
  allianceResult?: AllianceResult;
}

async function addSupport(db: Db, partyId: string, valkretsId: string, amount: number): Promise<void> {
  await db.query(
    'UPDATE support SET support = GREATEST(0.4, support + $1) WHERE party_id = $2 AND valkrets_id = $3',
    [amount, partyId, valkretsId],
  );
}

async function spreadSupport(db: Db, partyId: string, amount: number): Promise<void> {
  await db.query(
    'UPDATE support SET support = GREATEST(0.4, support + $1) WHERE party_id = $2',
    [amount, partyId],
  );
}

async function awardAchievement(db: Db, playerId: number, code: string): Promise<boolean> {
  const existing = await db.query('SELECT 1 FROM achievements WHERE player_id = $1 AND code = $2', [
    playerId,
    code,
  ]);
  if (existing.length > 0) return false;
  await db.query('INSERT INTO achievements (player_id, code, ts) VALUES ($1, $2, $3)', [
    playerId,
    code,
    Date.now(),
  ]);
  return true;
}

/** Nollstall dagens atgarder och uppdatera streak vid ny dag. */
export async function refreshForDay(db: Db, player: Player, day: number): Promise<Player> {
  if (player.actions_day === day) return player;
  const streak = player.last_active_day === day - 1 ? player.streak + 1 : 1;
  await db.query(
    'UPDATE players SET actions_day = $1, actions_left = $2, last_active_day = $3, streak = $4 WHERE id = $5',
    [day, ACTIONS_PER_DAY, day, streak, player.id],
  );
  return { ...player, actions_day: day, actions_left: ACTIONS_PER_DAY, last_active_day: day, streak };
}

export async function setPartyAndRegion(
  db: Db,
  player: Player,
  partyId: string,
  regionId: string,
): Promise<ActionResult> {
  if (player.party_id) return { ok: false, error: 'Du har redan valt parti.' };
  if (!VALFEBER_PARTIES.includes(partyId)) return { ok: false, error: 'Ogiltigt parti.' };
  if (!Campaign.VALKRETS_BY_ID[regionId]) return { ok: false, error: 'Ogiltig valkrets.' };
  await db.query('UPDATE players SET party_id = $1, region_id = $2 WHERE id = $3', [
    partyId,
    regionId,
    player.id,
  ]);
  return { ok: true, player: { ...player, party_id: partyId, region_id: regionId } };
}

interface ActionPayload {
  answers?: number[];
  emotion?: Emotion;
  angle?: Angle;
  format?: PostFormat;
  valkretsId?: string;
  allocation?: Partial<Record<Demographic, number>>;
  crisisChoices?: Partial<Record<CrisisStep, string>>;
  allyPartyId?: string;
  accepted?: boolean[];
}

export async function performAction(
  db: Db,
  world: World,
  current: Player,
  kind: ActionKind,
  payload: ActionPayload,
): Promise<ActionResult> {
  if (!current.party_id || !current.region_id)
    return { ok: false, error: 'Valj parti och region forst.' };

  const day = currentDay(world);
  if (day >= Math.round((world.end_ts - world.start_ts) / 86_400_000) || Date.now() >= world.end_ts) {
    return { ok: false, error: 'Valrorelsen ar over - valnatten har kommit.' };
  }

  let player = await refreshForDay(db, current, day);
  if (player.actions_left <= 0)
    return { ok: false, error: 'Du har anvant dagens alla atgarder. Aterkom imorgon!' };

  const party = current.party_id!;
  const region = current.region_id!;
  const event = eventForDay(day);
  let points = 0;
  let support = 0;
  let text = '';
  let viral = false;
  const ach: string[] = [];
  let debateResult: (DebateResult & { opponentPartyId: string }) | undefined;
  let viralResult: ViralResult | undefined;
  let regionalResult: RegionalResult | undefined;
  let crisisResult: CrisisResult | undefined;
  let allianceResult: AllianceResult | undefined;

  if (kind === 'debate') {
    const setup = getDebateFor(day, party, event.hotIssue);
    const result = scoreDebate(payload.answers ?? [], setup);
    debateResult = { ...result, opponentPartyId: setup.opponentPartyId };
    points = Math.round(5 + result.score * 0.5);
    support = 1 + result.score * 0.05;
    await addSupport(db, party, region, support);
    const flavor =
      result.wins === 4 ? 'Totalseger! Du dominerade debatten.'
      : result.wins === 3 ? 'Du vann debatten klart.'
      : result.wins === 2 ? 'Oavgjord debatt - hederlig insats.'
      : result.wins === 1 ? 'Du forlorade debatten.'
      : 'Debaklet - publiken bytte sida helt.';
    text = `Debatt mot ${setup.opponentPartyId.toUpperCase()}: ${result.wins}/4 ratt. ${flavor}`;
    if (result.wins === 4 && (await awardAchievement(db, player.id, 'debattmastare')))
      ach.push('debattmastare');
  } else if (kind === 'viral') {
    const res = scoreViral(party, event.hotIssue, {
      emotion: (payload.emotion ?? 'hopp') as Emotion,
      angle: (payload.angle ?? 'loften') as Angle,
      format: (payload.format ?? 'bildcitat') as PostFormat,
    });
    viralResult = res;
    viral = res.viral;
    points = res.score;
    if (viral) {
      await spreadSupport(db, party, 0.6);
      text = `Din post gick viralt – spreds i hela landet (${res.score} poang).`;
      if (await awardAchievement(db, player.id, 'viral')) ach.push('viral');
    } else {
      await addSupport(db, party, region, 1.5);
      text = `Din post fick lokal spridning (${res.score} poang).`;
    }
  } else if (kind === 'regional') {
    const vk = payload.valkretsId && Campaign.VALKRETS_BY_ID[payload.valkretsId] ? payload.valkretsId : region;
    const r = scoreRegional(party, vk, payload.allocation ?? {});
    if (!r.ok || !r.result || r.points === undefined) {
      return { ok: false, error: r.error ?? 'Ogiltig fordelning.' };
    }
    regionalResult = r.result;
    points = r.points;
    await addSupport(db, party, vk, r.result.supportDelta);
    text = `Du kampanjade i ${Campaign.VALKRETS_BY_ID[vk].name} och tillforde ${r.result.supportDelta} stod.`;
  } else if (kind === 'crisis') {
    const r = scoreCrisis(party, event.hotIssue, payload.crisisChoices ?? {});
    if (!r.ok || !r.result) {
      return { ok: false, error: r.error ?? 'Ogiltiga val.' };
    }
    crisisResult = r.result;
    points = r.result.points;
    await addSupport(db, party, region, r.result.support);
    // Vid dalig krishantering sprids skadan nationellt lite.
    if (r.result.score < 30) await spreadSupport(db, party, -0.3);
    text = `${event.title}: ${r.result.text}`;
  } else if (kind === 'alliance') {
    const ally = payload.allyPartyId;
    if (!ally || !VALFEBER_PARTIES.includes(ally) || ally === party)
      return { ok: false, error: 'Valj ett annat parti att alliera med.' };
    const r = scoreAlliance(day, party, ally, payload.accepted ?? []);
    if (!r.ok || !r.result) {
      return { ok: false, error: r.error ?? 'Forhandlingen misslyckades.' };
    }
    allianceResult = r.result;
    points = r.result.points;
    if (r.result.deal) {
      await db.query(
        'INSERT INTO alliances (party_a, party_b, day, status) VALUES ($1, $2, $3, $4)',
        [party, ally, day, 'active'],
      );
      await addSupport(db, party, region, r.result.support);
      if (await awardAchievement(db, player.id, 'allians')) ach.push('allians');
    }
    text = r.result.text;
  } else {
    return { ok: false, error: 'Okand atgard.' };
  }

  await db.query('UPDATE players SET points = points + $1, actions_left = actions_left - 1 WHERE id = $2', [
    points,
    player.id,
  ]);
  await db.query(
    'INSERT INTO action_log (player_id, day, kind, detail, points, ts) VALUES ($1, $2, $3, $4, $5, $6)',
    [player.id, day, kind, text, points, Date.now()],
  );

  if (await awardAchievement(db, player.id, 'first_action')) ach.push('first_action');
  if (player.streak >= 7 && (await awardAchievement(db, player.id, 'streak7'))) ach.push('streak7');

  player = { ...player, points: player.points + points, actions_left: player.actions_left - 1 };
  return { ok: true, points, text, viral, player, newAchievements: ach, debateResult, viralResult, regionalResult, crisisResult, allianceResult };
}
