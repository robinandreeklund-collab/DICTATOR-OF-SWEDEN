// Centrala typer for Dictator of Sweden. Delas av server och klient.

export type Bloc = 'redgron' | 'tido';

export interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  bloc: Bloc;
  leader: string;
  agenda: string;
  /** Profilfragor partiet "ager" i valrorelsen 2026. */
  ownsIssues: string[];
}

export type Role = 'democrat' | 'collaborator' | 'dictator';
export type Team = 'democrats' | 'antidemocrats';

export type LawType = 'democratic' | 'authoritarian';

export interface LawCard {
  id: string;
  type: LawType;
  title: string;
  /** Vilken fri- eller rattighet/fraga forslaget ror. */
  topic: string;
  description: string;
  /** Facit-text som visas efter spelet, med verklighetsforankring. */
  factCheck: string;
  source: string;
}

export type PowerType =
  | 'investigate'
  | 'specialElection'
  | 'peek'
  | 'execute';

export type GamePhase =
  | 'lobby'
  | 'roleReveal'
  | 'nomination'
  | 'voting'
  | 'legislationPresident'
  | 'legislationTalman'
  | 'vetoResponse'
  | 'powerAction'
  | 'roundEnd'
  | 'gameOver';

export interface PlayerPublic {
  id: string;
  name: string;
  partyId: string;
  isBot: boolean;
  connected: boolean;
  alive: boolean;
  isHost: boolean;
  /** Sant for spelare i lobbyn som svarat klart pa valkompassen. */
  ready: boolean;
}

export interface Player extends PlayerPublic {
  role: Role;
}

export interface GovernmentRef {
  presidentId: string;
  talmanId: string;
}

export interface LogEntry {
  id: number;
  round: number;
  kind:
    | 'system'
    | 'nomination'
    | 'vote'
    | 'legislation'
    | 'power'
    | 'win';
  text: string;
}

export interface GameSettings {
  /** Doljer enskilda spelares roster (visar bara summa). */
  hiddenVotes: boolean;
  /** Sekunder for diskussion innan nominering. 0 = ingen timer. */
  discussionSeconds: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  hiddenVotes: false,
  discussionSeconds: 0,
};

/** Fullstandigt spelstate (server-internt, innehaller hemligheter). */
export interface GameState {
  phase: GamePhase;
  round: number;
  players: Player[];
  settings: GameSettings;

  presidentIndex: number;
  /** Index att ateruppta normal rotation fran efter ett specialval. */
  specialElectionFrom: number | null;
  /** Spelar-id som ska bli nasta president via specialval. */
  nextPresidentOverrideId: string | null;
  nominatedTalmanId: string | null;
  lastGovernment: GovernmentRef | null;

  electionTracker: number;

  deck: LawCard[];
  discard: LawCard[];
  democraticEnacted: LawCard[];
  authoritarianEnacted: LawCard[];

  /** Endast synligt for presidenten. */
  presidentCards: LawCard[];
  /** Endast synligt for talmannen. */
  talmanCards: LawCard[];
  /** Resultat av peek-makten, synligt for presidenten. */
  peekedCards: LawCard[];

  votes: Record<string, boolean | null>;

  vetoUnlocked: boolean;
  vetoProposed: boolean;

  pendingPower: PowerType | null;
  /** Spelar-id -> partiblock, avslojat for utredande president. */
  investigationResults: Record<string, Bloc>;
  alreadyInvestigated: string[];

  winner: Team | null;
  winReason: string | null;

  log: LogEntry[];
  nextLogId: number;
}

/** Klientvy av spelet — hemligheter ar bortfiltrerade per mottagare. */
export interface ClientGameView {
  phase: GamePhase;
  round: number;
  players: PlayerPublic[];
  settings: GameSettings;

  presidentId: string | null;
  nominatedTalmanId: string | null;
  lastGovernment: GovernmentRef | null;
  electionTracker: number;

  deckCount: number;
  discardCount: number;
  democraticEnacted: LawCard[];
  authoritarianEnacted: LawCard[];
  democraticTarget: number;
  authoritarianTarget: number;

  /** Per spelare: 'ja'/'nej' nar avslojad, 'hidden' = rostat dolt, 'none' = ej rostat. */
  votes: Record<string, 'ja' | 'nej' | 'hidden' | 'none'>;
  voteCounts: { ja: number; nej: number; total: number } | null;

  vetoUnlocked: boolean;
  vetoProposed: boolean;
  pendingPower: PowerType | null;

  winner: Team | null;
  winReason: string | null;
  log: LogEntry[];

  /** Mottagarspecifik privat information. */
  you: {
    id: string;
    role: Role | null;
    /** Lagkamrater du kanner till (id + roll). */
    knownAllies: { id: string; role: Role }[];
    /** Kort presidenten har pa hand. */
    presidentCards: LawCard[];
    /** Kort talmannen har pa hand. */
    talmanCards: LawCard[];
    /** Resultat av peek-makten. */
    peekedCards: LawCard[];
    /** Utredningsresultat presidenten sett. */
    investigationResults: Record<string, Bloc>;
  };
}
