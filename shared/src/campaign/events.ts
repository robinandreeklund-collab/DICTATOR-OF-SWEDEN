import type { CampaignEventCard } from './types.js';

// Nyhetshandelser i valrorelsen 2026. Varje vecka vands ett kort som gor en
// sakfraga "het" - lag som driver den fragan far extra genomslag.

export const CAMPAIGN_EVENTS: CampaignEventCard[] = [
  {
    id: 'ev_skjutning',
    title: 'Ny vag av gangskjutningar',
    body: 'Flera skjutningar i storstaderna pa en helg. Tryggheten dominerar nyhetsflodet.',
    hotIssue: 'brott',
    source: 'Brottsforebyggande radet',
  },
  {
    id: 'ev_elpris',
    title: 'Elpriserna rasar i hojden',
    body: 'En kall vinter och stoppad reaktor far elpriset att sla rekord. Energifragan blossar upp.',
    hotIssue: 'energi',
    regionShift: { region: 'norr', party: 's', amount: 4 },
    source: 'Svenska kraftnat',
  },
  {
    id: 'ev_nato',
    title: 'Spant lage i Ostersjon',
    body: 'Okad militar aktivitet far forsvarsfragan och NATO-samarbetet i fokus.',
    hotIssue: 'forsvar',
    source: 'Forsvarsmakten',
  },
  {
    id: 'ev_vardkris',
    title: 'Rekordlanga vardkoer',
    body: 'Nya siffror visar att vardkoerna aldrig varit langre. Valfarden hamnar i centrum.',
    hotIssue: 'valfard',
    source: 'Socialstyrelsen',
  },
  {
    id: 'ev_skolresultat',
    title: 'Svenska skolresultat faller',
    body: 'En internationell matning visar sjunkande kunskaper. Skolan blir veckans stora fraga.',
    hotIssue: 'skola',
    source: 'Skolverket',
  },
  {
    id: 'ev_inflation',
    title: 'Hushallen pressas av inflationen',
    body: 'Matpriser och rantor biter. Ekonomin och planbokens fragor tar over debatten.',
    hotIssue: 'ekonomi',
    source: 'Konjunkturinstitutet',
  },
  {
    id: 'ev_almedalen',
    title: 'Almedalsveckan',
    body: 'Partiledarna samlas i Visby. Allt fokus pa politiska utspel - Gotland star i centrum.',
    hotIssue: 'valfard',
    regionShift: { region: 'gotland', party: 'c', amount: 6 },
    source: 'Almedalsveckan',
  },
  {
    id: 'ev_tidobokslut',
    title: 'Bokslut over Tidoavtalet',
    body: 'Regeringen och SD presenterar resultatet av mandatperioden. Migrationen hettar till.',
    hotIssue: 'migration',
    source: 'Regeringskansliet',
  },
  {
    id: 'ev_klimattoppmote',
    title: 'FN:s klimattoppmote',
    body: 'Larmrapporter om klimatet far miljofragan att klattra pa dagordningen.',
    hotIssue: 'klimat',
    regionShift: { region: 'storstad', party: 'mp', amount: 5 },
    source: 'FN:s klimatpanel',
  },
  {
    id: 'ev_drev',
    title: 'Mediedrev mot toppolitiker',
    body: 'En avsloning skakar valrorelsen. Fortroendefragan och brott i fokus.',
    hotIssue: 'brott',
    source: 'Granskande journalistik',
  },
  {
    id: 'ev_reaktor',
    title: 'Beslut om ny karnkraft',
    body: 'Ett industribesked om nya reaktorer satter energipolitiken hogst pa agendan.',
    hotIssue: 'energi',
    source: 'Vattenfall',
  },
  {
    id: 'ev_slutdebatt',
    title: 'Den stora slutdebatten',
    body: 'Partiledarna mots i tv:s slutdebatt infor valdagen. Valfarden blir slagfaltet.',
    hotIssue: 'valfard',
    source: 'SVT/TV4',
  },
];
