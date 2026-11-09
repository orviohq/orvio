import { it, expect } from 'vitest';
import fs from 'node:fs';
import { decodeVerifiedOpus } from '../src/opus-codec/verified-opus-client.mjs';
const root = new URL('../test-support/opus35-frost/', import.meta.url);
const expected = JSON.parse(
  fs.readFileSync(new URL('descriptor.json', root), 'utf8'),
);
const bytes = new Uint8Array(fs.readFileSync(new URL('audio.ogg', root)));
const wasmBytes = new Uint8Array(
  fs.readFileSync(
    new URL('../src/opus-codec/opus-decoder.wasm', import.meta.url),
  ),
);
it('owned no-yield decode retains exact default PCM and rejects changed input', async () => {
  const original = await decodeVerifiedOpus({ bytes, wasmBytes, expected });
  const owned = await decodeVerifiedOpus({
    bytes,
    wasmBytes,
    expected,
    yieldAfterChunk: false,
  });
  expect(owned.frames).toBe(original.frames);
  expect(
    Buffer.compare(Buffer.from(owned.pcm16), Buffer.from(original.pcm16)),
  ).toBe(0);
  const wrong = bytes.slice();
  wrong[wrong.length - 8] ^= 1;
  await expect(
    decodeVerifiedOpus({
      bytes: wrong,
      wasmBytes,
      expected,
      yieldAfterChunk: false,
    }),
  ).rejects.toThrow('opus_encoded_identity');
  await expect(
    decodeVerifiedOpus({
      bytes,
      wasmBytes,
      expected: { ...expected, pcm16Sha256: '0'.repeat(64) },
      yieldAfterChunk: false,
    }),
  ).rejects.toThrow('opus_pcm_identity');
});
it('no-yield still observes a pre-aborted signal before decoding', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    decodeVerifiedOpus({
      bytes,
      wasmBytes,
      expected,
      yieldAfterChunk: false,
      signal: controller.signal,
    }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
