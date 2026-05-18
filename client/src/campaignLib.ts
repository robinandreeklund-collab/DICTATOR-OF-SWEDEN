import type { CampaignClientView } from '@dos/shared';

export const CAMPAIGN_PHASE_LABEL: Record<string, string> = {
  roleReveal: 'Uppdrag delas ut',
  news: 'Nyhetscykeln',
  campaign: 'Kampanjvecka',
  resolution: 'Veckan summeras',
  internal: 'Internt krismote',
  electionNight: 'Valnatten',
  gameOver: 'Valet avgjort',
};

/** Partifarg fran delad partidata, med fallback. */
export function teamLabel(view: CampaignClientView, teamId: string): string {
  const t = view.teams.find((x) => x.id === teamId);
  return t ? t.partyId.toUpperCase() : teamId;
}

export function playerName(view: CampaignClientView, id: string | null): string {
  if (!id) return '—';
  return view.players.find((p) => p.id === id)?.name ?? '—';
}

/** Format procent. */
export function pct(n: number): string {
  return `${n.toFixed(1)} %`;
}
