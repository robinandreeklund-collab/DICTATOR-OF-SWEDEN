import type { ClientGameView } from '@dos/shared';
import { useStore } from '../store.js';
import { LawCardView } from './LawCardView.js';
import { POWER_LABEL, eligibleTalmen, playerName } from '../lib.js';

function TargetPicker({
  g,
  ids,
  onPick,
}: {
  g: ClientGameView;
  ids: string[];
  onPick: (id: string) => void;
}) {
  if (ids.length === 0) return <p className="muted">Inga giltiga val.</p>;
  return (
    <div className="target-picker">
      {ids.map((id) => (
        <button key={id} className="btn target-chip" onClick={() => onPick(id)}>
          {playerName(g, id)}
        </button>
      ))}
    </div>
  );
}

export function ActionPanel({ g, meId }: { g: ClientGameView; meId: string }) {
  const sendAction = useStore((s) => s.sendAction);
  const me = g.players.find((p) => p.id === meId);
  const isPresident = g.presidentId === meId;
  const isTalman = g.nominatedTalmanId === meId;
  const alive = me?.alive ?? false;

  const waiting = (text: string) => (
    <div className="action-panel action-wait">
      <span className="action-spinner" /> {text}
    </div>
  );

  const presName = playerName(g, g.presidentId);
  const talmanName = playerName(g, g.nominatedTalmanId);

  switch (g.phase) {
    case 'nomination': {
      if (!isPresident) {
        return waiting(`${presName} ska nominera en talman.`);
      }
      return (
        <div className="action-panel">
          <h3>Du är statsminister</h3>
          <p>Nominera en talman att bilda regering med. Riksdagen röstar sedan.</p>
          <TargetPicker
            g={g}
            ids={eligibleTalmen(g)}
            onPick={(talmanId) => sendAction({ type: 'NOMINATE', talmanId })}
          />
        </div>
      );
    }

    case 'voting': {
      if (!alive) return waiting('Du är avsatt och deltar inte i omröstningen.');
      const myVote = g.votes[meId];
      if (myVote === 'none') {
        return (
          <div className="action-panel">
            <h3>Omröstning</h3>
            <p>
              Ska <strong>{presName}</strong> (statsminister) och{' '}
              <strong>{talmanName}</strong> (talman) bilda regering?
            </p>
            <div className="vote-buttons">
              <button
                className="btn vote-ja-btn"
                onClick={() => sendAction({ type: 'VOTE', vote: true })}
              >
                JA
              </button>
              <button
                className="btn vote-nej-btn"
                onClick={() => sendAction({ type: 'VOTE', vote: false })}
              >
                NEJ
              </button>
            </div>
          </div>
        );
      }
      const voted = Object.values(g.votes).filter((v) => v !== 'none').length;
      const total = Object.keys(g.votes).length;
      return waiting(`Din röst är lagd. Väntar på övriga (${voted}/${total}).`);
    }

    case 'legislationPresident': {
      if (isPresident && g.you.presidentCards.length > 0) {
        return (
          <div className="action-panel">
            <h3>Lagstiftning — statsminister</h3>
            <p>Du har dragit tre lagförslag. Släng ett. De övriga två går till talmannen.</p>
            <div className="card-row">
              {g.you.presidentCards.map((c) => (
                <LawCardView
                  key={c.id}
                  card={c}
                  onClick={() =>
                    sendAction({ type: 'PRESIDENT_DISCARD', cardId: c.id })
                  }
                />
              ))}
            </div>
          </div>
        );
      }
      return waiting(`${presName} väljer bland tre lagförslag.`);
    }

    case 'legislationTalman': {
      if (isTalman && g.you.talmanCards.length > 0) {
        return (
          <div className="action-panel">
            <h3>Lagstiftning — talman</h3>
            <p>Anta ett av de två förslagen. Det andra slängs.</p>
            <div className="card-row">
              {g.you.talmanCards.map((c) => (
                <LawCardView
                  key={c.id}
                  card={c}
                  onClick={() => sendAction({ type: 'TALMAN_ENACT', cardId: c.id })}
                />
              ))}
            </div>
            {g.vetoUnlocked && !g.vetoProposed && (
              <button
                className="btn btn-ghost"
                onClick={() => sendAction({ type: 'PROPOSE_VETO' })}
              >
                Föreslå veto mot båda förslagen
              </button>
            )}
          </div>
        );
      }
      return waiting(`${talmanName} antar ett av två lagförslag.`);
    }

    case 'vetoResponse': {
      if (isPresident) {
        return (
          <div className="action-panel">
            <h3>Vetobeslut</h3>
            <p>Talmannen föreslår veto — att slänga båda förslagen. Godkänner du?</p>
            <div className="row">
              <button
                className="btn btn-primary"
                onClick={() => sendAction({ type: 'VETO_RESPONSE', agree: true })}
              >
                Godkänn veto
              </button>
              <button
                className="btn"
                onClick={() => sendAction({ type: 'VETO_RESPONSE', agree: false })}
              >
                Avvisa — talmannen måste anta ett förslag
              </button>
            </div>
          </div>
        );
      }
      return waiting(`${presName} tar ställning till talmannens vetoförslag.`);
    }

    case 'powerAction': {
      const power = g.pendingPower;
      if (!isPresident || !power) {
        return waiting(
          `${presName} använder en maktbefogenhet${power ? `: ${POWER_LABEL[power]}` : ''}.`,
        );
      }
      if (power === 'peek') {
        return (
          <div className="action-panel">
            <h3>Granskning av kortleken</h3>
            <p>Detta är de tre översta lagförslagen. Bara du ser dem.</p>
            <div className="card-row">
              {g.you.peekedCards.map((c) => (
                <LawCardView key={c.id} card={c} />
              ))}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => sendAction({ type: 'POWER_PEEK_DONE' })}
            >
              Klar
            </button>
          </div>
        );
      }
      const targets = g.players
        .filter((p) => p.alive && p.id !== meId)
        .map((p) => p.id);
      return (
        <div className="action-panel">
          <h3>Maktbefogenhet</h3>
          <p>{POWER_LABEL[power]}.</p>
          <TargetPicker
            g={g}
            ids={targets}
            onPick={(targetId) => sendAction({ type: 'POWER_TARGET', targetId })}
          />
        </div>
      );
    }

    case 'roundEnd': {
      return (
        <div className="action-panel action-wait">
          <span className="action-spinner" /> Rundan avslutas — nästa runda börjar
          strax.
        </div>
      );
    }

    default:
      return waiting('Väntar…');
  }
}
