// Regler och konstanter for Valrorelsen 2026.

export const TOTAL_WEEKS = 8;
/** Efter denna veckas resolution halls det interna krismotet. */
export const INTERNAL_WEEK = 4;

export const MIN_TEAMS = 3;
export const MAX_TEAMS = 12;
export const TEAM_MIN_SIZE = 3;
export const TEAM_MAX_SIZE = 5;

/** Kampanjkassa ett lag far i inkomst varje vecka. */
export const WEEKLY_KASSA = 16;
/** Startkassa. */
export const START_KASSA = 16;
/** Extra kassa nasta vecka nar insamlaren valjer fundraise. */
export const FUNDRAISE_BONUS = 14;
/** Stodpoang en annonskampanj ger i en hel region. */
export const ANNONS_PER_VALKRETS = 2.4;
/** Andel av veckans kampanjeffekt som forsvinner vid sabotage. */
export const SABOTAGE_FACTOR = 0.5;
/** Multiplikator nar laget driver veckans heta fraga. */
export const HOT_ISSUE_BONUS = 1.35;
/** Strategens fokusbonus. */
export const STRATEG_BONUS = 1.5;
/** Hur mycket en attack-strateg dampar maltavlans vecka. */
export const ATTACK_DAMPEN = 0.7;
/** Slutspurt: sista tva veckorna far lagen extra kassa. */
export const SPRINT_WEEKS = 2;
export const SPRINT_KASSA_BONUS = 10;

export const THRESHOLD_PERCENT = 4;
export const MAJORITY = 175;

export const MORALE_MIN = 0.6;
export const MORALE_MAX = 1.3;
export const MORALE_START = 1.0;
export const MORALE_EXPOSE = 0.18;
export const MORALE_MISFIRE = 0.12;

export const MOMENTUM_MIN = -3;
export const MOMENTUM_MAX = 3;
/** Momentumets effekt per steg (multiplikator). */
export const MOMENTUM_STEP = 0.06;

export const REDGRON = ['s', 'v', 'mp', 'c', 'fi', 'djur'];
export const TIDO = ['m', 'sd', 'kd', 'l', 'pirat', 'nyans'];

export function blocOf(partyId: string): 'redgron' | 'tido' {
  return REDGRON.includes(partyId) ? 'redgron' : 'tido';
}
