import type { Db } from './db.js';

export interface LeaderRow {
  username: string;
  party_id: string | null;
  region_id: string | null;
  points: number;
  streak: number;
}

export async function getLeaderboard(
  db: Db,
  scope: 'global' | 'party' | 'region',
  scopeId: string | null,
  limit = 50,
): Promise<LeaderRow[]> {
  if (scope === 'party' && scopeId) {
    return db.query<LeaderRow>(
      `SELECT username, party_id, region_id, points, streak FROM players
       WHERE party_id = $1 ORDER BY points DESC, id ASC LIMIT $2`,
      [scopeId, limit],
    );
  }
  if (scope === 'region' && scopeId) {
    return db.query<LeaderRow>(
      `SELECT username, party_id, region_id, points, streak FROM players
       WHERE region_id = $1 ORDER BY points DESC, id ASC LIMIT $2`,
      [scopeId, limit],
    );
  }
  return db.query<LeaderRow>(
    `SELECT username, party_id, region_id, points, streak FROM players
     WHERE party_id IS NOT NULL ORDER BY points DESC, id ASC LIMIT $1`,
    [limit],
  );
}

export async function playerRank(db: Db, points: number): Promise<number> {
  const r = await db.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM players WHERE party_id IS NOT NULL AND points > $1',
    [points],
  );
  return (r[0]?.n ?? 0) + 1;
}

export async function partyMemberCounts(db: Db): Promise<Record<string, number>> {
  const rows = await db.query<{ party_id: string; n: number }>(
    'SELECT party_id, COUNT(*)::int AS n FROM players WHERE party_id IS NOT NULL GROUP BY party_id',
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.party_id] = Number(r.n);
  return out;
}

export async function getAchievements(db: Db, playerId: number): Promise<string[]> {
  const rows = await db.query<{ code: string }>(
    'SELECT code FROM achievements WHERE player_id = $1',
    [playerId],
  );
  return rows.map((r) => r.code);
}
