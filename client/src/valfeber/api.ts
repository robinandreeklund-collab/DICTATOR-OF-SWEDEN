// Klientens API mot Valfeber-backenden.

export interface PartyStanding {
  partyId: string;
  name: string;
  shortName: string;
  color: string;
  percent: number;
  mandates: number;
  passedThreshold: boolean;
}

export interface LeaderRow {
  username: string;
  party_id: string | null;
  region_id: string | null;
  points: number;
  streak: number;
}

export type CrisisStep = 'statement' | 'press' | 'close';
export type Archetype = 'fornekande' | 'offensiv' | 'erkannande';

export interface CrisisChoice {
  id: string;
  archetype: Archetype;
  label: string;
  blurb: string;
}

export interface CrisisStepPack {
  prompt: string;
  choices: CrisisChoice[];
}

export interface CrisisScript {
  statement: CrisisStepPack;
  press: CrisisStepPack;
  close: CrisisStepPack;
}

export interface CrisisOutcome {
  score: number;
  points: number;
  support: number;
  text: string;
  picks: { step: CrisisStep; choice: CrisisChoice }[];
}

export interface AllianceDemand {
  id: string;
  topic: string;
  text: string;
}

export interface AllianceOffer {
  allyPartyId: string;
  demands: AllianceDemand[];
  compat: number;
}

export interface AllianceOutcome {
  deal: boolean;
  allyPartyId: string;
  accepted: boolean[];
  score: number;
  points: number;
  support: number;
  text: string;
}

export type Demographic = 'pensionarer' | 'arbetstagare' | 'unga' | 'barnfamiljer';

export interface RegionalOutcome {
  valkretsId: string;
  perDemo: Record<Demographic, number>;
  totalEffect: number;
  supportDelta: number;
}

export type Emotion = 'hopp' | 'oro' | 'humor';
export type Angle = 'loften' | 'attack' | 'personligt';
export type PostFormat = 'bildcitat' | 'video' | 'trad';

export interface ViralBreakdown {
  score: number;
  viral: boolean;
  breakdown: {
    bas: number;
    emotion: number;
    angle: number;
    format: number;
    frage: number;
    slump: number;
  };
  prefHint: { emotion: Emotion; angle: Angle; format: PostFormat };
}

export type DebateResponseType = 'fakta' | 'kansla' | 'motangrepp';

export interface DebateRoundView {
  id: string;
  issue: string;
  text: string;
  responses: { type: DebateResponseType; text: string }[];
}

export interface DebateView {
  opponentPartyId: string;
  rounds: DebateRoundView[];
}

export interface DebateOutcome {
  score: number; // 0..100
  swings: number[]; // per runda, -10..+15
  wins: number;
  bestResponseIndex: number[];
  opponentPartyId: string;
}

export interface ValfeberState {
  world: {
    day: number;
    totalDays: number;
    electionOver: boolean;
    msToNextDay: number;
    endTs: number;
  };
  event: { title: string; body: string; hotIssue: string; crisis: boolean; source: string };
  standings: PartyStanding[];
  mapLeaders: Record<string, string>;
  partyCounts: Record<string, number>;
  regionStandings: { partyId: string; percent: number }[] | null;
  you: {
    id: number;
    username: string;
    partyId: string | null;
    regionId: string | null;
    points: number;
    streak: number;
    rank: number;
    actionsLeft: number;
    achievements: string[];
  };
  leaderboards: { global: LeaderRow[]; party: LeaderRow[]; region: LeaderRow[] };
  alliances: { party_a: string; party_b: string }[];
  debate: DebateView | null;
  crisis: CrisisScript;
  election: { redgron: number; tido: number; governingBloc: 'redgron' | 'tido' } | null;
}

export interface ActionResultPayload {
  points: number;
  text: string;
  viral: boolean;
  newAchievements: string[];
  debate?: DebateOutcome;
  viralBreakdown?: ViralBreakdown;
  regional?: RegionalOutcome;
  crisis?: CrisisOutcome;
  alliance?: AllianceOutcome;
}

const BASE = '/api';

async function req<T>(path: string, opts: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-token'] = token;
  const res = await fetch(BASE + path, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Serverfel.');
  return json as T;
}

export const api = {
  register: (username: string, password: string) =>
    req<{ token: string; state: ValfeberState }>('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    req<{ token: string; state: ValfeberState }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  state: (token: string) => req<{ state: ValfeberState }>('/state', { method: 'GET' }, token),
  choose: (token: string, partyId: string, regionId: string) =>
    req<{ state: ValfeberState }>(
      '/choose',
      { method: 'POST', body: JSON.stringify({ partyId, regionId }) },
      token,
    ),
  action: (token: string, kind: string, payload: Record<string, unknown>) =>
    req<{ result: ActionResultPayload; state: ValfeberState }>(
      '/action',
      { method: 'POST', body: JSON.stringify({ kind, ...payload }) },
      token,
    ),
  teams: (token: string) =>
    req<{ teams: { id: number; name: string; party_id: string; members: number }[]; myTeamId: number | null }>(
      '/teams',
      { method: 'GET' },
      token,
    ),
  createTeam: (token: string, name: string) =>
    req<{ ok: boolean; teamId: number }>(
      '/team',
      { method: 'POST', body: JSON.stringify({ name }) },
      token,
    ),
  joinTeam: (token: string, teamId: number) =>
    req<{ ok: boolean }>(
      '/team/join',
      { method: 'POST', body: JSON.stringify({ teamId }) },
      token,
    ),
  chatGet: (token: string, scope: string, scopeId: string) =>
    req<{ messages: { id: number; name: string; body: string; ts: number }[] }>(
      `/chat?scope=${scope}&scopeId=${scopeId}`,
      { method: 'GET' },
      token,
    ),
  chatSend: (token: string, scope: string, scopeId: string, body: string) =>
    req<{ ok: boolean }>(
      '/chat',
      { method: 'POST', body: JSON.stringify({ scope, scopeId, body }) },
      token,
    ),
  allianceOffer: (token: string, allyPartyId: string) =>
    req<{ offer: AllianceOffer }>(
      `/alliance/${encodeURIComponent(allyPartyId)}`,
      { method: 'GET' },
      token,
    ),
};
