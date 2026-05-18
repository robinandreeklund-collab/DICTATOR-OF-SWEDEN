// Regler och konstanter for Valrorelsen 2026.

export const TOTAL_WEEKS = 6;
/** Efter denna veckas resolution halls det interna krismotet. */
export const INTERNAL_WEEK = 3;

export const MIN_TEAMS = 3;
export const MAX_TEAMS = 4;
export const TEAM_MIN_SIZE = 3;
export const TEAM_MAX_SIZE = 5;

/** Kampanjkassa ett lag far att fordela varje vecka. */
export const WEEKLY_KASSA = 18;
/** Stodpoang ett partiledarbesok ger (innan multiplikatorer). */
export const LEADER_VISIT_BONUS = 10;
/** Andel av veckans kampanjeffekt som forsvinner vid sabotage. */
export const SABOTAGE_FACTOR = 0.5;
/** Multiplikator nar laget driver veckans heta fraga. */
export const HOT_ISSUE_BONUS = 1.35;

/** Nationell sparr i procent. */
export const THRESHOLD_PERCENT = 4;
/** Mandat som kravs for egen majoritet. */
export const MAJORITY = 175;

export const MORALE_MIN = 0.6;
export const MORALE_MAX = 1.25;
export const MORALE_START = 1.0;
/** Moralandring nar ett lag avslojar sin mullvad korrekt. */
export const MORALE_EXPOSE = 0.15;
/** Moralstraff nar ett lag rostar ut en oskyldig. */
export const MORALE_MISFIRE = 0.12;

export const REDGRON = ['s', 'v', 'mp', 'c'];
export const TIDO = ['m', 'sd', 'kd', 'l'];

export function blocOf(partyId: string): 'redgron' | 'tido' {
  return REDGRON.includes(partyId) ? 'redgron' : 'tido';
}
