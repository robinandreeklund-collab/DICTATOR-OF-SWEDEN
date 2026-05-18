import { useEffect, useState } from 'react';
import { teamOf, type ClientGameView } from '@dos/shared';
import { ROLE_BLURB, ROLE_LABEL, TEAM_LABEL, playerName } from '../lib.js';

export function RoleReveal({ g }: { g: ClientGameView }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const role = g.you.role;
  if (!role) return null;
  const team = teamOf(role);

  return (
    <div className="reveal-overlay">
      <div className={`reveal-card ${revealed ? 'reveal-open' : ''} reveal-${team}`}>
        {!revealed ? (
          <div className="reveal-front">
            <div className="reveal-seal">⚖</div>
            <p>Riksdagen sammanträder…</p>
            <p className="muted">Ditt hemliga uppdrag delas ut</p>
          </div>
        ) : (
          <div className="reveal-back">
            <span className="reveal-team">{TEAM_LABEL[team]}</span>
            <h1 className="reveal-role">{ROLE_LABEL[role]}</h1>
            <p className="reveal-blurb">{ROLE_BLURB[role]}</p>
            {g.you.knownAllies.length > 0 && (
              <div className="reveal-allies">
                <span>Dina hemliga allierade:</span>
                <ul>
                  {g.you.knownAllies.map((a) => (
                    <li key={a.id}>
                      {playerName(g, a.id)} — {ROLE_LABEL[a.role]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="muted small">Spelet börjar strax…</p>
          </div>
        )}
      </div>
    </div>
  );
}
