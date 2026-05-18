import type {
  ClientGameView,
  GameSettings,
  GameState,
  LawCard,
  LogEntry,
  Player,
  Role,
  Team,
} from './types.js';
import { ALL_LAW_CARDS } from './lawCards.js';
import { getParty } from './parties.js';
import {
  AUTHORITARIAN_TARGET,
  DEMOCRATIC_TARGET,
  DICTATOR_TALMAN_WIN_THRESHOLD,
  ELECTION_TRACKER_MAX,
  VETO_UNLOCK,
  collaboratorsKnowDictator,
  getPowerForPosition,
  getRoleCounts,
} from './rules.js';

// ---------------------------------------------------------------------------
// Deterministisk RNG (mulberry32) sa att spelforlopp gar att testa.
// ---------------------------------------------------------------------------

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'NOMINATE'; playerId: string; talmanId: string }
  | { type: 'VOTE'; playerId: string; vote: boolean }
  | { type: 'PRESIDENT_DISCARD'; playerId: string; cardId: string }
  | { type: 'TALMAN_ENACT'; playerId: string; cardId: string }
  | { type: 'PROPOSE_VETO'; playerId: string }
  | { type: 'VETO_RESPONSE'; playerId: string; agree: boolean }
  | { type: 'POWER_TARGET'; playerId: string; targetId: string }
  | { type: 'POWER_PEEK_DONE'; playerId: string }
  | { type: 'ADVANCE'; playerId?: string };

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: GameState;
}

// ---------------------------------------------------------------------------
// Hjalpare
// ---------------------------------------------------------------------------

const clone = (s: GameState): GameState => structuredClone(s);

function log(state: GameState, kind: LogEntry['kind'], text: string): void {
  state.log.push({ id: state.nextLogId++, round: state.round, kind, text });
}

export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

export function president(state: GameState): Player {
  return state.players[state.presidentIndex];
}

export function playerById(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function nextAliveIndex(state: GameState, from: number): number {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (state.players[idx].alive) return idx;
  }
  return from;
}

/** Spelare som inte far nomineras till talman (mandatperiodsregeln). */
export function termLimitedIds(state: GameState): string[] {
  const gov = state.lastGovernment;
  if (!gov) return [];
  const ids: string[] = [gov.talmanId];
  // Med fler an 5 levande spelare ar aven forra presidenten sparrad.
  if (alivePlayers(state).length > 5) ids.push(gov.presidentId);
  return ids.filter((id) => playerById(state, id)?.alive);
}

export function eligibleTalmanIds(state: GameState): string[] {
  const limited = new Set(termLimitedIds(state));
  const presId = president(state).id;
  return alivePlayers(state)
    .filter((p) => p.id !== presId && !limited.has(p.id))
    .map((p) => p.id);
}

export function teamOf(role: Role): Team {
  return role === 'democrat' ? 'democrats' : 'antidemocrats';
}

// ---------------------------------------------------------------------------
// Skapa nytt spel
// ---------------------------------------------------------------------------

export interface NewGamePlayer {
  id: string;
  name: string;
  partyId: string;
  isBot: boolean;
  isHost: boolean;
}

export function createGame(
  players: NewGamePlayer[],
  settings: GameSettings,
  seed: number,
): GameState {
  const rng = makeRng(seed);
  const counts = getRoleCounts(players.length);

  const roles: Role[] = [
    ...Array(counts.democrats).fill('democrat'),
    ...Array(counts.collaborators).fill('collaborator'),
    ...Array(counts.dictators).fill('dictator'),
  ];
  const shuffledRoles = shuffle(roles, rng);

  const gamePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    partyId: p.partyId,
    isBot: p.isBot,
    isHost: p.isHost,
    connected: true,
    alive: true,
    ready: true,
    role: shuffledRoles[i],
  }));

  const deck = shuffle(ALL_LAW_CARDS, rng);
  const presidentIndex = Math.floor(rng() * gamePlayers.length);

  const state: GameState = {
    phase: 'roleReveal',
    round: 1,
    players: gamePlayers,
    settings,
    presidentIndex,
    specialElectionFrom: null,
    nextPresidentOverrideId: null,
    nominatedTalmanId: null,
    lastGovernment: null,
    electionTracker: 0,
    deck,
    discard: [],
    democraticEnacted: [],
    authoritarianEnacted: [],
    presidentCards: [],
    talmanCards: [],
    peekedCards: [],
    votes: {},
    vetoUnlocked: false,
    vetoProposed: false,
    pendingPower: null,
    investigationResults: {},
    alreadyInvestigated: [],
    winner: null,
    winReason: null,
    log: [],
    nextLogId: 1,
  };

  log(state, 'system', `Spelet startar med ${players.length} ledamoter i riksdagen.`);
  log(
    state,
    'system',
    `${president(state).name} ar forst att agera statsminister.`,
  );
  return state;
}

// ---------------------------------------------------------------------------
// Kortlek
// ---------------------------------------------------------------------------

function ensureDeck(state: GameState, needed: number, rng: Rng): void {
  if (state.deck.length >= needed) return;
  state.deck = shuffle([...state.deck, ...state.discard], rng);
  state.discard = [];
}

// ---------------------------------------------------------------------------
// Vinstkontroll
// ---------------------------------------------------------------------------

function setWinner(state: GameState, team: Team, reason: string): void {
  state.winner = team;
  state.winReason = reason;
  state.phase = 'gameOver';
  log(state, 'win', reason);
}

function checkBoardWin(state: GameState): boolean {
  if (state.democraticEnacted.length >= DEMOCRATIC_TARGET) {
    setWinner(
      state,
      'democrats',
      `Demokraterna har forsvarat ${DEMOCRATIC_TARGET} grundlaggande rattigheter. Demokratin bestar!`,
    );
    return true;
  }
  if (state.authoritarianEnacted.length >= AUTHORITARIAN_TARGET) {
    setWinner(
      state,
      'antidemocrats',
      `${AUTHORITARIAN_TARGET} antidemokratiska lagar har antagits. Demokratin har fallit.`,
    );
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function applyAction(
  prev: GameState,
  action: Action,
  rng: Rng = Math.random,
): ActionResult {
  const state = clone(prev);

  const fail = (error: string): ActionResult => ({ ok: false, error, state: prev });

  switch (action.type) {
    case 'ADVANCE':
      return handleAdvance(state);
    case 'NOMINATE':
      return handleNominate(state, action, fail);
    case 'VOTE':
      return handleVote(state, action, rng, fail);
    case 'PRESIDENT_DISCARD':
      return handlePresidentDiscard(state, action, fail);
    case 'TALMAN_ENACT':
      return handleTalmanEnact(state, action, rng, fail);
    case 'PROPOSE_VETO':
      return handleProposeVeto(state, action, fail);
    case 'VETO_RESPONSE':
      return handleVetoResponse(state, action, rng, fail);
    case 'POWER_TARGET':
      return handlePowerTarget(state, action, fail);
    case 'POWER_PEEK_DONE':
      return handlePeekDone(state, action, fail);
    default:
      return fail('Okand handling.');
  }
}

function ok(state: GameState): ActionResult {
  return { ok: true, state };
}

// --- roleReveal -> nomination & generell rundavancering ----------------------

function startNomination(state: GameState): void {
  state.phase = 'nomination';
  state.nominatedTalmanId = null;
  state.votes = {};
  state.vetoProposed = false;
  log(
    state,
    'system',
    `Runda ${state.round}: ${president(state).name} ar statsminister och ska nominera en talman.`,
  );
}

function handleAdvance(state: GameState): ActionResult {
  if (state.phase === 'roleReveal') {
    startNomination(state);
    return ok(state);
  }
  if (state.phase === 'roundEnd') {
    if (state.winner) {
      state.phase = 'gameOver';
      return ok(state);
    }
    advancePresident(state);
    state.round += 1;
    startNomination(state);
    return ok(state);
  }
  if (state.phase === 'gameOver') return ok(state);
  return { ok: false, error: 'Kan inte ga vidare just nu.', state };
}

function advancePresident(state: GameState): void {
  if (state.nextPresidentOverrideId) {
    const idx = state.players.findIndex(
      (p) => p.id === state.nextPresidentOverrideId,
    );
    state.nextPresidentOverrideId = null;
    if (idx >= 0 && state.players[idx].alive) {
      state.presidentIndex = idx;
      return;
    }
  }
  if (state.specialElectionFrom !== null) {
    state.presidentIndex = nextAliveIndex(state, state.specialElectionFrom);
    state.specialElectionFrom = null;
    return;
  }
  state.presidentIndex = nextAliveIndex(state, state.presidentIndex);
}

// --- nominering --------------------------------------------------------------

function handleNominate(
  state: GameState,
  action: Extract<Action, { type: 'NOMINATE' }>,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'nomination') return fail('Det ar inte dags att nominera.');
  if (action.playerId !== president(state).id)
    return fail('Bara statsministern far nominera.');
  if (!eligibleTalmanIds(state).includes(action.talmanId))
    return fail('Den spelaren far inte nomineras till talman.');

  state.nominatedTalmanId = action.talmanId;
  state.phase = 'voting';
  state.votes = {};
  for (const p of alivePlayers(state)) state.votes[p.id] = null;

  log(
    state,
    'nomination',
    `${president(state).name} nominerar ${playerById(state, action.talmanId)!.name} till talman.`,
  );
  return ok(state);
}

// --- omrostning --------------------------------------------------------------

function handleVote(
  state: GameState,
  action: Extract<Action, { type: 'VOTE' }>,
  rng: Rng,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'voting') return fail('Ingen omrostning pagar.');
  const voter = playerById(state, action.playerId);
  if (!voter || !voter.alive) return fail('Du far inte rosta.');
  if (!(action.playerId in state.votes)) return fail('Du ingar inte i omrostningen.');

  state.votes[action.playerId] = action.vote;

  const everyoneVoted = alivePlayers(state).every(
    (p) => state.votes[p.id] !== null && state.votes[p.id] !== undefined,
  );
  if (everyoneVoted) resolveVote(state, rng);
  return ok(state);
}

function resolveVote(state: GameState, rng: Rng): void {
  const ja = Object.values(state.votes).filter((v) => v === true).length;
  const nej = Object.values(state.votes).filter((v) => v === false).length;
  const presName = president(state).name;
  const talman = playerById(state, state.nominatedTalmanId!)!;

  if (ja > nej) {
    log(state, 'vote', `Regeringen ${presName} / ${talman.name} valdes (${ja}-${nej}).`);

    // Diktatorn vald till talman sent i spelet => antidemokraterna vinner.
    if (
      talman.role === 'dictator' &&
      state.authoritarianEnacted.length >= DICTATOR_TALMAN_WIN_THRESHOLD
    ) {
      setWinner(
        state,
        'antidemocrats',
        `${talman.name} - den hemliga diktatorn - valdes till talman. Antidemokraterna griper makten!`,
      );
      return;
    }

    state.lastGovernment = {
      presidentId: president(state).id,
      talmanId: talman.id,
    };
    state.electionTracker = 0;
    beginLegislation(state, rng);
  } else {
    log(state, 'vote', `Regeringen ${presName} / ${talman.name} foll (${ja}-${nej}).`);
    state.electionTracker += 1;
    if (state.electionTracker >= ELECTION_TRACKER_MAX) {
      triggerChaos(state, rng);
    }
    state.phase = 'roundEnd';
  }
}

function triggerChaos(state: GameState, rng: Rng): void {
  log(
    state,
    'system',
    'Tre regeringar har fallit i rad. Riksdagen kollapsar - toppforslaget blir lag automatiskt.',
  );
  ensureDeck(state, 1, rng);
  const card = state.deck.shift()!;
  enactCard(state, card, true);
  state.electionTracker = 0;
  state.lastGovernment = null; // Mandatperiodsregeln nollstalls.
}

// --- lagstiftning ------------------------------------------------------------

function beginLegislation(state: GameState, rng: Rng): void {
  ensureDeck(state, 3, rng);
  state.presidentCards = state.deck.splice(0, 3);
  state.talmanCards = [];
  state.phase = 'legislationPresident';
  log(state, 'legislation', `${president(state).name} drar tre lagforslag.`);
}

function handlePresidentDiscard(
  state: GameState,
  action: Extract<Action, { type: 'PRESIDENT_DISCARD' }>,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'legislationPresident')
    return fail('Statsministern ska inte agera nu.');
  if (action.playerId !== president(state).id)
    return fail('Bara statsministern far slanga ett forslag.');
  const idx = state.presidentCards.findIndex((c) => c.id === action.cardId);
  if (idx < 0) return fail('Det forslaget finns inte pa handen.');

  const [discarded] = state.presidentCards.splice(idx, 1);
  state.discard.push(discarded);
  state.talmanCards = state.presidentCards;
  state.presidentCards = [];
  state.phase = 'legislationTalman';
  log(state, 'legislation', 'Statsministern slanger ett forslag och lamnar tva till talmannen.');
  return ok(state);
}

function handleTalmanEnact(
  state: GameState,
  action: Extract<Action, { type: 'TALMAN_ENACT' }>,
  rng: Rng,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'legislationTalman')
    return fail('Talmannen ska inte agera nu.');
  if (action.playerId !== state.nominatedTalmanId)
    return fail('Bara talmannen far anta ett forslag.');
  const idx = state.talmanCards.findIndex((c) => c.id === action.cardId);
  if (idx < 0) return fail('Det forslaget finns inte pa handen.');

  const [enacted] = state.talmanCards.splice(idx, 1);
  state.discard.push(...state.talmanCards);
  state.talmanCards = [];
  enactCard(state, enacted, false);

  if (state.winner) {
    state.phase = 'gameOver';
    return ok(state);
  }
  resolveAfterEnact(state, enacted, rng);
  return ok(state);
}

function enactCard(state: GameState, card: LawCard, byChaos: boolean): void {
  if (card.type === 'democratic') {
    state.democraticEnacted.push(card);
  } else {
    state.authoritarianEnacted.push(card);
  }
  state.vetoUnlocked = state.authoritarianEnacted.length >= VETO_UNLOCK;
  const prefix = byChaos ? '[Kaos] ' : '';
  log(
    state,
    'legislation',
    `${prefix}Lagen "${card.title}" antogs (${card.type === 'democratic' ? 'demokratisk' : 'antidemokratisk'}).`,
  );
  checkBoardWin(state);
}

/** Efter att en lag antagits: maktbefogenhet eller rundslut. */
function resolveAfterEnact(state: GameState, enacted: LawCard, rng: Rng): void {
  if (state.winner) {
    state.phase = 'gameOver';
    return;
  }
  // Maktbefogenhet utloses bara av antidemokratiska lagar.
  if (enacted.type !== 'authoritarian') {
    state.phase = 'roundEnd';
    return;
  }
  const power = getPowerForPosition(
    state.players.length,
    state.authoritarianEnacted.length,
  );
  if (!power) {
    state.phase = 'roundEnd';
    return;
  }
  state.pendingPower = power;
  state.phase = 'powerAction';
  if (power === 'peek') {
    ensureDeck(state, 3, rng);
    state.peekedCards = state.deck.slice(0, 3);
    log(state, 'power', `${president(state).name} far i hemlighet se de tre kommande forslagen.`);
  } else {
    const label =
      power === 'investigate'
        ? 'utreda en ledamots partitillhorighet'
        : power === 'specialElection'
          ? 'utlysa ett extraval'
          : 'avsatta en ledamot ur riksdagen';
    log(state, 'power', `${president(state).name} far en maktbefogenhet: ${label}.`);
  }
}

// --- veto --------------------------------------------------------------------

function handleProposeVeto(
  state: GameState,
  action: Extract<Action, { type: 'PROPOSE_VETO' }>,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'legislationTalman')
    return fail('Veto kan bara foreslas i lagstiftningsfasen.');
  if (!state.vetoUnlocked) return fail('Veto ar inte upplast an.');
  if (state.vetoProposed) return fail('Veto har redan foreslagits.');
  if (action.playerId !== state.nominatedTalmanId)
    return fail('Bara talmannen far foresla veto.');

  state.vetoProposed = true;
  state.phase = 'vetoResponse';
  log(state, 'legislation', `${playerById(state, action.playerId)!.name} foreslar veto mot bada forslagen.`);
  return ok(state);
}

function handleVetoResponse(
  state: GameState,
  action: Extract<Action, { type: 'VETO_RESPONSE' }>,
  rng: Rng,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'vetoResponse') return fail('Inget veto att besvara.');
  if (action.playerId !== president(state).id)
    return fail('Bara statsministern far besvara vetot.');

  if (action.agree) {
    state.discard.push(...state.talmanCards);
    state.talmanCards = [];
    log(state, 'legislation', 'Statsministern godkanner vetot. Bada forslagen slangs.');
    state.electionTracker += 1;
    if (state.electionTracker >= ELECTION_TRACKER_MAX) {
      triggerChaos(state, rng);
    }
    state.phase = 'roundEnd';
  } else {
    log(state, 'legislation', 'Statsministern avvisar vetot. Talmannen maste anta ett forslag.');
    state.phase = 'legislationTalman';
  }
  return ok(state);
}

// --- maktbefogenheter --------------------------------------------------------

function handlePowerTarget(
  state: GameState,
  action: Extract<Action, { type: 'POWER_TARGET' }>,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'powerAction' || !state.pendingPower)
    return fail('Ingen maktbefogenhet att anvanda.');
  if (action.playerId !== president(state).id)
    return fail('Bara statsministern far anvanda maktbefogenheten.');
  const target = playerById(state, action.targetId);
  if (!target || !target.alive) return fail('Ogiltigt mal.');
  if (target.id === president(state).id) return fail('Du kan inte valja dig sjalv.');

  const power = state.pendingPower;
  if (power === 'investigate') {
    if (state.alreadyInvestigated.includes(target.id))
      return fail('Den ledamoten har redan utretts.');
    const bloc = getParty(target.partyId).bloc;
    state.investigationResults[target.id] = bloc;
    state.alreadyInvestigated.push(target.id);
    log(
      state,
      'power',
      `${president(state).name} utreder ${target.name} och far veta partiblocket.`,
    );
    state.pendingPower = null;
    state.phase = 'roundEnd';
  } else if (power === 'specialElection') {
    state.specialElectionFrom = state.presidentIndex;
    state.nextPresidentOverrideId = target.id;
    log(state, 'power', `${president(state).name} utlyser extraval. ${target.name} blir nasta statsminister.`);
    state.pendingPower = null;
    state.phase = 'roundEnd';
  } else if (power === 'execute') {
    target.alive = false;
    delete state.votes[target.id];
    log(state, 'power', `${president(state).name} avsatter ${target.name} ur riksdagen.`);
    if (target.role === 'dictator') {
      setWinner(
        state,
        'democrats',
        `${target.name} var den hemliga diktatorn och har avsatts. Demokratin raddas!`,
      );
    }
    state.pendingPower = null;
    state.phase = state.winner ? 'gameOver' : 'roundEnd';
  }
  return ok(state);
}

function handlePeekDone(
  state: GameState,
  action: Extract<Action, { type: 'POWER_PEEK_DONE' }>,
  fail: (e: string) => ActionResult,
): ActionResult {
  if (state.phase !== 'powerAction' || state.pendingPower !== 'peek')
    return fail('Ingen granskning att avsluta.');
  if (action.playerId !== president(state).id)
    return fail('Bara statsministern far avsluta granskningen.');
  state.peekedCards = [];
  state.pendingPower = null;
  state.phase = 'roundEnd';
  return ok(state);
}

// ---------------------------------------------------------------------------
// Klientvy: filtrerar bort hemligheter per mottagare
// ---------------------------------------------------------------------------

export function toClientView(state: GameState, viewerId: string): ClientGameView {
  const viewer = playerById(state, viewerId);
  const gameOver = state.phase === 'gameOver';

  // Lagkamrater synliga for antidemokrater (och alla nar spelet ar slut).
  let knownAllies: { id: string; role: Role }[] = [];
  if (viewer && (gameOver || teamOf(viewer.role) === 'antidemocrats')) {
    const seeAll =
      gameOver ||
      viewer.role === 'dictator' ||
      collaboratorsKnowDictator(state.players.length);
    knownAllies = state.players
      .filter((p) => p.id !== viewerId && teamOf(p.role) === 'antidemocrats')
      .filter((p) => seeAll || p.role !== 'dictator')
      .map((p) => ({ id: p.id, role: p.role }));
  }

  const isPresident = president(state).id === viewerId;
  const isTalman = state.nominatedTalmanId === viewerId;

  const revealVotes =
    gameOver || (state.phase !== 'voting' && !state.settings.hiddenVotes);
  const publicVotes: ClientGameView['votes'] = {};
  for (const id of Object.keys(state.votes)) {
    const v = state.votes[id];
    if (v === null || v === undefined) publicVotes[id] = 'none';
    else if (revealVotes) publicVotes[id] = v ? 'ja' : 'nej';
    else publicVotes[id] = 'hidden';
  }

  let voteCounts: ClientGameView['voteCounts'] = null;
  if (state.phase !== 'voting' || gameOver) {
    const vals = Object.values(state.votes);
    if (vals.length > 0 && vals.some((v) => v !== null)) {
      voteCounts = {
        ja: vals.filter((v) => v === true).length,
        nej: vals.filter((v) => v === false).length,
        total: vals.length,
      };
    }
  }

  return {
    phase: state.phase,
    round: state.round,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      partyId: p.partyId,
      isBot: p.isBot,
      connected: p.connected,
      alive: p.alive,
      isHost: p.isHost,
      ready: p.ready,
    })),
    settings: state.settings,
    presidentId: president(state).id,
    nominatedTalmanId: state.nominatedTalmanId,
    lastGovernment: state.lastGovernment,
    electionTracker: state.electionTracker,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    democraticEnacted: state.democraticEnacted,
    authoritarianEnacted: state.authoritarianEnacted,
    democraticTarget: DEMOCRATIC_TARGET,
    authoritarianTarget: AUTHORITARIAN_TARGET,
    votes: publicVotes,
    voteCounts,
    vetoUnlocked: state.vetoUnlocked,
    vetoProposed: state.vetoProposed,
    pendingPower: state.pendingPower,
    winner: state.winner,
    winReason: state.winReason,
    finalRoles: gameOver
      ? Object.fromEntries(state.players.map((p) => [p.id, p.role]))
      : null,
    log: state.log,
    you: {
      id: viewerId,
      role: viewer ? viewer.role : null,
      knownAllies,
      presidentCards: isPresident ? state.presidentCards : [],
      talmanCards: isTalman ? state.talmanCards : [],
      peekedCards: isPresident ? state.peekedCards : [],
      investigationResults: isPresident ? state.investigationResults : {},
    },
  };
}

// ---------------------------------------------------------------------------
// Vems tur ar det? (anvands av server och bottar)
// ---------------------------------------------------------------------------

/** Returnerar id pa spelare som forvantas agera, eller null. */
export function pendingActors(state: GameState): string[] {
  switch (state.phase) {
    case 'roleReveal':
    case 'roundEnd':
    case 'gameOver':
      return [];
    case 'nomination':
      return [president(state).id];
    case 'voting':
      return alivePlayers(state)
        .filter((p) => state.votes[p.id] === null || state.votes[p.id] === undefined)
        .map((p) => p.id);
    case 'legislationPresident':
      return [president(state).id];
    case 'legislationTalman':
      return state.nominatedTalmanId ? [state.nominatedTalmanId] : [];
    case 'vetoResponse':
      return [president(state).id];
    case 'powerAction':
      return [president(state).id];
    default:
      return [];
  }
}
