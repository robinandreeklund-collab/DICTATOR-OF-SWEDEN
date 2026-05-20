import { Campaign } from '@dos/shared';
import type { Db } from './db.js';
import {
  ELECTION_TS,
  VALFEBER_PARTIES,
  seedSupportForValkrets,
  type World,
} from './world.js';
import { seedAiPlayers } from './simulation.js';

// Migrationer for databaser som redan finns (idempotenta).
const MIGRATIONS = [
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false',
  'ALTER TABLE world ADD COLUMN IF NOT EXISTS last_sim_day integer NOT NULL DEFAULT -1',
];

const TABLES = `
CREATE TABLE IF NOT EXISTS world (
  id int PRIMARY KEY,
  start_ts double precision NOT NULL,
  end_ts double precision NOT NULL,
  last_sim_day integer NOT NULL DEFAULT -1
);
CREATE TABLE IF NOT EXISTS players (
  id serial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  uname_lower text UNIQUE NOT NULL,
  pass_hash text NOT NULL,
  token text UNIQUE NOT NULL,
  party_id text,
  region_id text,
  points integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  last_active_day integer NOT NULL DEFAULT -1,
  actions_day integer NOT NULL DEFAULT -1,
  actions_left integer NOT NULL DEFAULT 3,
  is_ai boolean NOT NULL DEFAULT false,
  created_ts double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS support (
  party_id text NOT NULL,
  valkrets_id text NOT NULL,
  support real NOT NULL,
  PRIMARY KEY (party_id, valkrets_id)
);
CREATE TABLE IF NOT EXISTS action_log (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  day integer NOT NULL,
  kind text NOT NULL,
  detail text,
  points integer NOT NULL,
  ts double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS teams (
  id serial PRIMARY KEY,
  party_id text NOT NULL,
  name text NOT NULL,
  created_by integer NOT NULL,
  created_ts double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS team_members (
  team_id integer NOT NULL,
  player_id integer NOT NULL,
  PRIMARY KEY (team_id, player_id)
);
CREATE TABLE IF NOT EXISTS alliances (
  id serial PRIMARY KEY,
  party_a text NOT NULL,
  party_b text NOT NULL,
  day integer NOT NULL,
  status text NOT NULL
);
CREATE TABLE IF NOT EXISTS achievements (
  player_id integer NOT NULL,
  code text NOT NULL,
  ts double precision NOT NULL,
  PRIMARY KEY (player_id, code)
);
CREATE TABLE IF NOT EXISTS chat (
  id serial PRIMARY KEY,
  scope text NOT NULL,
  scope_id text NOT NULL,
  player_id integer,
  name text NOT NULL,
  body text NOT NULL,
  ts double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_players_points ON players (points DESC);
CREATE INDEX IF NOT EXISTS idx_chat_scope ON chat (scope, scope_id, id);
`;

export async function initSchema(db: Db): Promise<World> {
  for (const stmt of TABLES.split(';')) {
    const s = stmt.trim();
    if (s) await db.query(s);
  }
  for (const m of MIGRATIONS) await db.query(m);

  const existing = await db.query<{ start_ts: number; end_ts: number }>(
    'SELECT start_ts, end_ts FROM world WHERE id = 1',
  );
  if (existing.length === 0) {
    const start = Number(process.env.VALFEBER_START_TS) || Date.now();
    let end = Number(process.env.VALFEBER_END_TS) || ELECTION_TS;
    if (end <= start) end = start + 84 * 86_400_000; // fallback: 12 veckor
    await db.query('INSERT INTO world (id, start_ts, end_ts) VALUES (1, $1, $2)', [start, end]);
  }

  const support = await db.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM support');
  if ((support[0]?.n ?? 0) === 0) {
    for (const vk of Campaign.VALKRETSAR) {
      const row = seedSupportForValkrets(vk.id);
      for (const party of VALFEBER_PARTIES) {
        await db.query(
          'INSERT INTO support (party_id, valkrets_id, support) VALUES ($1, $2, $3)',
          [party, vk.id, row[party]],
        );
      }
    }
  }

  await seedAiPlayers(db);

  const w = await db.query<{ start_ts: number; end_ts: number }>(
    'SELECT start_ts, end_ts FROM world WHERE id = 1',
  );
  return { start_ts: Number(w[0].start_ts), end_ts: Number(w[0].end_ts) };
}

export async function loadWorld(db: Db): Promise<World> {
  const w = await db.query<{ start_ts: number; end_ts: number }>(
    'SELECT start_ts, end_ts FROM world WHERE id = 1',
  );
  return { start_ts: Number(w[0].start_ts), end_ts: Number(w[0].end_ts) };
}

export async function loadSupport(db: Db): Promise<Record<string, Record<string, number>>> {
  const rows = await db.query<{ party_id: string; valkrets_id: string; support: number }>(
    'SELECT party_id, valkrets_id, support FROM support',
  );
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (map[r.valkrets_id] ??= {})[r.party_id] = Number(r.support);
  }
  return map;
}
