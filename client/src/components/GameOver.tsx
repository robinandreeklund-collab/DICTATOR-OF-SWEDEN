import { getParty, type ClientGameView, type LawCard } from '@dos/shared';
import { useStore } from '../store.js';
import { ROLE_LABEL, TEAM_LABEL } from '../lib.js';

export function GameOver({ g, isHost }: { g: ClientGameView; isHost: boolean }) {
  const restartGame = useStore((s) => s.restartGame);
  const leaveRoom = useStore((s) => s.leaveRoom);
  const winner = g.winner;
  const roles = g.finalRoles ?? {};
  const enacted: LawCard[] = [...g.democraticEnacted, ...g.authoritarianEnacted];

  return (
    <div className="game-over">
      <div className={`go-banner go-${winner}`}>
        <span className="go-sub">Spelet är slut</span>
        <h1>{winner ? `${TEAM_LABEL[winner]} vinner` : 'Oavgjort'}</h1>
        <p>{g.winReason}</p>
      </div>

      <div className="go-grid">
        <section className="card">
          <h2>Rollerna avslöjas</h2>
          <ul className="reveal-list">
            {g.players.map((p) => {
              const party = getParty(p.partyId);
              const role = roles[p.id];
              return (
                <li key={p.id}>
                  <span className="seat-mark" style={{ background: party.color }}>
                    {party.shortName}
                  </span>
                  <span className="reveal-list-name">{p.name}</span>
                  <span className="muted">{party.name}</span>
                  {role && (
                    <span className={`tag role-tag-${role}`}>{ROLE_LABEL[role]}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2>Riksdagens facit</h2>
          <p className="muted small">
            Lagförslagen är dramatiserade men inspirerade av verkliga debatter inför
            valet 2026. Så här förhåller de sig till verkligheten:
          </p>
          {enacted.length === 0 && <p className="muted">Inga lagar hann antas.</p>}
          <ul className="facit-list">
            {enacted.map((c) => (
              <li key={c.id} className={`facit-item facit-${c.type}`}>
                <div className="facit-head">
                  <strong>{c.title}</strong>
                  <span className="facit-topic">{c.topic}</span>
                </div>
                <p className="facit-fact">{c.factCheck}</p>
                <p className="facit-source">Källa: {c.source}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="row go-actions">
        {isHost ? (
          <button className="btn btn-primary" onClick={restartGame}>
            Tillbaka till lobbyn
          </button>
        ) : (
          <p className="muted">Värden kan ta tillbaka sällskapet till lobbyn.</p>
        )}
        <button className="btn btn-ghost" onClick={leaveRoom}>
          Lämna spelet
        </button>
      </div>
    </div>
  );
}
