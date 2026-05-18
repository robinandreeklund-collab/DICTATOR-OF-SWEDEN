import type { Rng } from '../engine.js';
import type { CampaignAction } from './engine.js';
import { pendingCampaignActors, teamOfPlayer } from './engine.js';
import { ISSUES } from './issues.js';
import { VALKRETSAR } from './valkretsar.js';
import { WEEKLY_KASSA } from './rules.js';
import type { CampaignState, CampaignTeam } from './types.js';

// AI for botspelare i Valrorelsen 2026.

function decidePlan(
  state: CampaignState,
  team: CampaignTeam,
  isMoleLeader: boolean,
  rng: Rng,
): { spend: Record<string, number>; leaderVisit: string | null; issue: string } {
  const party = team.partyId;
  const owned = ISSUES.filter((i) => i.owners.includes(party)).map((i) => i.id);

  let issue: string;
  if (isMoleLeader) {
    const bad = ISSUES.filter(
      (i) => !i.owners.includes(party) && i.id !== state.hotIssue,
    );
    issue = (bad[Math.floor(rng() * bad.length)] ?? ISSUES[0]).id;
  } else if (state.hotIssue && owned.includes(state.hotIssue)) {
    issue = state.hotIssue;
  } else {
    issue = owned[Math.floor(rng() * owned.length)] ?? state.hotIssue ?? ISSUES[0].id;
  }

  const byMandate = [...VALKRETSAR].sort((a, b) => b.mandate - a.mandate);
  const targets = isMoleLeader ? byMandate.slice(-5) : byMandate.slice(0, 5);
  const splits = [3, 3, 2, 2, 2];
  const spend: Record<string, number> = {};
  let used = 0;
  targets.forEach((v, i) => {
    const amount = splits[i] ?? 2;
    spend[v.id] = amount;
    used += amount;
  });
  if (used < WEEKLY_KASSA && targets[0]) {
    spend[targets[0].id] += WEEKLY_KASSA - used;
  }
  const leaderVisit = isMoleLeader
    ? targets[targets.length - 1].id
    : targets[0].id;
  return { spend, leaderVisit, issue };
}

/** Returnerar handlingen en bot ska gora nu, eller null. */
export function botCampaignAction(
  state: CampaignState,
  botId: string,
  rng: Rng,
): CampaignAction | null {
  if (!pendingCampaignActors(state).includes(botId)) return null;
  const team = teamOfPlayer(state, botId);
  if (!team) return null;

  if (state.phase === 'campaign') {
    const isLeader = team.leaderId === botId;
    const isMole = team.moleId === botId;
    const planDone = !!state.plans[team.id]?.submitted;

    if (isLeader && !planDone) {
      const isMoleLeader = isMole && team.moleStatus === 'hidden';
      const plan = decidePlan(state, team, isMoleLeader, rng);
      return { type: 'SUBMIT_PLAN', playerId: botId, ...plan };
    }
    if (isMole && team.moleStatus === 'hidden' && !state.moleMoves[team.id]?.submitted) {
      const sabotage = rng() < 0.3 + state.week * 0.08;
      return { type: 'SUBMIT_MOLE', playerId: botId, sabotage };
    }
    return null;
  }

  if (state.phase === 'internal') {
    const others = team.memberIds.filter((id) => id !== botId);
    if (others.length === 0) return null;
    const accusedId = others[Math.floor(rng() * others.length)];
    return { type: 'INTERNAL_VOTE', playerId: botId, accusedId };
  }

  return null;
}
