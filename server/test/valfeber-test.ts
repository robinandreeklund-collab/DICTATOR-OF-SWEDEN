// Backend-test for Valfeber 2026 mot en inbaddad Postgres (PGlite, i minnet).
// Kor hela flodet: konto, partival, atgarder, topplista, opinion, valnatt.
import assert from 'node:assert';
import { createDb } from '../src/valfeber/db.js';
import { initSchema, loadWorld, loadSupport } from '../src/valfeber/schema.js';
import { register, login, playerByToken } from '../src/valfeber/auth.js';
import { performAction, setPartyAndRegion } from '../src/valfeber/actions.js';
import { computeStandings, isElectionOver } from '../src/valfeber/world.js';
import { getLeaderboard, playerRank, getAchievements } from '../src/valfeber/leaderboard.js';

async function main() {
  process.env.VALFEBER_START_TS = String(Date.now());
  process.env.VALFEBER_END_TS = String(Date.now() + 10 * 86_400_000);

  const db = createDb(); // in-memory Postgres
  await initSchema(db);
  const world = await loadWorld(db);
  console.log('  Schema initierat, varld laddad.');

  // Konton
  const reg = await register(db, 'Robin', 'pw12');
  assert(reg.ok && reg.token && reg.player, 'registrering misslyckades');
  let player = reg.player!;
  const dup = await register(db, 'robin', 'pw12');
  assert(!dup.ok, 'dubblett-namn borde nekas');
  const li = await login(db, 'ROBIN', 'pw12');
  assert(li.ok, 'login borde lyckas');
  const bad = await login(db, 'robin', 'fel');
  assert(!bad.ok, 'fel losenord borde nekas');
  const byTok = await playerByToken(db, reg.token!);
  assert(byTok && byTok.id === player.id, 'token-uppslag misslyckades');
  console.log('  Konton: registrering, login, token, dubblettskydd OK.');

  // Partival
  const choose = await setPartyAndRegion(db, player, 's', 'sthlm-stad');
  assert(choose.ok && choose.player, 'partival misslyckades');
  player = choose.player!;
  assert(player.party_id === 's' && player.region_id === 'sthlm-stad');
  console.log('  Partival OK.');

  // Atgarder (3 per dag)
  const before = await loadSupport(db);
  const sBefore = before['sthlm-stad'].s;

  const a1 = await performAction(db, world, player, 'debate', {
    answers: ['helt', 'helt', 'helt'],
  });
  assert(a1.ok && (a1.points ?? 0) > 0, 'debatt misslyckades');
  player = a1.player!;
  assert(player.actions_left === 2, `actions_left borde vara 2, var ${player.actions_left}`);

  const a2 = await performAction(db, world, player, 'regional', { valkretsId: 'goteborg' });
  assert(a2.ok, 'regional misslyckades');
  player = a2.player!;

  const a3 = await performAction(db, world, player, 'crisis', {});
  assert(a3.ok, 'kris misslyckades');
  player = a3.player!;
  assert(player.actions_left === 0, 'borde vara slut pa atgarder');

  const a4 = await performAction(db, world, player, 'viral', { sloganIndex: 1 });
  assert(!a4.ok, 'fjarde atgarden borde nekas (slut pa atgarder)');
  console.log('  Atgarder: 3/dag, fjarde nekas, poang ges OK.');

  const after = await loadSupport(db);
  assert(after['sthlm-stad'].s > sBefore, 'opinionen i regionen borde ha okat');
  assert(after['goteborg'].s > before['goteborg'].s, 'regional kampanj borde ha okat Goteborg');
  console.log('  Delad opinion paverkas av atgarder OK.');

  // Opinion & mandat
  const standings = computeStandings(after);
  const totalMandate = standings.reduce((a, s) => a + s.mandates, 0);
  assert(totalMandate === 349, `mandaten borde summera till 349, var ${totalMandate}`);
  console.log('  Mandatprojektion summerar till 349 OK.');

  // Topplista
  const lb = await getLeaderboard(db, 'global', null, 10);
  assert(lb.length === 1 && lb[0].username === 'Robin', 'topplistan saknar spelaren');
  const rank = await playerRank(db, player.points);
  assert(rank === 1, 'spelaren borde vara rank 1');
  const ach = await getAchievements(db, player.id);
  assert(ach.includes('first_action'), 'borde ha first_action-achievement');
  console.log('  Topplista, rank och achievements OK.');

  // Valnatt
  const pastWorld = { start_ts: Date.now() - 20 * 86_400_000, end_ts: Date.now() - 1000 };
  assert(isElectionOver(pastWorld) === true, 'valet borde vara over');
  const a5 = await performAction(db, pastWorld, player, 'debate', { answers: ['helt'] });
  assert(!a5.ok, 'inga atgarder efter valdagen');
  console.log('  Valnatt: spelet stanger for atgarder OK.');

  await db.close();
  console.log('VALFEBER BACKEND-TEST OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('VALFEBER BACKEND-TEST MISSLYCKADES:', err);
  process.exit(1);
});
