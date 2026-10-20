// Krishanterings-minispelet. Tre beslutssteg med 3 val vardera. Varje val
// har en arketyp (fornekande/offensiv/erkannande). Olika partier haller bast
// konsekvent till en linje. Att aga dagens heta fraga ger extra skjuts.

import { Campaign } from '@dos/shared';

export type CrisisStep = 'statement' | 'press' | 'close';
export type Archetype = 'fornekande' | 'offensiv' | 'erkannande';

export interface CrisisChoice {
  id: string;
  archetype: Archetype;
  label: string;
  blurb: string;
}

interface StepPack {
  prompt: string;
  choices: CrisisChoice[]; // alltid 3 (en per arketyp)
}

export const CRISIS_SCRIPT: Record<CrisisStep, StepPack> = {
  statement: {
    prompt: 'Pressen vantar pa ditt forsta uttalande. Vad sager du?',
    choices: [
      { id: 's-forn', archetype: 'fornekande', label: 'Fornekar helt', blurb: 'Rubriken ar overdriven – inget konkret har hant.' },
      { id: 's-erk', archetype: 'erkannande', label: 'Erkanner och ber om ursakt', blurb: 'Jag tar fullt ansvar. Vi ska gora battre.' },
      { id: 's-off', archetype: 'offensiv', label: 'Skyller pa motstandarna', blurb: 'Detta ar en politisk kampanj mot oss, inget annat.' },
    ],
  },
  press: {
    prompt: 'Dagen efter sitter du i presstudion. Reportern pressar dig.',
    choices: [
      { id: 'p-forn', archetype: 'fornekande', label: 'Ligger lagt', blurb: 'Jag har inget att tillagga utover det som sagts.' },
      { id: 'p-erk', archetype: 'erkannande', label: 'Ger konkreta atgarder', blurb: 'Vi inrattar en oberoende utredning och strammar upp rutiner.' },
      { id: 'p-off', archetype: 'offensiv', label: 'Vander frage mot ankaret', blurb: 'Det ar intressant att SVT valjer just den har vinkeln…' },
    ],
  },
  close: {
    prompt: 'Dagens tredje steg: ett avslutande drag innan drevet mattas.',
    choices: [
      { id: 'c-erk', archetype: 'erkannande', label: 'Pratar om bred reform', blurb: 'Vi tar lardom och foreslar konkreta forandringar for hela sektorn.' },
      { id: 'c-off', archetype: 'offensiv', label: 'Byter dagordningen', blurb: 'Idag presenterar vi var nya satsning pa en annan fraga.' },
      { id: 'c-forn', archetype: 'fornekande', label: 'Avbryter alla intervjuer', blurb: 'Jag ska nu fokusera pa vart viktiga arbete. Period.' },
    ],
  },
};

export function stepChoices(step: CrisisStep): CrisisChoice[] {
  return CRISIS_SCRIPT[step].choices;
}

// Vilken arketyp som bast passar varje partis stil.
const PARTY_STYLE: Record<string, Archetype> = {
  s: 'erkannande', m: 'offensiv', sd: 'offensiv', v: 'erkannande',
  c: 'erkannande', kd: 'erkannande', mp: 'erkannande', l: 'offensiv',
};

export interface CrisisResult {
  score: number;
  points: number;
  support: number;
  text: string;
  picks: { step: CrisisStep; choice: CrisisChoice }[];
}

export function scoreCrisis(
  partyId: string,
  hotIssue: string | null,
  choices: Partial<Record<CrisisStep, string>>,
): { ok: boolean; error?: string; result?: CrisisResult } {
  const steps: CrisisStep[] = ['statement', 'press', 'close'];
  const picks: { step: CrisisStep; choice: CrisisChoice }[] = [];
  for (const s of steps) {
    const pack = CRISIS_SCRIPT[s];
    const id = choices[s];
    const c = id ? pack.choices.find((x) => x.id === id) : null;
    if (!c) return { ok: false, error: `Ogiltigt val i steg "${s}".` };
    picks.push({ step: s, choice: c });
  }

  // Baspoang 40, plus bonusar.
  let score = 40;

  const archs = picks.map((p) => p.choice.archetype);
  if (archs[0] === archs[1] && archs[1] === archs[2]) score += 20;
  else if (archs[0] === archs[1] || archs[1] === archs[2]) score += 8;

  const style = PARTY_STYLE[partyId] ?? 'erkannande';
  const matching = archs.filter((a) => a === style).length;
  score += matching * 6;

  const owns = hotIssue
    ? (Campaign.ISSUE_BY_ID[hotIssue]?.owners ?? []).includes(partyId)
    : false;
  if (owns && archs.includes('offensiv')) score += 8;

  if (archs[0] === 'fornekande' && archs[2] === 'offensiv') score -= 8;

  score = Math.max(5, Math.min(100, score));
  const points = Math.round(10 + score * 0.5);
  const support = Math.round((2 + score * 0.05) * 10) / 10;

  const flavor =
    score >= 80 ? 'Du vann krisen – stodet steg nar du bemotte det med stil.' :
    score >= 55 ? 'Du klarade krisen hyggligt. Drevet mattas.' :
    score >= 30 ? 'Du overlever men far en skrama.' :
                  'Krisen slog hart tillbaka. Opinionen rasar.';

  return {
    ok: true,
    result: { score, points, support, text: flavor, picks },
  };
}
