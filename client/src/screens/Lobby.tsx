import { useState } from 'react';
import { PARTIES, getParty } from '@dos/shared';
import { useStore } from '../store.js';
import { Valkompass } from '../components/Valkompass.js';
import { Chat } from '../components/Chat.js';

export function Lobby() {
  const snapshot = useStore((s) => s.snapshot)!;
  const lobby = snapshot.lobby!;
  const me = lobby.players.find((p) => p.id === snapshot.you.id);
  const isHost = snapshot.you.isHost;

  const setParty = useStore((s) => s.setParty);
  const setReady = useStore((s) => s.setReady);
  const addBot = useStore((s) => s.addBot);
  const removeBot = useStore((s) => s.removeBot);
  const updateSettings = useStore((s) => s.updateSettings);
  const startGame = useStore((s) => s.startGame);
  const leaveRoom = useStore((s) => s.leaveRoom);

  const [vkOpen, setVkOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard?.writeText(snapshot.roomCode).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  };

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div>
          <h1>Lobby</h1>
          <button className="code-chip" onClick={copyCode} title="Kopiera rumskod">
            Rumskod: <strong>{snapshot.roomCode}</strong> {copied ? '✓' : '⧉'}
          </button>
        </div>
        <button className="btn btn-ghost btn-small" onClick={leaveRoom}>
          Lämna
        </button>
      </header>

      <div className="lobby-grid">
        <div className="lobby-main">
          {/* Valkompass / partival */}
          {vkOpen ? (
            <Valkompass onClose={() => setVkOpen(false)} />
          ) : (
            <section className="card">
              <div className="section-head">
                <h2>Ditt parti</h2>
                {!me?.valkompassDone && (
                  <button className="btn btn-small btn-primary" onClick={() => setVkOpen(true)}>
                    Ta valkompassen
                  </button>
                )}
                {me?.valkompassDone && (
                  <button className="btn btn-small btn-ghost" onClick={() => setVkOpen(true)}>
                    Gör om valkompassen
                  </button>
                )}
              </div>
              <p className="muted small">
                Valkompassen matchar dig med ett riksdagsparti utifrån valfrågorna
                2026. Partiet är offentlig spelfärg — din hemliga roll delas ut separat.
              </p>
              <div className="party-grid">
                {PARTIES.map((party) => {
                  const selected = me?.partyId === party.id;
                  const suggested = me?.suggestedPartyId === party.id;
                  return (
                    <button
                      key={party.id}
                      className={`party-card ${selected ? 'party-selected' : ''}`}
                      style={{ borderColor: selected ? party.color : undefined }}
                      onClick={() => setParty(party.id)}
                    >
                      <span className="party-mark" style={{ background: party.color }}>
                        {party.shortName}
                      </span>
                      <span className="party-name">{party.name}</span>
                      {suggested && <span className="party-suggested">Din match</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Spelare */}
          <section className="card">
            <div className="section-head">
              <h2>
                Ledamöter {lobby.players.length}/{lobby.maxPlayers}
              </h2>
              {isHost && lobby.players.length < lobby.maxPlayers && (
                <button className="btn btn-small" onClick={addBot}>
                  + Lägg till bot
                </button>
              )}
            </div>
            <ul className="player-list">
              {lobby.players.map((p) => {
                const party = p.partyId ? getParty(p.partyId) : null;
                return (
                  <li key={p.id} className="player-row">
                    <span
                      className="player-mark"
                      style={{ background: party ? party.color : '#5a6270' }}
                    >
                      {party ? party.shortName : '–'}
                    </span>
                    <span className="player-name">
                      {p.name}
                      {p.id === snapshot.you.id && <em> (du)</em>}
                    </span>
                    <span className="player-tags">
                      {p.isHost && <span className="tag tag-host">Värd</span>}
                      {p.isBot && <span className="tag tag-bot">Bot</span>}
                      {!p.connected && <span className="tag tag-off">Frånvarande</span>}
                      {p.ready ? (
                        <span className="tag tag-ready">Redo</span>
                      ) : (
                        <span className="tag">Väntar</span>
                      )}
                    </span>
                    {isHost && p.isBot && (
                      <button
                        className="icon-btn"
                        title="Ta bort bot"
                        onClick={() => removeBot(p.id)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Redo + start */}
          <section className="card">
            {me && !me.isBot && (
              <label className="ready-toggle">
                <input
                  type="checkbox"
                  checked={me.ready}
                  disabled={!me.partyId}
                  onChange={(e) => setReady(e.target.checked)}
                />
                <span>
                  Jag är redo att spela
                  {!me.partyId && <em className="muted"> — välj ett parti först</em>}
                </span>
              </label>
            )}

            {isHost && (
              <div className="host-controls">
                <label className="ready-toggle">
                  <input
                    type="checkbox"
                    checked={lobby.settings.hiddenVotes}
                    onChange={(e) =>
                      updateSettings({
                        ...lobby.settings,
                        hiddenVotes: e.target.checked,
                      })
                    }
                  />
                  <span>Dolda röster (visa bara summan, inte vem som röstade vad)</span>
                </label>
                <button
                  className="btn btn-primary btn-big"
                  disabled={!lobby.canStart}
                  onClick={startGame}
                >
                  Starta spelet
                </button>
                {lobby.startBlockedReason && (
                  <p className="muted small">{lobby.startBlockedReason}</p>
                )}
              </div>
            )}
            {!isHost && (
              <p className="muted small">Värden startar spelet när alla är redo.</p>
            )}
          </section>

          <section className="card">
            <button className="rules-toggle" onClick={() => setRulesOpen(!rulesOpen)}>
              {rulesOpen ? '▾' : '▸'} Så spelas Dictator of Sweden
            </button>
            {rulesOpen && <RulesText />}
          </section>
        </div>

        <aside className="lobby-side">
          <Chat messages={snapshot.chat} meId={snapshot.you.id} />
        </aside>
      </div>
    </div>
  );
}

function RulesText() {
  return (
    <div className="rules-text">
      <p>
        <strong>Mål.</strong> Demokraterna försvarar 5 grundläggande rättigheter.
        Antidemokraterna — diktatorn och medlöparna — vill få igenom 6
        antidemokratiska lagar, eller få diktatorn vald till talman sent i spelet.
      </p>
      <p>
        <strong>Rundan.</strong> Statsministern roterar och nominerar en talman.
        Riksdagen röstar. En vald regering drar tre lagförslag — statsministern
        slänger ett, talmannen antar ett av de två kvarvarande.
      </p>
      <p>
        <strong>Maktbefogenheter.</strong> När antidemokratiska lagar staplas får
        statsministern verktyg: granska kortleken, utreda en ledamot, utlysa
        extraval eller avsätta någon ur riksdagen.
      </p>
      <p>
        <strong>Slutledning.</strong> Demokraterna måste lista ut vem diktatorn är
        — antidemokraterna måste vilseleda. Prata, anklaga, bluffa.
      </p>
    </div>
  );
}
