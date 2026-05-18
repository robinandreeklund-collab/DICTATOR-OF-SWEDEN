import { getParty, type NationalProjection } from '@dos/shared';

// Opinionsstaplar for de atta partierna med 4-procentssparr.

export function PollBars({ projection }: { projection: NationalProjection[] }) {
  const sorted = [...projection].sort((a, b) => b.percent - a.percent);
  const max = Math.max(30, ...sorted.map((p) => p.percent));

  return (
    <div className="poll-bars">
      <div className="poll-title">Opinionslaget</div>
      <div className="poll-list">
        {sorted.map((p) => {
          const party = getParty(p.partyId);
          return (
            <div
              key={p.partyId}
              className={`poll-row ${p.passedThreshold ? '' : 'poll-below'}`}
            >
              <span className="poll-tag" style={{ background: party.color }}>
                {party.shortName}
              </span>
              <div className="poll-track">
                <div
                  className="poll-fill"
                  style={{ width: `${(p.percent / max) * 100}%`, background: party.color }}
                />
                <span
                  className="poll-threshold"
                  style={{ left: `${(4 / max) * 100}%` }}
                  title="4-procentssparren"
                />
              </div>
              <span className="poll-pct">{p.percent.toFixed(1)}%</span>
              <span className="poll-mandate">{p.mandates}</span>
            </div>
          );
        })}
      </div>
      <div className="poll-legend">
        <span className="poll-threshold-key" /> 4 %-sparr · siffran till hoger = mandat
      </div>
    </div>
  );
}
