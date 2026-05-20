import { useCallback, useEffect, useRef, useState } from 'react';
import { getParty } from '@dos/shared';
import { useV } from '../store.js';
import { api } from '../api.js';

type Channel = 'global' | 'party' | 'team';
interface ChatMsg { id: number; name: string; body: string; ts: number }
interface TeamRow { id: number; name: string; party_id: string; members: number }

export function VSocial({ partyId }: { partyId: string }) {
  const token = useV((s) => s.token)!;
  const meName = useV((s) => s.state?.you.username);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [myTeamId, setMyTeamId] = useState<number | null>(null);
  const [newTeam, setNewTeam] = useState('');
  const [channel, setChannel] = useState<Channel>('party');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadTeams = useCallback(async () => {
    try {
      const r = await api.teams(token);
      setTeams(r.teams);
      setMyTeamId(r.myTeamId);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const scopeId = channel === 'global' ? 'all' : channel === 'party' ? partyId : String(myTeamId ?? 0);

  const loadChat = useCallback(async () => {
    if (channel === 'team' && !myTeamId) {
      setMessages([]);
      return;
    }
    try {
      const r = await api.chatGet(token, channel, scopeId);
      setMessages(r.messages);
    } catch {
      /* ignore */
    }
  }, [token, channel, scopeId, myTeamId]);

  useEffect(() => {
    loadChat();
    const t = setInterval(loadChat, 6000);
    return () => clearInterval(t);
  }, [loadChat]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await api.chatSend(token, channel, scopeId, body);
    loadChat();
  };

  const createTeam = async () => {
    const name = newTeam.trim();
    if (name.length < 2) return;
    await api.createTeam(token, name);
    setNewTeam('');
    loadTeams();
  };

  return (
    <section className="card v-social">
      <h2>Lag & chatt</h2>

      {myTeamId ? (
        <p className="small">
          Ditt lag: <strong>{teams.find((t) => t.id === myTeamId)?.name ?? 'okant'}</strong>
        </p>
      ) : (
        <div className="v-team-create">
          <div className="chat-input">
            <input
              value={newTeam}
              maxLength={40}
              placeholder="Skapa lag…"
              onChange={(e) => setNewTeam(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTeam()}
            />
            <button className="btn btn-small" onClick={createTeam}>Skapa</button>
          </div>
          {teams.length > 0 && (
            <div className="v-team-list">
              {teams.slice(0, 4).map((t) => (
                <button key={t.id} className="btn btn-small" onClick={() => api.joinTeam(token, t.id).then(loadTeams)}>
                  {t.name} ({t.members}) +
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="v-lb-tabs">
        {(['party', 'team', 'global'] as Channel[]).map((c) => (
          <button
            key={c}
            className={`v-tab ${channel === c ? 'v-tab-on' : ''}`}
            disabled={c === 'team' && !myTeamId}
            onClick={() => setChannel(c)}
          >
            {c === 'party' ? `${getParty(partyId).shortName}-chatt` : c === 'team' ? 'Lag' : 'Land'}
          </button>
        ))}
      </div>

      <div className="chat-log v-chat-log">
        {messages.length === 0 && <p className="muted small">Inga meddelanden an.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.name === meName ? 'chat-mine' : ''}`}>
            <span className="chat-name">{m.name}:</span> <span className="chat-text">{m.body}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          value={text}
          maxLength={280}
          placeholder="Skriv…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn btn-small" onClick={send}>Skicka</button>
      </div>
    </section>
  );
}
