// Integrationstest: ansluter till servern via riktiga Socket.IO-anslutningar,
// skapar ett rum, fyller med bottar och spelar hela partier till slut.
// Kraver att servern kor (helst med DOS_FAST=1). Kors via tsx.

import { io, type Socket } from 'socket.io-client';
import type {
  ClientGameView,
  ClientToServerEvents,
  JoinResult,
  RoomSnapshot,
  ServerToClientEvents,
} from '@dos/shared';
import { VALKOMPASS_QUESTIONS, type AnswerKey } from '@dos/shared';

const URL = process.env.DOS_URL ?? 'http://localhost:3001';
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function emitAck<T>(socket: TestSocket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), 5000);
    (socket.emit as (e: string, p: unknown, cb: (r: T) => void) => void)(
      event,
      payload,
      (r: T) => {
        clearTimeout(timer);
        resolve(r);
      },
    );
  });
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Enkel manniskoinput harledd ur klientvyn. */
function decideHumanAction(me: string, g: ClientGameView): void | {
  type: string;
  [k: string]: unknown;
} {
  const alive = g.players.filter((p) => p.alive);
  const others = alive.filter((p) => p.id !== me);

  if (g.phase === 'nomination' && g.presidentId === me && !g.nominatedTalmanId) {
    return { type: 'NOMINATE', talmanId: rand(others).id };
  }
  if (g.phase === 'voting' && g.votes[me] === 'none') {
    return { type: 'VOTE', vote: Math.random() < 0.7 };
  }
  if (
    g.phase === 'legislationPresident' &&
    g.presidentId === me &&
    g.you.presidentCards.length > 0
  ) {
    return { type: 'PRESIDENT_DISCARD', cardId: rand(g.you.presidentCards).id };
  }
  if (
    g.phase === 'legislationTalman' &&
    g.nominatedTalmanId === me &&
    g.you.talmanCards.length > 0
  ) {
    return { type: 'TALMAN_ENACT', cardId: rand(g.you.talmanCards).id };
  }
  if (g.phase === 'vetoResponse' && g.presidentId === me) {
    return { type: 'VETO_RESPONSE', agree: false };
  }
  if (g.phase === 'powerAction' && g.presidentId === me) {
    if (g.pendingPower === 'peek') return { type: 'POWER_PEEK_DONE' };
    return { type: 'POWER_TARGET', targetId: rand(others).id };
  }
  return undefined;
}

function runOneGame(gameNo: number): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const socket: TestSocket = io(URL, { transports: ['websocket', 'polling'] });
    let myId = '';
    let finished = false;
    let lastGame: ClientGameView | null = null;
    const overallTimeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        socket.close();
        reject(new Error(`Spel ${gameNo}: avslutades aldrig`));
      }
    }, 60_000);

    const act = (g: ClientGameView) => {
      const action = decideHumanAction(myId, g);
      if (action) socket.emit('game:action', { action: action as never });
    };

    socket.on('connect_error', (e) => {
      if (!finished) {
        finished = true;
        clearTimeout(overallTimeout);
        reject(new Error(`Anslutningsfel: ${e.message}`));
      }
    });

    socket.on('room:error', () => {
      // Otillaten handling (t.ex. termsparrad nominering) - forsok igen.
      if (lastGame && !finished) act(lastGame);
    });

    socket.on('room:snapshot', (snap: RoomSnapshot) => {
      if (finished) return;
      if (snap.phase === 'ingame' && snap.game) {
        lastGame = snap.game;
        if (snap.game.phase === 'gameOver') {
          finished = true;
          clearTimeout(overallTimeout);
          const winner = snap.game.winner ?? 'okant';
          socket.close();
          resolve(winner);
          return;
        }
        act(snap.game);
      }
    });

    try {
      await new Promise<void>((res) => socket.on('connect', () => res()));
      const created = await emitAck<JoinResult>(socket, 'lobby:create', {
        name: `Tester ${gameNo}`,
      });
      if (!created.ok || !created.playerId) throw new Error('Kunde inte skapa rum');
      myId = created.playerId;

      for (let i = 0; i < 4; i++) socket.emit('lobby:addBot');

      const answers: Record<string, AnswerKey> = {};
      for (const q of VALKOMPASS_QUESTIONS) answers[q.id] = rand(['helt', 'neutral', 'inte'] as AnswerKey[]);
      socket.emit('lobby:valkompass', { answers });
      socket.emit('lobby:setReady', { ready: true });

      await new Promise((r) => setTimeout(r, 300));
      socket.emit('lobby:start');
    } catch (err) {
      if (!finished) {
        finished = true;
        clearTimeout(overallTimeout);
        socket.close();
        reject(err);
      }
    }
  });
}

async function main() {
  const games = Number(process.env.DOS_GAMES) || 3;
  console.log(`Kor ${games} integrationsspel mot ${URL} ...`);
  const winners: Record<string, number> = {};
  for (let i = 1; i <= games; i++) {
    const winner = await runOneGame(i);
    winners[winner] = (winners[winner] ?? 0) + 1;
    console.log(`  Spel ${i}: vinnare = ${winner}`);
  }
  console.log('Resultat:', winners);
  console.log('INTEGRATIONSTEST OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('INTEGRATIONSTEST MISSLYCKADES:', err.message);
  process.exit(1);
});
