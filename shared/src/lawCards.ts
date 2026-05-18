import type { LawCard } from './types.js';

// Lagforslags-kortleken: 6 demokratiska + 11 antidemokratiska kort.
// Den ont-tunga fordelningen ar medveten speldesign - demokraterna maste
// anstranga sig. Korten ar dramatiserade och inspirerade av verkliga
// debatter i valrorelsen 2026; de pastar INTE att nagot parti vill avskaffa
// demokratin. Facit-texterna visas pa slutskarmen.

export const DEMOCRATIC_CARDS: LawCard[] = [
  {
    id: 'dem_offentlighet',
    type: 'democratic',
    title: 'Starkt offentlighetsprincip',
    topic: 'Insyn',
    description: 'Medborgare och journalister far utokad ratt att granska makten.',
    factCheck:
      'Offentlighetsprincipen och meddelarfriheten ar grundbultar i den svenska tryckfrihetsforordningen sedan 1766.',
    source: 'Tryckfrihetsforordningen',
  },
  {
    id: 'dem_domstol',
    type: 'democratic',
    title: 'Skyddat domstolsoberoende',
    topic: 'Rattsstat',
    description: 'Domstolarnas oberoende fran politisk styrning grundlagsskyddas tydligare.',
    factCheck:
      'Forslag om att grundlagsskydda domstolarnas oberoende har utretts (SOU 2023:12) for att starka rattsstaten.',
    source: 'Grundlagsutredning om domstolarna',
  },
  {
    id: 'dem_press',
    type: 'democratic',
    title: 'Skyddad pressfrihet',
    topic: 'Yttrandefrihet',
    description: 'Journalisters kallskydd och rätt att granska makthavare starks.',
    factCheck:
      'Kallskyddet innebar att den som lamnar uppgifter till medier har ratt att vara anonym - en hornsten i svensk yttrandefrihet.',
    source: 'Tryckfrihetsforordningen 3 kap.',
  },
  {
    id: 'dem_rostratt',
    type: 'democratic',
    title: 'Breddat valdeltagande',
    topic: 'Demokrati',
    description: 'Insatser for att fler ska kunna och vilja rosta i allmanna val.',
    factCheck:
      'Allman och lika rostratt infordes stegvis 1909-1921. Hogt valdeltagande raknas som ett tecken pa en frisk demokrati.',
    source: 'Regeringsformen 1 kap.',
  },
  {
    id: 'dem_grundlag',
    type: 'democratic',
    title: 'Starkt grundlagsskydd',
    topic: 'Demokrati',
    description: 'Det ska kravas bredare politisk enighet for att andra fri- och rattigheter.',
    factCheck:
      'Grundlag andras genom tva likalydande riksdagsbeslut med ett riksdagsval emellan - ett medvetet trogt skydd.',
    source: 'Regeringsformen 8 kap.',
  },
  {
    id: 'dem_publicservice',
    type: 'democratic',
    title: 'Oberoende public service',
    topic: 'Mediefrihet',
    description: 'Public service garanteras finansiering fri fran politisk paverkan.',
    factCheck:
      'Public services oberoende regleras for att radio och tv ska kunna granska makten utan politisk styrning.',
    source: 'Public service-utredningen',
  },
];

export const AUTHORITARIAN_CARDS: LawCard[] = [
  {
    id: 'aut_tryckfrihet',
    type: 'authoritarian',
    title: 'Inskrankt tryckfrihet',
    topic: 'Tryckfrihet',
    description: 'Medier maste inhamta tillstand innan kanslig granskning publiceras.',
    factCheck:
      'Forhandsgranskning av tryckt material (censur) ar uttryckligen forbjudet i den svenska tryckfrihetsforordningen.',
    source: 'Tryckfrihetsforordningen 1 kap.',
  },
  {
    id: 'aut_overvakning',
    type: 'authoritarian',
    title: 'Massovervakning utan misstanke',
    topic: 'Personlig integritet',
    description: 'Kameraovervakning och avlyssning tillats brett, aven utan brottsmisstanke.',
    factCheck:
      'Utokad kameraovervakning debatterades flitigt i Tidoavtalet. Overvakning utan misstanke vacker fragor om integritetsskyddet i regeringsformen 2 kap.',
    source: 'Debatt om Tidoavtalet',
  },
  {
    id: 'aut_vittnen',
    type: 'authoritarian',
    title: 'Hemliga rattegangar',
    topic: 'Rattssakerhet',
    description: 'Bevisning och vittnen kan hemlighallas helt fran den anklagade.',
    factCheck:
      'Anonyma vittnen utreddes inom Tidoavtalet. Helt hemliga rattegangar skulle dock bryta mot rätten till en rattvis rattegang.',
    source: 'Europakonventionen art. 6',
  },
  {
    id: 'aut_demonstration',
    type: 'authoritarian',
    title: 'Demonstrationsforbud',
    topic: 'Motesfrihet',
    description: 'Regeringen kan forbjuda demonstrationer som anses politiskt obekvama.',
    factCheck:
      'Motes- och demonstrationsfriheten skyddas av regeringsformen och far bara begransas av sarskilt tunga skal som ordning och sakerhet.',
    source: 'Regeringsformen 2 kap. 1 §',
  },
  {
    id: 'aut_forening',
    type: 'authoritarian',
    title: 'Inskrankt foreningsfrihet',
    topic: 'Foreningsfrihet',
    description: 'Politiska sammanslutningar kan forbjudas pa losa grunder.',
    factCheck:
      'Foreningsfriheten ar grundlagsskyddad. Den far begransas bara nar det galler organisationer som bedriver militant verksamhet.',
    source: 'Regeringsformen 2 kap. 24 §',
  },
  {
    id: 'aut_publicservice',
    type: 'authoritarian',
    title: 'Politiskt styrd public service',
    topic: 'Mediefrihet',
    description: 'Regeringen far utse public services ledning och paverka innehallet.',
    factCheck:
      'Public services oberoende fran politisk styrning ses som avgorande for fria mediers formaga att granska makten.',
    source: 'Public service-utredningen',
  },
  {
    id: 'aut_rostratt',
    type: 'authoritarian',
    title: 'Begransad rostratt',
    topic: 'Demokrati',
    description: 'Nya krav infors som utesluter grupper av medborgare fran att rosta.',
    factCheck:
      'Allman och lika rostratt ar en grundprincip i regeringsformen. Att villkora rosträtten skulle vara ett brott mot den.',
    source: 'Regeringsformen 1 kap. 1 §',
  },
  {
    id: 'aut_domstol',
    type: 'authoritarian',
    title: 'Politiskt tillsatta domare',
    topic: 'Rattsstat',
    description: 'Regeringen far utse och avsatta domare efter politisk linje.',
    factCheck:
      'Domstolarnas oberoende fran regeringen ar en hornsten i rattsstaten och skyddas av regeringsformen 11 kap.',
    source: 'Regeringsformen 11 kap. 3 §',
  },
  {
    id: 'aut_religion',
    type: 'authoritarian',
    title: 'Inskrankt religionsfrihet',
    topic: 'Religionsfrihet',
    description: 'Statlig kontroll over vilka tros- och livsaskadningar som tillats.',
    factCheck:
      'Religionsfriheten ar en absolut rattighet i regeringsformen som inte ens far begransas genom vanlig lag.',
    source: 'Regeringsformen 2 kap. 1 §',
  },
  {
    id: 'aut_rorelsefrihet',
    type: 'authoritarian',
    title: 'Inskrankt rorelsefrihet',
    topic: 'Rorelsefrihet',
    description: 'Visitationszoner dar polisen far stoppa och visitera vem som helst.',
    factCheck:
      'Sakerhetszoner (visitationszoner) infordes 2024 och debatterades hart utifran skyddet mot godtyckliga ingrepp.',
    source: 'Lagen om sakerhetszoner',
  },
  {
    id: 'aut_yttrandefrihet',
    type: 'authoritarian',
    title: 'Forbud mot regeringskritik',
    topic: 'Yttrandefrihet',
    description: 'Det blir straffbart att offentligt kritisera regeringens politik.',
    factCheck:
      'Yttrandefriheten skyddar uttryckligen ratten att kritisera makthavare - det ar dess karna i en demokrati.',
    source: 'Regeringsformen 2 kap. 1 §',
  },
];

export const ALL_LAW_CARDS: LawCard[] = [...DEMOCRATIC_CARDS, ...AUTHORITARIAN_CARDS];

export const LAW_CARD_BY_ID: Record<string, LawCard> = Object.fromEntries(
  ALL_LAW_CARDS.map((c) => [c.id, c]),
);
