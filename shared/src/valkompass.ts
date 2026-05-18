// Valkompass infor riksdagsvalet 2026. Anvands i lobbyn for att matcha
// varje spelare med ett riksdagsparti. Pastaendena ar formulerade utifran
// de stora sakfragorna i valrorelsen 2026.

export type AnswerKey = 'helt' | 'delvis' | 'neutral' | 'knappast' | 'inte';

export const ANSWER_OPTIONS: { key: AnswerKey; label: string; multiplier: number }[] = [
  { key: 'helt', label: 'Instammer helt', multiplier: 1 },
  { key: 'delvis', label: 'Instammer delvis', multiplier: 0.5 },
  { key: 'neutral', label: 'Varken eller', multiplier: 0 },
  { key: 'knappast', label: 'Instammer knappast', multiplier: -0.5 },
  { key: 'inte', label: 'Instammer inte alls', multiplier: -1 },
];

export const ANSWER_MULTIPLIER: Record<AnswerKey, number> = Object.fromEntries(
  ANSWER_OPTIONS.map((o) => [o.key, o.multiplier]),
) as Record<AnswerKey, number>;

export interface ValkompassQuestion {
  id: string;
  topic: string;
  statement: string;
  /** Partianpassning vid "instammer helt". */
  effects: Record<string, number>;
}

export const VALKOMPASS_QUESTIONS: ValkompassQuestion[] = [
  {
    id: 'q_brott',
    topic: 'Brott och straff',
    statement: 'Straffen for grova brott ska skarpas kraftigt.',
    effects: { sd: 2, m: 2, kd: 1, l: 1, s: 0, c: -1, v: -2, mp: -2 },
  },
  {
    id: 'q_migration',
    topic: 'Migration',
    statement: 'Invandringen till Sverige ska minska kraftigt.',
    effects: { sd: 3, m: 1, kd: 1, l: 0, s: 0, c: -1, v: -2, mp: -2 },
  },
  {
    id: 'q_karnkraft',
    topic: 'Energi',
    statement: 'Sverige ska bygga ut karnkraften.',
    effects: { m: 2, sd: 2, kd: 1, l: 1, c: -1, s: 0, v: -1, mp: -2 },
  },
  {
    id: 'q_klimat',
    topic: 'Klimat',
    statement: 'Klimatomstallningen maste ga mycket snabbare, aven om det kostar.',
    effects: { mp: 3, v: 2, c: 1, s: 0, l: 0, m: -1, kd: -1, sd: -2 },
  },
  {
    id: 'q_skatt',
    topic: 'Skatter',
    statement: 'Skatten for hoginkomsttagare ska hojas.',
    effects: { v: 3, s: 1, mp: 1, c: -1, l: -1, kd: -1, m: -2, sd: 0 },
  },
  {
    id: 'q_vinst',
    topic: 'Valfard',
    statement: 'Vinstjakten i skattefinansierad valfard ska stoppas.',
    effects: { v: 3, s: 2, mp: 1, sd: 0, kd: -1, l: -1, c: -2, m: -2 },
  },
  {
    id: 'q_forsvar',
    topic: 'Forsvar',
    statement: 'Forsvarsanslagen ska oka snabbt.',
    effects: { m: 2, kd: 1, l: 1, sd: 1, s: 1, c: 0, mp: 0, v: -1 },
  },
  {
    id: 'q_eu',
    topic: 'EU',
    statement: 'Sverige ska fordjupa samarbetet inom EU.',
    effects: { l: 3, m: 1, c: 1, s: 1, mp: 1, kd: 0, v: -2, sd: -3 },
  },
  {
    id: 'q_skola',
    topic: 'Skola',
    statement: 'Friskolor och tidiga betyg ar bra for svensk skola.',
    effects: { l: 2, m: 2, kd: 1, sd: 1, c: 0, s: -1, mp: -1, v: -2 },
  },
  {
    id: 'q_overvakning',
    topic: 'Trygghet',
    statement: 'Polisen ska fa anvanda mer kameraovervakning och avlyssning.',
    effects: { sd: 2, m: 2, kd: 1, s: 0, c: -1, l: -1, v: -2, mp: -2 },
  },
  {
    id: 'q_drivmedel',
    topic: 'Landsbygd',
    statement: 'Drivmedelsskatten ar for hog och bor sankas.',
    effects: { sd: 2, c: 2, m: 1, kd: 1, l: 0, s: 0, v: -1, mp: -2 },
  },
  {
    id: 'q_jamstalldhet',
    topic: 'Jamlikhet',
    statement: 'Samhallet bor gora mer for jamstalldhet och minoriteters rattigheter.',
    effects: { v: 2, mp: 2, s: 1, c: 1, l: 1, kd: -1, m: -1, sd: -2 },
  },
  {
    id: 'q_sjukvard',
    topic: 'Sjukvard',
    statement: 'Staten bor ta over ansvaret for sjukvarden fran regionerna.',
    effects: { kd: 3, sd: 1, m: 1, l: 0, s: 0, mp: 0, v: 0, c: -1 },
  },
  {
    id: 'q_medborgarskap',
    topic: 'Integration',
    statement: 'Det ska bli svarare att fa svenskt medborgarskap.',
    effects: { sd: 3, m: 1, kd: 1, l: 0, s: 0, c: -1, v: -2, mp: -2 },
  },
  {
    id: 'q_foretag',
    topic: 'Foretagande',
    statement: 'Det ska bli enklare och billigare att driva foretag pa landsbygden.',
    effects: { c: 3, m: 1, l: 1, kd: 1, sd: 1, s: 0, mp: 0, v: -1 },
  },
];

export interface ValkompassResult {
  partyId: string;
  score: number;
  /** Normaliserad procent 0-100 for visning. */
  percent: number;
}

const PARTY_IDS = ['s', 'm', 'sd', 'v', 'mp', 'c', 'kd', 'l'];

/**
 * Berakna partimatchning fran valkompass-svar.
 * Returnerar partier sorterade fran bast till samst match.
 */
export function scoreValkompass(
  answers: Record<string, AnswerKey>,
): ValkompassResult[] {
  const raw: Record<string, number> = Object.fromEntries(
    PARTY_IDS.map((id) => [id, 0]),
  );

  for (const q of VALKOMPASS_QUESTIONS) {
    const answer = answers[q.id];
    if (!answer) continue;
    const mult = ANSWER_MULTIPLIER[answer];
    for (const [partyId, effect] of Object.entries(q.effects)) {
      raw[partyId] += effect * mult;
    }
  }

  const values = Object.values(raw);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const results: ValkompassResult[] = PARTY_IDS.map((id) => ({
    partyId: id,
    score: raw[id],
    percent: Math.round(((raw[id] - min) / span) * 100),
  }));

  // Stabil sortering: hogst poang forst, sedan alfabetiskt pa id.
  results.sort((a, b) => b.score - a.score || a.partyId.localeCompare(b.partyId));
  return results;
}
