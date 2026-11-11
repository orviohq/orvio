import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Source-injection only: this tests neither a browser nor real record generation.
test('worker success preserves ownership and transfers the original bytes', async () => {
  const path = new URL('../src/local-allkeys-chart.worker.ts', import.meta.url);
  const original = await readFile(path, 'utf8');
  const source = original.replace(/import\s*\{\s*generateLocalAllKeysRecord\s*,\s*type\s+LocalAllKeysEnvelope\s*,?\s*\}\s*from\s*"\.\/local-allkeys-record"\s*;?/, '');
  assert.notEqual(source, original, 'strip the worker import');
  const bytes = new Uint8Array([1, 2]).buffer;
  const videoId = 'abcdefghijk';
  const envelope = { sentinel: true };
  const calls: unknown[][] = [];
  let generated = 0;
  const self = {
    onmessage: null as null | ((event: { data: { id: number; bytes: ArrayBuffer; videoId: string } }) => Promise<void>),
    postMessage: (...args: unknown[]) => { calls.push(args); },
  };
  const generate = async (input: { bytes: ArrayBuffer; videoId: string }) => {
    generated++;
    assert.strictEqual(input.bytes, bytes);
    assert.strictEqual(input.videoId, videoId);
    return envelope;
  };
  new Function('self', 'generateLocalAllKeysRecord', stripTypeScriptTypes(source))(self, generate);
  assert.ok(self.onmessage);
  await self.onmessage({ data: { id: 1, bytes, videoId } });
  assert.equal(generated, 1);
  assert.equal(calls.length, 1);
  const [message, transfer] = calls[0] as [{ id: number; ok: boolean; bytes: ArrayBuffer; envelope: unknown }, ArrayBuffer[]];
  assert.equal(message.id, 1);
  assert.equal(message.ok, true);
  assert.strictEqual(message.bytes, bytes);
  assert.strictEqual(message.envelope, envelope);
  assert.equal(transfer.length, 1);
  assert.strictEqual(transfer[0], bytes);
});
