import { Campaign, getParty } from '@dos/shared';

// De atta riksdagspartierna (Valfeber spelas med dessa).
export const VALFEBER_PARTIES = ['s', 'm', 'sd', 'v', 'c', 'kd', 'mp', 'l'];

export const ACTIONS_PER_DAY = 3;

// Valdagen 13 september 2026, vallokalerna stanger 20:00 svensk tid (~18 UTC).
export const ELECTION_TS = Date.parse('2026-09-13T18:00:00Z');

/** En "dag" i speltid. Kan kortas i test via VALFEBER_DAY_MS. */
export function dayMs(): number {
  return Number(process.env.VALFEBER_DAY_MS) || 86_400_000;
}

export interface World {
  start_ts: number;
  end_ts: number;
}

export function totalDays(world: World): number {
  return Math.max(1, Math.round((world.end_ts - world.start_ts) / dayMs()));
}

export function currentDay(world: World, now = Date.now()): number {
  const d = Math.floor((now - world.start_ts) / dayMs());
  return Math.max(0, Math.min(totalDays(world), d));
}

export function isElectionOver(world: World, now = Date.now()): boolean {
  return now >= world.end_ts;
}

export interface DailyEvent {
  title: string;
  body: string;
  hotIssue: string;
  crisis: boolean;
  source: string;
}

/** Deterministisk dagshandelse for en given dag. */
export function eventForDay(day: number): DailyEvent {
  const list = Campaign.CAMPAIGN_EVENTS;
  const e = list[day % list.length];
  return {
    title: e.title,
    body: e.body,
    hotIssue: e.hotIssue,
    crisis: e.crisis,
    source: e.source,
  };
}

// --- opinion & mandat -------------------------------------------------------

export type SupportMap = Record<string, Record<string, number>>;

/** Nationellt stod per parti (summa over valkretsar). */
export function nationalSupport(support: SupportMap): Record<string, number> {
  const sum: Record<string, number> = {};
  for (const p of VALFEBER_PARTIES) sum[p] = 0;
  for (const vk of Campaign.VALKRETSAR) {
    const row = support[vk.id] ?? {};
    for (const p of VALFEBER_PARTIES) sum[p] += row[p] ?? 0;
  }
  return sum;
}

export interface PartyStanding {
  partyId: string;
  name: string;
  shortName: string;
  color: string;
  percent: number;
  mandates: number;
  passedThreshold: boolean;
}

const THRESHOLD = 4;

/** Procent + mandatprojektion for alla partier utifran stodet. */
export function computeStandings(support: SupportMap): PartyStanding[] {
  const national = nationalSupport(support);
  const total = Object.values(national).reduce((a, b) => a + b, 0) || 1;
  const passed = new Set(
    VALFEBER_PARTIES.filter((p) => (national[p] / total) * 100 >= THRESHOLD),
  );

  const mandates: Record<string, number> = {};
  for (const p of VALFEBER_PARTIES) mandates[p] = 0;
  for (const vk of Campaign.VALKRETSAR) {
    const row = support[vk.id] ?? {};
    const shares: Record<string, number> = {};
    for (const p of VALFEBER_PARTIES) if (passed.has(p)) shares[p] = Math.max(0, row[p] ?? 0);
    const dist = Campaign.distributeMandate(shares, vk.mandate);
    for (const [p, m] of Object.entries(dist)) mandates[p] += m;
  }

  return VALFEBER_PARTIES.map((p) => {
    const party = getParty(p);
    return {
      partyId: p,
      name: party.name,
      shortName: party.shortName,
      color: party.color,
      percent: (national[p] / total) * 100,
      mandates: mandates[p] ?? 0,
      passedThreshold: passed.has(p),
    };
  }).sort((a, b) => b.mandates - a.mandates || b.percent - a.percent);
}

/** Initialt stod for en valkrets (8 partier), fran den delade datan. */
export function seedSupportForValkrets(valkretsId: string): Record<string, number> {
  const vk = Campaign.VALKRETS_BY_ID[valkretsId];
  const full = Campaign.initialSupport(vk);
  const row: Record<string, number> = {};
  for (const p of VALFEBER_PARTIES) row[p] = full[p] ?? 1;
  return row;
}
