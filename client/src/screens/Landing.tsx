import { useState } from 'react';
import { useStore } from '../store.js';

export function Landing() {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const busy = useStore((s) => s.busy);
  const createRoom = useStore((s) => s.createRoom);
  const joinRoom = useStore((s) => s.joinRoom);

  const nameOk = name.trim().length >= 2;

  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="crest">⚖</div>
        <h1>Dictator of Sweden</h1>
        <p className="tagline">
          Ett socialt deduktionsspel om demokratins skörhet — tematiserat på valet 2026.
        </p>
      </div>

      <div className="card landing-card">
        {mode === 'menu' && (
          <>
            <p className="muted">
              5–8 spelare. Försvara den svenska demokratin — eller störta den i hemlighet.
            </p>
            <button className="btn btn-primary" onClick={() => setMode('create')}>
              Skapa nytt spel
            </button>
            <button className="btn" onClick={() => setMode('join')}>
              Gå med via rumskod
            </button>
          </>
        )}

        {mode === 'create' && (
          <>
            <label className="field">
              <span>Ditt namn</span>
              <input
                value={name}
                maxLength={24}
                placeholder="t.ex. Robin"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            <button
              className="btn btn-primary"
              disabled={!nameOk || busy}
              onClick={() => createRoom(name.trim())}
            >
              {busy ? 'Skapar…' : 'Skapa lobby'}
            </button>
            <button className="btn btn-ghost" onClick={() => setMode('menu')}>
              Tillbaka
            </button>
          </>
        )}

        {mode === 'join' && (
          <>
            <label className="field">
              <span>Ditt namn</span>
              <input
                value={name}
                maxLength={24}
                placeholder="t.ex. Robin"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            <label className="field">
              <span>Rumskod</span>
              <input
                value={code}
                maxLength={4}
                placeholder="ABCD"
                className="code-input"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <button
              className="btn btn-primary"
              disabled={!nameOk || code.trim().length !== 4 || busy}
              onClick={() => joinRoom(code.trim(), name.trim())}
            >
              {busy ? 'Ansluter…' : 'Gå med'}
            </button>
            <button className="btn btn-ghost" onClick={() => setMode('menu')}>
              Tillbaka
            </button>
          </>
        )}
      </div>

      <footer className="landing-foot">
        Partierna är offentlig spelfärg. Den hemliga rollen delas ut oberoende — vem
        som helst kan vara demokratins fiende.
      </footer>
    </div>
  );
}
