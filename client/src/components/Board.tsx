import { getPowerForPosition, type ClientGameView } from '@dos/shared';
import { POWER_LABEL } from '../lib.js';

const POWER_ICON: Record<string, string> = {
  investigate: '🔍',
  specialElection: '🗳',
  peek: '👁',
  execute: '⚖',
};

export function Board({ g }: { g: ClientGameView }) {
  const playerCount = g.players.length;

  return (
    <div className="board">
      <Track
        label="Demokratins försvar"
        kind="democratic"
        target={g.democraticTarget}
        enacted={g.democraticEnacted}
        playerCount={playerCount}
      />
      <Track
        label="Vägen mot diktatur"
        kind="authoritarian"
        target={g.authoritarianTarget}
        enacted={g.authoritarianEnacted}
        playerCount={playerCount}
      />

      <div className="board-meta">
        <div className="tracker">
          <span className="tracker-label">Riksdagskaos</span>
          <div className="tracker-dots">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`tracker-dot ${i < g.electionTracker ? 'tracker-on' : ''}`}
              />
            ))}
          </div>
          <span className="muted small">
            {g.electionTracker}/3 fallna regeringar — vid 3 antas ett förslag
            automatiskt.
          </span>
        </div>
        <div className="deck-info">
          <span title="Lagförslag kvar i kortleken">Kortlek: {g.deckCount}</span>
          <span title="Slängda förslag">Slänghög: {g.discardCount}</span>
        </div>
      </div>
    </div>
  );
}

function Track({
  label,
  kind,
  target,
  enacted,
  playerCount,
}: {
  label: string;
  kind: 'democratic' | 'authoritarian';
  target: number;
  enacted: { id: string; title: string; topic: string }[];
  playerCount: number;
}) {
  return (
    <div className={`track track-${kind}`}>
      <div className="track-label">
        {label} <span className="track-count">{enacted.length}/{target}</span>
      </div>
      <div className="track-slots">
        {Array.from({ length: target }, (_, i) => {
          const card = enacted[i];
          const power =
            kind === 'authoritarian'
              ? getPowerForPosition(playerCount, i + 1)
              : null;
          return (
            <div
              key={i}
              className={`slot ${card ? 'slot-filled' : ''}`}
              title={card ? `${card.title} — ${card.topic}` : power ? POWER_LABEL[power] : ''}
            >
              {card ? (
                <span className="slot-card">{card.topic}</span>
              ) : power ? (
                <span className="slot-power">{POWER_ICON[power]}</span>
              ) : (
                <span className="slot-empty" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
