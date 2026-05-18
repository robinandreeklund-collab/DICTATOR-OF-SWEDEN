import { describe, it, expect } from 'vitest';
import {
  applyAction,
  botAction,
  createGame,
  makeRng,
  pendingActors,
  teamOf,
  toClientView,
  type GameState,
  type NewGamePlayer,
} from './index.js';
import { DEFAULT_SETTINGS } from './types.js';
import { getRoleCounts } from './rules.js';
import { scoreValkompass, VALKOMPASS_QUESTIONS, type AnswerKey } from './valkompass.js';
import { ALL_LAW_CARDS, DEMOCRATIC_CARDS, AUTHORITARIAN_CARDS } from './lawCards.js';
import { PARTIES } from './parties.js';

function makePlayers(n: number): NewGamePlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Bot ${i}`,
    partyId: PARTIES[i % PARTIES.length].id,
    isBot: true,
    isHost: i === 0,
  }));
}

/** Driver: kor ett helt spel med bottar tills gameOver. */
function runToEnd(playerCount: number, seed: number): GameState {
  let state = createGame(makePlayers(playerCount), DEFAULT_SETTINGS, seed);
  const rng = makeRng(seed * 7 + 13);

  for (let i = 0; i < 10000; i++) {
    if (state.phase === 'gameOver') return state;
    if (state.phase === 'roleReveal' || state.phase === 'roundEnd') {
      const res = applyAction(state, { type: 'ADVANCE' }, rng);
      expect(res.ok).toBe(true);
      state = res.state;
      continue;
    }
    const actors = pendingActors(state);
    expect(actors.length).toBeGreaterThan(0);
    let acted = false;
    for (const actorId of actors) {
      const act = botAction(state, actorId, rng);
      if (act) {
        const res = applyAction(state, act, rng);
        if (!res.ok) {
          throw new Error(`Otillaten bot-handling i ${state.phase}: ${res.error}`);
        }
        state = res.state;
        acted = true;
        break;
      }
    }
    if (!acted) throw new Error(`Ingen bot kunde agera i fasen ${state.phase}`);
  }
  throw new Error('Spelet avslutades aldrig');
}

describe('kortlek', () => {
  it('har 6 demokratiska och 11 antidemokratiska kort', () => {
    expect(DEMOCRATIC_CARDS).toHaveLength(6);
    expect(AUTHORITARIAN_CARDS).toHaveLength(11);
    expect(ALL_LAW_CARDS).toHaveLength(17);
  });
  it('har unika kort-id:n', () => {
    const ids = new Set(ALL_LAW_CARDS.map((c) => c.id));
    expect(ids.size).toBe(17);
  });
});

describe('partier', () => {
  it('innehaller alla atta riksdagspartier', () => {
    expect(PARTIES).toHaveLength(8);
    expect(new Set(PARTIES.map((p) => p.id)).size).toBe(8);
  });
});

describe('rollfordelning', () => {
  for (const n of [5, 6, 7, 8]) {
    it(`stammer for ${n} spelare`, () => {
      const counts = getRoleCounts(n);
      expect(counts.democrats + counts.collaborators + counts.dictators).toBe(n);
      expect(counts.dictators).toBe(1);
    });
  }

  it('delar ut ratt antal roller vid spelstart', () => {
    for (const n of [5, 6, 7, 8]) {
      const state = createGame(makePlayers(n), DEFAULT_SETTINGS, 42);
      const counts = getRoleCounts(n);
      const dem = state.players.filter((p) => p.role === 'democrat').length;
      const col = state.players.filter((p) => p.role === 'collaborator').length;
      const dic = state.players.filter((p) => p.role === 'dictator').length;
      expect(dem).toBe(counts.democrats);
      expect(col).toBe(counts.collaborators);
      expect(dic).toBe(counts.dictators);
    }
  });
});

describe('valkompass', () => {
  it('ger ett resultat per parti', () => {
    const answers: Record<string, AnswerKey> = {};
    for (const q of VALKOMPASS_QUESTIONS) answers[q.id] = 'helt';
    const result = scoreValkompass(answers);
    expect(result).toHaveLength(8);
    expect(result[0].percent).toBeGreaterThanOrEqual(result[7].percent);
  });

  it('hogerprofil matchar ett tidoparti', () => {
    const answers: Record<string, AnswerKey> = {};
    for (const q of VALKOMPASS_QUESTIONS) {
      // Stark hogerprofil: hall med om brott/migration/karnkraft, emot klimat/skatt.
      const right = ['q_brott', 'q_migration', 'q_karnkraft', 'q_overvakning', 'q_medborgarskap'];
      answers[q.id] = right.includes(q.id) ? 'helt' : 'neutral';
    }
    const top = scoreValkompass(answers)[0];
    expect(['m', 'sd', 'kd', 'l']).toContain(top.partyId);
  });

  it('ar deterministisk', () => {
    const answers: Record<string, AnswerKey> = {};
    for (const q of VALKOMPASS_QUESTIONS) answers[q.id] = 'delvis';
    expect(scoreValkompass(answers)).toEqual(scoreValkompass(answers));
  });
});

describe('spelmotor - fullstandiga partier', () => {
  for (const n of [5, 6, 7, 8]) {
    it(`avslutar alltid spel med ${n} spelare (30 seeds)`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const final = runToEnd(n, seed);
        expect(final.phase).toBe('gameOver');
        expect(['democrats', 'antidemocrats']).toContain(final.winner);
        expect(final.democraticEnacted.length).toBeLessThanOrEqual(5);
        expect(final.authoritarianEnacted.length).toBeLessThanOrEqual(6);
      }
    });
  }

  it('bada lagen kan vinna over manga seeds', () => {
    const winners = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      winners.add(runToEnd(7, seed).winner!);
    }
    expect(winners.has('democrats')).toBe(true);
    expect(winners.has('antidemocrats')).toBe(true);
  });
});

describe('klientvy doljer hemligheter', () => {
  it('demokrat ser inte andras roller', () => {
    const state = createGame(makePlayers(7), DEFAULT_SETTINGS, 5);
    const democrat = state.players.find((p) => p.role === 'democrat')!;
    const view = toClientView(state, democrat.id);
    expect(view.you.role).toBe('democrat');
    expect(view.you.knownAllies).toHaveLength(0);
    // Ingen spelare i listan har ett rollfalt.
    for (const p of view.players) {
      expect('role' in p).toBe(false);
    }
  });

  it('diktatorn ser sina medlopare', () => {
    const state = createGame(makePlayers(7), DEFAULT_SETTINGS, 5);
    const dictator = state.players.find((p) => p.role === 'dictator')!;
    const view = toClientView(state, dictator.id);
    const collaborators = state.players.filter((p) => p.role === 'collaborator');
    expect(view.you.knownAllies.length).toBe(collaborators.length);
  });

  it('medlopare i stort spel kanner inte diktatorn', () => {
    const state = createGame(makePlayers(8), DEFAULT_SETTINGS, 9);
    const collaborator = state.players.find((p) => p.role === 'collaborator')!;
    const view = toClientView(state, collaborator.id);
    expect(view.you.knownAllies.some((a) => a.role === 'dictator')).toBe(false);
  });

  it('medlopare i litet spel kanner diktatorn', () => {
    const state = createGame(makePlayers(5), DEFAULT_SETTINGS, 9);
    const collaborator = state.players.find((p) => p.role === 'collaborator')!;
    const view = toClientView(state, collaborator.id);
    expect(view.you.knownAllies.some((a) => a.role === 'dictator')).toBe(true);
  });
});

describe('spelregler - specifika fall', () => {
  it('avvisar nominering fran fel spelare', () => {
    let state = createGame(makePlayers(5), DEFAULT_SETTINGS, 3);
    state = applyAction(state, { type: 'ADVANCE' }).state;
    expect(state.phase).toBe('nomination');
    const notPresident = state.players.find(
      (p, i) => i !== state.presidentIndex,
    )!;
    const res = applyAction(state, {
      type: 'NOMINATE',
      playerId: notPresident.id,
      talmanId: state.players[(state.presidentIndex + 1) % 5].id,
    });
    expect(res.ok).toBe(false);
  });

  it('tre fallna regeringar utloser kaos', () => {
    let state = createGame(makePlayers(5), DEFAULT_SETTINGS, 3);
    state = applyAction(state, { type: 'ADVANCE' }).state;
    for (let round = 0; round < 3; round++) {
      const pres = state.players[state.presidentIndex];
      const talman = state.players.find(
        (p) => p.id !== pres.id && p.alive,
      )!;
      state = applyAction(state, {
        type: 'NOMINATE',
        playerId: pres.id,
        talmanId: talman.id,
      }).state;
      for (const p of state.players) {
        if (state.votes[p.id] === null) {
          state = applyAction(state, { type: 'VOTE', playerId: p.id, vote: false }).state;
        }
      }
      if (state.phase === 'roundEnd') {
        state = applyAction(state, { type: 'ADVANCE' }).state;
      }
    }
    const enacted =
      state.democraticEnacted.length + state.authoritarianEnacted.length;
    expect(enacted).toBeGreaterThanOrEqual(1);
  });

  it('teamOf mappar roller korrekt', () => {
    expect(teamOf('democrat')).toBe('democrats');
    expect(teamOf('collaborator')).toBe('antidemocrats');
    expect(teamOf('dictator')).toBe('antidemocrats');
  });
});
