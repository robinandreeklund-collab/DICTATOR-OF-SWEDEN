import { useEffect } from 'react';
import { useStore } from './store.js';
import { Landing } from './screens/Landing.js';
import { Lobby } from './screens/Lobby.js';
import { Game } from './screens/Game.js';
import { Toast } from './components/Toast.js';

export function App() {
  const snapshot = useStore((s) => s.snapshot);
  const connected = useStore((s) => s.connected);

  useEffect(() => {
    document.title = snapshot
      ? `Dictator of Sweden — ${snapshot.roomCode}`
      : 'Dictator of Sweden';
  }, [snapshot]);

  return (
    <div className="app">
      {!connected && (
        <div className="conn-banner">Ingen kontakt med servern — ateransluter…</div>
      )}
      {!snapshot && <Landing />}
      {snapshot?.phase === 'lobby' && <Lobby />}
      {snapshot?.phase === 'ingame' && <Game />}
      <Toast />
    </div>
  );
}
