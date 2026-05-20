import { randomBytes } from 'node:crypto';
import { Campaign } from '@dos/shared';
import type { Db } from './db.js';
import { currentDay, eventForDay, totalDays, VALFEBER_PARTIES, type World } from './world.js';

// Simulerad befolkning: AI-kampanjarbetare och daglig nationell opinionsdrift.
// Korst lat - nar nagon laddar varlden simuleras alla dagar som passerat sedan
// forra simuleringen. Det gor att varlden lever aven om servern somnat emellan.

const AI_NAMES = [
  'Anja', 'Bosse', 'Cilla', 'Doris', 'Egon', 'Frida', 'Gustav', 'Hanna',
  'Ivar', 'Janne', 'Kajsa', 'Leif', 'Moa', 'Nisse', 'Ove', 'Petra',
  'Rune', 'Sigrid', 'Tage', 'Ulrika', 'Verner', 'Wilma', 'Yngve', 'Asa',
  'Birgit', 'Curt', 'Disa', 'Erik', 'Folke', 'Greta',
];

const AI_COUNT = 30;

export async function seedAiPlayers(db: Db): Promise<void> {
  const existing = await db.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM players WHERE is_ai = true',
  );
  if ((existing[0]?.n ?? 0) > 0) return;

  const valkretsar = Campaign.VALKRETSAR;
  for (let i = 0; i < AI_COUNT; i++) {
    const name = `${AI_NAMES[i % AI_NAMES.length]}${i >= AI_NAMES.length ? i : ''}`;
    const party = VALFEBER_PARTIES[i % VALFEBER_PARTIES.length]; // jamn fordelning over alla partier
    const region = valkretsar[Math.floor(Math.random() * valkretsar.length)].id;
    await db.query(
      `INSERT INTO players (username, uname_lower, pass_hash, token, party_id, region_id, points, is_ai, created_ts)
       VALUES ($1, $2, 'x', $3, $4, $5, $6, true, $7)`,
      [
        name,
        name.toLowerCase(),
        randomBytes(16).toString('hex'),
        party,
        region,
        Math.floor(Math.random() * 40),
        Date.now(),
      ],
    );
  }
}

let simLock: Promise<void> | null = null;

/** Simulera alla dagar som passerat sedan forra korningen. */
export async function ensureSimulated(db: Db, world: World): Promise<void> {
  if (simLock) {
    await simLock;
    return;
  }
  simLock = runSimulation(db, world).finally(() => {
    simLock = null;
  });
  await simLock;
}

async function runSimulation(db: Db, world: World): Promise<void> {
  const today = Math.min(currentDay(world), totalDays(world));
  const row = await db.query<{ last_sim_day: number }>(
    'SELECT last_sim_day FROM world WHERE id = 1',
  );
  const last = Number(row[0]?.last_sim_day ?? -1);
  if (today <= last) return;

  const ai = await db.query<{ id: number; party_id: string; region_id: string }>(
    'SELECT id, party_id, region_id FROM players WHERE is_ai = true',
  );

  for (let day = last + 1; day <= today; day++) {
    await simulateDay(db, day, ai);
  }
  await db.query('UPDATE world SET last_sim_day = $1 WHERE id = 1', [today]);
}

async function simulateDay(
  db: Db,
  day: number,
  ai: { id: number; party_id: string; region_id: string }[],
): Promise<void> {
  const hot = eventForDay(day).hotIssue;

  // Mild nationell drift, med extra medvind for partier som ager dagens fraga.
  for (const p of VALFEBER_PARTIES) {
    const owns = Campaign.ISSUE_BY_ID[hot]?.owners.includes(p) ? 0.05 : 0;
    const delta = (Math.random() - 0.5) * 0.12 + owns;
    await db.query(
      'UPDATE support SET support = GREATEST(0.4, support + $1) WHERE party_id = $2',
      [delta, p],
    );
  }

  // AI-kampanjarbetare agerar: poang till sig sjalva, stod till sitt parti i sin region.
  for (const a of ai) {
    if (!a.party_id || !a.region_id) continue;
    const gain = 6 + Math.floor(Math.random() * 26);
    await db.query('UPDATE players SET points = points + $1 WHERE id = $2', [gain, a.id]);
    await db.query(
      'UPDATE support SET support = support + $1 WHERE party_id = $2 AND valkrets_id = $3',
      [1.6 + Math.random() * 2.2, a.party_id, a.region_id],
    );
  }
}
