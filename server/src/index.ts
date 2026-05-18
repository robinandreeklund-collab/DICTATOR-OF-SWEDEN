import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@dos/shared';
import { RoomManager } from './RoomManager.js';
import type { Room } from './Room.js';

const PORT = Number(process.env.PORT) || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true },
});

const manager = new RoomManager(io);

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: manager.roomCount });
});

// Servera den byggda klienten om den finns.
if (existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get('*', (_req, res) => {
    res.sendFile(join(PUBLIC_DIR, 'index.html'));
  });
}

interface SocketData {
  roomCode?: string;
  playerId?: string;
}

io.on('connection', (socket) => {
  const data = socket.data as SocketData;

  const joinRoom = (roomCode: string, playerId: string) => {
    data.roomCode = roomCode;
    data.playerId = playerId;
    socket.join(roomCode);
  };

  socket.on('lobby:create', ({ name }, cb) => {
    const room = manager.createRoom();
    const playerId = room.addHuman(name, socket.id);
    joinRoom(room.code, playerId);
    cb({ ok: true, roomCode: room.code, playerId });
  });

  socket.on('lobby:join', ({ roomCode, name }, cb) => {
    const room = manager.getRoom(roomCode);
    if (!room) {
      cb({ ok: false, error: 'Rummet finns inte.' });
      return;
    }
    if (room.inGame) {
      cb({ ok: false, error: 'Spelet har redan borjat.' });
      return;
    }
    if (room.humanCount >= 8) {
      cb({ ok: false, error: 'Rummet ar fullt.' });
      return;
    }
    manager.cancelCleanup(room.code);
    const playerId = room.addHuman(name, socket.id);
    joinRoom(room.code, playerId);
    cb({ ok: true, roomCode: room.code, playerId });
  });

  socket.on('lobby:rejoin', ({ roomCode, playerId }, cb) => {
    const room = manager.getRoom(roomCode);
    if (!room || !room.hasPlayer(playerId)) {
      cb({ ok: false, error: 'Kunde inte ateransluta till rummet.' });
      return;
    }
    manager.cancelCleanup(room.code);
    room.reconnect(playerId, socket.id);
    joinRoom(room.code, playerId);
    cb({ ok: true, roomCode: room.code, playerId });
  });

  const withRoom = (fn: (room: Room, playerId: string) => void) => {
    if (!data.roomCode || !data.playerId) return;
    const room = manager.getRoom(data.roomCode);
    if (!room) return;
    fn(room, data.playerId);
  };

  socket.on('lobby:valkompass', ({ answers }) => {
    withRoom((room, pid) => room.setValkompass(pid, answers));
  });
  socket.on('lobby:setParty', ({ partyId }) => {
    withRoom((room, pid) => room.setParty(pid, partyId));
  });
  socket.on('lobby:setReady', ({ ready }) => {
    withRoom((room, pid) => room.setReady(pid, ready));
  });
  socket.on('lobby:addBot', () => {
    withRoom((room) => room.addBot());
  });
  socket.on('lobby:removeBot', ({ botId }) => {
    withRoom((room) => room.removeBot(botId));
  });
  socket.on('lobby:settings', ({ settings }) => {
    withRoom((room, pid) => room.setSettings(pid, settings));
  });
  socket.on('lobby:start', () => {
    withRoom((room, pid) => room.startGame(pid));
  });
  socket.on('game:restart', () => {
    withRoom((room, pid) => room.restartGame(pid));
  });
  socket.on('game:action', ({ action }) => {
    withRoom((room, pid) => room.handleGameAction(pid, action));
  });
  socket.on('chat:send', ({ text }) => {
    withRoom((room, pid) => room.addChat(pid, text));
  });

  socket.on('lobby:leave', () => {
    handleLeave();
  });

  function handleLeave() {
    if (!data.roomCode) return;
    const room = manager.getRoom(data.roomCode);
    if (room) {
      const empty = room.handleDisconnect(socket.id);
      if (empty) manager.scheduleCleanup(room.code);
    }
    socket.leave(data.roomCode);
    data.roomCode = undefined;
    data.playerId = undefined;
  }

  socket.on('disconnect', () => {
    handleLeave();
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Dictator of Sweden] Servern lyssnar pa port ${PORT}`);
});
