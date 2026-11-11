import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, open, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:4197';
const privateDir = await mkdtemp(join(tmpdir(), 'orv92-p2qa-browser-'));
await chmod(privateDir, 0o700);
const log = await open(join(privateDir, 'astro.log'), 'wx', 0o600);
let server, browser;
const proof = {};
const denied = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  server = spawn(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'dev', '--host', '127.0.0.1', '--port', '4197'], {
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
  assert.equal(denied.length, 0, 'Unexpected nonlocal network requests');
  proof.externalRequests = denied.length;
  proof.bootstrap = true;
  console.log(JSON.stringify({ scope: 'worker-store-prep-reload', ...proof }));
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
