import { create } from 'zustand';
import { api, type ActionResultPayload, type ValfeberState } from './api.js';

const TOKEN_KEY = 'valfeber.token';

interface VStore {
  token: string | null;
  state: ValfeberState | null;
  error: string | null;
  busy: boolean;
  booted: boolean;
  lastResult: ActionResultPayload | null;

  boot: () => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  choose: (partyId: string, regionId: string) => Promise<void>;
  doAction: (kind: string, payload?: Record<string, unknown>) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearResult: () => void;
}

export const useV = create<VStore>((set, get) => ({
  token: null,
  state: null,
  error: null,
  busy: false,
  booted: false,
  lastResult: null,

  boot: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ booted: true });
      return;
    }
    try {
      const { state } = await api.state(token);
      set({ token, state, booted: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, booted: true });
    }
  },

  register: async (u, p) => {
    set({ busy: true, error: null });
    try {
      const { token, state } = await api.register(u, p);
      localStorage.setItem(TOKEN_KEY, token);
      set({ token, state, busy: false });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  },

  login: async (u, p) => {
    set({ busy: true, error: null });
    try {
      const { token, state } = await api.login(u, p);
      localStorage.setItem(TOKEN_KEY, token);
      set({ token, state, busy: false });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, state: null });
  },

  choose: async (partyId, regionId) => {
    const token = get().token;
    if (!token) return;
    set({ busy: true, error: null });
    try {
      const { state } = await api.choose(token, partyId, regionId);
      set({ state, busy: false });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  },

  doAction: async (kind, payload = {}) => {
    const token = get().token;
    if (!token) return;
    set({ busy: true, error: null });
    try {
      const { result, state } = await api.action(token, kind, payload);
      set({ state, busy: false, lastResult: result });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  },

  refresh: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const { state } = await api.state(token);
      set({ state });
    } catch {
      /* tyst - behall gammalt state */
    }
  },

  clearError: () => set({ error: null }),
  clearResult: () => set({ lastResult: null }),
}));
