import type { GameState, Player } from './types.js';
import type { Action, Rng } from './engine.js';
import {
  alivePlayers,
  eligibleTalmanIds,
  playerById,
  president,
  teamOf,
} from './engine.js';
import { collaboratorsKnowDictator } from './rules.js';

// Enkel heuristisk AI for botspelare. Bottarna anvander bara den kunskap
// de legitimt har (medlopare i stora spel kanner inte diktatorn).

function knownAllyIds(state: GameState, bot: Player): Set<string> {
  if (teamOf(bot.role) !== 'antidemocrats') return new Set();
  const seeDictator =
    bot.role === 'dictator' || collaboratorsKnowDictator(state.players.length);
  const ids = state.players
    .filter((p) => p.id !== bot.id && teamOf(p.role) === 'antidemocrats')
    .filter((p) => seeDictator || p.role !== 'dictator')
    .map((p) => p.id);
  return new Set(ids);
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Returnerar handlingen en bot ska utfora nu, eller null om botten inte
 * forvantas agera (t.ex. i roundEnd som servern avancerar automatiskt).
 */
export function botAction(state: GameState, botId: string, rng: Rng): Action | null {
  const bot = playerById(state, botId);
  if (!bot || !bot.alive || !bot.isBot) return null;
  const allies = knownAllyIds(state, bot);
  const isAnti = teamOf(bot.role) === 'antidemocrats';

  switch (state.phase) {
    case 'nomination': {
      if (president(state).id !== botId) return null;
      const eligible = eligibleTalmanIds(state);
      if (eligible.length === 0) return null;
      let choice: string;
      if (isAnti) {
        const allyChoices = eligible.filter((id) => allies.has(id));
        choice = allyChoices.length > 0 ? pick(allyChoices, rng) : pick(eligible, rng);
      } else {
        choice = pick(eligible, rng);
      }
      return { type: 'NOMINATE', playerId: botId, talmanId: choice };
    }

    case 'voting': {
      if (state.votes[botId] !== null && state.votes[botId] !== undefined) return null;
      const pres = president(state);
      const talman = state.nominatedTalmanId
        ? playerById(state, state.nominatedTalmanId)
        : undefined;
      const vote = decideVote(state, bot, pres, talman, allies, isAnti, rng);
      return { type: 'VOTE', playerId: botId, vote };
    }

    case 'legislationPresident': {
      if (president(state).id !== botId) return null;
      const cards = state.presidentCards;
      if (cards.length === 0) return null;
      // Anti slanger garna en demokratisk; demokrat slanger en antidemokratisk.
      const wantDiscard = isAnti ? 'democratic' : 'authoritarian';
      const target = cards.find((c) => c.type === wantDiscard) ?? cards[0];
      return { type: 'PRESIDENT_DISCARD', playerId: botId, cardId: target.id };
    }

    case 'legislationTalman': {
      if (state.nominatedTalmanId !== botId) return null;
      const cards = state.talmanCards;
      if (cards.length === 0) return null;
      // Demokratisk talman vetar tva antidemokratiska forslag om mojligt.
      if (
        state.vetoUnlocked &&
        !state.vetoProposed &&
        !isAnti &&
        cards.every((c) => c.type === 'authoritarian')
      ) {
        return { type: 'PROPOSE_VETO', playerId: botId };
      }
      const wantEnact = isAnti ? 'authoritarian' : 'democratic';
      const target = cards.find((c) => c.type === wantEnact) ?? cards[0];
      return { type: 'TALMAN_ENACT', playerId: botId, cardId: target.id };
    }

    case 'vetoResponse': {
      if (president(state).id !== botId) return null;
      // Demokrat-statsminister stodjer veto, antidemokrat avvisar.
      return { type: 'VETO_RESPONSE', playerId: botId, agree: !isAnti };
    }

    case 'powerAction': {
      if (president(state).id !== botId) return null;
      if (state.pendingPower === 'peek') {
        return { type: 'POWER_PEEK_DONE', playerId: botId };
      }
      const targets = alivePlayers(state).filter((p) => p.id !== botId);
      if (targets.length === 0) return null;

      if (state.pendingPower === 'investigate') {
        const fresh = targets.filter(
          (p) => !state.alreadyInvestigated.includes(p.id),
        );
        const pool = fresh.length > 0 ? fresh : targets;
        return { type: 'POWER_TARGET', playerId: botId, targetId: pick(pool, rng).id };
      }
      if (state.pendingPower === 'specialElection') {
        const pool = isAnti
          ? targets.filter((p) => allies.has(p.id))
          : targets;
        const chosen = pool.length > 0 ? pool : targets;
        return { type: 'POWER_TARGET', playerId: botId, targetId: pick(chosen, rng).id };
      }
      if (state.pendingPower === 'execute') {
        // Anti undviker sina kanda lagkamrater.
        const pool = isAnti
          ? targets.filter((p) => !allies.has(p.id))
          : targets;
        const chosen = pool.length > 0 ? pool : targets;
        return { type: 'POWER_TARGET', playerId: botId, targetId: pick(chosen, rng).id };
      }
      return null;
    }

    default:
      return null;
  }
}

function decideVote(
  state: GameState,
  _bot: Player,
  pres: Player,
  talman: Player | undefined,
  allies: Set<string>,
  isAnti: boolean,
  rng: Rng,
): boolean {
  const govHasAlly =
    allies.has(pres.id) ||
    (talman ? allies.has(talman.id) : false) ||
    (isAnti && talman?.role === 'dictator');
  const auth = state.authoritarianEnacted.length;

  if (isAnti) {
    if (govHasAlly) return true;
    if (auth < 3) return rng() < 0.7;
    return rng() < 0.45;
  }

  // Demokrat-bot.
  if (state.electionTracker >= 2) return rng() < 0.9; // undvik kaos
  let p = 0.72;
  if (auth >= 3) p -= 0.22;
  if (auth >= 4) p -= 0.15;
  // Misstanke mot regeringar som tidigare antagit antidemokratiska lagar.
  return rng() < p;
}
