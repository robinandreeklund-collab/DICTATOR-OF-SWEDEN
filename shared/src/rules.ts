import type { PowerType } from './types.js';

// Spelregler harledda fran den balanstestade Secret Hitler-matematiken,
// anpassade till temat Dictator of Sweden.

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 8;

export const DEMOCRATIC_TARGET = 5;
export const AUTHORITARIAN_TARGET = 6;

/** Antal antidemokratiska lagar innan diktatorn kan vinna som talman. */
export const DICTATOR_TALMAN_WIN_THRESHOLD = 3;

/** Antal antidemokratiska lagar som laser upp veto. */
export const VETO_UNLOCK = 5;

/** Misslyckade regeringar i rad innan parlamentet kollapsar. */
export const ELECTION_TRACKER_MAX = 3;

export interface RoleCounts {
  democrats: number;
  collaborators: number;
  dictators: number;
}

/** Rollfordelning per spelarantal (5-8). */
export const ROLE_DISTRIBUTION: Record<number, RoleCounts> = {
  5: { democrats: 3, collaborators: 1, dictators: 1 },
  6: { democrats: 4, collaborators: 1, dictators: 1 },
  7: { democrats: 4, collaborators: 2, dictators: 1 },
  8: { democrats: 5, collaborators: 2, dictators: 1 },
};

export function getRoleCounts(playerCount: number): RoleCounts {
  const counts = ROLE_DISTRIBUTION[playerCount];
  if (!counts) {
    throw new Error(`Ostott spelarantal: ${playerCount} (tillatet 5-8)`);
  }
  return counts;
}

/**
 * Maktbefogenhet som utlöses nar den N:te antidemokratiska lagen antas.
 * Skiljer sig at mellan 5-6 och 7-8 spelare (som i Secret Hitler).
 */
export function getPowerForPosition(
  playerCount: number,
  authoritarianPosition: number,
): PowerType | null {
  const small = playerCount <= 6;
  if (small) {
    if (authoritarianPosition === 3) return 'peek';
    if (authoritarianPosition === 4) return 'execute';
    if (authoritarianPosition === 5) return 'execute';
    return null;
  }
  // 7-8 spelare
  if (authoritarianPosition === 2) return 'investigate';
  if (authoritarianPosition === 3) return 'specialElection';
  if (authoritarianPosition === 4) return 'execute';
  if (authoritarianPosition === 5) return 'execute';
  return null;
}

/**
 * Diktatorn kanner alltid sina medlopare. Medlopare kanner diktatorn och
 * varandra ENDAST i sma spel; i stora spel (7-8) ar medloparna ovetande
 * om vem diktatorn ar - det skapar asymmetrisk information.
 */
export function collaboratorsKnowDictator(playerCount: number): boolean {
  return playerCount <= 6;
}
