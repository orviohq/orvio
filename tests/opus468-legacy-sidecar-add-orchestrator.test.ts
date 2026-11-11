import { it, expect, vi } from 'vitest';
import fs from 'node:fs';

const saved = vi.hoisted(() => ({ calls: [] as any[] }));
vi.mock('../src/opus/opus35-store', () => ({
  saveOpus35Metadata: async (...args: any[]) => {
    saved.calls.push(args);
    return 'saved';
  },
}));

import { createBuildOwnedLegacySidecarAdd } from '../src/opus/opus468-legacy-sidecar-add';
import { LEGACY_INVENTORY_ENTRIES } from '../src/opus/legacy-source-inventory.mjs';

const record = JSON.parse(
  fs.readFileSync(
    new URL('../test-support/real3Ihr1016/base-record.raw.json', import.meta.url),
    'utf8',
  ),
);
const selection = { lanes: 4, difficulty: 'low' } as const;
const metadata = { title: 'Fixed legacy', author: 'A' };

function harness({
  pin = true,
  catalog = true,
  saveFails = false,
  installResult = true,
  abortAt = '',
  current = true,
}: any = {}) {
  const c = new AbortController();
  const runtime = {
    consumeFixedLegacySidecar: vi.fn(async (input: any, { signal }: any) => {
      if (!pin) return { song: { id: 'yt-opus-x' }, localPinCommitted: false };
      return { song: { id: 'yt-opus-x' }, localPinCommitted: true };
    }),
    frontend: {
      catalogView: vi.fn(async () => {
        if (abortAt === 'catalog') {
          c.abort(Error('abort after pin'));
          throw c.signal.reason;
        }
        if (!catalog) throw Error('catalog denied');
        return { song: { id: 'yt-opus-x', title: 'Pin title' }, baseRecord: record };
      }),
    },
  };
  const saveMetadata = vi.fn(async () => {
    if (saveFails) throw Error('metadata fail');
    return 'saved';
  });
  let currentCalls = 0;
  const install = vi.fn(async () => installResult);
  const add = createBuildOwnedLegacySidecarAdd({
    runtime: runtime as any,
    saveMetadata: saveMetadata as any,
    install,
    isCurrent: async () => {
      currentCalls++;
      if (abortAt === 'after-save' && currentCalls === 4) {
        c.abort(Error('abort after save'));
        throw c.signal.reason;
      }
      return typeof current === 'function' ? current(currentCalls) : current;
    },
  });
  return { add, c, saveMetadata, install, runtime };
}

async function run(h: any) {
  return h.add({ selection, metadata, signal: h.c.signal });
}

it('pre-pin failure throws and never saves or installs', async () => {
  const h = harness({ pin: false });
  await expect(run(h)).rejects.toThrow('legacy_sidecar_add_pin');
  expect(h.saveMetadata).not.toHaveBeenCalled();
  expect(h.install).not.toHaveBeenCalled();
});

it('isCurrent preflight blocks the runtime pin when the caller is stale', async () => {
  const h = harness({ current: false });
  await expect(run(h)).rejects.toThrow('legacy_sidecar_add_stale');
  expect(h.runtime.consumeFixedLegacySidecar).not.toHaveBeenCalled();
  expect(h.saveMetadata).not.toHaveBeenCalled();
});

it('catalog denial and abort after a durable pin return honest partial state', async () => {
  for (const mode of ['catalog-deny', 'catalog-abort'] as const) {
    const h = harness(
      mode === 'catalog-deny' ? { catalog: false } : { abortAt: 'catalog' },
    );
    const result = await run(h);
    expect(result).toMatchObject({
      localPinCommitted: true,
      metadataSaved: false,
      installed: false,
      partial: true,
    });
    expect(h.saveMetadata).not.toHaveBeenCalled();
    expect(h.install).not.toHaveBeenCalled();
  }
});

it('isCurrent guard after pin returns partial before metadata/install', async () => {
  const h = harness({ current: (n: number) => n === 1 });
  const result = await run(h);
  expect(result).toMatchObject({
    localPinCommitted: true,
    metadataSaved: false,
    installed: false,
    partial: true,
  });
  expect(result.error).toBe('legacy_sidecar_add_stale');
  expect(h.saveMetadata).not.toHaveBeenCalled();
});

it('metadata failure keeps the pin; retry shape only (not actual DB idempotency proof)', async () => {
  const first = harness({ saveFails: true });
  const failed = await run(first);
  expect(failed).toMatchObject({
    localPinCommitted: true,
    metadataSaved: false,
    installed: false,
    partial: true,
  });
  expect(first.install).not.toHaveBeenCalled();

  saved.calls.length = 0;
  const second = harness();
  const retried = await run(second);
  expect(retried).toMatchObject({
    localPinCommitted: true,
    metadataSaved: true,
    installed: true,
    partial: false,
  });
  expect(second.saveMetadata).toHaveBeenCalledOnce();
  expect(second.install).toHaveBeenCalledOnce();
});

it('install false, undefined or throw is never success and stays partial', async () => {
  for (const installResult of [false, undefined, 'throw'] as const) {
    const h = harness();
    if (installResult === 'throw') h.install.mockRejectedValue(Error('install fail'));
    else h.install.mockResolvedValue(installResult);
    const result = await run(h);
    expect(result).toMatchObject({
      localPinCommitted: true,
      metadataSaved: true,
      installed: false,
      partial: true,
    });
  }
});

it('abort after metadata save returns partial without installing', async () => {
  const h = harness({ abortAt: 'after-save' });
  const result = await run(h);
  expect(result).toMatchObject({
    localPinCommitted: true,
    metadataSaved: true,
    installed: false,
    partial: true,
  });
  expect(h.install).not.toHaveBeenCalled();
});

it('strict install true is the only success', async () => {
  const h = harness();
  const result = await run(h);
  expect(result).toEqual({
    song: { id: 'yt-opus-x' },
    localPinCommitted: true,
    metadataSaved: true,
    installed: true,
    partial: false,
  });
});


it('forwards an explicit selected manifestId without inventing a hash/base URL', async () => {
  const h = harness();
  await h.add({
    selection,
    metadata,
    manifestId: LEGACY_INVENTORY_ENTRIES[18].manifestId,
    signal: h.c.signal,
  });
  expect(h.runtime.consumeFixedLegacySidecar).toHaveBeenCalledWith(
    {
      selection,
      metadata,
      manifestId: LEGACY_INVENTORY_ENTRIES[18].manifestId,
    },
    { signal: h.c.signal },
  );
});
