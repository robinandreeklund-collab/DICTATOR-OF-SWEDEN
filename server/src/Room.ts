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
  Campaign,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PARTIES,
  type Action,
  type AnswerKey,
  type ChatMessage,
  type ClientAction,
  type CampaignClientAction,
  type ClientToServerEvents,
  type GameMode,
  type GameSettings,
  type GameState,
  type LobbyPlayer,
  type LobbyView,
  type Rng,
  type RoomSnapshot,
  type ServerToClientEvents,
} from '@dos/shared';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type CampaignState = Campaign.CampaignState;

// DOS_FAST=1 ger minimala fordrojningar for automatiserade tester.
const FAST = process.env.DOS_FAST === '1';
const ROLE_REVEAL_MS = FAST ? 40 : 7000;
const NEWS_MS = FAST ? 40 : 6500;
const ROUND_END_MS = FAST ? 40 : 4500;
const RESOLUTION_MS = FAST ? 40 : 7500;
const ELECTION_MS = FAST ? 60 : 9000;
const BOT_ACTION_MS = FAST ? 15 : 1300;
const AFK_MS = FAST ? 2500 : 90000;

const BOT_NAMES = [
  'Bot Astrid', 'Bot Bjorn', 'Bot Cecilia', 'Bot David', 'Bot Elsa',
  'Bot Fredrik', 'Bot Greta', 'Bot Henrik', 'Bot Ingrid', 'Bot Johan',
  'Bot Karin', 'Bot Lars', 'Bot Maja', 'Bot Nils', 'Bot Olivia',
  'Bot Per', 'Bot Sara', 'Bot Tomas', 'Bot Ulla', 'Bot Viktor',
];

// Blockväxlande ordning sa att valfritt antal lag blir nara balanserat.
const DEFAULT_TEAM_PARTIES = [
  's', 'm', 'c', 'sd', 'v', 'kd', 'mp', 'l', 'fi', 'pirat', 'djur', 'nyans',
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
  teamIndex: number | null;
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
  private teamChats: ChatMessage[][] = [[], [], [], []];
  private nextChatId = 1;
  private hostId = '';

  private mode: GameMode = 'campaign';
  private numTeams = 3;
  private teamParties: string[] = DEFAULT_TEAM_PARTIES.slice(0, 3);

  private gameState: GameState | null = null;
  private campaign: CampaignState | null = null;
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
    return this.gameState !== null || this.campaign !== null;
  }
  hasPlayer(playerId: string): boolean {
    return this.players.some((p) => p.id === playerId);
  }

  addHuman(name: string, socketId: string): string {
    const isFirst = this.players.length === 0;
    const id = genId('p');
    this.players.push({
      id,
      name: sanitizeName(name),
      isBot: false,
      connected: true,
      partyId: null,
      valkompassDone: false,
      suggestedPartyId: null,
      ready: false,
      teamIndex: null,
    });
    this.socketByPlayer.set(id, socketId);
    if (isFirst) this.hostId = id;
    this.systemChat(`${sanitizeName(name)} gick med i lobbyn.`);
    this.broadcast();
    return id;
  }

  reconnect(playerId: string, socketId: string): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;
    player.connected = true;
    this.socketByPlayer.set(playerId, socketId);
    this.broadcast();
    return true;
  }

  handleDisconnect(socketId: string): boolean {
    const entry = [...this.socketByPlayer.entries()].find(([, sid]) => sid === socketId);
    if (!entry) return this.isEmpty;
    const [playerId] = entry;
    this.socketByPlayer.delete(playerId);
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return this.isEmpty;

    if (!this.inGame) {
      this.players = this.players.filter((p) => p.id !== playerId);
      this.systemChat(`${player.name} lamnade lobbyn.`);
      if (this.hostId === playerId) {
        const nextHost = this.players.find((p) => !p.isBot);
        this.hostId = nextHost ? nextHost.id : '';
      }
    } else {
      player.connected = false;
      this.systemChat(`${player.name} kopplades fran.`);
    }
    this.broadcast();
    return this.isEmpty;
  }

  // --- lobbyinstallningar ---------------------------------------------------

  setMode(playerId: string, mode: GameMode): void {
    if (playerId !== this.hostId || this.inGame) return;
    if (mode !== 'classic' && mode !== 'campaign') return;
    this.mode = mode;
    for (const p of this.players) {
      p.ready = false;
      p.teamIndex = null;
      p.partyId = null;
    }
    this.broadcast();
  }

  setNumTeams(playerId: string, n: number): void {
    if (playerId !== this.hostId || this.inGame || this.mode !== 'campaign') return;
    if (n < Campaign.MIN_TEAMS || n > Campaign.MAX_TEAMS) return;
    this.numTeams = n;
    this.teamParties = DEFAULT_TEAM_PARTIES.slice(0, n);
    for (const p of this.players) {
      if (p.teamIndex !== null && p.teamIndex >= n) {
        p.teamIndex = null;
        p.ready = false;
      }
    }
    // Ta bort bottar som hamnat utanfor.
    this.players = this.players.filter((p) => !(p.isBot && p.teamIndex === null));
    this.broadcast();
  }

  setTeamParty(playerId: string, teamIndex: number, partyId: string): void {
    if (playerId !== this.hostId || this.inGame || this.mode !== 'campaign') return;
    if (teamIndex < 0 || teamIndex >= this.numTeams) return;
    if (!PARTIES.some((p) => p.id === partyId)) return;
    this.teamParties[teamIndex] = partyId;
    this.broadcast();
  }

  joinTeam(playerId: string, teamIndex: number): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.inGame || this.mode !== 'campaign') return;
    if (teamIndex < 0 || teamIndex >= this.numTeams) return;
    const size = this.players.filter((p) => p.teamIndex === teamIndex).length;
    if (size >= Campaign.TEAM_MAX_SIZE && player.teamIndex !== teamIndex) return;
    player.teamIndex = teamIndex;
    this.broadcast();
  }

  // --- bottar ---------------------------------------------------------------

  addBot(teamIndex?: number): void {
    if (this.inGame) return;
    const used = new Set(this.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.players.length}`;

    if (this.mode === 'classic') {
      if (this.players.length >= MAX_PLAYERS) return;
      const party = PARTIES[Math.floor(Math.random() * PARTIES.length)];
      this.players.push({
        id: genId('bot'), name, isBot: true, connected: true,
        partyId: party.id, valkompassDone: true, suggestedPartyId: party.id,
        ready: true, teamIndex: null,
      });
    } else {
      let target = teamIndex;
      if (target === undefined || target < 0 || target >= this.numTeams) {
        // Minsta laget.
        target = 0;
        let best = Infinity;
        for (let i = 0; i < this.numTeams; i++) {
          const size = this.players.filter((p) => p.teamIndex === i).length;
          if (size < best) { best = size; target = i; }
        }
      }
      if (this.players.filter((p) => p.teamIndex === target).length >= Campaign.TEAM_MAX_SIZE)
        return;
      this.players.push({
        id: genId('bot'), name, isBot: true, connected: true,
        partyId: null, valkompassDone: true, suggestedPartyId: null,
        ready: true, teamIndex: target,
      });
    }
    this.broadcast();
  }

  removeBot(botId: string): void {
    if (this.inGame) return;
    this.players = this.players.filter((p) => !(p.id === botId && p.isBot));
    this.broadcast();
  }

  // --- klassisk lobby -------------------------------------------------------

  setValkompass(playerId: string, answers: Record<string, AnswerKey>): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.inGame) return;
    const result = scoreValkompass(answers);
    player.valkompassDone = true;
    player.suggestedPartyId = result[0]?.partyId ?? null;
    if (this.mode === 'classic' && !player.partyId) player.partyId = player.suggestedPartyId;
    this.broadcast();
  }

  setParty(playerId: string, partyId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.inGame || this.mode !== 'classic') return;
    if (!PARTIES.some((p) => p.id === partyId)) return;
    player.partyId = partyId;
    this.broadcast();
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.inGame) return;
    if (ready && this.mode === 'classic' && !player.partyId) return;
    if (ready && this.mode === 'campaign' && player.teamIndex === null) return;
    player.ready = ready;
    this.broadcast();
  }

  setSettings(playerId: string, settings: GameSettings): void {
    if (playerId !== this.hostId || this.inGame) return;
    this.settings = {
      hiddenVotes: !!settings.hiddenVotes,
      discussionSeconds: Math.max(0, Math.min(120, settings.discussionSeconds | 0)),
    };
    this.broadcast();
  }

  // --- startvillkor ---------------------------------------------------------

  private startBlockedReason(): string | null {
    if (this.mode === 'classic') {
      if (this.players.length < MIN_PLAYERS)
        return `Det behovs minst ${MIN_PLAYERS} spelare. Lagg till bottar.`;
      if (this.players.length > MAX_PLAYERS) return `Hogst ${MAX_PLAYERS} spelare.`;
      const notReady = this.players.filter((p) => !p.isBot && (!p.ready || !p.partyId));
      if (notReady.length > 0) return 'Alla spelare maste valja parti och bli redo.';
      return null;
    }
    // Kampanj
    const parties = this.teamParties.slice(0, this.numTeams);
    if (new Set(parties).size !== parties.length)
      return 'Varje lag maste ha ett unikt parti.';
    for (let i = 0; i < this.numTeams; i++) {
      const size = this.players.filter((p) => p.teamIndex === i).length;
      if (size > Campaign.TEAM_MAX_SIZE)
        return `Lag ${i + 1} har for manga spelare (max ${Campaign.TEAM_MAX_SIZE}).`;
    }
    const unassigned = this.players.filter((p) => !p.isBot && p.teamIndex === null);
    if (unassigned.length > 0) return 'Alla spelare maste ga med i ett lag.';
    const notReady = this.players.filter((p) => !p.isBot && !p.ready);
    if (notReady.length > 0) return 'Alla spelare maste bli redo.';
    if (this.players.filter((p) => !p.isBot).length === 0)
      return 'Det behovs minst en spelare.';
    return null;
  }

  startGame(playerId: string): void {
    if (playerId !== this.hostId || this.inGame) return;
    if (this.startBlockedReason()) return;

    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this.rng = makeRng((seed + 101) >>> 0);

    if (this.mode === 'classic') {
      for (const p of this.players) {
        if (!p.partyId) p.partyId = PARTIES[Math.floor(Math.random() * PARTIES.length)].id;
      }
      this.gameState = createGame(
        this.players.map((p) => ({
          id: p.id, name: p.name, partyId: p.partyId!, isBot: p.isBot,
          isHost: p.id === this.hostId,
        })),
        this.settings,
        seed,
      );
    } else {
      // Fyll varje lag till minst minsta storlek.
      for (let i = 0; i < this.numTeams; i++) {
        let size = this.players.filter((p) => p.teamIndex === i).length;
        while (size < Campaign.TEAM_MIN_SIZE) {
          this.addBotSilently(i);
          size++;
        }
      }
      const teams = [];
      for (let i = 0; i < this.numTeams; i++) {
        teams.push({
          id: `team${i}`,
          partyId: this.teamParties[i],
          memberIds: this.players.filter((p) => p.teamIndex === i).map((p) => p.id),
        });
      }
      this.campaign = Campaign.createCampaign(
        {
          players: this.players.map((p) => ({
            id: p.id, name: p.name, isBot: p.isBot, isHost: p.id === this.hostId,
          })),
          teams,
        },
        seed,
      );
    }
    this.systemChat('Spelet har borjat. Lycka till!');
    this.broadcast();
    this.scheduleTick();
  }

  private addBotSilently(teamIndex: number): void {
    const used = new Set(this.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.players.length}`;
    this.players.push({
      id: genId('bot'), name, isBot: true, connected: true,
      partyId: null, valkompassDone: true, suggestedPartyId: null,
      ready: true, teamIndex,
    });
  }

  restartGame(playerId: string): void {
    if (playerId !== this.hostId) return;
    this.clearTimer();
    this.gameState = null;
    this.campaign = null;
    for (const p of this.players) if (!p.isBot) p.ready = false;
    this.systemChat('Ater till lobbyn for en ny match.');
    this.broadcast();
  }

  // --- spelhandlingar -------------------------------------------------------

  handleGameAction(playerId: string, clientAction: ClientAction): void {
    if (!this.gameState) return;
    const res = applyAction(this.gameState, { ...clientAction, playerId } as Action, this.rng);
    if (!res.ok) { this.emitError(playerId, res.error ?? 'Otillaten handling.'); return; }
    this.gameState = res.state;
    this.broadcast();
    this.scheduleTick();
  }

  handleCampaignAction(playerId: string, action: CampaignClientAction): void {
    if (!this.campaign) return;
    const res = Campaign.applyCampaignAction(
      this.campaign,
      { ...action, playerId } as Campaign.CampaignAction,
      this.rng,
    );
    if (!res.ok) { this.emitError(playerId, res.error ?? 'Otillaten handling.'); return; }
    this.campaign = res.state;
    this.broadcast();
    this.scheduleTick();
  }

  // --- tick / pacing --------------------------------------------------------

  private scheduleTick(): void {
    this.clearTimer();
    if (this.gameState) this.scheduleClassicTick();
    else if (this.campaign) this.scheduleCampaignTick();
  }

  private scheduleClassicTick(): void {
    const g = this.gameState!;
    if (g.phase === 'gameOver') return;
    let delay: number;
    let run: () => void;
    if (g.phase === 'roleReveal') {
      delay = ROLE_REVEAL_MS;
      run = () => this.runClassic({ type: 'ADVANCE' });
    } else if (g.phase === 'roundEnd') {
      delay = ROUND_END_MS;
      run = () => this.runClassic({ type: 'ADVANCE' });
    } else {
      const actors = pendingActors(g);
      if (actors.length === 0) return;
      const bot = actors.find((id) => playerById(g, id)?.isBot);
      delay = bot ? BOT_ACTION_MS : AFK_MS;
      const actor = bot ?? actors[0];
      run = () => {
        const action = botAction(this.gameState!, actor, this.rng);
        if (action) this.runClassic(action);
        else this.scheduleTick();
      };
    }
    this.timer = setTimeout(() => { this.timer = null; run(); }, delay);
  }

  private runClassic(action: Action): void {
    if (!this.gameState) return;
    const res = applyAction(this.gameState, action, this.rng);
    if (res.ok) this.gameState = res.state;
    this.broadcast();
    this.scheduleTick();
  }

  private scheduleCampaignTick(): void {
    const c = this.campaign!;
    if (c.phase === 'gameOver') return;
    let delay: number;
    let run: () => void;
    const advance = () => this.runCampaign({ type: 'ADVANCE' });

    if (c.phase === 'roleReveal') { delay = ROLE_REVEAL_MS; run = advance; }
    else if (c.phase === 'news') { delay = NEWS_MS; run = advance; }
    else if (c.phase === 'resolution') { delay = RESOLUTION_MS; run = advance; }
    else if (c.phase === 'electionNight') { delay = ELECTION_MS; run = advance; }
    else {
      const actors = Campaign.pendingCampaignActors(c);
      if (actors.length === 0) return;
      const bot = actors.find((id) => c.players.find((p) => p.id === id)?.isBot);
      delay = bot ? BOT_ACTION_MS : AFK_MS;
      const actor = bot ?? actors[0];
      run = () => {
        const action = Campaign.botCampaignAction(this.campaign!, actor, this.rng);
        if (action) this.runCampaign(action);
        else this.scheduleTick();
      };
    }
    this.timer = setTimeout(() => { this.timer = null; run(); }, delay);
  }

  private runCampaign(action: Campaign.CampaignAction): void {
    if (!this.campaign) return;
    const res = Campaign.applyCampaignAction(this.campaign, action, this.rng);
    if (res.ok) this.campaign = res.state;
    this.broadcast();
    this.scheduleTick();
  }

  private clearTimer(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  // --- chatt ----------------------------------------------------------------

  addChat(playerId: string, text: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    const clean = (text ?? '').trim().slice(0, 500);
    if (!clean) return;
    this.pushChat(this.chat, playerId, player.name, clean, false, null);
    this.broadcast();
  }

  addTeamChat(playerId: string, text: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.teamIndex === null) return;
    const clean = (text ?? '').trim().slice(0, 500);
    if (!clean) return;
    const log = this.teamChats[player.teamIndex];
    this.pushChat(log, playerId, player.name, clean, false, player.teamIndex);
    this.broadcast();
  }

  private systemChat(text: string): void {
    this.pushChat(this.chat, 'system', 'System', text, true, null);
  }

  private pushChat(
    log: ChatMessage[], playerId: string, name: string, text: string,
    system: boolean, teamIndex: number | null,
  ): void {
    log.push({ id: this.nextChatId++, playerId, name, text, ts: Date.now(), system, teamIndex });
    if (log.length > 200) log.splice(0, log.length - 200);
  }

  // --- ogonblicksbilder -----------------------------------------------------

  private buildLobbyView(): LobbyView {
    const players: LobbyPlayer[] = this.players.map((p) => ({
      id: p.id, name: p.name, isBot: p.isBot, isHost: p.id === this.hostId,
      connected: p.connected, partyId: p.partyId, valkompassDone: p.valkompassDone,
      suggestedPartyId: p.suggestedPartyId, ready: p.isBot ? true : p.ready,
      teamIndex: p.teamIndex,
    }));
    return {
      mode: this.mode,
      players,
      settings: this.settings,
      campaign: { numTeams: this.numTeams, teamParties: this.teamParties.slice(0, this.numTeams) },
      hostId: this.hostId,
      canStart: this.startBlockedReason() === null,
      startBlockedReason: this.startBlockedReason(),
      minPlayers: this.mode === 'classic' ? MIN_PLAYERS : Campaign.MIN_TEAMS * Campaign.TEAM_MIN_SIZE,
      maxPlayers: this.mode === 'classic' ? MAX_PLAYERS : this.numTeams * Campaign.TEAM_MAX_SIZE,
    };
  }

  snapshotFor(playerId: string): RoomSnapshot {
    const player = this.players.find((p) => p.id === playerId);
    let game: RoomSnapshot['game'] = null;
    if (this.gameState) game = toClientView(this.gameState, playerId);
    else if (this.campaign) game = Campaign.toCampaignView(this.campaign, playerId);

    const teamChat =
      this.mode === 'campaign' && player?.teamIndex != null
        ? this.teamChats[player.teamIndex]
        : [];

    return {
      roomCode: this.code,
      mode: this.mode,
      phase: this.inGame ? 'ingame' : 'lobby',
      you: { id: playerId, name: player?.name ?? 'Spelare', isHost: playerId === this.hostId },
      lobby: this.inGame ? null : this.buildLobbyView(),
      game,
      chat: this.chat,
      teamChat,
    };
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
