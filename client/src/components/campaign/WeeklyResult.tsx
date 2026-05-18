import { getParty, type CampaignClientView } from '@dos/shared';

export function WeeklyResult({ view }: { view: CampaignClientView }) {
  const o = view.lastOutcome;
  if (!o) return null;

  const swings = Object.entries(o.swing)
    .map(([partyId, change]) => ({ partyId, change }))
    .filter((s) => Math.abs(s.change) > 0.01)
    .sort((a, b) => b.change - a.change)
    .slice(0, 6);

  return (
    <div className="weekly-result">
      <div className="wr-card">
        <span className="wr-eyebrow">Vecka {o.week} · valstudion sammanfattar</span>
        <h2>{o.headline}</h2>

        {o.ticker.length > 0 && (
          <ul className="wr-ticker">
            {o.ticker.map((line, i) => (
              <li key={i} style={{ animationDelay: `${i * 0.12}s` }}>
                {line}
              </li>
            ))}
          </ul>
        )}

        {swings.length > 0 && (
          <div className="wr-swings">
            {swings.map((s) => (
              <div key={s.partyId} className="wr-swing">
                <span className="wr-swing-tag" style={{ background: getParty(s.partyId).color }}>
                  {getParty(s.partyId).shortName}
                </span>
                <span className={`wr-swing-val ${s.change >= 0 ? 'wr-up' : 'wr-down'}`}>
                  {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="muted small">Nasta vecka borjar strax…</p>
      </div>
    </div>
  );
}
