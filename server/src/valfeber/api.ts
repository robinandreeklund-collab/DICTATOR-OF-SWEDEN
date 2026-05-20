import express, { type Request, type Response, type Router } from 'express';
import { Campaign } from '@dos/shared';
import type { Db } from './db.js';
import { loadWorld, loadSupport } from './schema.js';
import { login, playerByToken, register, type Player } from './auth.js';
import { performAction, questionsForDay, setPartyAndRegion, type ActionKind } from './actions.js';
import {
  getAchievements,
  getLeaderboard,
  partyMemberCounts,
  playerRank,
} from './leaderboard.js';
import {
  ACTIONS_PER_DAY,
  computeStandings,
  currentDay,
  dayMs,
  eventForDay,
  isElectionOver,
  totalDays,
  VALFEBER_PARTIES,
} from './world.js';

function h(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err) => {
      console.error('[valfeber] API-fel:', err);
      res.status(500).json({ error: 'Serverfel.' });
    });
  };
}

async function buildState(db: Db, player: Player) {
  const world = await loadWorld(db);
  const day = currentDay(world);
  const total = totalDays(world);
  const electionOver = isElectionOver(world);
  const support = await loadSupport(db);
  const standings = computeStandings(support);
  const counts = await partyMemberCounts(db);

  const mapLeaders: Record<string, string> = {};
  for (const vk of Campaign.VALKRETSAR) {
    const row = support[vk.id] ?? {};
    let best = VALFEBER_PARTIES[0];
    for (const p of VALFEBER_PARTIES) if ((row[p] ?? 0) > (row[best] ?? 0)) best = p;
    mapLeaders[vk.id] = best;
  }

  // Spelarens region-stod for sitt parti.
  let regionStandings = null;
  if (player.region_id) {
    const row = support[player.region_id] ?? {};
    const tot = Object.values(row).reduce((a, b) => a + b, 0) || 1;
    regionStandings = VALFEBER_PARTIES.map((p) => ({
      partyId: p,
      percent: ((row[p] ?? 0) / tot) * 100,
    })).sort((a, b) => b.percent - a.percent);
  }

  const rank = await playerRank(db, player.points);
  const achievements = await getAchievements(db, player.id);

  const [global, partyLb, regionLb] = await Promise.all([
    getLeaderboard(db, 'global', null, 50),
    player.party_id ? getLeaderboard(db, 'party', player.party_id, 50) : Promise.resolve([]),
    player.region_id ? getLeaderboard(db, 'region', player.region_id, 50) : Promise.resolve([]),
  ]);

  let election = null;
  if (electionOver) {
    let redgron = 0;
    let tido = 0;
    for (const s of standings) {
      if (Campaign.blocOf(s.partyId) === 'redgron') redgron += s.mandates;
      else tido += s.mandates;
    }
    election = { redgron, tido, governingBloc: redgron >= tido ? 'redgron' : 'tido' };
  }

  const msToNextDay = electionOver
    ? 0
    : world.start_ts + (day + 1) * dayMs() - Date.now();

  return {
    world: {
      day,
      totalDays: total,
      electionOver,
      msToNextDay: Math.max(0, msToNextDay),
      endTs: world.end_ts,
    },
    event: eventForDay(day),
    standings,
    mapLeaders,
    partyCounts: counts,
    regionStandings,
    you: {
      id: player.id,
      username: player.username,
      partyId: player.party_id,
      regionId: player.region_id,
      points: player.points,
      streak: player.streak,
      rank,
      actionsLeft: player.actions_day === day ? player.actions_left : ACTIONS_PER_DAY,
      achievements,
    },
    leaderboards: { global, party: partyLb, region: regionLb },
    debate: questionsForDay(day).map((q) => ({
      id: q.id,
      topic: q.topic,
      statement: q.statement,
    })),
    election,
  };
}

export function createValfeberApi(db: Db): Router {
  const router = express.Router();
  router.use(express.json({ limit: '32kb' }));

  const auth = async (req: Request, res: Response): Promise<Player | null> => {
    const token = (req.header('x-token') ?? '').trim();
    const player = await playerByToken(db, token);
    if (!player) {
      res.status(401).json({ error: 'Inte inloggad.' });
      return null;
    }
    return player;
  };

  router.post('/register', h(async (req, res) => {
    const { username, password } = req.body ?? {};
    const r = await register(db, username, password);
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ token: r.token, state: await buildState(db, r.player!) });
  }));

  router.post('/login', h(async (req, res) => {
    const { username, password } = req.body ?? {};
    const r = await login(db, username, password);
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ token: r.token, state: await buildState(db, r.player!) });
  }));

  router.get('/state', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    res.json({ state: await buildState(db, player) });
  }));

  router.post('/choose', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    const { partyId, regionId } = req.body ?? {};
    const r = await setPartyAndRegion(db, player, partyId, regionId);
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ state: await buildState(db, r.player!) });
  }));

  router.post('/action', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    const world = await loadWorld(db);
    const { kind, ...payload } = req.body ?? {};
    const r = await performAction(db, world, player, kind as ActionKind, payload);
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({
      result: { points: r.points, text: r.text, viral: r.viral, newAchievements: r.newAchievements },
      state: await buildState(db, r.player!),
    });
  }));

  router.get('/leaderboard', h(async (req, res) => {
    const scope = (req.query.scope as string) ?? 'global';
    const scopeId = (req.query.scopeId as string) ?? null;
    const rows = await getLeaderboard(db, scope as 'global' | 'party' | 'region', scopeId, 100);
    res.json({ rows });
  }));

  // --- lag ---
  router.get('/teams', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    const teams = await db.query(
      `SELECT t.id, t.name, t.party_id, COUNT(m.player_id)::int AS members
       FROM teams t LEFT JOIN team_members m ON m.team_id = t.id
       WHERE t.party_id = $1 GROUP BY t.id ORDER BY members DESC`,
      [player.party_id],
    );
    const mine = await db.query<{ team_id: number }>(
      'SELECT team_id FROM team_members WHERE player_id = $1',
      [player.id],
    );
    res.json({ teams, myTeamId: mine[0]?.team_id ?? null });
  }));

  router.post('/team', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    if (!player.party_id) {
      res.status(400).json({ error: 'Valj parti forst.' });
      return;
    }
    const name = String((req.body?.name ?? '').trim()).slice(0, 40);
    if (name.length < 2) {
      res.status(400).json({ error: 'Lagnamn minst 2 tecken.' });
      return;
    }
    const rows = await db.query<{ id: number }>(
      'INSERT INTO teams (party_id, name, created_by, created_ts) VALUES ($1, $2, $3, $4) RETURNING id',
      [player.party_id, name, player.id, Date.now()],
    );
    await db.query('DELETE FROM team_members WHERE player_id = $1', [player.id]);
    await db.query('INSERT INTO team_members (team_id, player_id) VALUES ($1, $2)', [
      rows[0].id,
      player.id,
    ]);
    res.json({ ok: true, teamId: rows[0].id });
  }));

  router.post('/team/join', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    const teamId = Number(req.body?.teamId);
    const team = await db.query<{ party_id: string }>('SELECT party_id FROM teams WHERE id = $1', [teamId]);
    if (team.length === 0 || team[0].party_id !== player.party_id) {
      res.status(400).json({ error: 'Du kan bara ga med i ett lag i ditt eget parti.' });
      return;
    }
    await db.query('DELETE FROM team_members WHERE player_id = $1', [player.id]);
    await db.query(
      'INSERT INTO team_members (team_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [teamId, player.id],
    );
    res.json({ ok: true });
  }));

  // --- chatt ---
  router.get('/chat', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    const scope = (req.query.scope as string) ?? 'global';
    const scopeId = (req.query.scopeId as string) ?? 'all';
    const rows = await db.query(
      'SELECT id, name, body, ts FROM chat WHERE scope = $1 AND scope_id = $2 ORDER BY id DESC LIMIT 60',
      [scope, scopeId],
    );
    res.json({ messages: rows.reverse() });
  }));

  router.post('/chat', h(async (req, res) => {
    const player = await auth(req, res);
    if (!player) return;
    const scope = String(req.body?.scope ?? 'global');
    const scopeId = String(req.body?.scopeId ?? 'all');
    const body = String((req.body?.body ?? '').trim()).slice(0, 280);
    if (!body) {
      res.status(400).json({ error: 'Tomt meddelande.' });
      return;
    }
    await db.query(
      'INSERT INTO chat (scope, scope_id, player_id, name, body, ts) VALUES ($1, $2, $3, $4, $5, $6)',
      [scope, scopeId, player.id, player.username, body, Date.now()],
    );
    res.json({ ok: true });
  }));

  return router;
}
