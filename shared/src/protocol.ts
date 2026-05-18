// Natverksprotokoll mellan klient och server (Socket.IO).
// Endast datatyper - inga ramverksberoenden.

import type { ClientGameView, GameSettings } from './types.js';
import type { AnswerKey } from './valkompass.js';

export interface ChatMessage {
  id: number;
  playerId: string;
  name: string;
  text: string;
  ts: number;
  /** Systemmeddelanden (spelaren gick med osv.). */
  system: boolean;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  partyId: string | null;
  valkompassDone: boolean;
  suggestedPartyId: string | null;
  ready: boolean;
}

export interface LobbyView {
  players: LobbyPlayer[];
  settings: GameSettings;
  hostId: string;
  canStart: boolean;
  /** Anledning till att spelet inte kan startas, om nagon. */
  startBlockedReason: string | null;
  minPlayers: number;
  maxPlayers: number;
}

export interface RoomSnapshot {
  roomCode: string;
  phase: 'lobby' | 'ingame';
  you: { id: string; name: string; isHost: boolean };
  lobby: LobbyView | null;
  game: ClientGameView | null;
  chat: ChatMessage[];
}

export interface JoinResult {
  ok: boolean;
  error?: string;
  roomCode?: string;
  playerId?: string;
}

/** Spelhandling fran klient - serverns autentiserade playerId injiceras. */
export type ClientAction =
  | { type: 'NOMINATE'; talmanId: string }
  | { type: 'VOTE'; vote: boolean }
  | { type: 'PRESIDENT_DISCARD'; cardId: string }
  | { type: 'TALMAN_ENACT'; cardId: string }
  | { type: 'PROPOSE_VETO' }
  | { type: 'VETO_RESPONSE'; agree: boolean }
  | { type: 'POWER_TARGET'; targetId: string }
  | { type: 'POWER_PEEK_DONE' };

export interface ClientToServerEvents {
  'lobby:create': (p: { name: string }, cb: (r: JoinResult) => void) => void;
  'lobby:join': (
    p: { roomCode: string; name: string },
    cb: (r: JoinResult) => void,
  ) => void;
  'lobby:rejoin': (
    p: { roomCode: string; playerId: string },
    cb: (r: JoinResult) => void,
  ) => void;
  'lobby:valkompass': (p: { answers: Record<string, AnswerKey> }) => void;
  'lobby:setParty': (p: { partyId: string }) => void;
  'lobby:setReady': (p: { ready: boolean }) => void;
  'lobby:addBot': () => void;
  'lobby:removeBot': (p: { botId: string }) => void;
  'lobby:settings': (p: { settings: GameSettings }) => void;
  'lobby:start': () => void;
  'lobby:leave': () => void;
  'game:action': (p: { action: ClientAction }) => void;
  'game:restart': () => void;
  'chat:send': (p: { text: string }) => void;
}

export interface ServerToClientEvents {
  'room:snapshot': (s: RoomSnapshot) => void;
  'room:error': (p: { message: string }) => void;
  'room:closed': (p: { reason: string }) => void;
}
