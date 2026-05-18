import type { Party } from './types.js';

// De atta riksdagspartierna infor valet 13 september 2026.
// Partifarger och abstrakta symboler anvands - inga officiella logotyper.
// Ledare/sprakror enligt opinionslaget varen 2026.

export const PARTIES: Party[] = [
  {
    id: 's',
    name: 'Socialdemokraterna',
    shortName: 'S',
    color: '#e8112d',
    bloc: 'redgron',
    leader: 'Magdalena Andersson',
    agenda: 'Stark gemensam valfard, fler jobb och en sjukvard utan langa koer.',
    ownsIssues: ['Valfard', 'Sjukvard', 'Jobb'],
  },
  {
    id: 'm',
    name: 'Moderaterna',
    shortName: 'M',
    color: '#1b49a2',
    bloc: 'tido',
    leader: 'Ulf Kristersson',
    agenda: 'Lagre skatt, hardare tag mot brott och utbyggd karnkraft.',
    ownsIssues: ['Ekonomi', 'Brott', 'Karnkraft', 'Forsvar'],
  },
  {
    id: 'sd',
    name: 'Sverigedemokraterna',
    shortName: 'SD',
    color: '#143c66',
    bloc: 'tido',
    leader: 'Jimmie Akesson',
    agenda: 'Kraftigt minskad invandring och skarpta straff for grov brottslighet.',
    ownsIssues: ['Migration', 'Lag och ordning'],
  },
  {
    id: 'v',
    name: 'Vansterpartiet',
    shortName: 'V',
    color: '#af0000',
    bloc: 'redgron',
    leader: 'Nooshi Dadgostar',
    agenda: 'Stoppad vinstjakt i valfarden och okad ekonomisk jamlikhet.',
    ownsIssues: ['Jamlikhet', 'Valfard', 'Klimat'],
  },
  {
    id: 'mp',
    name: 'Miljopartiet',
    shortName: 'MP',
    color: '#83cf39',
    bloc: 'redgron',
    leader: 'Daniel Hellden & Amanda Lind',
    agenda: 'Snabb klimatomstallning och skydd av natur och biologisk mangfald.',
    ownsIssues: ['Klimat', 'Miljo'],
  },
  {
    id: 'c',
    name: 'Centerpartiet',
    shortName: 'C',
    color: '#009933',
    bloc: 'redgron',
    leader: 'Elisabeth Thand Ringqvist',
    agenda: 'Hela landet ska leva - foretagande, landsbygd och gron omstallning.',
    ownsIssues: ['Landsbygd', 'Foretagande', 'Miljo'],
  },
  {
    id: 'kd',
    name: 'Kristdemokraterna',
    shortName: 'KD',
    color: '#005ea8',
    bloc: 'tido',
    leader: 'Ebba Busch',
    agenda: 'Kortare vardkoer, starkt stod till familjer och en trygg alderdom.',
    ownsIssues: ['Sjukvard', 'Familj', 'Aldreomsorg'],
  },
  {
    id: 'l',
    name: 'Liberalerna',
    shortName: 'L',
    color: '#006ab3',
    bloc: 'tido',
    leader: 'Johan Pehrson',
    agenda: 'En kunskapsskola i framkant och starkt skydd for individens fri- och rattigheter.',
    ownsIssues: ['Skola', 'EU', 'Frihet'],
  },
  {
    id: 'fi',
    name: 'Feministiskt initiativ',
    shortName: 'Fi',
    color: '#d9579b',
    bloc: 'redgron',
    leader: 'Teysir Subhi',
    agenda: 'Ett jamstallt samhalle fritt fran diskriminering och vald.',
    ownsIssues: ['Jamlikhet'],
  },
  {
    id: 'djur',
    name: 'Djurens parti',
    shortName: 'DjP',
    color: '#7a9a4b',
    bloc: 'redgron',
    leader: 'Partistyrelsen',
    agenda: 'Starkt djurskydd och en mer hallbar livsmedelspolitik.',
    ownsIssues: ['Miljo'],
  },
  {
    id: 'pirat',
    name: 'Piratpartiet',
    shortName: 'PP',
    color: '#572b85',
    bloc: 'tido',
    leader: 'Partistyrelsen',
    agenda: 'Digital frihet, integritet och en reformerad upphovsratt.',
    ownsIssues: ['Frihet'],
  },
  {
    id: 'nyans',
    name: 'Partiet Nyans',
    shortName: 'Ny',
    color: '#0e7c6b',
    bloc: 'tido',
    leader: 'Mikail Yuksel',
    agenda: 'Minoriteters rattigheter och kamp mot diskriminering.',
    ownsIssues: ['Jamlikhet'],
  },
];

export const PARTY_BY_ID: Record<string, Party> = Object.fromEntries(
  PARTIES.map((p) => [p.id, p]),
);

export function getParty(id: string): Party {
  const party = PARTY_BY_ID[id];
  if (!party) throw new Error(`Okant parti: ${id}`);
  return party;
}
