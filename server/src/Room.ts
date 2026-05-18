import type { Server } from 'socket.io';
import {
  applyAction,
  botAction,
  createGame,
  makeRng,
  pendingActors,
  playerById,
  scoreValkompass,
  toClientView,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PARTIES,
  type Action,
  type AnswerKey,
  type ChatMessage,
  type ClientAction,
  type ClientToServerEvents,
  type GameSettings,
  type GameState,
  type LobbyPlayer,
  type LobbyView,
  type Rng,
  type RoomSnapshot,
  type ServerToClientEvents,
} from '@dos/shared';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

// DOS_FAST=1 ger minimala fordrojningar for automatiserade tester.
const FAST = process.env.DOS_FAST === '1';
const ROLE_REVEAL_MS = FAST ? 40 : 7000;
const ROUND_END_MS = FAST ? 40 : 4500;
const BOT_ACTION_MS = FAST ? 15 : 1300;
const AFK_MS = FAST ? 2500 : 90000;

const BOT_NAMES = [
  'Bot Astrid',
  'Bot Bjorn',
  'Bot Cecilia',
  'Bot David',
  'Bot Elsa',
  'Bot Fredrik',
  'Bot Greta',
  'Bot Henrik',
];

interface ServerPlayer {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  partyId: string | null;
  valkompassDone: boolean;
  suggestedPartyId: string | null;
  ready: boolean;
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

function sanitizeName(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
  return trimmed.length > 0 ? trimmed : 'Spelare';
}

export class Room {
  readonly code: string;
  private io: IO;
  private players: ServerPlayer[] = [];
  private socketByPlayer = new Map<string, string>();
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private chat: ChatMessage[] = [];
  private nextChatId = 1;
  private hostId = '';
  private gameState: GameState | null = null;
  private rng: Rng = Math.random;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(code: string, io: IO) {
    this.code = code;
    this.io = io;
  }

  // --- spelarregister -------------------------------------------------------

  get isEmpty(): boolean {
    return this.players.every((p) => p.isBot || !p.connected);
  }

  get humanCount(): number {
    return this.players.filter((p) => !p.isBot).length;
  }

  get inGame(): boolean {
    return this.gameState !== null;
  }

  hasPlayer(playerId: string): boolean {
    return this.players.some((p) => p.id === playerId);
  }

  addHuman(name: string, socketId: string): string {
    const isFirst = this.players.length === 0;
    const id = genId('p');
    const player: ServerPlayer = {
      id,
      name: sanitizeName(name),
      isBot: false,
      connected: true,
      partyId: null,
      valkompassDone: false,
      suggestedPartyId: null,
      ready: false,
    };
    this.players.push(player);
    this.socketByPlayer.set(id, socketId);
    if (isFirst) this.hostId = id;
    this.systemChat(`${player.name} gick med i lobbyn.`);
    this.broadcast();
    return id;
  }

  reconnect(playerId: string, socketId: string): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;
    player.connected = true;
    this.socketByPlayer.set(playerId, socketId);
    this.sendSnapshot(playerId);
    this.broadcast();
    return true;
  }

  /** Hanterar en bortkopplad socket. Returnerar true om rummet bor stangas. */
  handleDisconnect(socketId: string): boolean {
    const entry = [...this.socketByPlayer.entries()].find(
      ([, sid]) => sid === socketId,
    );
    if (!entry) return this.isEmpty;
    const [playerId] = entry;
    this.socketByPlayer.delete(playerId);
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return this.isEmpty;

    if (!this.gameState) {
      // I lobbyn tas spelaren bort helt.
      this.players = this.players.filter((p) => p.id !== playerId);
      this.systemChat(`${player.name} lamnade lobbyn.`);
      if (this.hostId === playerId) {
        const nextHost = this.players.find((p) => !p.isBot);
        this.hostId = nextHost ? nextHost.id : '';
      }
    } else {
      // I spel behalls spelaren men markeras franvarande.
      player.connected = false;
      this.systemChat(`${player.name} kopplades fran.`);
    }
    this.broadcast();
    return this.isEmpty;
  }

  // --- lobby ----------------------------------------------------------------

  addBot(): void {
    if (this.gameState) return;
    if (this.players.length >= MAX_PLAYERS) return;
    const used = new Set(this.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.players.length}`;
    const party = PARTIES[Math.floor(Math.random() * PARTIES.length)];
    this.players.push({
      id: genId('bot'),
      name,
      isBot: true,
      connected: true,
      partyId: party.id,
      valkompassDone: true,
      suggestedPartyId: party.id,
      ready: true,
    });
    this.broadcast();
  }

  removeBot(botId: string): void {
    if (this.gameState) return;
    this.players = this.players.filter((p) => !(p.id === botId && p.isBot));
    this.broadcast();
  }

  setValkompass(playerId: string, answers: Record<string, AnswerKey>): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.gameState) return;
    const result = scoreValkompass(answers);
    player.valkompassDone = true;
    player.suggestedPartyId = result[0]?.partyId ?? null;
    if (!player.partyId) player.partyId = player.suggestedPartyId;
    this.broadcast();
  }

  setParty(playerId: string, partyId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.gameState) return;
    if (!PARTIES.some((p) => p.id === partyId)) return;
    player.partyId = partyId;
    this.broadcast();
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.gameState) return;
    if (ready && !player.partyId) return;
    player.ready = ready;
    this.broadcast();
  }

  setSettings(playerId: string, settings: GameSettings): void {
    if (playerId !== this.hostId || this.gameState) return;
    this.settings = {
      hiddenVotes: !!settings.hiddenVotes,
      discussionSeconds: Math.max(0, Math.min(120, settings.discussionSeconds | 0)),
    };
    this.broadcast();
  }

  private startBlockedReason(): string | null {
    if (this.players.length < MIN_PLAYERS)
      return `Det behovs minst ${MIN_PLAYERS} spelare. Lagg till bottar.`;
    if (this.players.length > MAX_PLAYERS)
      return `Hogst ${MAX_PLAYERS} spelare tillats.`;
    const notReady = this.players.filter(
      (p) => !p.isBot && (!p.ready || !p.partyId),
    );
    if (notReady.length > 0)
      return 'Alla spelare maste valja parti och bli redo.';
    return null;
  }

  startGame(playerId: string): void {
    if (playerId !== this.hostId || this.gameState) return;
    if (this.startBlockedReason()) return;

    for (const p of this.players) {
      if (!p.partyId) {
        p.partyId = PARTIES[Math.floor(Math.random() * PARTIES.length)].id;
      }
    }
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this.rng = makeRng((seed + 101) >>> 0);
    this.gameState = createGame(
      this.players.map((p) => ({
        id: p.id,
        name: p.name,
        partyId: p.partyId!,
        isBot: p.isBot,
        isHost: p.id === this.hostId,
      })),
      this.settings,
      seed,
    );
    this.systemChat('Spelet har borjat. Lycka till!');
    this.broadcast();
    this.scheduleTick();
  }

  restartGame(playerId: string): void {
    if (playerId !== this.hostId) return;
    this.clearTimer();
    this.gameState = null;
    for (const p of this.players) {
      if (!p.isBot) p.ready = false;
    }
    this.systemChat('Ater till lobbyn for en ny match.');
    this.broadcast();
  }

  // --- spelhandlingar -------------------------------------------------------

  handleGameAction(playerId: string, clientAction: ClientAction): void {
    const g = this.gameState;
    if (!g) return;
    const action = { ...clientAction, playerId } as Action;
    const res = applyAction(g, action, this.rng);
    if (!res.ok) {
      this.emitError(playerId, res.error ?? 'Otillaten handling.');
      return;
    }
    this.gameState = res.state;
    this.broadcast();
    this.scheduleTick();
  }

  private scheduleTick(): void {
    this.clearTimer();
    const g = this.gameState;
    if (!g || g.phase === 'gameOver') return;

    let delay: number;
    let run: () => void;

    if (g.phase === 'roleReveal') {
      delay = ROLE_REVEAL_MS;
      run = () => this.runEngine({ type: 'ADVANCE' });
    } else if (g.phase === 'roundEnd') {
      delay = ROUND_END_MS;
      run = () => this.runEngine({ type: 'ADVANCE' });
    } else {
      const actors = pendingActors(g);
      if (actors.length === 0) return;
      const botActor = actors.find((id) => playerById(g, id)?.isBot);
      if (botActor) {
        delay = BOT_ACTION_MS;
        run = () => this.runAutoPlayer(botActor);
      } else {
        // Inga bottar kvar att agera - AFK-skydd for franvarande/lana manniskor.
        delay = AFK_MS;
        run = () => this.runAutoPlayer(actors[0]);
      }
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      run();
    }, delay);
  }

  private runAutoPlayer(actorId: string): void {
    const g = this.gameState;
    if (!g) return;
    const action = botAction(g, actorId, this.rng);
    if (action) {
      this.runEngine(action);
    } else {
      this.scheduleTick();
    }
  }

  private runEngine(action: Action): void {
    const g = this.gameState;
    if (!g) return;
    const res = applyAction(g, action, this.rng);
    if (res.ok) this.gameState = res.state;
    this.broadcast();
    this.scheduleTick();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // --- chatt ----------------------------------------------------------------

  addChat(playerId: string, text: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    const clean = (text ?? '').trim().slice(0, 500);
    if (!clean) return;
    this.pushChat(playerId, player.name, clean, false);
    this.broadcast();
  }

  private systemChat(text: string): void {
    this.pushChat('system', 'System', text, true);
  }

  private pushChat(
    playerId: string,
    name: string,
    text: string,
    system: boolean,
  ): void {
    this.chat.push({ id: this.nextChatId++, playerId, name, text, ts: Date.now(), system });
    if (this.chat.length > 200) this.chat = this.chat.slice(-200);
  }

  // --- ogonblicksbilder -----------------------------------------------------

  private buildLobbyView(): LobbyView {
    const players: LobbyPlayer[] = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      isHost: p.id === this.hostId,
      connected: p.connected,
      partyId: p.partyId,
      valkompassDone: p.valkompassDone,
      suggestedPartyId: p.suggestedPartyId,
      ready: p.isBot ? true : p.ready,
    }));
    return {
      players,
      settings: this.settings,
      hostId: this.hostId,
      canStart: this.startBlockedReason() === null,
      startBlockedReason: this.startBlockedReason(),
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
    };
  }

  snapshotFor(playerId: string): RoomSnapshot {
    const player = this.players.find((p) => p.id === playerId);
    return {
      roomCode: this.code,
      phase: this.gameState ? 'ingame' : 'lobby',
      you: {
        id: playerId,
        name: player?.name ?? 'Spelare',
        isHost: playerId === this.hostId,
      },
      lobby: this.gameState ? null : this.buildLobbyView(),
      game: this.gameState ? toClientView(this.gameState, playerId) : null,
      chat: this.chat,
    };
  }

  private sendSnapshot(playerId: string): void {
    const socketId = this.socketByPlayer.get(playerId);
    if (socketId) {
      this.io.to(socketId).emit('room:snapshot', this.snapshotFor(playerId));
    }
  }

  private emitError(playerId: string, message: string): void {
    const socketId = this.socketByPlayer.get(playerId);
    if (socketId) this.io.to(socketId).emit('room:error', { message });
  }

  broadcast(): void {
    for (const [playerId, socketId] of this.socketByPlayer.entries()) {
      this.io.to(socketId).emit('room:snapshot', this.snapshotFor(playerId));
    }
  }

  close(reason: string): void {
    this.clearTimer();
    for (const socketId of this.socketByPlayer.values()) {
      this.io.to(socketId).emit('room:closed', { reason });
    }
  }
}
