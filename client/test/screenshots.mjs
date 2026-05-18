// Tar skarmbilder av spelet for visuell granskning.
import { chromium } from 'playwright';

const URL = process.env.DOS_URL ?? 'http://localhost:3001';
const OUT = process.env.DOS_SHOTS ?? '/tmp/dos-shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  ${name}.png`);
};
const has = async (s) => (await page.locator(s).count()) > 0;

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Dictator of Sweden' }).waitFor();
await shot('1-landing');

await page.getByRole('button', { name: 'Skapa nytt spel' }).click();
await page.getByPlaceholder('t.ex. Robin').fill('Robin');
await page.getByRole('button', { name: 'Skapa lobby' }).click();
await page.locator('.team-card').first().waitFor({ timeout: 8000 });
await shot('2-lobby');

await page.locator('.team-card').first().getByRole('button', { name: 'Ga med' }).click();
await page.waitForTimeout(300);
await page.locator('.ready-toggle input').first().click();
const startBtn = page.getByRole('button', { name: 'Starta spelet' });
for (let i = 0; i < 30; i++) {
  if (!(await startBtn.isDisabled())) break;
  await page.waitForTimeout(200);
}
await startBtn.click();

await page.locator('.reveal-overlay').waitFor({ timeout: 8000 });
await page.waitForTimeout(1700);
await shot('3-rollutdelning');

await page.locator('.sweden-map').waitFor({ timeout: 14000 });
await page.waitForTimeout(400);
await shot('4-kampanjskarm');

// Spela vidare tills slutskarmen.
const deadline = Date.now() + 100000;
let shotElection = false;
while (Date.now() < deadline) {
  if (await has('.go-banner')) break;
  if (await has('.election-night') && !shotElection) {
    await shot('5-valnatten');
    shotElection = true;
  }
  const submit = page.getByRole('button', { name: 'Las ditt drag' });
  if (await submit.count()) {
    if (await submit.first().isDisabled()) {
      const nodes = page.locator('.map-node');
      const count = await nodes.count();
      for (const idx of [4, 12, 20]) {
        if (idx < count) await nodes.nth(idx).click().catch(() => {});
      }
    } else {
      await submit.first().click().catch(() => {});
    }
  }
  if (await has('.target-chip'))
    await page.locator('.target-chip').first().click().catch(() => {});
  await page.waitForTimeout(600);
}
if (await has('.go-banner')) await shot('6-slutskarm');

await browser.close();
console.log('SKARMBILDER KLARA');
