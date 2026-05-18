import { useState } from 'react';
import { PARTIES, getParty, type LobbyView } from '@dos/shared';
import { useStore } from '../store.js';
import { Valkompass } from '../components/Valkompass.js';
import { Chat } from '../components/Chat.js';

export function Lobby() {
  const snapshot = useStore((s) => s.snapshot)!;
  const lobby = snapshot.lobby!;
  const me = lobby.players.find((p) => p.id === snapshot.you.id);
  const isHost = snapshot.you.isHost;
  const isCampaign = lobby.mode === 'campaign';

  const store = useStore();
  const [vkOpen, setVkOpen] = useState(false);
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
        <button className="btn btn-ghost btn-small" onClick={store.leaveRoom}>
          Lamna
        </button>
      </header>

      <div className="lobby-grid">
        <div className="lobby-main">
          <section className="card">
            <h2>Spellage</h2>
            <div className="mode-picker">
              <button
                className={`mode-card ${isCampaign ? 'mode-on' : ''}`}
                disabled={!isHost}
                onClick={() => store.setMode('campaign')}
              >
                <span className="mode-name">Valrorelsen 2026</span>
                <span className="mode-desc">
                  Partilag tavlar i en kampanjduell over hela Sverige. En hemlig
                  mullvad i varje lag.
                </span>
              </button>
              <button
                className={`mode-card ${!isCampaign ? 'mode-on' : ''}`}
                disabled={!isHost}
                onClick={() => store.setMode('classic')}
              >
                <span className="mode-name">Riksdagen</span>
                <span className="mode-desc">
                  Klassiskt socialt deduktionsspel. Hitta diktatorn innan
                  demokratin faller.
                </span>
              </button>
            </div>
            {!isHost && <p className="muted small">Varden valjer spellage.</p>}
          </section>

          {isCampaign ? (
            <CampaignSetup lobby={lobby} meId={snapshot.you.id} isHost={isHost} />
          ) : (
            <ClassicSetup
              lobby={lobby}
              meId={snapshot.you.id}
              isHost={isHost}
              vkOpen={vkOpen}
              setVkOpen={setVkOpen}
            />
          )}

          <section className="card">
            {me && !me.isBot && (
              <label className="ready-toggle">
                <input
                  type="checkbox"
                  checked={me.ready}
                  disabled={isCampaign ? me.teamIndex === null : !me.partyId}
                  onChange={(e) => store.setReady(e.target.checked)}
                />
                <span>
                  Jag ar redo att spela
                  {isCampaign && me.teamIndex === null && (
                    <em className="muted"> — ga med i ett lag forst</em>
                  )}
                  {!isCampaign && !me.partyId && (
                    <em className="muted"> — valj ett parti forst</em>
                  )}
                </span>
              </label>
            )}
            {isHost && (
              <>
                <button
                  className="btn btn-primary btn-big"
                  disabled={!lobby.canStart}
                  onClick={store.startGame}
                >
                  Starta spelet
                </button>
                {lobby.startBlockedReason && (
                  <p className="muted small">{lobby.startBlockedReason}</p>
                )}
              </>
            )}
            {!isHost && (
              <p className="muted small">Varden startar spelet nar alla ar redo.</p>
            )}
          </section>
        </div>

        <aside className="lobby-side">
          <Chat messages={snapshot.chat} meId={snapshot.you.id} />
        </aside>
      </div>
    </div>
  );
}

// --- kampanjuppstallning ----------------------------------------------------

function CampaignSetup({
  lobby,
  meId,
  isHost,
}: {
  lobby: LobbyView;
  meId: string;
  isHost: boolean;
}) {
  const store = useStore();
  const cfg = lobby.campaign;

  return (
    <section className="card">
      <div className="section-head">
        <h2>Partilag</h2>
        {isHost && (
          <div className="row team-count">
            <span className="muted small">Antal lag:</span>
            <button
              className="btn btn-small"
              disabled={cfg.numTeams <= 3}
              onClick={() => store.setNumTeams(cfg.numTeams - 1)}
            >
              −
            </button>
            <strong className="team-count-num">{cfg.numTeams}</strong>
            <button
              className="btn btn-small"
              disabled={cfg.numTeams >= 12}
              onClick={() => store.setNumTeams(cfg.numTeams + 1)}
            >
              +
            </button>
            <span className="muted small">
              {cfg.numTeams <= 4 ? 'Snabbval' : cfg.numTeams <= 7 ? 'Riksval' : 'Mega-val'}
            </span>
          </div>
        )}
      </div>

      <div className="team-setup">
        {cfg.teamParties.map((partyId, idx) => {
          const party = getParty(partyId);
          const members = lobby.players.filter((p) => p.teamIndex === idx);
          const iAmHere = members.some((p) => p.id === meId);
          return (
            <div
              key={idx}
              className="team-card"
              style={{ borderColor: party.color }}
            >
              <div className="team-card-head" style={{ background: party.color }}>
                <span>Lag {idx + 1}</span>
                <strong>{party.name}</strong>
              </div>
              {isHost && (
                <select
                  className="team-party-select"
                  value={partyId}
                  onChange={(e) => store.setTeamParty(idx, e.target.value)}
                >
                  {PARTIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <ul className="team-members">
                {members.map((p) => (
                  <li key={p.id}>
                    {p.name}
                    {p.id === meId && <em> (du)</em>}
                    {p.isHost && <span className="tag tag-host">Vard</span>}
                    {p.isBot && <span className="tag tag-bot">Bot</span>}
                    {isHost && p.isBot && (
                      <button className="icon-btn" onClick={() => store.removeBot(p.id)}>
                        ×
                      </button>
                    )}
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="muted small">Tomt — fylls med bottar.</li>
                )}
              </ul>
              <div className="team-card-actions">
                {!iAmHere && (
                  <button className="btn btn-small btn-primary" onClick={() => store.joinTeam(idx)}>
                    Ga med
                  </button>
                )}
                {isHost && members.length < 5 && (
                  <button className="btn btn-small" onClick={() => store.addBot(idx)}>
                    + Bot
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        Varje lag fylls automatiskt till tre medlemmar med bottar vid start. En
        slumpad medlem i varje lag blir hemlig mullvad.
      </p>
    </section>
  );
}

// --- klassisk uppstallning --------------------------------------------------

function ClassicSetup({
  lobby,
  meId,
  isHost,
  vkOpen,
  setVkOpen,
}: {
  lobby: LobbyView;
  meId: string;
  isHost: boolean;
  vkOpen: boolean;
  setVkOpen: (v: boolean) => void;
}) {
  const store = useStore();
  const me = lobby.players.find((p) => p.id === meId);

  return (
    <>
      {vkOpen ? (
        <Valkompass onClose={() => setVkOpen(false)} />
      ) : (
        <section className="card">
          <div className="section-head">
            <h2>Ditt parti</h2>
            <button className="btn btn-small btn-primary" onClick={() => setVkOpen(true)}>
              {me?.valkompassDone ? 'Gor om valkompassen' : 'Ta valkompassen'}
            </button>
          </div>
          <div className="party-grid">
            {PARTIES.map((party) => {
              const selected = me?.partyId === party.id;
              const suggested = me?.suggestedPartyId === party.id;
              return (
                <button
                  key={party.id}
                  className={`party-card ${selected ? 'party-selected' : ''}`}
                  style={{ borderColor: selected ? party.color : undefined }}
                  onClick={() => store.setParty(party.id)}
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

      <section className="card">
        <div className="section-head">
          <h2>
            Ledamoter {lobby.players.length}/{lobby.maxPlayers}
          </h2>
          {isHost && lobby.players.length < lobby.maxPlayers && (
            <button className="btn btn-small" onClick={() => store.addBot()}>
              + Lagg till bot
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
                  {p.id === meId && <em> (du)</em>}
                </span>
                <span className="player-tags">
                  {p.isHost && <span className="tag tag-host">Vard</span>}
                  {p.isBot && <span className="tag tag-bot">Bot</span>}
                  {p.ready ? (
                    <span className="tag tag-ready">Redo</span>
                  ) : (
                    <span className="tag">Vantar</span>
                  )}
                </span>
                {isHost && p.isBot && (
                  <button className="icon-btn" onClick={() => store.removeBot(p.id)}>
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
