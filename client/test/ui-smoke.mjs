// UI-roktest: oppnar klienten i en riktig webblasare, skapar ett rum,
// fyller med bottar och spelar ett helt parti via grafiska granssnittet.
// Kraver att servern kor (helst med DOS_FAST=1) pa DOS_URL.

import { chromium } from 'playwright';

const URL = process.env.DOS_URL ?? 'http://localhost:3001';

function fail(msg) {
  console.error('UI-TEST MISSLYCKADES:', msg);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

try {
  await page.goto(URL, { waitUntil: 'networkidle' });

  // --- Landning ---
  await page.getByRole('heading', { name: 'Dictator of Sweden' }).waitFor();
  await page.getByRole('button', { name: 'Skapa nytt spel' }).click();
  await page.getByPlaceholder('t.ex. Robin').fill('UI-Testare');
  await page.getByRole('button', { name: 'Skapa lobby' }).click();

  // --- Lobby ---
  await page.getByRole('heading', { name: 'Lobby' }).waitFor({ timeout: 8000 });
  console.log('  Lobby renderad.');

  // Lagg till 4 bottar.
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: '+ Lägg till bot' }).click();
    await page.waitForTimeout(150);
  }

  // Valj parti (forsta partikortet).
  await page.locator('.party-card').first().click();
  await page.waitForTimeout(150);

  // Bli redo (checkboxen ar React-styrd och uppdateras via servern).
  await page.locator('.ready-toggle input').first().click();
  await page
    .locator('.ready-toggle input')
    .first()
    .waitFor({ state: 'attached' });

  // Starta spelet - vanta tills knappen blir aktiv.
  const startBtn = page.getByRole('button', { name: 'Starta spelet' });
  await startBtn.waitFor();
  for (let i = 0; i < 30; i++) {
    if (!(await startBtn.isDisabled())) break;
    await page.waitForTimeout(200);
  }
  if (await startBtn.isDisabled()) fail('Startknappen blev aldrig aktiv.');
  await startBtn.click();
  console.log('  Spelet startat.');

  // --- Rollutdelning ---
  await page.locator('.reveal-overlay').waitFor({ timeout: 8000 });
  console.log('  Rollutdelning visas.');

  // --- Spelvy ---
  await page.locator('.board').waitFor({ timeout: 12000 });
  console.log('  Spelbordet renderat.');

  // Spela igenom: klicka pa det som dyker upp tills spelet ar slut.
  const deadline = Date.now() + 90_000;
  let lastAction = '';
  while (Date.now() < deadline) {
    if (await page.locator('.go-banner').count()) break;

    // Omrostning.
    if (await page.locator('.vote-ja-btn').count()) {
      await page.locator('.vote-ja-btn').click().catch(() => {});
      lastAction = 'rost';
    }
    // Nominering / maktbefogenhet (valj forsta mojliga mal).
    else if (await page.locator('.target-chip').count()) {
      await page.locator('.target-chip').first().click().catch(() => {});
      lastAction = 'mal';
    }
    // Lagstiftning (klicka forsta lagkortet).
    else if (await page.locator('.law-clickable').count()) {
      await page.locator('.law-clickable').first().click().catch(() => {});
      lastAction = 'lag';
    }
    // Veto / granskning - knappar med text.
    else if (await page.getByRole('button', { name: 'Klar' }).count()) {
      await page.getByRole('button', { name: 'Klar' }).click().catch(() => {});
      lastAction = 'klar';
    } else if (await page.getByRole('button', { name: /Avvisa/ }).count()) {
      await page.getByRole('button', { name: /Avvisa/ }).click().catch(() => {});
      lastAction = 'veto';
    }
    await page.waitForTimeout(700);
  }

  if (!(await page.locator('.go-banner').count())) {
    fail(`Spelet nadde aldrig slutskarmen (senaste handling: ${lastAction}).`);
  }
  const winner = await page.locator('.go-banner h1').textContent();
  console.log(`  Slutskarm visas: "${winner?.trim()}"`);

  // Facit ska finnas.
  await page.getByRole('heading', { name: 'Riksdagens facit' }).waitFor();
  await page.getByRole('heading', { name: 'Rollerna avslöjas' }).waitFor();
  console.log('  Facit och rollavslojning renderade.');

  if (consoleErrors.length > 0) {
    fail(`Konsolfel i webblasaren:\n${consoleErrors.join('\n')}`);
  }

  console.log('UI-ROKTEST OK');
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error(err);
  await browser.close();
  fail(err.message);
}
