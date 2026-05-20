import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

// Databaslager. I produktion (DATABASE_URL satt, t.ex. Neon) anvands node-postgres.
// Lokalt/i test anvands en inbaddad Postgres (PGlite) - exakt samma SQL-dialekt.

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

function fromPg(url: string): Db {
  const ssl = url.includes('localhost') || url.includes('127.0.0.1')
    ? undefined
    : { rejectUnauthorized: false };
  const pool = new pg.Pool({ connectionString: url, ssl, max: 8 });
  return {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const r = await pool.query(sql, params as unknown[]);
      return r.rows as T[];
    },
    async close() {
      await pool.end();
    },
  };
}

function fromPglite(dataDir?: string): Db {
  const lite = new PGlite(dataDir);
  return {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const r = await lite.query(sql, params as unknown[]);
      return r.rows as T[];
    },
    async close() {
      await lite.close();
    },
  };
}

/** Skapa en ny databasanslutning (anvands av tester for en frist instans). */
export function createDb(opts?: { url?: string; dataDir?: string }): Db {
  const url = opts?.url ?? process.env.DATABASE_URL;
  if (url) return fromPg(url);
  return fromPglite(opts?.dataDir);
}

let singleton: Db | null = null;

/** Delad databasanslutning for servern. */
export function getDb(): Db {
  if (!singleton) {
    singleton = createDb({ dataDir: process.env.VALFEBER_DATA });
  }
  return singleton;
}
