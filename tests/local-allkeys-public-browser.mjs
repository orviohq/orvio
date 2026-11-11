import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

assert.ok(process.env.ORVIO_ORIGIN, 'ORVIO_ORIGIN is required');
const origin = new URL(process.env.ORVIO_ORIGIN).origin;
const fixture = JSON.parse(await readFile(new URL('./fixtures/local-allkeys-public.json', import.meta.url), 'utf8'));
assert.ok(fixture.row?.identity && fixture.row.bytesBase64 && fixture.sessionReplay && fixture.shareFragment);
const output = new URL('./artifacts/local-allkeys-public/', import.meta.url);
await mkdir(output, { recursive: true });
const proof = { origin, identity: fixture.row.identity, startedLanes: [], pageErrors: [], screenshots: [] };
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
const observe = (context) => context.on('page', (page) => page.on('pageerror', (error) => proof.pageErrors.push(error.message)));
observe(context);
const page = await context.newPage();
page.setDefaultTimeout(30000);
const shot = async (page, name) => { await page.screenshot({ path: new URL(`${name}.png`, output).pathname, fullPage: true }); proof.screenshots.push(`${name}.png`); };
const results = (page) => page.locator('#results[open]').waitFor({ state: 'visible', timeout: 45000 });
const ready = () => page.waitForFunction((id) => window.orvioDiagnostics?.version === '0.3.18' && window.orvioDiagnostics?.song === id && !document.documentElement.hasAttribute('data-library-hydrating'), fixture.row.identity);
const active = (lanes, replay = false) => page.waitForFunction(({ lanes, replay }) => window.orvioDiagnostics?.active === true && window.orvioDiagnostics?.settings?.lanes === lanes && (!replay || window.orvioDiagnostics?.replayActive === true), { lanes, replay });
const quit = async () => {
  await page.locator('#exit').click();
  if (await page.locator('#pause-exit').isVisible()) await page.locator('#pause-exit').click();
  await page.waitForFunction(() => window.orvioDiagnostics?.active === false);
};
try {
  await page.goto(`${origin}/select/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (row) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('orvio-local-allkeys-v1', 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('sources', { keyPath: 'identity' });
        store.createIndex('metadata', ['identity', 'envelope.record.videoId', 'envelope.record.audioSha256', 'envelope.record.chartSetSha256', 'envelope.record.sampleRate', 'envelope.record.frames']);
        store.createIndex('title', ['identity', 'title']);
        store.createIndex('author', ['identity', 'author']);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Fixture database blocked'));
    });
    try {
      await new Promise((resolve, reject) => {
        const { bytesBase64, ...source } = row;
        const bytes = Uint8Array.from(atob(bytesBase64), (c) => c.charCodeAt(0)).buffer;
        const tx = db.transaction('sources', 'readwrite');
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Fixture transaction aborted'));
        tx.objectStore('sources').put({ ...source, bytes });
      });
    } finally { db.close(); }
  }, fixture.row);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const selection = `${origin}/select/?${new URLSearchParams({ song: fixture.row.identity, lanes: '4', difficulty: 'low', speed: '3.0', fader: 'off', shuffle: 'off', seed: '0' })}`;
  await page.goto(selection, { waitUntil: 'domcontentloaded' });
  await ready();
  assert.equal(await page.locator('#selected-title').textContent(), fixture.row.title);
  await shot(page, 'selection');
  await page.locator('#start').click();
  await active(4); proof.startedLanes.push(4);
  await shot(page, 'play-4');
  await results(page);
  await page.waitForFunction(() => new URLSearchParams(location.search).get('local')?.startsWith('local-allkeys-session:'));
  proof.sessionURL = page.url();
  await page.waitForTimeout(1200);
  await shot(page, 'results');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await results(page);
  assert.equal(await page.locator('#result-song').textContent(), fixture.row.title);
  proof.sessionReload = true;
  await page.locator('#watch-replay').click();
  await active(4, true); proof.replay = true;
  await shot(page, 'replay'); await quit();
  for (const lanes of [5, 6, 7, 8]) {
    await page.goto(selection, { waitUntil: 'domcontentloaded' }); await ready();
    await page.locator(`[data-lanes="${lanes}"]`).click();
    await page.locator('#start').click(); await active(lanes);
    proof.startedLanes.push(lanes); await shot(page, `play-${lanes}`); await quit();
  }
  await page.goto(proof.sessionURL, { waitUntil: 'domcontentloaded' }); await results(page);
  await page.locator('#share-result').click();
  await page.waitForFunction(async (origin) => (await navigator.clipboard.readText()).startsWith(`${origin}/result/#v=local-allkeys-v1&d=`), origin);
  proof.shareURL = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(proof.shareURL, { waitUntil: 'domcontentloaded' }); await results(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await results(page);
  assert.equal(await page.locator('#result-song').textContent(), fixture.row.title);
  proof.shareReload = true; await page.waitForTimeout(1200); await shot(page, 'share-reload');
  const fresh = await browser.newContext({ serviceWorkers: 'block' }); observe(fresh);
  const freshPage = await fresh.newPage();
  await freshPage.goto(`${origin}/result/#${fixture.shareFragment.replace(/^#/, '')}`, { waitUntil: 'domcontentloaded' });
  await results(freshPage); await freshPage.locator('#watch-replay').click();
  await freshPage.waitForTimeout(3000);
  const diagnostics = await freshPage.evaluate(() => ({ active: window.orvioDiagnostics?.active, audioActive: window.orvioDiagnostics?.audioActive }));
  assert.equal(diagnostics.active, false); assert.equal(diagnostics.audioActive, false);
  proof.missingAudio = diagnostics; await shot(freshPage, 'missing-audio'); await fresh.close();
  assert.deepEqual(proof.pageErrors, []); proof.passed = true;
} catch (error) { proof.error = error.stack; await shot(page, 'failure').catch(() => {}); throw error;
} finally {
  try { await writeFile(new URL('evidence.json', output), JSON.stringify(proof, null, 2)); } finally { await browser.close(); }
}
