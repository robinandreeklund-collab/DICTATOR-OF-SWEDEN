import type { Rng } from '../engine.js';
import type { CampaignAction } from './engine.js';
import { pendingCampaignActors, teamOfPlayer } from './engine.js';
import { ISSUES } from './issues.js';
import { VALKRETSAR } from './valkretsar.js';
import type { RegionType } from './valkretsar.js';
import type { CampaignState, CampaignTeam, RoleAction } from './types.js';

// AI for botspelare i Valrorelsen 2026 - en heuristik per roll.

const REGIONS: RegionType[] = [
  'norr', 'mellan', 'storstad', 'storstadslan', 'smaland', 'syd',
];

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function botSpend(team: CampaignTeam, weak: boolean): Record<string, number> {
  const budget = Math.floor(team.kassa);
  if (budget <= 0) return {};
  const sorted = [...VALKRETSAR].sort((a, b) => b.mandate - a.mandate);
  const targets = weak ? sorted.slice(-5) : sorted.slice(0, 6);
  const chosen = targets.slice(0, 5);
  const spend: Record<string, number> = {};
  const per = Math.floor(budget / chosen.length);
  let used = 0;
  for (const vk of chosen) {
    spend[vk.id] = per;
    used += per;
  }
  if (used < budget && chosen[0]) spend[chosen[0].id] += budget - used;
  return spend;
}

function decideRoleAction(
  state: CampaignState,
  team: CampaignTeam,
  role: string,
  isMoleHidden: boolean,
  rng: Rng,
): RoleAction {
  const rivals = state.teams.filter((t) => t.id !== team.id);
  switch (role) {
    case 'kampanjledare':
      return { role: 'kampanjledare', spend: botSpend(team, isMoleHidden && rng() < 0.5) };
    case 'talesperson': {
      const owned = ISSUES.filter((i) => i.owners.includes(team.partyId)).map((i) => i.id);
      const issue =
        state.hotIssue && owned.includes(state.hotIssue)
          ? state.hotIssue
          : owned.length
            ? pick(owned, rng)
            : state.hotIssue ?? ISSUES[0].id;
      const target = rivals.length ? pick(rivals, rng).id : 'positiv';
      const action: RoleAction = { role: 'talesperson', issue, debateTarget: target };
      if (state.crisisTeamId === team.id) {
        action.crisisResponse = isMoleHidden ? 'forneka' : 'erkann';
      }
      return action;
    }
    case 'strateg': {
      const focus = pick(['bas', 'marginal', 'attack'] as const, rng);
      if (focus === 'attack' && rivals.length) {
        return { role: 'strateg', focus, attackTarget: pick(rivals, rng).id };
      }
      return { role: 'strateg', focus: focus === 'attack' ? 'bas' : focus };
    }
    case 'analytiker':
      return {
        role: 'analytiker',
        analyzeTarget: rivals.length ? pick(rivals, rng).id : team.id,
      };
    case 'insamlare': {
      const late = state.week > state.totalWeeks - 3;
      const choice = late
        ? pick(['annons', 'skold'] as const, rng)
        : rng() < 0.6
          ? 'fundraise'
          : 'annons';
      return { role: 'insamlare', choice, region: pick(REGIONS, rng) };
    }
    default:
      return { role: 'kampanjledare', spend: botSpend(team, false) };
  }
}

export function botCampaignAction(
  state: CampaignState,
  botId: string,
  rng: Rng,
): CampaignAction | null {
  if (!pendingCampaignActors(state).includes(botId)) return null;
  const team = teamOfPlayer(state, botId);
  const player = state.players.find((p) => p.id === botId);
  if (!team || !player) return null;

  if (state.phase === 'planning') {
    const isMole = team.moleId === botId && team.moleStatus === 'hidden';
    const action = decideRoleAction(state, team, player.role, isMole, rng);
    const sabotage = isMole && rng() < 0.25 + state.week * 0.06;
    return { type: 'SUBMIT_ROLE', playerId: botId, action, sabotage };
  }

  if (state.phase === 'internal') {
    const others = team.memberIds.filter((id) => id !== botId);
    if (others.length === 0) return null;
    return { type: 'INTERNAL_VOTE', playerId: botId, accusedId: pick(others, rng) };
  }

  return null;
}
