import { useState } from 'react';
import { useV } from '../store.js';

export function VAuth() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const busy = useV((s) => s.busy);
  const register = useV((s) => s.register);
  const login = useV((s) => s.login);

  const ok = username.trim().length >= 2 && password.length >= 4;
  const submit = () => {
    if (!ok) return;
    if (mode === 'register') register(username.trim(), password);
    else login(username.trim(), password);
  };

  return (
    <div className="v-auth">
      <div className="v-auth-hero">
        <div className="v-flag">🇸🇪</div>
        <h1>Valfeber 2026</h1>
        <p className="tagline">
          Hela Sveriges valrörelse — ett levande spel fram till valdagen 13 september.
          Välj parti, kampanja varje dag, klättra på topplistan.
        </p>
      </div>

      <div className="card v-auth-card">
        <div className="v-auth-tabs">
          <button
            className={`v-tab ${mode === 'register' ? 'v-tab-on' : ''}`}
            onClick={() => setMode('register')}
          >
            Skapa konto
          </button>
          <button
            className={`v-tab ${mode === 'login' ? 'v-tab-on' : ''}`}
            onClick={() => setMode('login')}
          >
            Logga in
          </button>
        </div>

        <label className="field">
          <span>Användarnamn</span>
          <input
            value={username}
            maxLength={20}
            placeholder="t.ex. Robin"
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <label className="field">
          <span>Lösenord</span>
          <input
            type="password"
            value={password}
            placeholder="minst 4 tecken"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <button className="btn btn-primary btn-big" disabled={!ok || busy} onClick={submit}>
          {busy ? 'Ett ögonblick…' : mode === 'register' ? 'Skapa konto & spela' : 'Logga in'}
        </button>
      </div>
      <footer className="landing-foot">
        Inget mejl krävs. Ditt konto sparas så att du kan komma tillbaka varje dag.
      </footer>
    </div>
  );
}
