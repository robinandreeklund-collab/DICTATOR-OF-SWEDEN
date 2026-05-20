import pg from 'pg';

// Databaslager. I produktion (DATABASE_URL satt, t.ex. Neon) anvands node-postgres
// (latt, ren JS). Lokalt/i test anvands en inbaddad Postgres (PGlite) som laddas
// FORST vid forsta anvandning - sa produktion med Neon aldrig drar in WASM-Postgres
// i minnet (viktigt pa sma instanser, t.ex. Renders 512 MB).

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

function fromPg(url: string): Db {
  const ssl = url.includes('localhost') || url.includes('127.0.0.1')
    ? undefined
    : { rejectUnauthorized: false };
  const pool = new pg.Pool({ connectionString: url, ssl, max: 5 });
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
  // Lazy: laddas och instansieras forst vid forsta anropet.
  let lite: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>; close: () => Promise<void> } | null = null;
  let initing: Promise<typeof lite> | null = null;
  const ensure = async () => {
    if (lite) return lite;
    if (!initing) {
      initing = (async () => {
        const { PGlite } = await import('@electric-sql/pglite');
        lite = new PGlite(dataDir) as unknown as typeof lite;
        return lite;
      })();
    }
    return initing;
  };
  return {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const l = await ensure();
      const r = await l!.query(sql, params);
      return r.rows as T[];
    },
    async close() {
      if (lite) await lite.close();
    },
  };
}

export function createDb(opts?: { url?: string; dataDir?: string }): Db {
  const url = opts?.url ?? process.env.DATABASE_URL;
  if (url) return fromPg(url);
  if (process.env.NODE_ENV === 'production') {
    // Ingen inbaddad WASM-databas i produktion - den ar minnestung och nollstalls.
    const msg =
      'DATABASE_URL saknas. Satt din Neon-anslutningsstrang som miljovariabel DATABASE_URL i Render.';
    return {
      async query() {
        throw new Error(msg);
      },
      async close() {},
    };
  }
  return fromPglite(opts?.dataDir);
}

let singleton: Db | null = null;

export function getDb(): Db {
  if (!singleton) {
    singleton = createDb({ dataDir: process.env.VALFEBER_DATA });
  }
  return singleton;
}
