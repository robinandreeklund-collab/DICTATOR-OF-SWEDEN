import { makeRng, type Rng } from '../engine.js';
import { CAMPAIGN_EVENTS } from './events.js';
import { ISSUES, ownershipBonus } from './issues.js';
import {
  ANNONS_PER_VALKRETS,
  ATTACK_DAMPEN,
  FUNDRAISE_BONUS,
  HOT_ISSUE_BONUS,
  INTERNAL_WEEK,
  MOMENTUM_MAX,
  MOMENTUM_MIN,
  MOMENTUM_STEP,
  MORALE_EXPOSE,
  MORALE_MAX,
  MORALE_MIN,
  MORALE_MISFIRE,
  MORALE_START,
  SABOTAGE_FACTOR,
  SPRINT_KASSA_BONUS,
  SPRINT_WEEKS,
  START_KASSA,
  STRATEG_BONUS,
  THRESHOLD_PERCENT,
  TOTAL_WEEKS,
  WEEKLY_KASSA,
  blocOf,
} from './rules.js';
import { VALKRETSAR, VALKRETS_BY_ID, initialSupport } from './valkretsar.js';
import { ROLE_PRIORITY } from './types.js';
import type {
  CampaignClientView,
  CampaignEventCard,
  CampaignLogEntry,
  CampaignPlayer,
  CampaignRole,
  CampaignState,
  CampaignTeam,
  CampaignTeamView,
  DebateResult,
  ElectionResult,
  PartyResult,
  RoleAction,
  RoleSubmission,
  ValkretsState,
} from './types.js';

export const PARTY_IDS = [
  's', 'm', 'sd', 'v', 'mp', 'c', 'kd', 'l', 'fi', 'djur', 'pirat', 'nyans',
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type CampaignAction =
  | { type: 'ADVANCE' }
  | { type: 'SUBMIT_ROLE'; playerId: string; action: RoleAction; sabotage: boolean }
  | { type: 'INTERNAL_VOTE'; playerId: string; accusedId: string };

export interface CampaignResult {
  ok: boolean;
  error?: string;
  state: CampaignState;
}

export interface CampaignSetup {
  players: { id: string; name: string; isBot: boolean; isHost: boolean }[];
  teams: { id: string; partyId: string; memberIds: string[] }[];
}

// ---------------------------------------------------------------------------
// Hjalpare
// ---------------------------------------------------------------------------

const clone = (s: CampaignState): CampaignState => structuredClone(s);

function clog(state: CampaignState, kind: CampaignLogEntry['kind'], text: string): void {
  state.log.push({ id: state.nextLogId++, week: state.week, kind, text });
}

export function teamOfPlayer(state: CampaignState, playerId: string): CampaignTeam | undefined {
  const p = state.players.find((x) => x.id === playerId);
  return p ? state.teams.find((t) => t.id === p.teamId) : undefined;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function leadingParty(vk: ValkretsState): string {
  let best = PARTY_IDS[0];
  for (const p of PARTY_IDS) {
    if ((vk.support[p] ?? 0) > (vk.support[best] ?? 0)) best = p;
  }
  return best;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Skapa kampanj
// ---------------------------------------------------------------------------

export function createCampaign(setup: CampaignSetup, seed: number): CampaignState {
  const rng = makeRng(seed);

  const teams: CampaignTeam[] = setup.teams.map((t) => {
    const members = t.memberIds;
    const moleId = members[Math.floor(rng() * members.length)];
    return {
      id: t.id,
      partyId: t.partyId,
      memberIds: members,
      leaderId: members[0],
      moleId,
      moleStatus: 'hidden',
      morale: MORALE_START,
      kassa: START_KASSA,
      momentum: 0,
      intel: [],
    };
  });

  const players: CampaignPlayer[] = setup.players.map((p) => {
    const team = setup.teams.find((t) => t.memberIds.includes(p.id))!;
    const idx = team.memberIds.indexOf(p.id);
    const role: CampaignRole = ROLE_PRIORITY[Math.min(idx, ROLE_PRIORITY.length - 1)];
    return {
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      isHost: p.isHost,
      connected: true,
      teamId: team.id,
      role,
    };
  });

  const valkretsar: ValkretsState[] = VALKRETSAR.map((v) => ({
    id: v.id,
    support: initialSupport(v),
  }));

  const state: CampaignState = {
    mode: 'campaign',
    phase: 'roleReveal',
    week: 1,
    totalWeeks: TOTAL_WEEKS,
    players,
    teams,
    valkretsar,
    currentEvent: null,
    hotIssue: null,
    crisisTeamId: null,
    submissions: {},
    lastOutcome: null,
    internalVotes: {},
    internalDone: false,
    result: null,
    log: [],
    nextLogId: 1,
  };
  clog(state, 'system', `Valrorelsen 2026 inleds med ${teams.length} partilag.`);
  return state;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function applyCampaignAction(
  prev: CampaignState,
  action: CampaignAction,
  rng: Rng = Math.random,
): CampaignResult {
  const state = clone(prev);
  const fail = (error: string): CampaignResult => ({ ok: false, error, state: prev });

  switch (action.type) {
    case 'ADVANCE':
      return advance(state, rng);
    case 'SUBMIT_ROLE':
      return submitRole(state, action, rng, fail);
    case 'INTERNAL_VOTE':
      return internalVote(state, action, fail);
    default:
      return fail('Okand handling.');
  }
}

const ok = (state: CampaignState): CampaignResult => ({ ok: true, state });

// --- nyhetshandelse ----------------------------------------------------------

function drawEvent(state: CampaignState, rng: Rng): void {
  const usedTitles = new Set(state.log.filter((l) => l.kind === 'news').map((l) => l.text));
  const pool = shuffle(CAMPAIGN_EVENTS, rng).filter((e) => !usedTitles.has(e.title));
  const event: CampaignEventCard = pool[0] ?? shuffle(CAMPAIGN_EVENTS, rng)[0];
  state.currentEvent = event;
  state.hotIssue = event.hotIssue;

  if (event.regionShift) {
    for (const vk of state.valkretsar) {
      if (VALKRETS_BY_ID[vk.id].region === event.regionShift.region) {
        vk.support[event.regionShift.party] =
          (vk.support[event.regionShift.party] ?? 0) + event.regionShift.amount;
      }
    }
  }

  state.crisisTeamId = null;
  if (event.crisis && state.teams.length > 0) {
    // Krisen drabbar laget som leder opinionen (mediedrev mot den storsta).
    const proj = computeElectionResult(state);
    const rank = [...state.teams].sort(
      (a, b) => mandatesOf(proj, b.partyId) - mandatesOf(proj, a.partyId),
    );
    state.crisisTeamId = rank[0].id;
    clog(state, 'crisis', `${event.title} — drabbar ${partyTag(state, rank[0].id)}.`);
  } else {
    clog(state, 'news', event.title);
  }
}

function mandatesOf(result: ElectionResult, partyId: string): number {
  return result.parties.find((p) => p.partyId === partyId)?.mandates ?? 0;
}

function partyTag(state: CampaignState, teamId: string): string {
  return (state.teams.find((t) => t.id === teamId)?.partyId ?? '?').toUpperCase();
}

function startWeek(state: CampaignState, rng: Rng): void {
  state.phase = 'news';
  state.submissions = {};
  drawEvent(state, rng);
}

// --- advance -----------------------------------------------------------------

function advance(state: CampaignState, rng: Rng): CampaignResult {
  switch (state.phase) {
    case 'roleReveal':
      startWeek(state, rng);
      return ok(state);
    case 'news':
      state.phase = 'planning';
      return ok(state);
    case 'resolution':
      if (state.week === INTERNAL_WEEK && !state.internalDone) {
        state.phase = 'internal';
        state.internalVotes = {};
        for (const t of state.teams) state.internalVotes[t.id] = {};
        clog(state, 'system', 'Internt krismote: lagen jagar sina mullvadar.');
        return ok(state);
      }
      return nextWeekOrElection(state, rng);
    case 'electionNight':
      state.phase = 'gameOver';
      return ok(state);
    default:
      return { ok: false, error: 'Kan inte ga vidare nu.', state };
  }
}

function nextWeekOrElection(state: CampaignState, rng: Rng): CampaignResult {
  if (state.week >= state.totalWeeks) {
    runElection(state);
    state.phase = 'electionNight';
    return ok(state);
  }
  state.week += 1;
  startWeek(state, rng);
  return ok(state);
}

// --- rollhandlingar ----------------------------------------------------------

function submitRole(
  state: CampaignState,
  action: Extract<CampaignAction, { type: 'SUBMIT_ROLE' }>,
  rng: Rng,
  fail: (e: string) => CampaignResult,
): CampaignResult {
  if (state.phase !== 'planning') return fail('Det ar inte planeringsfas.');
  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return fail('Okand spelare.');
  if (state.submissions[action.playerId]?.submitted)
    return fail('Du har redan last ditt drag.');
  if (action.action.role !== player.role)
    return fail('Handlingen matchar inte din roll.');

  const team = teamOfPlayer(state, action.playerId)!;
  const err = validateRoleAction(state, team, action.action);
  if (err) return fail(err);

  const sabotage = action.playerId === team.moleId && team.moleStatus === 'hidden'
    ? action.sabotage
    : false;

  state.submissions[action.playerId] = {
    playerId: action.playerId,
    submitted: true,
    action: action.action,
    sabotage,
  };

  if (state.players.every((p) => state.submissions[p.id]?.submitted)) {
    resolveWeek(state, rng);
  }
  return ok(state);
}

function validateRoleAction(
  state: CampaignState,
  team: CampaignTeam,
  action: RoleAction,
): string | null {
  if (action.role === 'kampanjledare') {
    let total = 0;
    for (const [vkId, raw] of Object.entries(action.spend)) {
      if (!VALKRETS_BY_ID[vkId]) return 'Ogiltig valkrets.';
      if (raw < 0) return 'Negativ satsning.';
      total += raw;
    }
    if (total > team.kassa + 0.001) return `Du far satsa hogst ${Math.floor(team.kassa)} kassa.`;
  } else if (action.role === 'talesperson') {
    if (!ISSUES.some((i) => i.id === action.issue)) return 'Ogiltig sakfraga.';
    if (action.debateTarget !== 'positiv' &&
        !state.teams.some((t) => t.id === action.debateTarget))
      return 'Ogiltig debattmotstandare.';
  } else if (action.role === 'strateg') {
    if (!['bas', 'marginal', 'attack'].includes(action.focus)) return 'Ogiltigt fokus.';
    if (action.focus === 'attack' &&
        !state.teams.some((t) => t.id === action.attackTarget))
      return 'Valj ett lag att angripa.';
  } else if (action.role === 'analytiker') {
    if (!state.teams.some((t) => t.id === action.analyzeTarget))
      return 'Ogiltigt analysmal.';
  } else if (action.role === 'insamlare') {
    if (!['fundraise', 'annons', 'skold'].includes(action.choice))
      return 'Ogiltigt val.';
  }
  return null;
}

// --- veckoresolution ---------------------------------------------------------

interface TeamPlan {
  team: CampaignTeam;
  spend: Record<string, number>;
  issue: string;
  debateTarget: string;
  focus: 'bas' | 'marginal' | 'attack';
  attackTarget?: string;
  analyzeTarget?: string;
  insamlare?: 'fundraise' | 'annons' | 'skold';
  annonsRegion?: string;
  crisisResponse: 'erkann' | 'forneka' | 'skyll';
  sabotaged: boolean;
}

function gatherPlan(state: CampaignState, team: CampaignTeam): TeamPlan {
  const plan: TeamPlan = {
    team,
    spend: {},
    issue: state.hotIssue ?? 'valfard',
    debateTarget: 'positiv',
    focus: 'bas',
    crisisResponse: 'forneka',
    sabotaged: false,
  };
  for (const pid of team.memberIds) {
    const sub = state.submissions[pid];
    if (!sub) continue;
    if (sub.sabotage) plan.sabotaged = true;
    const a = sub.action;
    if (a.role === 'kampanjledare') plan.spend = a.spend;
    else if (a.role === 'talesperson') {
      plan.issue = a.issue;
      plan.debateTarget = a.debateTarget;
      if (a.crisisResponse) plan.crisisResponse = a.crisisResponse;
    } else if (a.role === 'strateg') {
      plan.focus = a.focus;
      plan.attackTarget = a.attackTarget;
    } else if (a.role === 'analytiker') plan.analyzeTarget = a.analyzeTarget;
    else if (a.role === 'insamlare') {
      plan.insamlare = a.choice;
      plan.annonsRegion = a.region;
    }
  }
  return plan;
}

function nationalSupport(state: CampaignState): Record<string, number> {
  const sum: Record<string, number> = {};
  for (const p of PARTY_IDS) sum[p] = 0;
  for (const vk of state.valkretsar) {
    for (const p of PARTY_IDS) sum[p] += vk.support[p] ?? 0;
  }
  return sum;
}

function nationalPercents(state: CampaignState): Record<string, number> {
  const sum = nationalSupport(state);
  const total = Object.values(sum).reduce((a, b) => a + b, 0) || 1;
  const pct: Record<string, number> = {};
  for (const p of PARTY_IDS) pct[p] = (sum[p] / total) * 100;
  return pct;
}

function resolveWeek(state: CampaignState, rng: Rng): void {
  const before = nationalPercents(state);
  const playedParties = new Set(state.teams.map((t) => t.partyId));
  const plans = state.teams.map((t) => gatherPlan(state, t));
  const ticker: string[] = [];
  const sabotagedTeamIds: string[] = [];

  // Skold: lag vars insamlare valt skold ar skyddade mot attack.
  const shielded = new Set(plans.filter((p) => p.insamlare === 'skold').map((p) => p.team.id));
  // Attackdampning per lag.
  const dampen: Record<string, number> = {};
  for (const p of plans) {
    if (p.focus === 'attack' && p.attackTarget && !shielded.has(p.attackTarget)) {
      dampen[p.attackTarget] = (dampen[p.attackTarget] ?? ATTACK_DAMPEN) * ATTACK_DAMPEN;
    }
  }

  for (const plan of plans) {
    const team = plan.team;
    if (plan.sabotaged) sabotagedTeamIds.push(team.id);

    const momentumMult = 1 + team.momentum * MOMENTUM_STEP;
    const issueMult =
      ownershipBonus(plan.issue, team.partyId) *
      (plan.issue === state.hotIssue ? HOT_ISSUE_BONUS : 1);
    const base =
      issueMult *
      team.morale *
      momentumMult *
      (plan.sabotaged ? 1 - SABOTAGE_FACTOR : 1) *
      (dampen[team.id] ?? 1);

    // Kampanjledarens satsning.
    let spent = 0;
    for (const [vkId, amount] of Object.entries(plan.spend)) {
      const vk = state.valkretsar.find((v) => v.id === vkId);
      if (!vk || amount <= 0) continue;
      spent += amount;
      const stratMult = strategMultiplier(vk, team.partyId, plan.focus);
      vk.support[team.partyId] += amount * base * stratMult;
    }
    team.kassa = Math.max(0, team.kassa - spent);

    // Insamlare.
    if (plan.insamlare === 'fundraise') {
      team.kassa += FUNDRAISE_BONUS;
      ticker.push(`${partyTag(state, team.id)} drar in pengar till slutspurten.`);
    } else if (plan.insamlare === 'annons' && plan.annonsRegion) {
      for (const vk of state.valkretsar) {
        if (VALKRETS_BY_ID[vk.id].region === plan.annonsRegion) {
          vk.support[team.partyId] += ANNONS_PER_VALKRETS * base;
        }
      }
      ticker.push(`${partyTag(state, team.id)} koper annonsplats i en hel region.`);
    }

    // Kris.
    if (state.crisisTeamId === team.id) {
      applyCrisis(state, team, plan.crisisResponse, rng, ticker);
    }
  }

  // Debatter.
  const debates = resolveDebates(state, plans, rng);

  // Ospelade partier driver.
  for (const vk of state.valkretsar) {
    for (const p of PARTY_IDS) {
      if (!playedParties.has(p)) {
        vk.support[p] = Math.max(0.4, vk.support[p] + (rng() - 0.5) * 2.2);
      }
    }
  }

  // Analytiker -> underrattelser.
  for (const plan of plans) {
    if (!plan.analyzeTarget) continue;
    const target = state.teams.find((t) => t.id === plan.analyzeTarget);
    if (!target) continue;
    const tgtSab = sabotagedTeamIds.includes(target.id);
    const txt = tgtSab
      ? `Analys vecka ${state.week}: ${partyTag(state, target.id)} verkar ha saboterats inifran.`
      : `Analys vecka ${state.week}: ${partyTag(state, target.id)} korde en arlig kampanj (momentum ${target.momentum >= 0 ? '+' : ''}${target.momentum}).`;
    plan.team.intel.push({ week: state.week, text: txt });
  }

  // Momentum utifran veckans nationella svangning.
  const after = nationalPercents(state);
  const swing: Record<string, number> = {};
  for (const p of PARTY_IDS) swing[p] = after[p] - before[p];
  for (const team of state.teams) {
    const s = swing[team.partyId] ?? 0;
    if (s > 0.15) team.momentum = clamp(team.momentum + 1, MOMENTUM_MIN, MOMENTUM_MAX);
    else if (s < -0.15) team.momentum = clamp(team.momentum - 1, MOMENTUM_MIN, MOMENTUM_MAX);
  }

  // Veckoinkomst (+ slutspurtsbonus).
  const sprint = state.week > state.totalWeeks - SPRINT_WEEKS;
  for (const team of state.teams) {
    team.kassa += WEEKLY_KASSA + (sprint ? SPRINT_KASSA_BONUS : 0);
  }
  if (sprint) ticker.push('Slutspurt! Alla lag far extra kampanjkassa.');

  for (const debate of debates) {
    ticker.push(
      `Debatt: ${partyTag(state, debate.winnerTeamId)} vann mot ${partyTag(
        state,
        debate.teamA === debate.winnerTeamId ? debate.teamB : debate.teamA,
      )}.`,
    );
  }

  state.lastOutcome = {
    week: state.week,
    headline: state.currentEvent?.title ?? `Vecka ${state.week}`,
    swing,
    debates,
    sabotagedTeamIds,
    ticker,
  };
  state.phase = 'resolution';
  clog(state, 'result', `Vecka ${state.week} avgjord.`);
}

function strategMultiplier(
  vk: ValkretsState,
  partyId: string,
  focus: 'bas' | 'marginal' | 'attack',
): number {
  const leads = leadingParty(vk) === partyId;
  if (focus === 'bas') return leads ? STRATEG_BONUS : 1;
  if (focus === 'marginal') {
    const top = vk.support[leadingParty(vk)] ?? 0;
    const mine = vk.support[partyId] ?? 0;
    const close = !leads && top - mine <= 8;
    return close ? STRATEG_BONUS : 1;
  }
  return 1; // attack hanteras separat
}

function applyCrisis(
  state: CampaignState,
  team: CampaignTeam,
  response: 'erkann' | 'forneka' | 'skyll',
  rng: Rng,
  ticker: string[],
): void {
  const hit = (factor: number) => {
    for (const vk of state.valkretsar) {
      vk.support[team.partyId] = Math.max(0.4, (vk.support[team.partyId] ?? 0) - factor);
    }
  };
  if (response === 'erkann') {
    hit(0.7);
    team.morale = clamp(team.morale + 0.06, MORALE_MIN, MORALE_MAX);
    ticker.push(`${partyTag(state, team.id)} erkanner och ber om ursakt — drevet mattas.`);
  } else if (response === 'forneka') {
    hit(1.4);
    ticker.push(`${partyTag(state, team.id)} fornekar allt — drevet rullar vidare.`);
  } else {
    if (rng() < 0.5) {
      hit(0.3);
      ticker.push(`${partyTag(state, team.id)} skyller pa motstandarna — och kommer undan.`);
    } else {
      hit(2.1);
      team.morale = clamp(team.morale - 0.06, MORALE_MIN, MORALE_MAX);
      ticker.push(`${partyTag(state, team.id)} skyller ifran sig — det slar tillbaka hart.`);
    }
  }
}

function resolveDebates(
  state: CampaignState,
  plans: TeamPlan[],
  rng: Rng,
): DebateResult[] {
  const seen = new Set<string>();
  const debates: DebateResult[] = [];
  for (const plan of plans) {
    if (plan.debateTarget === 'positiv') continue;
    const opp = state.teams.find((t) => t.id === plan.debateTarget);
    if (!opp || opp.id === plan.team.id) continue;
    const key = [plan.team.id, opp.id].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const oppPlan = plans.find((p) => p.team.id === opp.id);

    const score = (t: CampaignTeam, issue: string): number => {
      const mom = 1 + t.momentum * MOMENTUM_STEP;
      return (
        ownershipBonus(issue, t.partyId) *
        (issue === state.hotIssue ? HOT_ISSUE_BONUS : 1) *
        t.morale *
        mom *
        (0.7 + rng() * 0.6)
      );
    };
    const sa = score(plan.team, plan.issue);
    const sb = score(opp, oppPlan?.issue ?? state.hotIssue ?? 'valfard');
    const winner = sa >= sb ? plan.team : opp;
    const loser = winner.id === plan.team.id ? opp : plan.team;
    for (const vk of state.valkretsar) {
      vk.support[winner.partyId] += 0.6;
      vk.support[loser.partyId] = Math.max(0.4, vk.support[loser.partyId] - 0.22);
    }
    debates.push({
      teamA: plan.team.id,
      teamB: opp.id,
      winnerTeamId: winner.id,
      issue: plan.issue,
    });
    clog(
      state,
      'debate',
      `Debatt: ${partyTag(state, winner.id)} besegrade ${partyTag(state, loser.id)}.`,
    );
  }
  return debates;
}

// --- internt krismote --------------------------------------------------------

function internalVote(
  state: CampaignState,
  action: Extract<CampaignAction, { type: 'INTERNAL_VOTE' }>,
  fail: (e: string) => CampaignResult,
): CampaignResult {
  if (state.phase !== 'internal') return fail('Inget krismote pagar.');
  const team = teamOfPlayer(state, action.playerId);
  if (!team) return fail('Du ingar inte i nagot lag.');
  if (!team.memberIds.includes(action.accusedId))
    return fail('Du kan bara anklaga nagon i ditt eget lag.');
  state.internalVotes[team.id][action.playerId] = action.accusedId;

  const everyone = state.players.every(
    (p) => state.internalVotes[p.teamId]?.[p.id] !== undefined,
  );
  if (everyone) resolveInternal(state);
  return ok(state);
}

function resolveInternal(state: CampaignState): void {
  for (const team of state.teams) {
    const votes = state.internalVotes[team.id] ?? {};
    const tally: Record<string, number> = {};
    for (const accused of Object.values(votes)) tally[accused] = (tally[accused] ?? 0) + 1;
    let topId = '';
    let topCount = 0;
    let tie = false;
    for (const [id, count] of Object.entries(tally)) {
      if (count > topCount) { topCount = count; topId = id; tie = false; }
      else if (count === topCount) tie = true;
    }
    if (!topId || tie) {
      clog(state, 'mole', `${partyTag(state, team.id)}: krismotet enades inte.`);
      continue;
    }
    if (topId === team.moleId) {
      team.moleStatus = 'exposed';
      team.morale = clamp(team.morale + MORALE_EXPOSE, MORALE_MIN, MORALE_MAX);
      clog(state, 'mole', `${partyTag(state, team.id)} avslojade sin mullvad!`);
    } else {
      team.morale = clamp(team.morale - MORALE_MISFIRE, MORALE_MIN, MORALE_MAX);
      clog(state, 'mole', `${partyTag(state, team.id)} rostade ut fel person.`);
    }
  }
  state.internalDone = true;
  state.phase = 'resolution';
}

// --- valnatten ---------------------------------------------------------------

export function distributeMandate(
  shares: Record<string, number>,
  seats: number,
): Record<string, number> {
  const total = Object.values(shares).reduce((a, b) => a + b, 0);
  const result: Record<string, number> = {};
  if (total <= 0 || seats <= 0) {
    for (const p of Object.keys(shares)) result[p] = 0;
    return result;
  }
  const remainders: { party: string; rem: number }[] = [];
  let assigned = 0;
  for (const [party, share] of Object.entries(shares)) {
    const exact = (share / total) * seats;
    const floor = Math.floor(exact);
    result[party] = floor;
    assigned += floor;
    remainders.push({ party, rem: exact - floor });
  }
  remainders.sort((a, b) => b.rem - a.rem);
  let i = 0;
  while (assigned < seats && remainders.length > 0) {
    result[remainders[i % remainders.length].party] += 1;
    assigned += 1;
    i += 1;
  }
  return result;
}

export function computeElectionResult(state: CampaignState): ElectionResult {
  const national = nationalSupport(state);
  const totalNational = Object.values(national).reduce((a, b) => a + b, 0) || 1;
  const passed = new Set(
    PARTY_IDS.filter((p) => (national[p] / totalNational) * 100 >= THRESHOLD_PERCENT),
  );

  const mandates: Record<string, number> = {};
  for (const p of PARTY_IDS) mandates[p] = 0;
  for (const vk of state.valkretsar) {
    const v = VALKRETS_BY_ID[vk.id];
    const shares: Record<string, number> = {};
    for (const p of PARTY_IDS) {
      if (passed.has(p)) shares[p] = Math.max(0, vk.support[p] ?? 0);
    }
    const dist = distributeMandate(shares, v.mandate);
    for (const [p, m] of Object.entries(dist)) mandates[p] += m;
  }

  const parties: PartyResult[] = PARTY_IDS.map((p) => ({
    partyId: p,
    votePercent: (national[p] / totalNational) * 100,
    mandates: mandates[p] ?? 0,
    passedThreshold: passed.has(p),
  })).sort((a, b) => b.mandates - a.mandates || b.votePercent - a.votePercent);

  let redgron = 0;
  let tido = 0;
  for (const pr of parties) {
    if (blocOf(pr.partyId) === 'redgron') redgron += pr.mandates;
    else tido += pr.mandates;
  }
  const governingBloc = redgron >= tido ? 'redgron' : 'tido';

  const teamWon: Record<string, boolean> = {};
  const moleWon: Record<string, boolean> = {};
  for (const team of state.teams) {
    const won = blocOf(team.partyId) === governingBloc;
    teamWon[team.id] = won;
    moleWon[team.id] = !won && team.moleStatus === 'hidden';
  }
  return { parties, redgronMandate: redgron, tidoMandate: tido, governingBloc, teamWon, moleWon };
}

function runElection(state: CampaignState): void {
  state.result = computeElectionResult(state);
  clog(
    state,
    'result',
    `Valnatten: ${state.result.governingBloc === 'redgron' ? 'rodgrona' : 'Tido'}-sidan bildar regering.`,
  );
}

// ---------------------------------------------------------------------------
// Vems tur ar det?
// ---------------------------------------------------------------------------

export function pendingCampaignActors(state: CampaignState): string[] {
  if (state.phase === 'planning') {
    return state.players
      .filter((p) => !state.submissions[p.id]?.submitted)
      .map((p) => p.id);
  }
  if (state.phase === 'internal') {
    return state.players
      .filter((p) => state.internalVotes[p.teamId]?.[p.id] === undefined)
      .map((p) => p.id);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Klientvy
// ---------------------------------------------------------------------------

export function toCampaignView(state: CampaignState, viewerId: string): CampaignClientView {
  const gameOver = state.phase === 'gameOver';
  const viewer = state.players.find((p) => p.id === viewerId);
  const viewerTeamId = viewer?.teamId ?? '';
  const projection = computeElectionResult(state);

  const teams: CampaignTeamView[] = state.teams.map((t) => {
    const reveal = gameOver || t.moleStatus === 'exposed';
    const roles: Record<string, CampaignRole> = {};
    for (const pid of t.memberIds) {
      const pl = state.players.find((p) => p.id === pid);
      if (pl) roles[pid] = pl.role;
    }
    return {
      id: t.id,
      partyId: t.partyId,
      leaderId: t.leaderId,
      memberIds: t.memberIds,
      roles,
      moleStatus: t.moleStatus,
      moleId: reveal ? t.moleId : null,
      morale: t.morale,
      momentum: t.momentum,
      kassa: Math.round(t.kassa),
      submittedCount: t.memberIds.filter((id) => state.submissions[id]?.submitted).length,
    };
  });

  const valkretsar = state.valkretsar.map((vk) => ({
    id: vk.id,
    support: vk.support,
    leadingParty: leadingParty(vk),
  }));

  const myTeam = state.teams.find((t) => t.id === viewerTeamId);
  const isMole = myTeam?.moleId === viewerId;

  return {
    mode: 'campaign',
    phase: state.phase,
    week: state.week,
    totalWeeks: state.totalWeeks,
    players: state.players,
    teams,
    valkretsar,
    projection: projection.parties.map((p) => ({
      partyId: p.partyId,
      percent: p.votePercent,
      mandates: p.mandates,
      passedThreshold: p.passedThreshold,
    })),
    redgronMandate: projection.redgronMandate,
    tidoMandate: projection.tidoMandate,
    currentEvent: state.currentEvent,
    hotIssue: state.hotIssue,
    crisisTeamId: state.crisisTeamId,
    lastOutcome: state.lastOutcome,
    result: state.result,
    log: state.log,
    you: {
      id: viewerId,
      teamId: viewerTeamId,
      role: viewer?.role ?? null,
      isMole,
      submitted: !!state.submissions[viewerId]?.submitted,
      mySubmission: state.submissions[viewerId] ?? null,
      teamIntel: myTeam?.intel ?? [],
      internalVoteCast: viewerTeamId
        ? (state.internalVotes[viewerTeamId]?.[viewerId] ?? null)
        : null,
    },
    finalMoles: gameOver
      ? Object.fromEntries(state.teams.map((t) => [t.id, t.moleId]))
      : null,
  };
}

export { nationalSupport };
export type { RoleSubmission };
