// UI-roktest: oppnar klienten i en riktig webblasare och spelar igenom
// kampanjlaget Valrorelsen 2026 via det grafiska granssnittet.
// Kraver att servern kor (helst med DOS_FAST=1) pa DOS_URL.

import { chromium } from 'playwright';

const URL = process.env.DOS_URL ?? 'http://localhost:3001';

function fail(msg) {
  console.error('UI-TEST MISSLYCKADES:', msg);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const has = async (sel) => (await page.locator(sel).count()) > 0;
const clickIf = async (sel) => {
  if (await has(sel)) {
    await page.locator(sel).first().click().catch(() => {});
    return true;
  }
  return false;
};

try {
  await page.goto(URL, { waitUntil: 'networkidle' });

  // --- Landning ---
  await page.getByRole('heading', { name: 'Dictator of Sweden' }).waitFor();
  await page.getByRole('button', { name: 'Skapa nytt spel' }).click();
  await page.getByPlaceholder('t.ex. Robin').fill('UI-Testare');
  await page.getByRole('button', { name: 'Skapa lobby' }).click();

  // --- Lobby (kampanjlaget ar standard) ---
  await page.getByRole('heading', { name: 'Lobby' }).waitFor({ timeout: 8000 });
  await page.locator('.team-card').first().waitFor({ timeout: 8000 });
  console.log('  Lobby + laguppstallning renderad.');

  // Ga med i lag 1.
  await page.locator('.team-card').first().getByRole('button', { name: 'Ga med' }).click();
  await page.waitForTimeout(300);

  // Bli redo.
  await page.locator('.ready-toggle input').first().click();
  const startBtn = page.getByRole('button', { name: 'Starta spelet' });
  await startBtn.waitFor();
  for (let i = 0; i < 30; i++) {
    if (!(await startBtn.isDisabled())) break;
    await page.waitForTimeout(200);
  }
  if (await startBtn.isDisabled()) fail('Startknappen blev aldrig aktiv.');
  await startBtn.click();
  console.log('  Kampanjen startad.');

  // --- Rollutdelning ---
  await page.locator('.reveal-overlay').waitFor({ timeout: 8000 });
  console.log('  Rollutdelning visas.');

  // --- Kampanjskarmen ---
  await page.locator('.sweden-map').waitFor({ timeout: 14000 });
  if (!(await has('.riksdag-arc'))) fail('Riksdagsgrafiken renderades inte.');
  if (!(await has('.poll-bars'))) fail('Opinionsstaplarna renderades inte.');
  console.log('  Karta, riksdagsgrafik och opinionsstaplar renderade.');

  // Spela igenom kampanjen - varje spelare har ett rolldrag.
  const deadline = Date.now() + 130_000;
  while (Date.now() < deadline) {
    if (await has('.go-banner')) break;

    const submit = page.getByRole('button', { name: 'Las ditt drag' });
    if (await submit.count()) {
      if (await submit.first().isDisabled()) {
        // Kampanjledare: valj valkretsar pa kartan forst.
        const nodes = page.locator('.map-node');
        const count = await nodes.count();
        for (const idx of [3, 10, 18]) {
          if (idx < count) await nodes.nth(idx).click().catch(() => {});
        }
      } else {
        await submit.first().click().catch(() => {});
      }
    }
    // Internt krismote.
    await clickIf('.target-chip');

    await page.waitForTimeout(600);
  }

  if (!(await has('.go-banner'))) fail('Kampanjen nadde aldrig slutskarmen.');
  const verdict = await page.locator('.go-banner h1').textContent();
  console.log(`  Slutskarm: "${verdict?.trim()}"`);

  await page.getByRole('heading', { name: 'Valresultat' }).waitFor();
  await page.getByRole('heading', { name: 'Lagen och mullvadarna' }).waitFor();
  console.log('  Valresultat och mullvadsavslojning renderade.');

  if (consoleErrors.length > 0) {
    fail(`Konsolfel i webblasaren:\n${consoleErrors.slice(0, 5).join('\n')}`);
  }

  console.log('UI-ROKTEST OK');
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error(err);
  await browser.close();
  fail(err.message ?? String(err));
}
