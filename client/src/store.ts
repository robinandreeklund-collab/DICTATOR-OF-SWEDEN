import { create } from 'zustand';
import type {
  ClientAction,
  GameSettings,
  JoinResult,
  RoomSnapshot,
} from '@dos/shared';
import type { AnswerKey } from '@dos/shared';
import { socket } from './socket.js';

const STORAGE_KEY = 'dos.session';

interface SavedSession {
  roomCode: string;
  playerId: string;
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: SavedSession | null): void {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignorera */
  }
}

interface AppState {
  connected: boolean;
  snapshot: RoomSnapshot | null;
  error: string | null;
  notice: string | null;
  busy: boolean;

  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  clearError: () => void;

  submitValkompass: (answers: Record<string, AnswerKey>) => void;
  setParty: (partyId: string) => void;
  setReady: (ready: boolean) => void;
  addBot: () => void;
  removeBot: (botId: string) => void;
  updateSettings: (settings: GameSettings) => void;
  startGame: () => void;
  restartGame: () => void;
  sendAction: (action: ClientAction) => void;
  sendChat: (text: string) => void;
}

export const useStore = create<AppState>((set, get) => {
  // --- socket-handelser ------------------------------------------------------
  socket.on('connect', () => {
    set({ connected: true });
    const saved = loadSession();
    if (saved && !get().snapshot) {
      socket.emit('lobby:rejoin', saved, (r: JoinResult) => {
        if (!r.ok) saveSession(null);
      });
    }
  });
  socket.on('disconnect', () => set({ connected: false }));
  socket.on('room:snapshot', (snap) => set({ snapshot: snap }));
  socket.on('room:error', ({ message }) => set({ error: message }));
  socket.on('room:closed', ({ reason }) => {
    saveSession(null);
    set({ snapshot: null, notice: reason });
  });

  const persist = (r: JoinResult) => {
    if (r.ok && r.roomCode && r.playerId) {
      saveSession({ roomCode: r.roomCode, playerId: r.playerId });
    }
  };

  return {
    connected: socket.connected,
    snapshot: null,
    error: null,
    notice: null,
    busy: false,

    createRoom: (name) => {
      set({ busy: true, error: null });
      socket.emit('lobby:create', { name }, (r) => {
        set({ busy: false });
        if (r.ok) persist(r);
        else set({ error: r.error ?? 'Kunde inte skapa rum.' });
      });
    },

    joinRoom: (code, name) => {
      set({ busy: true, error: null });
      socket.emit('lobby:join', { roomCode: code, name }, (r) => {
        set({ busy: false });
        if (r.ok) persist(r);
        else set({ error: r.error ?? 'Kunde inte ga med i rummet.' });
      });
    },

    leaveRoom: () => {
      socket.emit('lobby:leave');
      saveSession(null);
      set({ snapshot: null, notice: null });
    },

    clearError: () => set({ error: null, notice: null }),

    submitValkompass: (answers) => socket.emit('lobby:valkompass', { answers }),
    setParty: (partyId) => socket.emit('lobby:setParty', { partyId }),
    setReady: (ready) => socket.emit('lobby:setReady', { ready }),
    addBot: () => socket.emit('lobby:addBot'),
    removeBot: (botId) => socket.emit('lobby:removeBot', { botId }),
    updateSettings: (settings) => socket.emit('lobby:settings', { settings }),
    startGame: () => socket.emit('lobby:start'),
    restartGame: () => socket.emit('game:restart'),
    sendAction: (action) => socket.emit('game:action', { action }),
    sendChat: (text) => socket.emit('chat:send', { text }),
  };
});
