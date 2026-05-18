// Sveriges 29 riksdagsvalkretsar. Koordinaterna (x,y) ar stiliserade for
// kartan i klienten (viewBox 0 0 460 1000). Mandattalen ar avrundade och
// summerar till 349.

export type RegionType =
  | 'norr'
  | 'mellan'
  | 'storstad'
  | 'storstadslan'
  | 'smaland'
  | 'syd'
  | 'gotland';

export interface Valkrets {
  id: string;
  name: string;
  shortName: string;
  mandate: number;
  region: RegionType;
  x: number;
  y: number;
}

export const VALKRETSAR: Valkrets[] = [
  { id: 'norrbotten', name: 'Norrbottens lan', shortName: 'Norrbotten', mandate: 9, region: 'norr', x: 258, y: 110 },
  { id: 'vasterbotten', name: 'Vasterbottens lan', shortName: 'Vasterbotten', mandate: 10, region: 'norr', x: 240, y: 205 },
  { id: 'jamtland', name: 'Jamtlands lan', shortName: 'Jamtland', mandate: 5, region: 'norr', x: 175, y: 250 },
  { id: 'vasternorrland', name: 'Vasternorrlands lan', shortName: 'Vasternorrland', mandate: 9, region: 'norr', x: 260, y: 290 },
  { id: 'gavleborg', name: 'Gavleborgs lan', shortName: 'Gavleborg', mandate: 11, region: 'norr', x: 265, y: 365 },
  { id: 'dalarna', name: 'Dalarnas lan', shortName: 'Dalarna', mandate: 12, region: 'norr', x: 190, y: 375 },
  { id: 'varmland', name: 'Varmlands lan', shortName: 'Varmland', mandate: 11, region: 'mellan', x: 145, y: 450 },
  { id: 'vastmanland', name: 'Vastmanlands lan', shortName: 'Vastmanland', mandate: 10, region: 'mellan', x: 245, y: 445 },
  { id: 'orebro', name: 'Orebro lan', shortName: 'Orebro', mandate: 12, region: 'mellan', x: 200, y: 485 },
  { id: 'uppsala', name: 'Uppsala lan', shortName: 'Uppsala', mandate: 13, region: 'mellan', x: 295, y: 455 },
  { id: 'sthlm-stad', name: 'Stockholms kommun', shortName: 'Sthlm stad', mandate: 31, region: 'storstad', x: 340, y: 510 },
  { id: 'sthlm-lan', name: 'Stockholms lan', shortName: 'Sthlm lan', mandate: 41, region: 'storstadslan', x: 320, y: 478 },
  { id: 'sodermanland', name: 'Sodermanlands lan', shortName: 'Sodermanland', mandate: 11, region: 'mellan', x: 275, y: 525 },
  { id: 'ostergotland', name: 'Ostergotlands lan', shortName: 'Ostergotland', mandate: 16, region: 'mellan', x: 255, y: 580 },
  { id: 'vg-norra', name: 'Vastra Gotalands lan norra', shortName: 'VG norra', mandate: 9, region: 'mellan', x: 150, y: 545 },
  { id: 'vg-ostra', name: 'Vastra Gotalands lan ostra', shortName: 'VG ostra', mandate: 8, region: 'mellan', x: 195, y: 600 },
  { id: 'vg-vastra', name: 'Vastra Gotalands lan vastra', shortName: 'VG vastra', mandate: 10, region: 'mellan', x: 110, y: 615 },
  { id: 'goteborg', name: 'Goteborgs kommun', shortName: 'Goteborg', mandate: 18, region: 'storstad', x: 95, y: 650 },
  { id: 'vg-sodra', name: 'Vastra Gotalands lan sodra', shortName: 'VG sodra', mandate: 8, region: 'mellan', x: 150, y: 650 },
  { id: 'jonkoping', name: 'Jonkopings lan', shortName: 'Jonkoping', mandate: 13, region: 'smaland', x: 205, y: 660 },
  { id: 'kalmar', name: 'Kalmar lan', shortName: 'Kalmar', mandate: 8, region: 'smaland', x: 270, y: 665 },
  { id: 'gotland', name: 'Gotlands lan', shortName: 'Gotland', mandate: 2, region: 'gotland', x: 350, y: 625 },
  { id: 'kronoberg', name: 'Kronobergs lan', shortName: 'Kronoberg', mandate: 7, region: 'smaland', x: 215, y: 720 },
  { id: 'halland', name: 'Hallands lan', shortName: 'Halland', mandate: 12, region: 'syd', x: 120, y: 715 },
  { id: 'blekinge', name: 'Blekinge lan', shortName: 'Blekinge', mandate: 5, region: 'syd', x: 255, y: 765 },
  { id: 'skane-no', name: 'Skane lans norra och ostra', shortName: 'Skane no', mandate: 11, region: 'syd', x: 200, y: 795 },
  { id: 'skane-vastra', name: 'Skane lans vastra', shortName: 'Skane vastra', mandate: 12, region: 'storstadslan', x: 135, y: 810 },
  { id: 'malmo', name: 'Malmo kommun', shortName: 'Malmo', mandate: 11, region: 'storstad', x: 150, y: 855 },
  { id: 'skane-sodra', name: 'Skane lans sodra', shortName: 'Skane sodra', mandate: 14, region: 'syd', x: 180, y: 850 },
];

export const VALKRETS_BY_ID: Record<string, Valkrets> = Object.fromEntries(
  VALKRETSAR.map((v) => [v.id, v]),
);

export const TOTAL_MANDATE = VALKRETSAR.reduce((s, v) => s + v.mandate, 0);

// Nationellt utgangsstod 2026 (ungefarligt opinionslage, normaliseras i bruk).
// De fyra smapartierna ligger lagt och kommer sallan over 4-procentssparren.
export const NATIONAL_BASE: Record<string, number> = {
  s: 25, sd: 21, m: 19, v: 9, kd: 6, c: 6, mp: 5, l: 4,
  fi: 2, djur: 1, pirat: 2, nyans: 1,
};

// Regional lutning: multiplikator pa nationellt stod per regiontyp.
export const REGION_TILT: Record<RegionType, Record<string, number>> = {
  norr: { s: 1.4, v: 1.25, c: 1.15, sd: 0.95, mp: 0.9, kd: 0.8, m: 0.7, l: 0.55 },
  mellan: { s: 1.12, sd: 1.08, m: 1.0, c: 1.0, kd: 0.95, v: 0.95, mp: 0.9, l: 0.85 },
  storstad: { mp: 1.6, v: 1.4, l: 1.5, m: 1.35, kd: 0.9, s: 0.85, c: 0.6, sd: 0.6 },
  storstadslan: { m: 1.35, l: 1.2, mp: 1.1, sd: 1.0, kd: 1.0, v: 1.0, s: 0.95, c: 0.85 },
  smaland: { kd: 1.7, sd: 1.2, c: 1.15, m: 1.05, l: 0.85, s: 0.85, mp: 0.8, v: 0.7 },
  syd: { sd: 1.45, m: 1.15, kd: 1.1, c: 0.9, s: 0.9, l: 0.9, mp: 0.8, v: 0.8 },
  gotland: { c: 1.9, mp: 1.4, s: 1.0, m: 1.0, v: 1.0, kd: 0.9, l: 0.8, sd: 0.75 },
};

/** Berakna utgangsstod (8 partier) for en valkrets. */
export function initialSupport(v: Valkrets): Record<string, number> {
  const tilt = REGION_TILT[v.region];
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const [party, base] of Object.entries(NATIONAL_BASE)) {
    raw[party] = base * (tilt[party] ?? 1);
    sum += raw[party];
  }
  // Normalisera till 100 stodpoang per valkrets.
  const support: Record<string, number> = {};
  for (const party of Object.keys(raw)) {
    support[party] = (raw[party] / sum) * 100;
  }
  return support;
}
