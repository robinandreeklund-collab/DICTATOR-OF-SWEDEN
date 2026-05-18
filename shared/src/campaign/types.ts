// Typer for spellaget "Valrorelsen 2026" - kampanjduellen lag mot lag.

export type CampaignPhase =
  | 'roleReveal'
  | 'news'
  | 'campaign'
  | 'resolution'
  | 'internal'
  | 'electionNight'
  | 'gameOver';

export type MoleStatus = 'hidden' | 'exposed';

export interface CampaignPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  teamId: string;
  /** Sant for lagledaren som last lagets kampanjdrag. */
  isLeader: boolean;
}

export interface CampaignTeam {
  id: string;
  partyId: string;
  leaderId: string;
  memberIds: string[];
  /** Hemlig - filtreras bort i klientvyn for utomstaende. */
  moleId: string;
  moleStatus: MoleStatus;
  /** Lagmoral 0.6-1.2, paverkar kampanjeffekt. */
  morale: number;
}

export interface ValkretsState {
  id: string;
  /** Valjarstod per parti (rapoang, ratio avgor mandat). */
  support: Record<string, number>;
}

/** Ett lags kampanjbeslut for en vecka. */
export interface WeeklyPlan {
  teamId: string;
  /** Kampanjkassa fordelad per valkrets-id. */
  spend: Record<string, number>;
  /** Valkrets dar partiledaren gor besok. */
  leaderVisit: string | null;
  /** Sakfraga laget driver denna vecka. */
  issue: string;
  submitted: boolean;
}

/** Mullvadens hemliga veckobeslut. */
export interface MoleMove {
  teamId: string;
  sabotage: boolean;
  submitted: boolean;
}

export interface WeeklyOutcome {
  week: number;
  /** Stodforandring per parti nationellt denna vecka. */
  swing: Record<string, number>;
  /** Debattens parter och vinnare. */
  debate: { teamA: string; teamB: string; winnerTeamId: string; issue: string } | null;
  /** Lag vars mullvad saboterade (avslojas ej vem). */
  sabotagedTeamIds: string[];
  headline: string;
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
  /** Lag-id -> vann laget (partiet i regering). */
  teamWon: Record<string, boolean>;
  /** Lag-id -> vann lagets mullvad. */
  moleWon: Record<string, boolean>;
}

export interface CampaignEventCard {
  id: string;
  title: string;
  body: string;
  /** Sakfraga som blir "het" denna vecka. */
  hotIssue: string;
  /** Valfri regioneffekt: stodjuste per parti i en regiontyp. */
  regionShift?: { region: string; party: string; amount: number };
  source: string;
}

export interface CampaignLogEntry {
  id: number;
  week: number;
  kind: 'system' | 'news' | 'campaign' | 'debate' | 'mole' | 'result';
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

  plans: Record<string, WeeklyPlan>;
  moleMoves: Record<string, MoleMove>;

  lastOutcome: WeeklyOutcome | null;

  /** internal-fasen: lag-id -> (rostare-id -> anklagad-id). */
  internalVotes: Record<string, Record<string, string>>;
  internalDone: boolean;

  result: ElectionResult | null;

  log: CampaignLogEntry[];
  nextLogId: number;
}

// --- Klientvy (hemligheter filtrerade) --------------------------------------

export interface CampaignTeamView {
  id: string;
  partyId: string;
  leaderId: string;
  memberIds: string[];
  moleStatus: MoleStatus;
  morale: number;
  /** Mullvadens id - endast nar avslojad eller spelet ar slut. */
  moleId: string | null;
  planSubmitted: boolean;
  moleSubmitted: boolean;
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
  lastOutcome: WeeklyOutcome | null;
  result: ElectionResult | null;
  log: CampaignLogEntry[];
  you: {
    id: string;
    teamId: string;
    isMole: boolean;
    isLeader: boolean;
    teamPlan: WeeklyPlan | null;
    moleMove: MoleMove | null;
    internalVoteCast: string | null;
  };
  finalMoles: Record<string, string> | null;
}
