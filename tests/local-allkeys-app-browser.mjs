import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, open, chmod, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:4198';
const privateDir = await mkdtemp(join(tmpdir(), 'orv92-app-browser-'));
await chmod(privateDir, 0o700);
const log = await open(join(privateDir, 'astro.log'), 'wx', 0o600);
let server, browser;
const proof = {};
const denied = [];
const pageErrors = [];
const observePage = (page) => {
  page.on('pageerror', (error) => pageErrors.push(error.message));
};
const apiRequests = [];
const observeRequest = (request) => {
  const url = new URL(request.url());
  if (url.origin === origin && /^\/api(?:\/|$)/.test(url.pathname))
    apiRequests.push(url.href);
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  server = spawn(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'dev', '--host', '127.0.0.1', '--port', '4198'], {
    cwd: root, env: { ...process.env, ASTRO_DEV_BACKGROUND: '1' }, stdio: ['ignore', log.fd, log.fd],
  });
  let serverError;
  server.on('error', (error) => { serverError = error; });
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    if (serverError) throw serverError;
    assert.ok(server.exitCode === null && server.signalCode === null, 'own Astro server exited');
    try { ready = (await fetch(`${origin}/select/`, { signal: AbortSignal.timeout(2000) })).ok; } catch {}
    if (ready) break;
    await pause(250);
  }
  assert.ok(ready, 'Astro readiness deadline exceeded');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], timeout: 30000 });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  context.on('page', observePage);
  context.on('request', observeRequest);
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    denied.push(url.href);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(`${origin}/select/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  proof.worker = await page.evaluate(async () => {
    const { prepareLocalAllKeysOwned } = await import('/src/local-allkeys-worker-client.ts');
    const { validateLocalAllKeysRecord, localAllKeysIdentity } = await import('/src/local-allkeys-record.ts');
    const sampleRate = 48000, frames = sampleRate * 12, expectedLength = 44 + frames * 4;
    const bytes = new ArrayBuffer(expectedLength), view = new DataView(bytes);
    const text = (offset, value) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    text(0, 'RIFF'); view.setUint32(4, expectedLength - 8, true); text(8, 'WAVE');
    text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 2, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); view.setUint16(32, 4, true);
    view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 4, true);
    let seed = 92;
    for (let frame = 0; frame < frames; frame++) {
      const time = frame / sampleRate, beat = time % 0.5, tick = time % 0.25;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 0x100000000 * 2 - 1;
      const kick = Math.sin(2 * Math.PI * 70 * beat) * Math.exp(-beat * 28);
      const percussion = noise * Math.exp(-tick * 70);
      const sample = Math.round(Math.max(-1, Math.min(1, 0.65 * kick + 0.3 * percussion)) * 32767);
      view.setInt16(44 + frame * 4, sample, true);
      view.setInt16(46 + frame * 4, sample, true);
    }
    const result = await prepareLocalAllKeysOwned({ bytes, videoId: 'AAAAAAAAAAA' });
    if (bytes.byteLength !== 0) throw new Error('Original WAV was not transferred');
    if (result.bytes.byteLength !== expectedLength) throw new Error('Returned WAV length mismatch');
    const validated = await validateLocalAllKeysRecord(result.envelope);
    const { record } = validated;
    if (record.version !== 3 || Object.keys(record.charts).length !== 20 ||
        JSON.stringify(record.lanes) !== '[4,5,6,7,8]') throw new Error('All-keys record mismatch');
    const { saveLocalAllKeys, readLocalAllKeys, listLocalAllKeys } = await import('/src/local-allkeys-store.ts');
    const { prepareDirectAllKeys } = await import('/src/prepare-direct-allkeys.ts');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const hash = async (buffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)),
      (byte) => byte.toString(16).padStart(2, '0')).join('');
    check((await listLocalAllKeys()).length === 0, 'Expected fresh browser database');
    const identity = localAllKeysIdentity(validated);
    const input = { envelope: validated, bytes: result.bytes, title: 'Fixture', author: 'QA' };
    const saved = await saveLocalAllKeys(input);
    const row = await readLocalAllKeys(identity);
    check(saved.identity === identity && row?.identity === identity, 'Store identity mismatch');
    check(saved.bytes !== result.bytes && row.bytes !== saved.bytes && row.bytes !== result.bytes,
      'Store bytes must be independent clones');
    check(await hash(row.bytes) === record.audioSha256 && await hash(saved.bytes) === record.audioSha256,
      'Stored WAV hash mismatch');
    new Uint8Array(saved.bytes)[44] ^= 1;
    new Uint8Array(row.bytes)[44] ^= 1;
    check(await hash((await readLocalAllKeys(identity)).bytes) === record.audioSha256,
      'Returned byte mutation changed durable data');
    const listing = await listLocalAllKeys();
    check(listing.length === 1 && listing[0].identity === identity && listing[0].title === 'Fixture' &&
      listing[0].author === 'QA' && listing[0].audioSha256 === record.audioSha256 &&
      !('bytes' in listing[0]) && !('envelope' in listing[0]), 'Expected metadata-only listing');
    const again = await saveLocalAllKeys({ ...input, title: 'Replacement' });
    check(again.identity === identity && again.title === 'Fixture' && (await listLocalAllKeys()).length === 1,
      'Second save was not immutable and idempotent');
    const corrupted = result.bytes.slice(0);
    new Uint8Array(corrupted)[44] ^= 1;
    let rejected = false;
    try { await saveLocalAllKeys({ ...input, bytes: corrupted }); }
    catch (error) { rejected = /SHA-256/.test(error.message); }
    check(rejected, 'Conflicting WAV was not rejected for hash mismatch');
    const unchanged = await readLocalAllKeys(identity);
    check(await hash(unchanged.bytes) === record.audioSha256 && unchanged.title === 'Fixture' &&
      unchanged.author === 'QA' && JSON.stringify(unchanged.envelope) === JSON.stringify(validated),
      'Rejected save changed the durable row');
    const supplied = result.bytes.slice(0);
    const hit = await prepareDirectAllKeys('AAAAAAAAAAA', new AbortController().signal,
      { publicKey: 'synthetic', audio: { bytes: supplied, audioSha256: record.audioSha256 }, title: 'Fixture' });
    check(hit.restored === true && hit.identity === identity && supplied.byteLength === expectedLength &&
      await hash(supplied) === record.audioSha256 && await hash(hit.bytes) === record.audioSha256,
      'Preparation hit must restore without transferring supplied bytes');
    const fresh = result.bytes.slice(0);
    const miss = await prepareDirectAllKeys('BBBBBBBBBBB', new AbortController().signal,
      { publicKey: 'synthetic', audio: { bytes: fresh, audioSha256: record.audioSha256 }, title: 'Fixture', author: 'QA' });
    const freshEnvelope = await validateLocalAllKeysRecord(miss.envelope);
    const persisted = await readLocalAllKeys(miss.identity);
    check(miss.restored === false && fresh.byteLength === 0 && miss.bytes.byteLength === expectedLength &&
      freshEnvelope.record.videoId === 'BBBBBBBBBBB' && Object.keys(freshEnvelope.record.charts).length === 20 &&
      miss.identity === localAllKeysIdentity(freshEnvelope) && persisted?.identity === miss.identity &&
      await hash(persisted.bytes) === record.audioSha256 && (await listLocalAllKeys()).length === 2,
      'Fresh preparation must transfer, generate and persist');
    return { workerTransfer: true, returnedBytes: result.bytes.byteLength, charts: 20, validated: true,
      store: true, idempotent: true, conflictRejected: true, prepHit: true, prepMiss: true,
      freshIdentity: miss.identity, audioSha256: record.audioSha256 };
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  proof.reload = await page.evaluate(async ({ freshIdentity, audioSha256 }) => {
    const { prepareDirectAllKeys } = await import('/src/prepare-direct-allkeys.ts');
    const { readLocalAllKeys, listLocalAllKeys } = await import('/src/local-allkeys-store.ts');
    const restored = await prepareDirectAllKeys('BBBBBBBBBBB', new AbortController().signal,
      { publicKey: 'synthetic' });
    const row = await readLocalAllKeys(freshIdentity);
    const listing = await listLocalAllKeys();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', restored.bytes)),
      (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (restored.restored !== true || restored.identity !== freshIdentity ||
        restored.envelope.record.audioSha256 !== audioSha256 || digest !== audioSha256 ||
        Object.keys(restored.envelope.record.charts).length !== 20 ||
        restored.title !== 'Fixture' || restored.author !== 'QA' ||
        row?.identity !== freshIdentity || row.envelope.record.audioSha256 !== audioSha256 ||
        row.title !== 'Fixture' || row.author !== 'QA') throw new Error('Reload restoration mismatch');
    if (listing.length !== 2 || !['AAAAAAAAAAA', 'BBBBBBBBBBB'].every((id) =>
      listing.some((item) => item.videoId === id)) ||
      !listing.some((item) => item.identity === freshIdentity) ||
      !listing.every((item) => item.title === 'Fixture' && item.author === 'QA' &&
        item.audioSha256 === audioSha256 && !('bytes' in item) && !('envelope' in item))) {
      throw new Error('Reload metadata listing changed');
    }
    return { reloadRestored: true, metadataRows: listing.length };
  }, { freshIdentity: proof.worker.freshIdentity, audioSha256: proof.worker.audioSha256 });
  const selection = new URL('/select/', origin);
  selection.search = new URLSearchParams({
    song: proof.worker.freshIdentity, lanes: '4', difficulty: 'low',
    speed: '3.0', fader: 'off', shuffle: 'off', seed: '0',
  }).toString();
  await page.goto(selection.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction((id) =>
    !document.documentElement.hasAttribute('data-library-hydrating') &&
    window.orvioDiagnostics?.song === id,
  proof.worker.freshIdentity, { timeout: 30000 });
  await page.locator('#songs [data-song]').filter({ hasText: 'Fixture' }).first()
    .waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await page.locator('#selected-title').textContent(), 'Fixture');
  for (const lanes of [4, 5, 6, 7, 8]) {
    await page.locator('button:visible')
      .filter({ hasText: new RegExp(`^\\s*${lanes}\\s*(?:KEY)?\\s*$`) })
      .first().waitFor({ state: 'visible', timeout: 10000 });
  }
  await mkdir('/downloads', { recursive: true });
  await page.screenshot({ path: '/downloads/orv92-phase3-select.png', fullPage: true });
  proof.appSelection = { identity: proof.worker.freshIdentity, title: 'Fixture', laneButtons: [4, 5, 6, 7, 8] };
  const cardIds = await page.locator('#songs [data-song]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-song')));
  await page.locator('#songs .song-card.selected').click({ button: 'right' });
  const menu = page.getByRole('menu');
  await menu.waitFor({ state: 'visible', timeout: 10000 });
  await menu.locator('[role="menuitem"][data-action="remove"]')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'hidden', timeout: 10000 });
  assert.deepEqual(await page.locator('#songs [data-song]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-song'))), cardIds,
  'Cancelling the context menu must preserve the library cards');
  assert.equal(await page.evaluate(() => window.orvioDiagnostics?.song), proof.worker.freshIdentity);
  proof.contextMenuCancelled = true;
  await page.locator('#start').click();
  await page.waitForFunction(() => window.orvioDiagnostics?.active === true,
    undefined, { timeout: 15000 });
  await page.screenshot({ path: '/downloads/orv92-phase3-game.png', fullPage: true });
  await page.locator('#results[open]').waitFor({ state: 'visible', timeout: 35000 });
  await page.waitForFunction(() =>
    new URLSearchParams(location.search).get('local')?.startsWith('local-allkeys-session:'),
  undefined, { timeout: 10000 });
  const sessionURL = page.url();
  proof.appResult = { sessionURL, lanes: 4, actualPlay: true };
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/downloads/orv92-phase3-result.png', fullPage: true });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#results[open]').waitFor({ state: 'visible', timeout: 30000 });
  assert.equal(await page.locator('#result-song').textContent(), 'Fixture');
  await page.locator('#watch-replay').waitFor({ state: 'visible', timeout: 10000 });
  proof.appSessionReload = true;
  await page.locator('#watch-replay').click();
  await page.waitForFunction(() =>
    window.orvioDiagnostics?.active === true && window.orvioDiagnostics?.replayActive === true,
  undefined, { timeout: 15000 });
  await page.screenshot({ path: '/downloads/orv92-phase3-replay.png', fullPage: true });
  await page.locator('#exit').click();
  if (await page.locator('#pause-exit').isVisible()) await page.locator('#pause-exit').click();
  await page.waitForFunction(() => window.orvioDiagnostics?.active === false,
    undefined, { timeout: 15000 });
  proof.appReplay = true;
  for (const lanes of [5, 6, 7, 8]) {
    await page.goto(selection.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction((id) =>
      !document.documentElement.hasAttribute('data-library-hydrating') &&
      window.orvioDiagnostics?.song === id,
    proof.worker.freshIdentity, { timeout: 30000 });
    await page.locator(`[data-lanes="${lanes}"]`).click();
    await page.locator('#start').click();
    await page.waitForFunction((lanes) =>
      window.orvioDiagnostics?.active === true &&
      window.orvioDiagnostics?.settings.lanes === lanes,
    lanes, { timeout: 15000 });
    assert.match(await page.locator('#lane-detail').textContent(), new RegExp(`${lanes} KEY`));
    await page.locator('#exit').click();
    await page.locator('#pause-exit').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#pause-exit').click();
    await page.waitForFunction(() => window.orvioDiagnostics?.active === false,
      undefined, { timeout: 15000 });
  }
  proof.startedLanes = [4, 5, 6, 7, 8];
  await page.goto(sessionURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#results[open]').waitFor({ state: 'visible', timeout: 30000 });
  const sessionScore = await page.evaluate(async (url) => {
    const { readLocalAllKeysSession } = await import('/src/local-allkeys-sessions.ts');
    return (await readLocalAllKeysSession(new URL(url).searchParams.get('local'))).result.score;
  }, sessionURL);
  await page.evaluate(() => {
    window.__copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async writeText(text) { window.__copied = text; },
        async write(items) {
          const blob = await items[0].getType('text/plain');
          window.__copied = await blob.text();
        },
      },
    });
  });
  await page.locator('#share-result').click();
  await page.waitForFunction((origin) =>
    window.__copied?.startsWith(`${origin}/result/#v=local-allkeys-v1&d=`),
  origin, { timeout: 30000 });
  const shareURL = await page.evaluate(() => window.__copied);
  await page.goto(shareURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#results[open]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#watch-replay').waitFor({ state: 'visible', timeout: 10000 });
  const sharedScore = await page.evaluate(async () => {
    const { decodeLocalAllKeysShare } = await import('/src/local-allkeys-share.ts');
    return (await decodeLocalAllKeysShare(location.hash.slice(1))).result.score;
  });
  assert.equal(sharedScore, sessionScore, 'Shared replay score must match the saved session');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#results[open]').waitFor({ state: 'visible', timeout: 30000 });
  proof.localShareReload = true;
  const freshContext = await browser.newContext({ serviceWorkers: 'block' });
  freshContext.on('page', observePage);
  freshContext.on('request', observeRequest);
  await freshContext.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    denied.push(url.href);
    return route.abort();
  });
  const freshPage = await freshContext.newPage();
  await freshPage.goto(shareURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await freshPage.locator('#results[open]').waitFor({ state: 'visible', timeout: 30000 });
  await freshPage.locator('#watch-replay').waitFor({ state: 'visible', timeout: 10000 });
  await freshPage.waitForTimeout(1200);
  await freshPage.screenshot({ path: '/downloads/orv92-phase3-share.png', fullPage: true });
  await freshPage.locator('#watch-replay').click();
  await freshPage.waitForTimeout(3000);
  assert.equal(await freshPage.evaluate(() => window.orvioDiagnostics?.active), false,
    'A shared chart without local audio must not start playback');
  assert.equal(await freshPage.evaluate(() => window.orvioDiagnostics?.audioActive), false);
  proof.missingAudioFailsClosed = true;
  await page.evaluate(async (sessionURL) => {
    const { listLocalAllKeysSessions, readLocalAllKeysSession } =
      await import('/src/local-allkeys-sessions.ts');
    const { SONGS } = await import('/src/chart.ts');
    const { localAllKeysSource } = await import('/src/local-allkeys-catalog.ts');
    const check = (condition, message) => { if (!condition) throw Error(message); };
    const fixtures = SONGS.filter((song) => song.title === 'Fixture').map((song) => ({
      id: song.id, videoId: localAllKeysSource(song.id)?.envelope.record.videoId,
    }));
    check(fixtures.length === 2 && new Set(fixtures.map((song) => song.id)).size === 2 &&
      ['AAAAAAAAAAA', 'BBBBBBBBBBB'].every((videoId) => fixtures.some((song) => song.videoId === videoId)),
    'Fixture rows must represent two distinct full source identities');
    const badKey = 'local-allkeys-session:' + crypto.randomUUID();
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('orvio-local-allkeys-sessions-v1', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').add({
          key: badKey, createdAt: Date.now(), sourceIdentity: 'missing', replay: {},
        });
        tx.oncomplete = resolve;
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
      const sessions = await listLocalAllKeysSessions();
      const healthyKey = new URL(sessionURL).searchParams.get('local');
      check(sessions.some((session) => session.key === healthyKey), 'Healthy session was hidden');
      check(!sessions.some((session) => session.key === badKey), 'Invalid session was listed');
      let rejected = false;
      try { await readLocalAllKeysSession(badKey); } catch { rejected = true; }
      check(rejected, 'Direct invalid session read must reject');
      const raw = await new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const request = tx.objectStore('sessions').get(badKey);
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
      check(raw?.key === badKey && raw.sourceIdentity === 'missing', 'Invalid row was deleted or rewritten');
    } finally {
      db.close();
    }
  }, sessionURL);
  proof.sessionIsolation = true;
  proof.distinctFixtureIdentities = true;
  await page.locator('#result-preview').click();
  await page.waitForFunction(() =>
    document.querySelector('#result-preview')?.getAttribute('aria-pressed') === 'true',
  undefined, { timeout: 15000 });
  assert.equal(await page.evaluate(() => window.orvioDiagnostics?.previewActive), true);
  await page.locator('#result-preview').click();
  await page.waitForFunction(() => window.orvioDiagnostics?.previewActive === false,
    undefined, { timeout: 10000 });
  proof.preview = true;
  await page.evaluate(async (identity) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('orvio-local-allkeys-v1', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('sources', 'readwrite');
        const store = tx.objectStore('sources');
        const request = store.get(identity);
        request.onsuccess = () => {
          const row = request.result;
          if (!row) { tx.abort(); return; }
          new Uint8Array(row.bytes)[44] ^= 1;
          store.put(row);
        };
        tx.oncomplete = resolve;
        tx.onabort = tx.onerror = () => reject(tx.error ?? Error('Audio corruption fixture failed'));
      });
    } finally {
      db.close();
    }
  }, proof.worker.freshIdentity);
  await page.locator('#watch-replay').click();
  await page.waitForTimeout(3000);
  assert.equal(await page.evaluate(() => window.orvioDiagnostics?.active), false);
  assert.equal(await page.evaluate(() => window.orvioDiagnostics?.audioActive), false);
  const corruptReadRejected = await page.evaluate(async (identity) => {
    const { readLocalAllKeys } = await import('/src/local-allkeys-store.ts');
    try { await readLocalAllKeys(identity); return false; } catch { return true; }
  }, proof.worker.freshIdentity);
  assert.equal(corruptReadRejected, true, 'Corrupted audio must fail the store verification gate');
  proof.cachedCorruptionFailsClosed = true;
  await page.keyboard.press('F2');
  await page.locator('#settings[open]').waitFor({ state: 'visible', timeout: 10000 });
  const statusURL = new URL(await page.locator('#status-link').getAttribute('href'), origin);
  assert.equal(statusURL.pathname, '/status/');
  assert.equal(statusURL.searchParams.get('lang'), 'en');
  const statusPage = await context.newPage();
  await statusPage.goto(new URL('/status/', origin).href,
    { waitUntil: 'networkidle', timeout: 30000 });
  assert.doesNotMatch(await statusPage.locator('body').innerText(),
    /\b(?:Uncaught|TypeError:|ReferenceError:|SyntaxError:)|^\s*Error(?::|$)/m,
    'Status page must not expose a raw runtime error');
  await statusPage.screenshot({ path: '/downloads/orv92-phase3-status.png', fullPage: true });
  proof.statusPage = true;
  await statusPage.close();
  assert.equal(apiRequests.length, 0, `Unexpected API requests: ${JSON.stringify(apiRequests)}`);
  proof.apiRequests = apiRequests;
  await freshContext.close();
  console.log('Blocked external URLs:', JSON.stringify(denied));
  const unexpected = denied.filter((url) => {
    const host = new URL(url).hostname;
    return host !== 'ytimg.com' && !host.endsWith('.ytimg.com');
  });
  assert.equal(unexpected.length, 0, 'Unexpected non-artwork network requests');
  assert.deepEqual(pageErrors, [], 'Unexpected page errors');
  proof.pageErrors = pageErrors;
  proof.externalRequests = denied.length;
  proof.bootstrap = true;
  await writeFile('/downloads/orv92-phase3-proof.json', JSON.stringify({ scope: 'app-play-session-reload', ...proof }, null, 2));
  console.log(JSON.stringify({ scope: 'app-play-session-reload', ...proof }));
} finally {
  try { await browser?.close(); } finally {
    if (server?.pid && server.exitCode === null && server.signalCode === null) {
      server.kill('SIGTERM');
      const deadline = Date.now() + 5000;
      while (server.exitCode === null && server.signalCode === null && Date.now() < deadline) await pause(100);
      if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
    }
    await log.close();
  }
}
