import { getParty, type CampaignClientView } from '@dos/shared';

export function WeeklyResult({ view }: { view: CampaignClientView }) {
  const o = view.lastOutcome;
  if (!o) return null;

  const swings = Object.entries(o.swing)
    .map(([partyId, change]) => ({ partyId, change }))
    .sort((a, b) => b.change - a.change);

  const winner = o.debate
    ? view.teams.find((t) => t.id === o.debate!.winnerTeamId)
    : null;

  return (
    <div className="weekly-result">
      <div className="wr-card">
        <span className="wr-eyebrow">Vecka {o.week} summeras</span>
        <h2>{o.headline}</h2>

        {o.debate && winner && (
          <p className="wr-debate">
            <span className="wr-debate-tag" style={{ background: getParty(winner.partyId).color }}>
              Debatt
            </span>
            {getParty(winner.partyId).name} vann partiledardebatten.
          </p>
        )}

        {o.sabotagedTeamIds.length > 0 && (
          <p className="wr-sabotage">
            ⚠ Sabotage anades i {o.sabotagedTeamIds.length} lag denna vecka.
          </p>
        )}

        <div className="wr-swings">
          {swings.map((s) => (
            <div key={s.partyId} className="wr-swing">
              <span className="wr-swing-tag" style={{ background: getParty(s.partyId).color }}>
                {getParty(s.partyId).shortName}
              </span>
              <span
                className={`wr-swing-val ${s.change >= 0 ? 'wr-up' : 'wr-down'}`}
              >
                {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <p className="muted small">Nasta vecka borjar strax…</p>
      </div>
    </div>
  );
}
