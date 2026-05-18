import { Campaign, type CampaignClientView, type CampaignRole } from '@dos/shared';

export const CAMPAIGN_PHASE_LABEL: Record<string, string> = {
  roleReveal: 'Uppdrag delas ut',
  news: 'Nyhetscykeln',
  planning: 'Planeringsvecka',
  resolution: 'Veckan summeras',
  internal: 'Internt krismote',
  electionNight: 'Valnatten',
  gameOver: 'Valet avgjort',
};

export const ROLE_LABEL: Record<CampaignRole, string> = {
  kampanjledare: 'Kampanjledare',
  talesperson: 'Talesperson',
  strateg: 'Strateg',
  analytiker: 'Analytiker',
  insamlare: 'Insamlingsansvarig',
};

export const ROLE_ICON: Record<CampaignRole, string> = {
  kampanjledare: '📍',
  talesperson: '🎤',
  strateg: '♟',
  analytiker: '🔍',
  insamlare: '💰',
};

export const ROLE_DESC: Record<CampaignRole, string> = {
  kampanjledare: 'Fordelar lagets kampanjkassa pa valkretsarna.',
  talesperson: 'Valjer sakfraga och vem laget moter i debatt.',
  strateg: 'Satter veckans strategi - bas, marginalvalkretsar eller attack.',
  analytiker: 'Analyserar ett lag och samlar underrattelser.',
  insamlare: 'Skoter ekonomin - samla in, annonsera eller skolda laget.',
};

export const REGION_LABEL: Record<string, string> = {
  norr: 'Norrland',
  mellan: 'Mellansverige',
  storstad: 'Storstaderna',
  storstadslan: 'Storstadslanen',
  smaland: 'Smaland',
  syd: 'Sydsverige',
  gotland: 'Gotland',
};

export function playerName(view: CampaignClientView, id: string | null): string {
  if (!id) return '—';
  return view.players.find((p) => p.id === id)?.name ?? '—';
}

export function issueLabel(id: string): string {
  return Campaign.ISSUE_BY_ID[id]?.label ?? id;
}

export function pct(n: number): string {
  return `${n.toFixed(1)} %`;
}
