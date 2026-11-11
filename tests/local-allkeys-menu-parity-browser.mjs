import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

assert.ok(process.env.ORVIO_ORIGIN, 'ORVIO_ORIGIN is required');
const origin = new URL(process.env.ORVIO_ORIGIN).origin;
const versionSource = await readFile(new URL('../src/app-version.ts', import.meta.url), 'utf8');
const expectedVersion = versionSource.match(/export\s+const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
assert.ok(expectedVersion, 'APP_VERSION must be readable from src/app-version.ts');
const fixture = JSON.parse(await readFile(new URL('./fixtures/local-allkeys-public.json', import.meta.url), 'utf8'));
assert.ok(fixture.row?.identity && fixture.row.bytesBase64 && fixture.sessionReplay && fixture.shareFragment);
const output = new URL('./artifacts/local-allkeys-menu-fixed/', import.meta.url);
await mkdir(output, { recursive: true });
const proof = { origin, identity: fixture.row.identity, startedLanes: [], pageErrors: [], screenshots: [] };
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
await context.addInitScript(() => {
  let next = 1;
  const sourceIds = new WeakMap();
  const bufferIds = new WeakMap();
  window.__audioProof = { decode: 0, start: 0, stop: 0, lastSourceId: null, lastBufferId: null };
  for (const [proto, key, metric] of [
    [BaseAudioContext.prototype, 'decodeAudioData', 'decode'],
    [AudioBufferSourceNode.prototype, 'start', 'start'],
    [AudioBufferSourceNode.prototype, 'stop', 'stop'],
  ]) {
    const native = proto[key];
    proto[key] = function (...args) {
      window.__audioProof[metric]++;
      if (metric === 'start') {
        if (!sourceIds.has(this)) sourceIds.set(this, next++);
        const buffer = this.buffer;
        if (buffer && !bufferIds.has(buffer)) bufferIds.set(buffer, next++);
        window.__audioProof.lastSourceId = sourceIds.get(this);
        window.__audioProof.lastBufferId = buffer ? bufferIds.get(buffer) : null;
      }
      return Reflect.apply(native, this, args);
    };
  }
});
const observe = (context) => context.on('page', (page) => page.on('pageerror', (error) => proof.pageErrors.push(error.message)));
observe(context);
const page = await context.newPage();
page.setDefaultTimeout(30000);
const shot = async (page, name) => { await page.screenshot({ path: new URL(`${name}.png`, output).pathname, fullPage: false }); proof.screenshots.push(`${name}.png`); };
const results = (page) => page.locator('#results[open]').waitFor({ state: 'visible', timeout: 45000 });
const ready = () => page.waitForFunction(({ id, version }) => window.orvioDiagnostics?.version === version && window.orvioDiagnostics?.song === id && !document.documentElement.hasAttribute('data-library-hydrating'), { id: fixture.row.identity, version: expectedVersion });
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
  await page.locator('#songs .song-card.selected').click({ button: 'right' });
  const menu = page.getByRole('menu');
  await menu.waitFor({ state: 'visible' });
  proof.menuItems = await menu.getByRole('menuitem').allTextContents();
  proof.shareVisible = await menu.locator('[data-action=share]').isVisible();
  assert.equal(proof.shareVisible, true);
  await shot(page, 'menu');
  await page.locator('#songs .song-card.selected').click({ button: 'right' });
  await menu.waitFor({ state: 'visible' });
  await menu.locator('[data-action=share]').click();
  await page.waitForFunction(async (origin) => (await navigator.clipboard.readText()).startsWith(`${origin}/select/?youtube=`), origin);
  proof.shareURL = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(proof.shareURL, `${origin}/select/?youtube=BBBBBBBBBBB`);
  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  observe(fresh);
  proof.acquisitionRequests = [];
  fresh.on('request', (request) => {
    const url = new URL(request.url());
    if (/yt-api/i.test(url.hostname + url.pathname) || /\/api(?:\/|$)/i.test(url.pathname)) {
      proof.acquisitionRequests.push({ url: request.url(), method: request.method() });
    }
  });
  try {
    const receiver = await fresh.newPage();
    await receiver.goto(proof.shareURL, { waitUntil: 'domcontentloaded' });
    await receiver.locator('#youtube-import[open]').waitFor({ state: 'visible' });
    const input = await receiver.locator('#youtube-url').inputValue();
    const youtube = new URL(input);
    assert.ok(['www.youtube.com', 'youtube.com', 'youtu.be'].includes(youtube.hostname));
    assert.equal(youtube.hostname === 'youtu.be' ? youtube.pathname.slice(1) : youtube.searchParams.get('v'), 'BBBBBBBBBBB');
    proof.receiverInput = input;
    await shot(receiver, 'receiver');
    assert.deepEqual(proof.acquisitionRequests, []);
    proof.localSongShare = true;
    proof.missingShareSong = false;
  } finally {
    await fresh.close();
  }
  assert.deepEqual(proof.pageErrors, []); proof.passed = true;
} catch (error) { proof.error = error.stack; await shot(page, 'failure').catch(() => {}); throw error;
} finally {
  try { await writeFile(new URL('evidence.json', output), JSON.stringify(proof, null, 2)); } finally { await browser.close(); }
}
