import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Run against Astro dev: node tests/status-health-local-allkeys-browser.mjs [url]
const origin = process.argv[2] ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Establish the dev origin without running application initialization.
  await page.route('**/__status-health-proof', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Status proof</title>' }),
  );
  await page.goto(new URL('/__status-health-proof', origin).href);
  const proof = await page.evaluate(async () => {
    const { checkArea } = await import('/src/status-health.ts');
    const names = async () => (await indexedDB.databases()).map((db) => db.name).sort();
    const before = await names();
    const absent = await checkArea('access');
    const afterAbsent = await names();
    const fixture = 'orvio-local-allkeys-v1';
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(fixture, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('sources', { keyPath: 'identity' });
        store.createIndex('metadata', [
          'identity',
          'envelope.record.videoId',
          'envelope.record.audioSha256',
          'envelope.record.chartSetSha256',
          'envelope.record.sampleRate',
          'envelope.record.frames',
        ]);
        store.createIndex('title', ['identity', 'title']);
        store.createIndex('author', ['identity', 'author']);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const seeded = await names();
    const readable = await checkArea('access');
    const afterReadable = await names();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(fixture);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Fixture connection leaked'));
    });
    return { before, absent, afterAbsent, seeded, readable, afterReadable, cleaned: await names() };
  });
  assert.deepEqual(proof.before, []);
  assert.equal(proof.absent.state, 'unknown');
  assert.deepEqual(proof.afterAbsent, proof.before);
  assert.deepEqual(proof.seeded, ['orvio-local-allkeys-v1']);
  assert.equal(proof.readable.state, 'healthy');
  assert.equal(proof.readable.detail, 'Local cache readable');
  assert.deepEqual(proof.afterReadable, proof.seeded);
  assert.deepEqual(proof.cleaned, proof.before);
  console.log('PASS: absent caches stay absent; empty all-keys schema is readable; connections close.');
  await context.close();
} finally {
  await browser.close();
}
