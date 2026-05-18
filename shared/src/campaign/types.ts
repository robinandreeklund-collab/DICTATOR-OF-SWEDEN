// Typer for spellaget "Valrorelsen 2026".
// Varje spelare har en roll med ett eget veckobeslut - ingen ar passiv.

import type { RegionType } from './valkretsar.js';

export type CampaignPhase =
  | 'roleReveal'
  | 'news'
  | 'planning'
  | 'resolution'
  | 'internal'
  | 'electionNight'
  | 'gameOver';

export type MoleStatus = 'hidden' | 'exposed';

/** De fem rollerna i ett partilag. Var och en har ett eget veckodrag. */
export type CampaignRole =
  | 'kampanjledare'
  | 'talesperson'
  | 'strateg'
  | 'analytiker'
  | 'insamlare';

export const ROLE_PRIORITY: CampaignRole[] = [
  'kampanjledare',
  'talesperson',
  'strateg',
  'analytiker',
  'insamlare',
];

export interface CampaignPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  teamId: string;
  role: CampaignRole;
}

export interface IntelEntry {
  week: number;
  text: string;
}

export interface CampaignTeam {
  id: string;
  partyId: string;
  memberIds: string[];
  /** Spelaren med rollen kampanjledare. */
  leaderId: string;
  /** Hemlig - filtreras bort i klientvyn for utomstaende. */
  moleId: string;
  moleStatus: MoleStatus;
  /** Lagmoral 0.6-1.3. */
  morale: number;
  /** Kampanjkassa kvar att spendera. */
  kassa: number;
  /** Momentum -3..+3, paverkar veckans genomslag. */
  momentum: number;
  /** Underrattelser laget samlat (syns bara for laget). */
  intel: IntelEntry[];
}

export interface ValkretsState {
  id: string;
  support: Record<string, number>;
}

// --- Rollhandlingar ---------------------------------------------------------

export type StrategFocus = 'bas' | 'marginal' | 'attack';
export type InsamlareChoice = 'fundraise' | 'annons' | 'skold';
export type CrisisResponse = 'erkann' | 'forneka' | 'skyll';

export type RoleAction =
  | { role: 'kampanjledare'; spend: Record<string, number> }
  | {
      role: 'talesperson';
      issue: string;
      debateTarget: string;
      crisisResponse?: CrisisResponse;
    }
  | { role: 'strateg'; focus: StrategFocus; attackTarget?: string }
  | { role: 'analytiker'; analyzeTarget: string }
  | { role: 'insamlare'; choice: InsamlareChoice; region?: RegionType };

export interface RoleSubmission {
  playerId: string;
  submitted: boolean;
  action: RoleAction;
  /** Mullvadens hemliga sabotage av sitt eget drag. */
  sabotage: boolean;
}

// --- handelser & resultat ---------------------------------------------------

export interface CampaignEventCard {
  id: string;
  title: string;
  body: string;
  hotIssue: string;
  /** Sant = handelsen ar en kris som drabbar ett lag. */
  crisis: boolean;
  regionShift?: { region: RegionType; party: string; amount: number };
  source: string;
}

export interface DebateResult {
  teamA: string;
  teamB: string;
  winnerTeamId: string;
  issue: string;
}

export interface WeeklyOutcome {
  week: number;
  headline: string;
  swing: Record<string, number>;
  debates: DebateResult[];
  /** Lag vars vecka saboterades (vem avslojas ej). */
  sabotagedTeamIds: string[];
  /** Korta nyhetsrader att rulla i en ticker. */
  ticker: string[];
}

export interface PartyResult {
  partyId: string;
  votePercent: number;
  mandates: number;
  passedThreshold: boolean;
}

export interface ElectionResult {
  parties: PartyResult[];
  redgronMandate: number;
  tidoMandate: number;
  governingBloc: 'redgron' | 'tido';
  teamWon: Record<string, boolean>;
  moleWon: Record<string, boolean>;
}

export interface CampaignLogEntry {
  id: number;
  week: number;
  kind: 'system' | 'news' | 'campaign' | 'debate' | 'mole' | 'result' | 'crisis';
  text: string;
}

/** Fullt kampanj-state (server-internt, med hemligheter). */
export interface CampaignState {
  mode: 'campaign';
  phase: CampaignPhase;
  week: number;
  totalWeeks: number;

  players: CampaignPlayer[];
  teams: CampaignTeam[];
  valkretsar: ValkretsState[];

  currentEvent: CampaignEventCard | null;
  hotIssue: string | null;
  /** Lag som drabbas av veckans kris, om nagon. */
  crisisTeamId: string | null;

  /** Spelar-id -> veckans rollhandling. */
  submissions: Record<string, RoleSubmission>;

  lastOutcome: WeeklyOutcome | null;

  internalVotes: Record<string, Record<string, string>>;
  internalDone: boolean;

  result: ElectionResult | null;

  log: CampaignLogEntry[];
  nextLogId: number;
}

// --- klientvy ---------------------------------------------------------------

export interface CampaignTeamView {
  id: string;
  partyId: string;
  leaderId: string;
  memberIds: string[];
  roles: Record<string, CampaignRole>;
  moleStatus: MoleStatus;
  moleId: string | null;
  morale: number;
  momentum: number;
  kassa: number;
  submittedCount: number;
}

export interface ValkretsView {
  id: string;
  support: Record<string, number>;
  leadingParty: string;
}

export interface NationalProjection {
  partyId: string;
  percent: number;
  mandates: number;
  passedThreshold: boolean;
}

export interface CampaignClientView {
  mode: 'campaign';
  phase: CampaignPhase;
  week: number;
  totalWeeks: number;
  players: CampaignPlayer[];
  teams: CampaignTeamView[];
  valkretsar: ValkretsView[];
  projection: NationalProjection[];
  redgronMandate: number;
  tidoMandate: number;
  currentEvent: CampaignEventCard | null;
  hotIssue: string | null;
  crisisTeamId: string | null;
  lastOutcome: WeeklyOutcome | null;
  result: ElectionResult | null;
  log: CampaignLogEntry[];
  you: {
    id: string;
    teamId: string;
    role: CampaignRole | null;
    isMole: boolean;
    submitted: boolean;
    mySubmission: RoleSubmission | null;
    teamIntel: IntelEntry[];
    internalVoteCast: string | null;
  };
  finalMoles: Record<string, string> | null;
}
