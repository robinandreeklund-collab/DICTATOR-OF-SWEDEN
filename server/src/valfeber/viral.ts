// Viral post-minispelet. Spelaren kombinerar en kansla, en vinkel och ett
// format – kombinationen avgor hur viralt inlagget blir. Varje parti har en
// "sweet spot" (sitt sattt att prata). Dagens heta fraga ger extra skjuts
// nar vinkeln ar loften eller attack och partiet ager fragan.

import { Campaign } from '@dos/shared';

export type Emotion = 'hopp' | 'oro' | 'humor';
export type Angle = 'loften' | 'attack' | 'personligt';
export type PostFormat = 'bildcitat' | 'video' | 'trad';

export const EMOTIONS: Emotion[] = ['hopp', 'oro', 'humor'];
export const ANGLES: Angle[] = ['loften', 'attack', 'personligt'];
export const FORMATS: PostFormat[] = ['bildcitat', 'video', 'trad'];

interface PartyPref {
  emotion: Emotion;
  angle: Angle;
  format: PostFormat;
}

// Varje partis "ovanliga rost" – nar spelaren traffar den gar inlagget bast.
const PARTY_PREFS: Record<string, PartyPref> = {
  s:  { emotion: 'oro',  angle: 'personligt', format: 'bildcitat' },
  m:  { emotion: 'hopp', angle: 'loften',     format: 'trad' },
  sd: { emotion: 'oro',  angle: 'attack',     format: 'video' },
  v:  { emotion: 'oro',  angle: 'personligt', format: 'bildcitat' },
  c:  { emotion: 'hopp', angle: 'loften',     format: 'trad' },
  kd: { emotion: 'hopp', angle: 'personligt', format: 'bildcitat' },
  mp: { emotion: 'oro',  angle: 'personligt', format: 'video' },
  l:  { emotion: 'hopp', angle: 'loften',     format: 'trad' },
};

export interface ViralResult {
  score: number;        // 0..60
  viral: boolean;       // score >= 40
  breakdown: {
    bas: number;
    emotion: number;
    angle: number;
    format: number;
    frage: number;
    slump: number;
  };
  prefHint: PartyPref;  // for faceted feedback
}

export function scoreViral(
  partyId: string,
  hotIssue: string | null,
  pick: { emotion: Emotion; angle: Angle; format: PostFormat },
): ViralResult {
  const pref = PARTY_PREFS[partyId] ?? PARTY_PREFS.s;
  const b = {
    bas: 12,
    emotion: pick.emotion === pref.emotion ? 12 : 0,
    angle: pick.angle === pref.angle ? 10 : 0,
    format: pick.format === pref.format ? 8 : 0,
    frage: 0,
    slump: Math.floor(Math.random() * 10) - 2,
  };
  const ownsHot = hotIssue
    ? (Campaign.ISSUE_BY_ID[hotIssue]?.owners ?? []).includes(partyId)
    : false;
  if (ownsHot && (pick.angle === 'loften' || pick.angle === 'attack')) {
    b.frage = 10;
  }
  const score = Math.max(5, b.bas + b.emotion + b.angle + b.format + b.frage + b.slump);
  return { score, viral: score >= 40, breakdown: b, prefHint: pref };
}
