import { describe, it, expect } from 'vitest';
import { makeRng } from '../engine.js';
import {
  applyCampaignAction,
  computeElectionResult,
  createCampaign,
  distributeMandate,
  pendingCampaignActors,
  toCampaignView,
  type CampaignSetup,
  type CampaignState,
} from './engine.js';
import { botCampaignAction } from './bots.js';
import { VALKRETSAR, TOTAL_MANDATE } from './valkretsar.js';
import { CAMPAIGN_EVENTS } from './events.js';

const PARTY_POOL = ['s', 'm', 'sd', 'v'];

function buildSetup(numTeams: number, perTeam: number): CampaignSetup {
  const players: CampaignSetup['players'] = [];
  const teams: CampaignSetup['teams'] = [];
  let idx = 0;
  for (let t = 0; t < numTeams; t++) {
    const memberIds: string[] = [];
    for (let m = 0; m < perTeam; m++) {
      const id = `p${idx}`;
      players.push({ id, name: `Bot ${idx}`, isBot: true, isHost: idx === 0 });
      memberIds.push(id);
      idx++;
    }
    teams.push({ id: `team${t}`, partyId: PARTY_POOL[t], memberIds });
  }
  return { players, teams };
}

function runCampaign(numTeams: number, perTeam: number, seed: number): CampaignState {
  let state = createCampaign(buildSetup(numTeams, perTeam), seed);
  const rng = makeRng(seed * 3 + 7);
  for (let i = 0; i < 5000; i++) {
    if (state.phase === 'gameOver') return state;
    if (['roleReveal', 'news', 'resolution', 'electionNight'].includes(state.phase)) {
      state = applyCampaignAction(state, { type: 'ADVANCE' }, rng).state;
      continue;
    }
    const actors = pendingCampaignActors(state);
    expect(actors.length).toBeGreaterThan(0);
    let acted = false;
    for (const actorId of actors) {
      const action = botCampaignAction(state, actorId, rng);
      if (action) {
        const res = applyCampaignAction(state, action, rng);
        if (!res.ok) throw new Error(`Otillaten: ${res.error} i ${state.phase}`);
        state = res.state;
        acted = true;
        break;
      }
    }
    if (!acted) throw new Error(`Ingen bot kunde agera i ${state.phase}`);
  }
  throw new Error('Kampanjen avslutades aldrig');
}

describe('valkretsar', () => {
  it('har 29 valkretsar', () => {
    expect(VALKRETSAR).toHaveLength(29);
  });
  it('mandaten summerar till 349', () => {
    expect(TOTAL_MANDATE).toBe(349);
  });
  it('alla valkretsar har unika id:n', () => {
    expect(new Set(VALKRETSAR.map((v) => v.id)).size).toBe(29);
  });
});

describe('mandatfordelning', () => {
  it('fordelar exakt antal mandat', () => {
    const dist = distributeMandate({ a: 50, b: 30, c: 20 }, 349);
    expect(Object.values(dist).reduce((x, y) => x + y, 0)).toBe(349);
  });
  it('ger noll mandat utan stod', () => {
    const dist = distributeMandate({ a: 0, b: 0 }, 10);
    expect(dist.a + dist.b).toBe(0);
  });
});

describe('handelsekort', () => {
  it('finns minst 6 unika handelser', () => {
    expect(CAMPAIGN_EVENTS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(CAMPAIGN_EVENTS.map((e) => e.id)).size).toBe(CAMPAIGN_EVENTS.length);
  });
});

describe('kampanjmotorn - fullstandiga val', () => {
  for (const teams of [3, 4]) {
    it(`avslutar alltid kampanj med ${teams} lag (25 seeds)`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const final = runCampaign(teams, 3, seed);
        expect(final.phase).toBe('gameOver');
        expect(final.result).not.toBeNull();
        const total = final.result!.parties.reduce((s, p) => s + p.mandates, 0);
        expect(total).toBe(349);
        expect(final.result!.redgronMandate + final.result!.tidoMandate).toBe(349);
      }
    });
  }

  it('bade lag och mullvadar kan vinna', () => {
    let teamWins = 0;
    let moleWins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const final = runCampaign(3, 3, seed);
      const r = final.result!;
      for (const team of final.teams) {
        if (r.teamWon[team.id]) teamWins++;
        if (r.moleWon[team.id]) moleWins++;
      }
    }
    expect(teamWins).toBeGreaterThan(0);
    expect(moleWins).toBeGreaterThan(0);
  });

  it('passerar det interna krismotet', () => {
    const final = runCampaign(3, 4, 5);
    expect(final.internalDone).toBe(true);
  });
});

describe('klientvy doljer mullvadar', () => {
  it('utomstaende ser inte ett lags mullvad', () => {
    const state = createCampaign(buildSetup(3, 3), 11);
    const team = state.teams[0];
    const outsider = state.players.find((p) => p.teamId !== team.id)!;
    const view = toCampaignView(state, outsider.id);
    const teamView = view.teams.find((t) => t.id === team.id)!;
    expect(teamView.moleId).toBeNull();
  });

  it('mullvaden vet om sin egen roll', () => {
    const state = createCampaign(buildSetup(3, 3), 11);
    const team = state.teams[0];
    const view = toCampaignView(state, team.moleId);
    expect(view.you.isMole).toBe(true);
  });

  it('avslojar alla mullvadar nar spelet ar slut', () => {
    const final = runCampaign(3, 3, 3);
    const view = toCampaignView(final, final.players[0].id);
    expect(view.finalMoles).not.toBeNull();
    expect(Object.keys(view.finalMoles!)).toHaveLength(3);
  });

  it('liveprognosen ger 349 mandat', () => {
    const state = createCampaign(buildSetup(4, 3), 7);
    const proj = computeElectionResult(state);
    expect(proj.parties.reduce((s, p) => s + p.mandates, 0)).toBe(349);
  });
});
