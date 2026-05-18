import type { CampaignClientView } from '@dos/shared';
import { RiksdagArc } from './RiksdagArc.js';

export function ElectionNight({ view }: { view: CampaignClientView }) {
  const r = view.result;
  if (!r) return null;
  const bloc = r.governingBloc === 'redgron' ? 'Rodgrona sidan' : 'Tido-sidan';

  return (
    <div className="election-night">
      <div className="en-inner">
        <span className="en-eyebrow">13 september 2026</span>
        <h1 className="en-title">Valnatten</h1>
        <RiksdagArc projection={view.projection} redgron={r.redgronMandate} tido={r.tidoMandate} />
        <div className={`en-verdict en-${r.governingBloc}`}>
          {bloc} bildar regering
        </div>
        <p className="muted">Rosterna ar raknade…</p>
      </div>
    </div>
  );
}
