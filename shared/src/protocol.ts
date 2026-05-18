// Natverksprotokoll mellan klient och server (Socket.IO).
// Endast datatyper - inga ramverksberoenden.

import type { ClientGameView, GameSettings } from './types.js';
import type { AnswerKey } from './valkompass.js';
import type { CampaignClientView, RoleAction } from './campaign/types.js';

export type GameMode = 'classic' | 'campaign';

export interface ChatMessage {
  id: number;
  playerId: string;
  name: string;
  text: string;
  ts: number;
  /** Systemmeddelanden (spelaren gick med osv.). */
  system: boolean;
  /** Lagindex for lagchatt, annars null = global chatt. */
  teamIndex: number | null;
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
  /** Vilket lag spelaren gatt med i (kampanjlaget). */
  teamIndex: number | null;
}

export interface CampaignLobbyConfig {
  numTeams: number;
  teamParties: string[];
}

export interface LobbyView {
  mode: GameMode;
  players: LobbyPlayer[];
  settings: GameSettings;
  campaign: CampaignLobbyConfig;
  hostId: string;
  canStart: boolean;
  /** Anledning till att spelet inte kan startas, om nagon. */
  startBlockedReason: string | null;
  minPlayers: number;
  maxPlayers: number;
}

export interface RoomSnapshot {
  roomCode: string;
  mode: GameMode;
  phase: 'lobby' | 'ingame';
  you: { id: string; name: string; isHost: boolean };
  lobby: LobbyView | null;
  game: ClientGameView | CampaignClientView | null;
  chat: ChatMessage[];
  /** Lagchatt for ditt lag (kampanjlaget), annars tom. */
  teamChat: ChatMessage[];
}

export interface JoinResult {
  ok: boolean;
  error?: string;
  roomCode?: string;
  playerId?: string;
}

/** Spelhandling i klassiska laget. */
export type ClientAction =
  | { type: 'NOMINATE'; talmanId: string }
  | { type: 'VOTE'; vote: boolean }
  | { type: 'PRESIDENT_DISCARD'; cardId: string }
  | { type: 'TALMAN_ENACT'; cardId: string }
  | { type: 'PROPOSE_VETO' }
  | { type: 'VETO_RESPONSE'; agree: boolean }
  | { type: 'POWER_TARGET'; targetId: string }
  | { type: 'POWER_PEEK_DONE' };

/** Spelhandling i kampanjlaget. */
export type CampaignClientAction =
  | { type: 'SUBMIT_ROLE'; action: RoleAction; sabotage: boolean }
  | { type: 'INTERNAL_VOTE'; accusedId: string };

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
  'lobby:setMode': (p: { mode: GameMode }) => void;
  'lobby:setNumTeams': (p: { numTeams: number }) => void;
  'lobby:setTeamParty': (p: { teamIndex: number; partyId: string }) => void;
  'lobby:joinTeam': (p: { teamIndex: number }) => void;
  'lobby:valkompass': (p: { answers: Record<string, AnswerKey> }) => void;
  'lobby:setParty': (p: { partyId: string }) => void;
  'lobby:setReady': (p: { ready: boolean }) => void;
  'lobby:addBot': (p: { teamIndex?: number }) => void;
  'lobby:removeBot': (p: { botId: string }) => void;
  'lobby:settings': (p: { settings: GameSettings }) => void;
  'lobby:start': () => void;
  'lobby:leave': () => void;
  'game:action': (p: { action: ClientAction }) => void;
  'game:campaignAction': (p: { action: CampaignClientAction }) => void;
  'game:restart': () => void;
  'chat:send': (p: { text: string }) => void;
  'chat:sendTeam': (p: { text: string }) => void;
}

export interface ServerToClientEvents {
  'room:snapshot': (s: RoomSnapshot) => void;
  'room:error': (p: { message: string }) => void;
  'room:closed': (p: { reason: string }) => void;
}
