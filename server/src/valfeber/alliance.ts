// Allians-minispelet. Spelaren valjer ett annat parti att forhandla med.
// Allianspartiet staller tre krav. Spelaren accepterar eller avvisar var.
// Lyckad allians beror pa hur manga krav som accepteras OCH hur politiskt
// kompatibla partierna ar.

import { VALFEBER_PARTIES } from './world.js';

const BLOC: Record<string, 'r' | 't'> = {
  s: 'r', v: 'r', mp: 'r', c: 'r',
  m: 't', sd: 't', kd: 't', l: 't',
};

// Baslinje for forhandlingsvilja mellan partier (0..1).
function compat(a: string, b: string): number {
  if (a === b) return 1;
  const sameBloc = BLOC[a] === BLOC[b];
  // sma smajusteringar for traditionella nav/konflikter
  if (sameBloc) {
    if ((a === 's' && b === 'v') || (a === 'v' && b === 's')) return 0.75;
    if ((a === 'm' && b === 'sd') || (a === 'sd' && b === 'm')) return 0.68;
    if ((a === 'c' && b === 's') || (a === 's' && b === 'c')) return 0.72;
    return 0.65;
  }
  // Over blockgransen – i princip bara C och L har traditioner at bada hall.
  if (a === 'c' || b === 'c') return 0.45;
  if (a === 'l' || b === 'l') return 0.42;
  return 0.3;
}

export interface Demand {
  id: string;
  topic: string;
  text: string;
}

export const DEMANDS: Demand[] = [
  { id: 'd-polis',   topic: 'Trygghet',  text: 'Fler poliser i hela landet och skarpta straff.' },
  { id: 'd-vald',    topic: 'Jamlikhet', text: 'Starkt arbete mot mans vald mot kvinnor.' },
  { id: 'd-energi',  topic: 'Energi',    text: 'Utbyggd karnkraft och sankta elpriser.' },
  { id: 'd-klimat',  topic: 'Klimat',    text: 'Snabbare utslappsminskning – oavsett pris.' },
  { id: 'd-vard',    topic: 'Vard',      text: 'Statlig overtagning av sjukvarden fran regionerna.' },
  { id: 'd-skola',   topic: 'Skola',     text: 'Vinstforbud i friskolor och fler statliga medel.' },
  { id: 'd-migration', topic: 'Migration', text: 'Harre regler for permanent uppehallstillstand.' },
  { id: 'd-eu',      topic: 'EU',        text: 'Mer EU-samarbete inom forsvar och klimat.' },
  { id: 'd-skatt',   topic: 'Skatter',   text: 'Hojd skatt pa stora formogenheter.' },
  { id: 'd-landsbygd', topic: 'Landsbygd', text: 'Sankt drivmedelsskatt och landsbygdsstod.' },
  { id: 'd-familj',  topic: 'Familj',    text: 'Hojt barnbidrag och forlangd foraldraforsakring.' },
  { id: 'd-forsvar', topic: 'Forsvar',   text: 'Forsvarsutgifter uppat 2,5% av BNP.' },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface AllianceOffer {
  allyPartyId: string;
  demands: Demand[];
  compat: number;
}

export function getAllianceOffer(day: number, playerPartyId: string, allyPartyId: string): AllianceOffer | null {
  if (!VALFEBER_PARTIES.includes(allyPartyId) || allyPartyId === playerPartyId) return null;
  const h = hash(`${day}:${playerPartyId}:${allyPartyId}`);
  const demands: Demand[] = [];
  const used = new Set<string>();
  for (let i = 0; demands.length < 3 && i < DEMANDS.length * 2; i++) {
    const d = DEMANDS[(h + i * 5) % DEMANDS.length];
    if (!used.has(d.id)) {
      demands.push(d);
      used.add(d.id);
    }
  }
  return { allyPartyId, demands, compat: compat(playerPartyId, allyPartyId) };
}

export interface AllianceResult {
  deal: boolean;
  allyPartyId: string;
  accepted: boolean[];
  score: number;      // 0..100
  points: number;
  support: number;    // tillfort stod vid lyckad deal
  text: string;
}

export function scoreAlliance(
  day: number,
  playerPartyId: string,
  allyPartyId: string,
  accepted: boolean[],
): { ok: boolean; error?: string; result?: AllianceResult } {
  const offer = getAllianceOffer(day, playerPartyId, allyPartyId);
  if (!offer) return { ok: false, error: 'Ogiltigt allianspartner.' };
  if (accepted.length !== offer.demands.length) {
    return { ok: false, error: 'Antal svar matchar inte antal krav.' };
  }

  const yes = accepted.filter(Boolean).length;
  // Dealen gar igenom om kompatibilitet + 0.17 per accepterat krav >= 1.0.
  const threshold = 1.0;
  const total = offer.compat + 0.17 * yes;
  const deal = total >= threshold;
  const score = Math.min(100, Math.round(total * 100));
  const points = deal ? Math.round(18 + yes * 6) : Math.round(6 + yes * 2);
  const support = deal ? 2 + yes * 0.6 : 0;
  const text = deal
    ? `Deal med ${allyPartyId.toUpperCase()}! Ni enas kring ${yes} av ${offer.demands.length} krav.`
    : `Forhandlingen brot samman. ${allyPartyId.toUpperCase()} drog sig ur.`;

  return {
    ok: true,
    result: { deal, allyPartyId, accepted, score, points, support, text },
  };
}
