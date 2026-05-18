// Sakfragorna i valrorelsen 2026 och vilka partier som "ager" dem.

export interface Issue {
  id: string;
  label: string;
  /** Partier som har trovardighet i fragan (kampanjbonus). */
  owners: string[];
}

export const ISSUES: Issue[] = [
  { id: 'brott', label: 'Brott och straff', owners: ['m', 'sd'] },
  { id: 'migration', label: 'Migration och integration', owners: ['sd'] },
  { id: 'energi', label: 'Energi och karnkraft', owners: ['m', 'kd'] },
  { id: 'klimat', label: 'Klimat och miljo', owners: ['mp', 'c'] },
  { id: 'valfard', label: 'Valfard och sjukvard', owners: ['s', 'v', 'kd'] },
  { id: 'ekonomi', label: 'Ekonomi och skatter', owners: ['m', 's'] },
  { id: 'skola', label: 'Skola och utbildning', owners: ['l', 's'] },
  { id: 'forsvar', label: 'Forsvar och NATO', owners: ['m', 'l'] },
];

export const ISSUE_BY_ID: Record<string, Issue> = Object.fromEntries(
  ISSUES.map((i) => [i.id, i]),
);

/** 1.5 om partiet ager fragan, 1.0 annars. */
export function ownershipBonus(issueId: string, partyId: string): number {
  return ISSUE_BY_ID[issueId]?.owners.includes(partyId) ? 1.5 : 1.0;
}
