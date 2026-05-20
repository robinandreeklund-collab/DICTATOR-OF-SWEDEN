import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Db } from './db.js';

export interface Player {
  id: number;
  username: string;
  party_id: string | null;
  region_id: string | null;
  points: number;
  streak: number;
  last_active_day: number;
  actions_day: number;
  actions_left: number;
}

const PLAYER_COLS =
  'id, username, party_id, region_id, points, streak, last_active_day, actions_day, actions_left';

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const h = scryptSync(pw, salt, 64);
  const hb = Buffer.from(hash, 'hex');
  return h.length === hb.length && timingSafeEqual(h, hb);
}

function newToken(): string {
  return randomBytes(24).toString('hex');
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  token?: string;
  player?: Player;
}

export async function register(
  db: Db,
  username: string,
  password: string,
): Promise<AuthResult> {
  const name = (username ?? '').trim();
  if (name.length < 2 || name.length > 20) return { ok: false, error: 'Anvandarnamn 2-20 tecken.' };
  if (!/^[\wåäöÅÄÖ \-]+$/.test(name)) return { ok: false, error: 'Otillatna tecken i namnet.' };
  if ((password ?? '').length < 4) return { ok: false, error: 'Losenord minst 4 tecken.' };

  const lower = name.toLowerCase();
  const taken = await db.query('SELECT 1 FROM players WHERE uname_lower = $1', [lower]);
  if (taken.length > 0) return { ok: false, error: 'Namnet ar upptaget.' };

  const token = newToken();
  const rows = await db.query<Player>(
    `INSERT INTO players (username, uname_lower, pass_hash, token, created_ts)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PLAYER_COLS}`,
    [name, lower, hashPassword(password), token, Date.now()],
  );
  return { ok: true, token, player: rows[0] };
}

export async function login(
  db: Db,
  username: string,
  password: string,
): Promise<AuthResult> {
  const lower = (username ?? '').trim().toLowerCase();
  const rows = await db.query<Player & { pass_hash: string; token: string }>(
    `SELECT ${PLAYER_COLS}, pass_hash, token FROM players WHERE uname_lower = $1`,
    [lower],
  );
  if (rows.length === 0) return { ok: false, error: 'Fel namn eller losenord.' };
  if (!verifyPassword(password ?? '', rows[0].pass_hash))
    return { ok: false, error: 'Fel namn eller losenord.' };

  const { pass_hash: _ph, token, ...player } = rows[0];
  void _ph;
  return { ok: true, token, player: player as Player };
}

export async function playerByToken(db: Db, token: string): Promise<Player | null> {
  if (!token) return null;
  const rows = await db.query<Player>(
    `SELECT ${PLAYER_COLS} FROM players WHERE token = $1`,
    [token],
  );
  return rows[0] ?? null;
}
