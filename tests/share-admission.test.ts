import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeLocalAllKeysShare } from '../src/local-allkeys-share';
import { encodeProgressiveShare } from '../src/progressive/share-proof';
import { admitShareFragment } from '../server/share-d1/admission';

it('accepts actual codec shares and rejects invalid proofs and extra parameters', async () => {
  const f = JSON.parse(readFileSync('tests/fixtures/local-allkeys-public.json', 'utf8'));
  const d = await decodeLocalAllKeysShare(f.shareFragment);
  const b = Buffer.from(f.row.bytesBase64, 'base64');
  const wav = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  const p = await encodeProgressiveShare({ record: d.record, replay: d.replay }, wav);
  const s = new AbortController().signal;
  expect(await admitShareFragment(f.shareFragment, s)).toBe(f.shareFragment);
  expect(await admitShareFragment(p, s)).toBe(p);
  await expect(admitShareFragment(p.slice(0, -1) + (p.endsWith('0') ? '1' : '0'), s)).rejects.toThrow();
  await expect(admitShareFragment(p + '&mh=' + 'a'.repeat(64), s)).rejects.toThrow();
  await expect(admitShareFragment(p + '&x=1', s)).rejects.toThrow();
}, 15000);

it('stores and retrieves a progressive share fragment unchanged', async () => {
  const { default: worker } = await import('../server/share-d1/worker');
  const f = JSON.parse(readFileSync('tests/fixtures/local-allkeys-public.json', 'utf8'));
  const d = await decodeLocalAllKeysShare(f.shareFragment);
  const b = Buffer.from(f.row.bytesBase64, 'base64');
  const p = await encodeProgressiveShare(
    { record: d.record, replay: d.replay },
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
  );
  let stored = '';
  const env: any = {
    SHARE_ENABLED: '1',
    SHARE_ORIGIN: 'https://app.fixture.invalid',
    DB: {
      prepare() {
        return {
          v: [] as any[],
          bind(...v: any[]) {
            this.v = v;
            return this;
          },
          async run() {
            stored = this.v[1];
            return { success: true };
          },
          async first() {
            return { fragment: stored, expires: Date.now() + 60000 };
          },
        };
      },
    },
  };
  const headers = {
    Origin: 'https://app.fixture.invalid',
    'Content-Type': 'application/json',
  };
  const response = await worker.fetch(
    new Request('https://share.fixture.invalid/v1/replays', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fragment: p }),
    }),
    env,
  );
  expect(response.status).toBe(201);
  const responseJSON = await response.json() as { id: string };
  const id = responseJSON.id;
  expect(stored).toBe(p);
  const retrieved = await worker.fetch(
    new Request('https://share.fixture.invalid/v1/replays/' + id, { headers }),
    env,
  );
  expect(retrieved.status).toBe(200);
  const retrievedJSON = await retrieved.json() as { fragment: string };
  expect(retrievedJSON.fragment).toBe(p);
}, 15000);
