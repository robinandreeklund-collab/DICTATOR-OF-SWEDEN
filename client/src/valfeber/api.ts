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
  debate: { id: string; topic: string; statement: string }[];
  election: { redgron: number; tido: number; governingBloc: 'redgron' | 'tido' } | null;
}

export interface ActionResultPayload {
  points: number;
  text: string;
  viral: boolean;
  newAchievements: string[];
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
};
