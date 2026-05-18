import type { ClientGameView, GamePhase, PowerType, Role, Team } from '@dos/shared';

export const PHASE_LABEL: Record<GamePhase, string> = {
  lobby: 'Lobby',
  roleReveal: 'Rollutdelning',
  nomination: 'Nominering',
  voting: 'Omröstning',
  legislationPresident: 'Statsministern lagstiftar',
  legislationTalman: 'Talmannen lagstiftar',
  vetoResponse: 'Vetobeslut',
  powerAction: 'Maktbefogenhet',
  roundEnd: 'Rundan avslutas',
  gameOver: 'Spelet är slut',
};

export const ROLE_LABEL: Record<Role, string> = {
  democrat: 'Demokrat',
  collaborator: 'Medlöpare',
  dictator: 'Diktator',
};

export const ROLE_BLURB: Record<Role, string> = {
  democrat:
    'Du försvarar demokratin. Du vet inte vilka som är dina allierade — lita på omdömet.',
  collaborator:
    'Du tjänar diktatorn i hemlighet. Hjälp antidemokratiska lagar fram utan att avslöjas.',
  dictator:
    'Du är den hemliga diktatorn. Dölj dig, vinn maktens förtroende och störta demokratin.',
};

export const TEAM_LABEL: Record<Team, string> = {
  democrats: 'Demokraterna',
  antidemocrats: 'Antidemokraterna',
};

export const POWER_LABEL: Record<PowerType, string> = {
  investigate: 'Utred en ledamots partiblock',
  specialElection: 'Utlys extraval — utse nästa statsminister',
  peek: 'Granska de tre kommande lagförslagen',
  execute: 'Avsätt en ledamot ur riksdagen',
};

/** Spelare som inte får nomineras till talman (mandatperiodsregeln). */
export function termLimitedIds(g: ClientGameView): string[] {
  if (!g.lastGovernment) return [];
  const ids = [g.lastGovernment.talmanId];
  const aliveCount = g.players.filter((p) => p.alive).length;
  if (aliveCount > 5) ids.push(g.lastGovernment.presidentId);
  return ids;
}

export function eligibleTalmen(g: ClientGameView): string[] {
  const limited = new Set(termLimitedIds(g));
  return g.players
    .filter((p) => p.alive && p.id !== g.presidentId && !limited.has(p.id))
    .map((p) => p.id);
}

export function playerName(g: ClientGameView, id: string | null): string {
  if (!id) return '—';
  return g.players.find((p) => p.id === id)?.name ?? '—';
}
