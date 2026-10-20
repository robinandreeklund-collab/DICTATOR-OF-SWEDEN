// Debatt-minispelet. En debatt = 4 rundor. Motstandaren (ett rivalparti och
// dess partiledare) kastar ett argument av en viss typ. Spelaren valjer en av
// tre svartaktiker. Ratt motsvarighet ger stor publiksvang; fel sanker.
// Mappning: statistisk attack kontras bast med fakta, moralisk med motangrepp,
// policy-attack med kansla.

import { VALFEBER_PARTIES } from './world.js';

export type DebateType = 'statistical' | 'moral' | 'policy';
export type ResponseType = 'fakta' | 'kansla' | 'motangrepp';

const BEST: Record<DebateType, ResponseType> = {
  statistical: 'fakta',
  moral: 'motangrepp',
  policy: 'kansla',
};

export interface DebateResponse {
  type: ResponseType;
  text: string;
}

export interface Argument {
  id: string;
  issue: string;
  type: DebateType;
  text: string;
  responses: DebateResponse[]; // alltid tre: en per typ
}

// 15 argument fordelade over sakfragorna. Formulerade generiskt sa att vilket
// parti som helst trovardigt kan "sagt" dem mot vilket annat som helst.
export const ARGUMENTS: Argument[] = [
  {
    id: 'migration-stat',
    issue: 'migration',
    type: 'statistical',
    text: 'Siffrorna är tydliga – bidragsberoendet bland nyanlända har ökat med 40 % under er tid. Det är ett totalt misslyckande.',
    responses: [
      { type: 'fakta', text: 'Era siffror är cherry-picking. Sysselsättningen bland utrikesfödda har faktiskt stigit med 12 procentenheter sedan 2020.' },
      { type: 'kansla', text: 'Bakom varje siffra står en människa – och vi måste prata om vad som gör skillnad på riktigt.' },
      { type: 'motangrepp', text: 'Och vems statsråd var det som skrev under etableringsavtalen från början? Just det – era egna.' },
    ],
  },
  {
    id: 'migration-moral',
    issue: 'migration',
    type: 'moral',
    text: 'Hur kan ni se barn utvisas till krigszoner och fortfarande hävda att er politik är human? Det är en skam.',
    responses: [
      { type: 'motangrepp', text: 'Det är ert parti som röstat ner barnrättsperspektivet i de senaste tre migrationsutredningarna. Prata inte med oss om moral.' },
      { type: 'kansla', text: 'Jag tänker på de familjerna varje dag. Men vi måste ha regler som gäller alla – annars faller systemet.' },
      { type: 'fakta', text: 'Rättssäkerheten är central – 83 % av Migrationsverkets beslut står sig i domstol.' },
    ],
  },
  {
    id: 'migration-policy',
    issue: 'migration',
    type: 'policy',
    text: 'Era förslag om nya kvoter är orealistiska. Ingen seriös expert tror på dem.',
    responses: [
      { type: 'kansla', text: 'Jag var i Södertälje i förra veckan. Där vet alla att det inte funkar som idag – de vill ha förändring.' },
      { type: 'fakta', text: 'Våra förslag är framtagna med Migrationsverket och ligger inom gällande EU-rätt. De är fullt genomförbara.' },
      { type: 'motangrepp', text: 'Era egna förslag har pajat tre utredningar i rad. Minns ni ens vad ni gick till val på 2022?' },
    ],
  },
  {
    id: 'brott-stat',
    issue: 'brott',
    type: 'statistical',
    text: 'Antalet skjutningar har ökat med 60 % under er mandatperiod. Era åtgärder har havererat.',
    responses: [
      { type: 'fakta', text: 'Faktum är att antalet dödsskjutningar sjunkit tre kvartal i rad enligt Brå. Men visst – vi är inte nöjda.' },
      { type: 'kansla', text: 'Varje skjutning är en tragedi. Jag mötte en mamma i Göteborg vars son blev skjuten – det driver mig varje dag.' },
      { type: 'motangrepp', text: 'Och under era år byggde ni upp exakt den utsatthet gängen rekryterar ur. Ni är del av problemet.' },
    ],
  },
  {
    id: 'brott-moral',
    issue: 'brott',
    type: 'moral',
    text: 'Varje mord är ett politiskt misslyckande – och ni står där och diskuterar paragrafer medan människor dör.',
    responses: [
      { type: 'motangrepp', text: 'Det var ni som i åtta år drev linjen att "mjuka åtgärder" räckte. Hur sover ni om nätterna?' },
      { type: 'kansla', text: 'Ni har rätt – det är fruktansvärt. Jag har varit på för många begravningar. Men vi måste faktiskt agera, inte bara känna.' },
      { type: 'fakta', text: 'Vi har satt in 2 300 nya poliser och trefaldigat straff för grovt vapenbrott. Resultaten tar tid men kommer.' },
    ],
  },
  {
    id: 'brott-policy',
    issue: 'brott',
    type: 'policy',
    text: 'Era straffskärpningar är rent populistiska. Alla seriösa kriminologer säger att de inte fungerar.',
    responses: [
      { type: 'kansla', text: 'Prata med folk i Vårberg eller Rinkeby om "fungerar" – de är livrädda. Vi måste visa att samhället slår tillbaka.' },
      { type: 'fakta', text: 'Faktiskt pekar Brå själva på att skärpta straff för grova vapenbrott har haft avskräckande effekt.' },
      { type: 'motangrepp', text: 'Era kriminologer? De samma som sa att gängvåldet skulle minska 2018? Så pålitligt.' },
    ],
  },
  {
    id: 'valfard-stat',
    issue: 'valfard',
    type: 'statistical',
    text: 'Vårdköerna är rekordlånga. 450 000 svenskar väntar på operation. Det är er politik i siffror.',
    responses: [
      { type: 'fakta', text: 'Köerna har faktiskt kortats i åtta regioner senaste kvartalet. Men vi är inte nöjda – vi vill statlig vård.' },
      { type: 'kansla', text: 'Min egen mamma stod i kö i 14 månader. Det är därför jag kämpar för det här.' },
      { type: 'motangrepp', text: 'Och ni? Under er tid byggde ni ner akutvården och sålde ut sjukhus. Fräckt att komma och klaga nu.' },
    ],
  },
  {
    id: 'valfard-moral',
    issue: 'valfard',
    type: 'moral',
    text: 'Mormödrar ligger på vårdkorridorer medan ni skär i välfärden. Vart tog anständigheten vägen?',
    responses: [
      { type: 'motangrepp', text: 'Det var ni som införde vinstjakten i äldreomsorgen. Prata inte med oss om anständighet.' },
      { type: 'kansla', text: 'Jag har själv jobbat i äldreomsorgen. Det ni beskriver är verkligt, och det är mitt livs uppdrag att ändra det.' },
      { type: 'fakta', text: 'Vi har tillfört 18 miljarder till vården det här året – mer än någon tidigare regering.' },
    ],
  },
  {
    id: 'ekonomi-stat',
    issue: 'ekonomi',
    type: 'statistical',
    text: 'Inflationen har ätit upp 15 % av medelinkomsttagarens köpkraft under er tid. Hur försvarar ni det?',
    responses: [
      { type: 'fakta', text: 'Inflationen är ett globalt fenomen – 11 av EU:s 27 länder har det värre. Vi har levererat störst skattesänkning för låginkomsttagare på 20 år.' },
      { type: 'kansla', text: 'Jag vet att det är tufft vid matkassen. Jag har pratat med barnfamiljer som väljer bort kött – det är fruktansvärt.' },
      { type: 'motangrepp', text: 'Era egna partikamrater röstade för alla räntehöjningar. Nu låtsas ni att det var vårt fel?' },
    ],
  },
  {
    id: 'ekonomi-policy',
    issue: 'ekonomi',
    type: 'policy',
    text: 'Era skatteförslag skulle kosta statsbudgeten 80 miljarder. Hur ska det finansieras? Säg det ärligt.',
    responses: [
      { type: 'kansla', text: 'Prata med en undersköterska i Boden om hennes verklighet. Det är därför vi måste våga göra det här.' },
      { type: 'fakta', text: 'Vi finansierar via höjd kapitalbeskattning, slopade ränteavdrag över taket och ökade miljöskatter. Allt redovisat i vårt skuggbudget.' },
      { type: 'motangrepp', text: 'Och era "ofinansierade" skattesänkningar 2024? De var 65 miljarder, utan en krona i täckning. Men det får vi inte prata om.' },
    ],
  },
  {
    id: 'klimat-moral',
    issue: 'klimat',
    type: 'moral',
    text: 'Våra barn ärver en förstörd planet – och ni försvarar fortfarande fossila subventioner. Det är historielöst.',
    responses: [
      { type: 'motangrepp', text: 'Ni röstade själva för de subventionerna 2021. Vi vågar åtminstone prata om vad som funkar nu.' },
      { type: 'kansla', text: 'Jag har en dotter på 7 år. Varje dag tänker jag på vilken värld hon ärver. Det är därför jag står här.' },
      { type: 'fakta', text: 'Sverige har sänkt utsläppen med 35 % sedan 1990 medan BNP ökat 100 %. Det går att göra båda.' },
    ],
  },
  {
    id: 'klimat-policy',
    issue: 'klimat',
    type: 'policy',
    text: 'Era klimatmål är orealistiska. 2045 noll utsläpp – det finns ingen trovärdig plan för hur det ska gå till.',
    responses: [
      { type: 'kansla', text: 'Jag var i Kiruna där gruvdriften ställs om till fossilfritt stål. Det är inte en pappersplan – det händer nu.' },
      { type: 'fakta', text: 'Energimyndigheten, Konjunkturinstitutet och IEA bedömer alla att målet är nåbart med rätt styrmedel.' },
      { type: 'motangrepp', text: 'Era egna experter var med och tog fram planen 2017. Att ni nu kallar den orealistisk säger mer om er än om målet.' },
    ],
  },
  {
    id: 'skola-stat',
    issue: 'skola',
    type: 'statistical',
    text: 'Pisa-resultaten rasar. Svensk skola har tappat 25 placeringar sedan ni tog över. Det är ett brott mot våra barn.',
    responses: [
      { type: 'fakta', text: 'Senaste Pisa visade faktiskt uppgång i matematik för första gången på 15 år. Men ni har rätt – det räcker inte.' },
      { type: 'kansla', text: 'Min son går i åk 7. När han säger att han inte lär sig – då bryter det mitt hjärta. Det driver det här.' },
      { type: 'motangrepp', text: 'Och vem var det som avreglerade skolan på 90-talet? Just det, era företrädare. Nu vill ni prata resultat.' },
    ],
  },
  {
    id: 'energi-policy',
    issue: 'energi',
    type: 'policy',
    text: 'Att bygga ut kärnkraft tar 15 år. Era löften om ny baskraft "snart" är tekniskt omöjliga på kort sikt.',
    responses: [
      { type: 'kansla', text: 'Jag var i Oskarshamn och pratade med ingenjörerna. De vill bygga, de är redo. Vad som fattas är politisk ryggrad.' },
      { type: 'fakta', text: 'Nya SMR-reaktorer kan vara i drift inom 7 år – det är inte 15. Finland har visat att det går.' },
      { type: 'motangrepp', text: 'Era egna beslut att stänga Ringhals orsakade dagens läge. Det är inte vi som orsakar förseningar – det är ni.' },
    ],
  },
  {
    id: 'forsvar-moral',
    issue: 'forsvar',
    type: 'moral',
    text: 'Våra soldater kämpar underfinansierade medan ni bråkar om kompromissbudgetar. Är det så ni möter Rysslandshotet?',
    responses: [
      { type: 'motangrepp', text: 'Det var ni som skar försvaret i botten 2010. Nu försöker ni skriva om historien.' },
      { type: 'kansla', text: 'Jag har en bror i försvaret. När han säger att han är stolt att tjäna – då vet jag att det är värt varje krona.' },
      { type: 'fakta', text: 'Vi når 2,2 % av BNP i försvarsutgifter 2026 – över NATO-målet. Det är den största upprustningen sedan kalla kriget.' },
    ],
  },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface DebateSetup {
  opponentPartyId: string;
  rounds: Argument[]; // 4 argument
}

/** Deterministisk motstandare och runduppsattning for en given dag/parti. */
export function getDebateFor(day: number, playerPartyId: string, hotIssue: string | null): DebateSetup {
  const others = VALFEBER_PARTIES.filter((p) => p !== playerPartyId);
  const h = hash(`${day}:${playerPartyId}`);
  const opponentPartyId = others[h % others.length];

  const hotArgs = hotIssue ? ARGUMENTS.filter((a) => a.issue === hotIssue) : [];
  const otherArgs = ARGUMENTS.filter((a) => !hotArgs.includes(a));
  const pool = [...hotArgs, ...otherArgs]; // het fraga forst for extra relevans

  const rounds: Argument[] = [];
  const used = new Set<string>();
  for (let i = 0; rounds.length < 4 && i < pool.length * 2; i++) {
    const a = pool[(h + i * 7) % pool.length];
    if (!used.has(a.id)) {
      rounds.push(a);
      used.add(a.id);
    }
  }
  while (rounds.length < 4) rounds.push(ARGUMENTS[rounds.length % ARGUMENTS.length]);
  return { opponentPartyId, rounds };
}

export interface DebateResult {
  score: number;    // 0..100 slutlig publikmatare
  swings: number[]; // publikmatarens svang per runda (-10 .. +15)
  wins: number;     // antal ratta responser
  bestResponseIndex: number[]; // for client-reveal: index 0-2 av basta svaret per runda
}

/** Betygsatt debattresultat. +15 for ratt motsvarighet, -10 for fel. */
export function scoreDebate(answers: number[], setup: DebateSetup): DebateResult {
  const swings: number[] = [];
  let wins = 0;
  const bestResponseIndex: number[] = [];

  for (let i = 0; i < setup.rounds.length; i++) {
    const r = setup.rounds[i];
    const best = BEST[r.type];
    const bestIdx = r.responses.findIndex((x) => x.type === best);
    bestResponseIndex.push(bestIdx);

    const pick = Number.isInteger(answers[i]) ? answers[i] : -1;
    const response = r.responses[pick];
    if (!response) {
      swings.push(-10);
      continue;
    }
    if (response.type === best) {
      swings.push(15);
      wins++;
    } else {
      swings.push(-10);
    }
  }
  const total = swings.reduce((a, b) => a + b, 0);
  const score = Math.max(0, Math.min(100, 50 + total));
  return { score, swings, wins, bestResponseIndex };
}
