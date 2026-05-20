// UI-roktest for Valfeber 2026 i en riktig webblasare.
import { chromium } from 'playwright';

const URL = process.env.DOS_URL ?? 'http://localhost:3001';
function fail(m) { console.error('VALFEBER UI-TEST MISSLYCKADES:', m); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const has = async (s) => (await page.locator(s).count()) > 0;

try {
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Registrera
  await page.getByRole('heading', { name: 'Valfeber 2026' }).waitFor();
  const uname = 'Spelare' + Math.floor(Math.random() * 100000);
  await page.getByPlaceholder('t.ex. Robin').fill(uname);
  await page.getByPlaceholder('minst 4 tecken').fill('pw12');
  await page.getByRole('button', { name: 'Skapa konto & spela' }).click();
  console.log('  Konto skapat.');

  // Onboarding
  await page.locator('.v-party-card').first().waitFor({ timeout: 8000 });
  await page.locator('.v-party-card').first().click();
  await page.getByRole('button', { name: 'Gå med i kampanjen' }).click();
  console.log('  Parti valt.');

  // Dashboard
  await page.locator('.v-dash').waitFor({ timeout: 8000 });
  if (!(await has('.riksdag-arc'))) fail('Riksdagsgrafiken saknas.');
  if (!(await has('.v-actions'))) fail('Atgarderna saknas.');
  if (!(await has('.v-map-svg'))) fail('Kartan saknas.');
  console.log('  Dashboard, riksdagsgrafik, atgarder och karta renderade.');

  // Utfor en atgard (kris)
  await page.locator('.v-action-card').first().click();
  await page.locator('.v-modal').waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Hantera krisen' }).click();
  await page.locator('.v-result').waitFor({ timeout: 6000 });
  const pts = await page.locator('.v-result-points').textContent();
  console.log(`  Atgard utford, resultat: ${pts?.trim()}`);

  // Vanta tills resultatet fortsvinner, kontrollera topplistan
  await page.waitForTimeout(2800);
  if (!(await has('.v-lb'))) fail('Topplistan saknas.');
  const lbText = await page.locator('.v-lb').first().textContent();
  if (!lbText?.includes(uname)) fail('Spelaren syns inte pa topplistan.');
  console.log('  Topplistan visar spelaren.');

  // Lag & chatt
  const teamInput = page.getByPlaceholder('Skapa lag…');
  if (await teamInput.count()) {
    await teamInput.fill('Testlaget');
    await page.getByRole('button', { name: 'Skapa', exact: true }).click();
    await page.waitForTimeout(700);
  }
  const chatInput = page.getByPlaceholder('Skriv…');
  await chatInput.fill('Hej kampanjen');
  await page.getByRole('button', { name: 'Skicka' }).click();
  await page.waitForTimeout(900);
  const chatText = await page.locator('.v-chat-log').textContent();
  if (!chatText?.includes('Hej kampanjen')) fail('Chattmeddelandet syns inte.');
  console.log('  Lag skapat och chatt fungerar.');

  if (errors.length) fail('Konsolfel:\n' + errors.slice(0, 5).join('\n'));
  console.log('VALFEBER UI-TEST OK');
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error(err);
  await browser.close();
  fail(err.message ?? String(err));
}
