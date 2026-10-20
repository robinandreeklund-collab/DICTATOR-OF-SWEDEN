// Regional kampanj-minispelet. Spelaren valjer en valkrets och fordelar 10
// kampanjtimmar over fyra demografier. Varje demografi har en mottaglighet
// (receptiveness) som varierar per parti - vad som funkar for S skiljer sig
// fran vad som funkar for MP.

import { Campaign } from '@dos/shared';

export type Demographic = 'pensionarer' | 'arbetstagare' | 'unga' | 'barnfamiljer';

export const DEMOGRAPHICS: Demographic[] = ['pensionarer', 'arbetstagare', 'unga', 'barnfamiljer'];
export const TOTAL_HOURS = 10;

// Hur mottaglig varje demografi ar for ett parti (multiplikator pa timmar).
const RECEPTIVENESS: Record<string, Record<Demographic, number>> = {
  s:  { pensionarer: 1.3, arbetstagare: 1.4, unga: 0.9, barnfamiljer: 1.1 },
  m:  { pensionarer: 1.1, arbetstagare: 1.2, unga: 0.9, barnfamiljer: 1.3 },
  sd: { pensionarer: 1.4, arbetstagare: 1.3, unga: 0.8, barnfamiljer: 1.0 },
  v:  { pensionarer: 0.9, arbetstagare: 1.2, unga: 1.4, barnfamiljer: 1.1 },
  c:  { pensionarer: 1.1, arbetstagare: 1.0, unga: 1.0, barnfamiljer: 1.2 },
  kd: { pensionarer: 1.4, arbetstagare: 1.0, unga: 0.8, barnfamiljer: 1.3 },
  mp: { pensionarer: 0.8, arbetstagare: 1.0, unga: 1.5, barnfamiljer: 1.1 },
  l:  { pensionarer: 1.0, arbetstagare: 1.1, unga: 1.1, barnfamiljer: 1.2 },
};

export interface RegionalResult {
  valkretsId: string;
  perDemo: Record<Demographic, number>; // effekt per demografi
  totalEffect: number;
  supportDelta: number; // vad som tillfors i valkretsen
}

export function receptivenessFor(partyId: string): Record<Demographic, number> {
  return RECEPTIVENESS[partyId] ?? RECEPTIVENESS.s;
}

export function scoreRegional(
  partyId: string,
  valkretsId: string,
  allocation: Partial<Record<Demographic, number>>,
): { ok: boolean; error?: string; result?: RegionalResult; points?: number } {
  if (!Campaign.VALKRETS_BY_ID[valkretsId]) {
    return { ok: false, error: 'Ogiltig valkrets.' };
  }
  // Sanitera och verifiera totalen.
  let total = 0;
  const alloc: Record<Demographic, number> = { pensionarer: 0, arbetstagare: 0, unga: 0, barnfamiljer: 0 };
  for (const d of DEMOGRAPHICS) {
    const raw = Math.max(0, Math.floor(allocation[d] ?? 0));
    alloc[d] = raw;
    total += raw;
  }
  if (total === 0) return { ok: false, error: 'Du måste fordela minst en timme.' };
  if (total > TOTAL_HOURS) return { ok: false, error: `Du har bara ${TOTAL_HOURS} timmar.` };

  const rec = receptivenessFor(partyId);
  const perDemo: Record<Demographic, number> = { pensionarer: 0, arbetstagare: 0, unga: 0, barnfamiljer: 0 };
  let totalEffect = 0;
  for (const d of DEMOGRAPHICS) {
    const e = alloc[d] * rec[d];
    perDemo[d] = Math.round(e * 10) / 10;
    totalEffect += e;
  }
  const supportDelta = Math.round(totalEffect * 0.55 * 10) / 10;
  const points = Math.round(8 + totalEffect * 1.6);

  return {
    ok: true,
    points,
    result: { valkretsId, perDemo, totalEffect: Math.round(totalEffect * 10) / 10, supportDelta },
  };
}
