import { makeRng, type Rng } from '../engine.js';
import { CAMPAIGN_EVENTS } from './events.js';
import { ISSUES, ownershipBonus } from './issues.js';
import {
  INTERNAL_WEEK,
  LEADER_VISIT_BONUS,
  MORALE_EXPOSE,
  MORALE_MAX,
  MORALE_MIN,
  MORALE_MISFIRE,
  MORALE_START,
  SABOTAGE_FACTOR,
  HOT_ISSUE_BONUS,
  THRESHOLD_PERCENT,
  TOTAL_WEEKS,
  WEEKLY_KASSA,
  blocOf,
} from './rules.js';
import {
  VALKRETSAR,
  VALKRETS_BY_ID,
  initialSupport,
} from './valkretsar.js';
import type {
  CampaignEventCard,
  CampaignLogEntry,
  CampaignPlayer,
  CampaignState,
  CampaignTeam,
  ElectionResult,
  PartyResult,
  ValkretsState,
  WeeklyOutcome,
} from './types.js';

const PARTY_IDS = ['s', 'm', 'sd', 'v', 'mp', 'c', 'kd', 'l'];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type CampaignAction =
  | { type: 'ADVANCE' }
  | {
      type: 'SUBMIT_PLAN';
      playerId: string;
      spend: Record<string, number>;
      leaderVisit: string | null;
      issue: string;
    }
  | { type: 'SUBMIT_MOLE'; playerId: string; sabotage: boolean }
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

/** Ledande parti i en valkrets. */
export function leadingParty(vk: ValkretsState): string {
  let best = PARTY_IDS[0];
  for (const p of PARTY_IDS) {
    if ((vk.support[p] ?? 0) > (vk.support[best] ?? 0)) best = p;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Skapa kampanj
// ---------------------------------------------------------------------------

export function createCampaign(setup: CampaignSetup, seed: number): CampaignState {
  const rng = makeRng(seed);

  const players: CampaignPlayer[] = setup.players.map((p) => {
    const team = setup.teams.find((t) => t.memberIds.includes(p.id))!;
    return {
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      isHost: p.isHost,
      connected: true,
      teamId: team.id,
      isLeader: false,
    };
  });

  const teams: CampaignTeam[] = setup.teams.map((t) => {
    const members = t.memberIds;
    const moleId = members[Math.floor(rng() * members.length)];
    // Lagledare: forsta manniska, annars forsta medlem.
    const humanLeader = members.find(
      (id) => !setup.players.find((p) => p.id === id)?.isBot,
    );
    const leaderId = humanLeader ?? members[0];
    return {
      id: t.id,
      partyId: t.partyId,
      leaderId,
      memberIds: members,
      moleId,
      moleStatus: 'hidden',
      morale: MORALE_START,
    };
  });
  for (const p of players) {
    p.isLeader = teams.some((t) => t.leaderId === p.id);
  }

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
    plans: {},
    moleMoves: {},
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
    case 'SUBMIT_PLAN':
      return submitPlan(state, action, rng, fail);
    case 'SUBMIT_MOLE':
      return submitMole(state, action, rng, fail);
    case 'INTERNAL_VOTE':
      return internalVote(state, action, fail);
    default:
      return fail('Okand handling.');
  }
}

const ok = (state: CampaignState): CampaignResult => ({ ok: true, state });

// --- nyhetshandelse ----------------------------------------------------------

function drawEvent(state: CampaignState, rng: Rng): void {
  const used = new Set(state.log.filter((l) => l.kind === 'news').map((l) => l.text));
  const pool = shuffle(CAMPAIGN_EVENTS, rng).filter((e) => !used.has(e.title));
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
  clog(state, 'news', event.title);
}

function startWeek(state: CampaignState, rng: Rng): void {
  state.phase = 'news';
  state.plans = {};
  state.moleMoves = {};
  drawEvent(state, rng);
}

// --- advance -----------------------------------------------------------------

function advance(state: CampaignState, rng: Rng): CampaignResult {
  switch (state.phase) {
    case 'roleReveal':
      startWeek(state, rng);
      return ok(state);
    case 'news':
      state.phase = 'campaign';
      return ok(state);
    case 'resolution': {
      if (state.week === INTERNAL_WEEK && !state.internalDone) {
        state.phase = 'internal';
        state.internalVotes = {};
        for (const t of state.teams) state.internalVotes[t.id] = {};
        clog(state, 'system', 'Internt krismote: lagen jagar sina mullvadar.');
        return ok(state);
      }
      return nextWeekOrElection(state, rng);
    }
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

// --- kampanjplaner -----------------------------------------------------------

function submitPlan(
  state: CampaignState,
  action: Extract<CampaignAction, { type: 'SUBMIT_PLAN' }>,
  rng: Rng,
  fail: (e: string) => CampaignResult,
): CampaignResult {
  if (state.phase !== 'campaign') return fail('Det ar inte kampanjfas.');
  const team = teamOfPlayer(state, action.playerId);
  if (!team) return fail('Du ingar inte i nagot lag.');
  if (team.leaderId !== action.playerId) return fail('Bara lagledaren far lasa kampanjen.');
  if (state.plans[team.id]?.submitted) return fail('Laget har redan last sin kampanj.');

  let total = 0;
  const spend: Record<string, number> = {};
  for (const [vkId, raw] of Object.entries(action.spend)) {
    if (!VALKRETS_BY_ID[vkId]) return fail('Ogiltig valkrets.');
    const amount = Math.max(0, Math.floor(raw));
    if (amount > 0) spend[vkId] = amount;
    total += amount;
  }
  if (total > WEEKLY_KASSA) return fail(`Du far satsa hogst ${WEEKLY_KASSA} kassa.`);
  if (action.leaderVisit && !VALKRETS_BY_ID[action.leaderVisit])
    return fail('Ogiltig valkrets for partiledarbesok.');
  if (!ISSUES.some((i) => i.id === action.issue)) return fail('Ogiltig sakfraga.');

  state.plans[team.id] = {
    teamId: team.id,
    spend,
    leaderVisit: action.leaderVisit,
    issue: action.issue,
    submitted: true,
  };
  clog(state, 'campaign', `${team.partyId.toUpperCase()} har last sin kampanjvecka.`);
  maybeResolveWeek(state, rng);
  return ok(state);
}

function submitMole(
  state: CampaignState,
  action: Extract<CampaignAction, { type: 'SUBMIT_MOLE' }>,
  rng: Rng,
  fail: (e: string) => CampaignResult,
): CampaignResult {
  if (state.phase !== 'campaign') return fail('Det ar inte kampanjfas.');
  const team = teamOfPlayer(state, action.playerId);
  if (!team) return fail('Du ingar inte i nagot lag.');
  if (team.moleId !== action.playerId) return fail('Bara mullvaden far gora detta drag.');
  if (state.moleMoves[team.id]?.submitted) return fail('Draget ar redan gjort.');

  state.moleMoves[team.id] = {
    teamId: team.id,
    sabotage: team.moleStatus === 'hidden' ? action.sabotage : false,
    submitted: true,
  };
  maybeResolveWeek(state, rng);
  return ok(state);
}

/** Behover detta lag ett separat mullvadsdrag? Avslojade mullvadar slipper. */
function teamNeedsMoleMove(team: CampaignTeam): boolean {
  return team.moleStatus === 'hidden';
}

function maybeResolveWeek(state: CampaignState, rng: Rng): void {
  for (const t of state.teams) {
    if (!state.plans[t.id]?.submitted) return;
    if (teamNeedsMoleMove(t) && !state.moleMoves[t.id]?.submitted) return;
  }
  resolveWeek(state, rng);
}

// --- veckoresolution ---------------------------------------------------------

function nationalSupport(state: CampaignState): Record<string, number> {
  const sum: Record<string, number> = {};
  for (const p of PARTY_IDS) sum[p] = 0;
  for (const vk of state.valkretsar) {
    for (const p of PARTY_IDS) sum[p] += vk.support[p] ?? 0;
  }
  return sum;
}

function resolveWeek(state: CampaignState, rng: Rng): void {
  const before = nationalSupport(state);
  const playedParties = new Set(state.teams.map((t) => t.partyId));
  const sabotaged: string[] = [];

  for (const team of state.teams) {
    const plan = state.plans[team.id];
    if (!plan) continue;
    const move = state.moleMoves[team.id];
    const sabotage = move?.sabotage ?? false;
    if (sabotage) sabotaged.push(team.id);

    const issueMult =
      ownershipBonus(plan.issue, team.partyId) *
      (plan.issue === state.hotIssue ? HOT_ISSUE_BONUS : 1) *
      team.morale *
      (sabotage ? 1 - SABOTAGE_FACTOR : 1);

    for (const [vkId, amount] of Object.entries(plan.spend)) {
      const vk = state.valkretsar.find((v) => v.id === vkId);
      if (vk) vk.support[team.partyId] += amount * issueMult;
    }
    if (plan.leaderVisit) {
      const vk = state.valkretsar.find((v) => v.id === plan.leaderVisit);
      if (vk) vk.support[team.partyId] += LEADER_VISIT_BONUS * issueMult;
    }
  }

  // Ospelade partier driver lite slumpmassigt.
  for (const vk of state.valkretsar) {
    for (const p of PARTY_IDS) {
      if (!playedParties.has(p)) {
        vk.support[p] = Math.max(0.5, vk.support[p] + (rng() - 0.5) * 2.4);
      }
    }
  }

  // Debatt: tva lag drabbar samman.
  const debate = resolveDebate(state, rng);

  const after = nationalSupport(state);
  const totalAfter = Object.values(after).reduce((a, b) => a + b, 0) || 1;
  const swing: Record<string, number> = {};
  for (const p of PARTY_IDS) {
    swing[p] =
      (after[p] / totalAfter) * 100 - (before[p] / (Object.values(before).reduce((a, b) => a + b, 0) || 1)) * 100;
  }

  const outcome: WeeklyOutcome = {
    week: state.week,
    swing,
    debate,
    sabotagedTeamIds: sabotaged,
    headline: state.currentEvent?.title ?? '',
  };
  state.lastOutcome = outcome;
  state.phase = 'resolution';
  clog(state, 'result', `Vecka ${state.week} avgjord. Opinionen har svangt.`);
}

function resolveDebate(
  state: CampaignState,
  rng: Rng,
): WeeklyOutcome['debate'] {
  if (state.teams.length < 2) return null;
  const n = state.teams.length;
  const a = state.teams[(state.week - 1) % n];
  const b = state.teams[state.week % n];
  if (a.id === b.id) return null;

  const score = (team: CampaignTeam): number => {
    const plan = state.plans[team.id];
    if (!plan) return 0;
    const issue = plan.issue;
    const own = ownershipBonus(issue, team.partyId);
    const hot = issue === state.hotIssue ? HOT_ISSUE_BONUS : 1;
    return own * hot * team.morale * (0.7 + rng() * 0.6);
  };
  const sa = score(a);
  const sb = score(b);
  const winner = sa >= sb ? a : b;
  const loser = winner.id === a.id ? b : a;

  // Vinnaren far ett nationellt opinionslyft.
  for (const vk of state.valkretsar) {
    vk.support[winner.partyId] += 0.7;
    vk.support[loser.partyId] = Math.max(0.5, vk.support[loser.partyId] - 0.25);
  }
  clog(
    state,
    'debate',
    `Partiledardebatt: ${winner.partyId.toUpperCase()} vann mot ${loser.partyId.toUpperCase()}.`,
  );
  return {
    teamA: a.id,
    teamB: b.id,
    winnerTeamId: winner.id,
    issue: state.plans[winner.id]?.issue ?? '',
  };
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
    for (const accused of Object.values(votes)) {
      tally[accused] = (tally[accused] ?? 0) + 1;
    }
    let topId = '';
    let topCount = 0;
    let tie = false;
    for (const [id, count] of Object.entries(tally)) {
      if (count > topCount) {
        topCount = count;
        topId = id;
        tie = false;
      } else if (count === topCount) {
        tie = true;
      }
    }
    if (!topId || tie) {
      clog(state, 'mole', `${team.partyId.toUpperCase()}: krismotet enades inte.`);
      continue;
    }
    if (topId === team.moleId) {
      team.moleStatus = 'exposed';
      team.morale = Math.min(MORALE_MAX, team.morale + MORALE_EXPOSE);
      clog(state, 'mole', `${team.partyId.toUpperCase()} avslojade sin mullvad!`);
    } else {
      team.morale = Math.max(MORALE_MIN, team.morale - MORALE_MISFIRE);
      clog(state, 'mole', `${team.partyId.toUpperCase()} rostade ut fel person.`);
    }
  }
  state.internalDone = true;
  state.phase = 'resolution';
}

// --- valnatten ---------------------------------------------------------------

/** Fordela mandat med storsta-rest-metoden. */
function distributeMandate(
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

/** Ren valuträkning - anvands bade for slutresultat och liveprognos. */
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
  if (state.phase === 'campaign') {
    const actors: string[] = [];
    for (const team of state.teams) {
      if (!state.plans[team.id]?.submitted) actors.push(team.leaderId);
      if (teamNeedsMoleMove(team) && !state.moleMoves[team.id]?.submitted) {
        actors.push(team.moleId);
      }
    }
    return [...new Set(actors)];
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

export function toCampaignView(
  state: CampaignState,
  viewerId: string,
): import('./types.js').CampaignClientView {
  const gameOver = state.phase === 'gameOver';
  const viewer = state.players.find((p) => p.id === viewerId);
  const viewerTeamId = viewer?.teamId ?? '';
  const projection = computeElectionResult(state);

  const teams: import('./types.js').CampaignTeamView[] = state.teams.map((t) => {
    const reveal = gameOver || t.moleStatus === 'exposed';
    return {
      id: t.id,
      partyId: t.partyId,
      leaderId: t.leaderId,
      memberIds: t.memberIds,
      moleStatus: t.moleStatus,
      morale: t.morale,
      moleId: reveal ? t.moleId : null,
      planSubmitted: !!state.plans[t.id]?.submitted,
      moleSubmitted: !!state.moleMoves[t.id]?.submitted,
    };
  });

  const valkretsar: import('./types.js').ValkretsView[] = state.valkretsar.map((vk) => ({
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
    lastOutcome: state.lastOutcome,
    result: state.result,
    log: state.log,
    you: {
      id: viewerId,
      teamId: viewerTeamId,
      isMole,
      isLeader: myTeam?.leaderId === viewerId,
      teamPlan: viewerTeamId ? (state.plans[viewerTeamId] ?? null) : null,
      moleMove: isMole && myTeam ? (state.moleMoves[myTeam.id] ?? null) : null,
      internalVoteCast:
        viewerTeamId && state.internalVotes[viewerTeamId]
          ? (state.internalVotes[viewerTeamId][viewerId] ?? null)
          : null,
    },
    finalMoles: gameOver
      ? Object.fromEntries(state.teams.map((t) => [t.id, t.moleId]))
      : null,
  };
}

export { PARTY_IDS, nationalSupport, distributeMandate };
