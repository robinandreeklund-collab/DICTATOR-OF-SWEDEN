// Integrationstest: ansluter till servern via riktiga Socket.IO-anslutningar
// och spelar bade kampanjlaget och det klassiska laget till slut.
// Kraver att servern kor (helst med DOS_FAST=1). Kors via tsx.

import { io, type Socket } from 'socket.io-client';
import type {
  CampaignClientAction,
  CampaignClientView,
  ClientGameView,
  ClientToServerEvents,
  JoinResult,
  RoomSnapshot,
  ServerToClientEvents,
} from '@dos/shared';

const URL = process.env.DOS_URL ?? 'http://localhost:3001';
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function emitAck<T>(socket: TestSocket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), 5000);
    (socket.emit as (e: string, p: unknown, cb: (r: T) => void) => void)(event, payload, (r: T) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- klassiska laget --------------------------------------------------------

function decideClassic(me: string, g: ClientGameView): { type: string; [k: string]: unknown } | void {
  const others = g.players.filter((p) => p.alive && p.id !== me);
  if (g.phase === 'nomination' && g.presidentId === me && !g.nominatedTalmanId)
    return { type: 'NOMINATE', talmanId: rand(others).id };
  if (g.phase === 'voting' && g.votes[me] === 'none')
    return { type: 'VOTE', vote: Math.random() < 0.7 };
  if (g.phase === 'legislationPresident' && g.presidentId === me && g.you.presidentCards.length)
    return { type: 'PRESIDENT_DISCARD', cardId: rand(g.you.presidentCards).id };
  if (g.phase === 'legislationTalman' && g.nominatedTalmanId === me && g.you.talmanCards.length)
    return { type: 'TALMAN_ENACT', cardId: rand(g.you.talmanCards).id };
  if (g.phase === 'vetoResponse' && g.presidentId === me)
    return { type: 'VETO_RESPONSE', agree: false };
  if (g.phase === 'powerAction' && g.presidentId === me) {
    if (g.pendingPower === 'peek') return { type: 'POWER_PEEK_DONE' };
    return { type: 'POWER_TARGET', targetId: rand(others).id };
  }
}

// --- kampanjlaget -----------------------------------------------------------

function decideCampaign(me: string, g: CampaignClientView): CampaignClientAction | void {
  if (g.phase === 'planning' && !g.you.submitted && g.you.role) {
    const myTeam = g.teams.find((t) => t.id === g.you.teamId);
    const rivals = g.teams.filter((t) => t.id !== g.you.teamId);
    const role = g.you.role;
    let action: Record<string, unknown> = { role };
    if (role === 'kampanjledare') {
      const vks = g.valkretsar.slice(0, 3).map((v) => v.id);
      const spend: Record<string, number> = {};
      vks.forEach((id) => (spend[id] = 4));
      action = { role, spend };
    } else if (role === 'talesperson') {
      action = {
        role,
        issue: g.hotIssue ?? 'valfard',
        debateTarget: rivals[0]?.id ?? 'positiv',
      };
      if (g.crisisTeamId === g.you.teamId) action.crisisResponse = 'erkann';
    } else if (role === 'strateg') {
      action = { role, focus: 'bas' };
    } else if (role === 'analytiker') {
      action = { role, analyzeTarget: rivals[0]?.id ?? g.you.teamId };
    } else {
      action = { role, choice: 'fundraise' };
    }
    return { type: 'SUBMIT_ROLE', action: action as never, sabotage: false };
  }
  if (g.phase === 'internal' && g.you.internalVoteCast === null) {
    const myTeam = g.teams.find((t) => t.id === g.you.teamId);
    const others = (myTeam?.memberIds ?? []).filter((id) => id !== me);
    if (others.length) return { type: 'INTERNAL_VOTE', accusedId: rand(others) };
  }
}

function playGame(
  mode: 'classic' | 'campaign',
  gameNo: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket: TestSocket = io(URL, { transports: ['websocket', 'polling'] });
    let myId = '';
    let finished = false;
    let lastGame: RoomSnapshot['game'] = null;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        socket.close();
        reject(new Error(`${mode} ${gameNo}: avslutades aldrig`));
      }
    }, 90_000);

    const act = (snap: RoomSnapshot) => {
      if (!snap.game) return;
      if (snap.mode === 'campaign') {
        const action = decideCampaign(myId, snap.game as CampaignClientView);
        if (action) socket.emit('game:campaignAction', { action });
      } else {
        const action = decideClassic(myId, snap.game as ClientGameView);
        if (action) socket.emit('game:action', { action: action as never });
      }
    };

    socket.on('connect_error', (e) => {
      if (!finished) { finished = true; clearTimeout(timeout); reject(e); }
    });
    socket.on('room:error', () => {
      /* AFK-skyddet driver vidare vid behov */
    });
    socket.on('room:snapshot', (snap: RoomSnapshot) => {
      if (finished) return;
      if (snap.phase !== 'ingame' || !snap.game) return;
      lastGame = snap.game;
      const over =
        (snap.mode === 'campaign' && (snap.game as CampaignClientView).phase === 'gameOver') ||
        (snap.mode === 'classic' && (snap.game as ClientGameView).phase === 'gameOver');
      if (over) {
        finished = true;
        clearTimeout(timeout);
        let outcome = 'klart';
        if (snap.mode === 'campaign') {
          const r = (snap.game as CampaignClientView).result;
          outcome = r ? `regering: ${r.governingBloc}` : 'okant';
        } else {
          outcome = (snap.game as ClientGameView).winner ?? 'okant';
        }
        socket.close();
        resolve(outcome);
        return;
      }
      act(snap);
    });

    (async () => {
      try {
        await new Promise<void>((res) => socket.on('connect', () => res()));
        const created = await emitAck<JoinResult>(socket, 'lobby:create', {
          name: `Tester ${gameNo}`,
        });
        if (!created.ok || !created.playerId) throw new Error('Kunde inte skapa rum');
        myId = created.playerId;

        if (mode === 'classic') {
          socket.emit('lobby:setMode', { mode: 'classic' });
          await sleep(150);
          for (let i = 0; i < 4; i++) socket.emit('lobby:addBot', {});
          await sleep(200);
          socket.emit('lobby:setParty', { partyId: 'm' });
        } else {
          socket.emit('lobby:joinTeam', { teamIndex: 0 });
        }
        await sleep(200);
        socket.emit('lobby:setReady', { ready: true });
        await sleep(300);
        socket.emit('lobby:start');
      } catch (err) {
        if (!finished) { finished = true; clearTimeout(timeout); socket.close(); reject(err); }
      }
    })();

    void lastGame;
  });
}

async function main() {
  const games = Number(process.env.DOS_GAMES) || 3;
  console.log(`Integrationstest mot ${URL}`);

  console.log('--- Kampanjlaget ---');
  for (let i = 1; i <= games; i++) {
    const r = await playGame('campaign', i);
    console.log(`  Kampanj ${i}: ${r}`);
  }
  console.log('--- Klassiska laget ---');
  for (let i = 1; i <= 2; i++) {
    const r = await playGame('classic', i);
    console.log(`  Klassiskt ${i}: ${r}`);
  }
  console.log('INTEGRATIONSTEST OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('INTEGRATIONSTEST MISSLYCKADES:', err.message ?? err);
  process.exit(1);
});
