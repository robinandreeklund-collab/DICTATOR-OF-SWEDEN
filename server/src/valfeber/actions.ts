import {
  ANSWER_MULTIPLIER,
  Campaign,
  VALKOMPASS_QUESTIONS,
  type AnswerKey,
} from '@dos/shared';
import type { Db } from './db.js';
import type { Player } from './auth.js';
import { ACTIONS_PER_DAY, VALFEBER_PARTIES, currentDay, eventForDay, type World } from './world.js';

export type ActionKind = 'debate' | 'viral' | 'regional' | 'crisis' | 'alliance';

export interface ActionResult {
  ok: boolean;
  error?: string;
  points?: number;
  text?: string;
  viral?: boolean;
  player?: Player;
  newAchievements?: string[];
}

const SLOGANS = [
  'Trygghet i hela landet',
  'Framtiden byggs nu',
  'Rattvisa for vanligt folk',
  'Sverige kan battre',
  'Din rost gor skillnad',
  'Ett varmare samhalle',
];

/** Tre debattfragor for en given dag (deterministiskt). */
export function questionsForDay(day: number): typeof VALKOMPASS_QUESTIONS {
  const n = VALKOMPASS_QUESTIONS.length;
  return [0, 1, 2].map((i) => VALKOMPASS_QUESTIONS[(day * 3 + i) % n]);
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
  answers?: AnswerKey[];
  sloganIndex?: number;
  valkretsId?: string;
  allyPartyId?: string;
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

  if (kind === 'debate') {
    const qs = questionsForDay(day);
    const answers = payload.answers ?? [];
    let raw = 0;
    let max = 0;
    qs.forEach((q, i) => {
      const eff = q.effects[party] ?? 0;
      max += Math.abs(eff);
      const mult = ANSWER_MULTIPLIER[answers[i]] ?? 0;
      raw += eff * mult;
    });
    const score = max > 0 ? Math.max(0, raw / max) : 0.5;
    points = Math.round(12 + score * 40);
    support = 1.5 + score * 3;
    await addSupport(db, party, region, support);
    text = `Du svarade i debatten och overtygade valjarna (${Math.round(score * 100)}% traff).`;
  } else if (kind === 'viral') {
    viral = Math.random() < 0.3;
    const slogan = SLOGANS[payload.sloganIndex ?? 0] ?? SLOGANS[0];
    if (viral) {
      points = 70;
      await spreadSupport(db, party, 0.5);
      text = `Din post "${slogan}" gick viralt och spreds over hela landet!`;
      if (await awardAchievement(db, player.id, 'viral')) ach.push('viral');
    } else {
      points = 18;
      await addSupport(db, party, region, 1.2);
      text = `Du postade "${slogan}". Den fick spridning lokalt.`;
    }
  } else if (kind === 'regional') {
    const vk = payload.valkretsId && Campaign.VALKRETS_BY_ID[payload.valkretsId] ? payload.valkretsId : region;
    support = 4;
    points = 25;
    await addSupport(db, party, vk, support);
    text = `Du kampanjade i ${Campaign.VALKRETS_BY_ID[vk].name} och okade stodet dar.`;
  } else if (kind === 'crisis') {
    const owns = Campaign.ISSUE_BY_ID[event.hotIssue]?.owners.includes(party);
    support = owns ? 6 : 3.5;
    points = owns ? 55 : 35;
    await addSupport(db, party, region, support);
    await spreadSupport(db, party, 0.4);
    text = `Du hanterade dagens kris om "${event.title}".${owns ? ' Din fraga - extra genomslag!' : ''}`;
  } else if (kind === 'alliance') {
    const ally = payload.allyPartyId;
    if (!ally || !VALFEBER_PARTIES.includes(ally) || ally === party)
      return { ok: false, error: 'Valj ett annat parti att alliera med.' };
    await db.query(
      'INSERT INTO alliances (party_a, party_b, day, status) VALUES ($1, $2, $3, $4)',
      [party, ally, day, 'active'],
    );
    await addSupport(db, party, region, 2.5);
    points = 22;
    text = `Du forhandlade fram ett samarbete med ${ally.toUpperCase()}.`;
    if (await awardAchievement(db, player.id, 'allians')) ach.push('allians');
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
  return { ok: true, points, text, viral, player, newAchievements: ach };
}
