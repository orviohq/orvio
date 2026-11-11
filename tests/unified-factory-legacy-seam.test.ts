import { it, expect, vi, beforeEach, afterEach } from 'vitest';

const adder = vi.hoisted(() => ({
  factoryCalls: [] as any[],
  addCalls: [] as any[],
  impl: null as null | ((input: any) => any),
}));
const restorer = vi.hoisted(() => ({
  factoryCalls: [] as any[],
  restoreCalls: [] as any[],
  impl: null as null | ((input: any) => any),
}));
const canonical = vi.hoisted(() => ({
  calls: [] as any[],
  result: new ArrayBuffer(0),
}));

vi.mock('../src/opus/opus35-legacy-sidecar-add.mjs', () => ({
  createBuildOwnedLegacySidecarAdder: async (config: any) => {
    adder.factoryCalls.push(config);
    return async (input: any) => {
      adder.addCalls.push(input);
      return adder.impl ? adder.impl(input) : undefined;
    };
  },
}));
vi.mock('../src/opus/opus35-legacy-frozen-restore.mjs', () => ({
  createBuildOwnedLegacyFrozenRecordRestorer: async (config: any) => {
    restorer.factoryCalls.push(config);
    return async (input: any) => {
      restorer.restoreCalls.push(input);
      return restorer.impl ? restorer.impl(input) : undefined;
    };
  },
}));
vi.mock('../src/opus/opus35-api', () => ({
  restoreOpus35Record: async (record: any, signal: AbortSignal) => {
    canonical.calls.push({ record, signal });
    return canonical.result;
  },
}));

import fs from 'node:fs';
import { createUnified468Candidate } from '../src/opus/unified/factory';
import {
  DEFAULT_LEGACY_MANIFEST_ID,
  LEGACY_INVENTORY_ENTRIES,
} from '../src/opus/legacy-source-inventory.mjs';

const endpoint = 'https://build.invalid/v2/legacy-currentness';
const selection = { lanes: 4, difficulty: 'low' };
const metadata = { title: 'Fixed legacy sidecar' };
const real3IhrRecord = JSON.parse(
  fs.readFileSync(
    new URL('../test-support/real3Ihr1016/base-record.raw.json', import.meta.url),
    'utf8',
  ),
);
const frostRecord = JSON.parse(
  fs.readFileSync(
    new URL('../test-support/opus35-frost/record.json', import.meta.url),
    'utf8',
  ),
);
const build = (legacyConfig?: any) =>
  createUnified468Candidate({
    readArtifact: vi.fn(),
    exchangeProjection: vi.fn(),
    ...(legacyConfig === undefined ? {} : { legacyConfig }),
  }) as any;

beforeEach(() => {
  adder.factoryCalls.length = 0;
  adder.addCalls.length = 0;
  adder.impl = null;
  restorer.factoryCalls.length = 0;
  restorer.restoreCalls.length = 0;
  restorer.impl = null;
  canonical.calls.length = 0;
  vi.stubGlobal('indexedDB', { open: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

it('legacy config absent leaves canonical factory alive and fixed Add unavailable', async () => {
  const factory = build();
  await expect(
    factory.consumeFixedLegacySidecar(
      { selection, metadata },
      { signal: new AbortController().signal },
    ),
  ).rejects.toThrow('general_legacy_unavailable');
  expect(adder.factoryCalls).toHaveLength(0);
  expect(adder.addCalls).toHaveLength(0);
});

it('explicit build-owned legacy config wires only endpoint/fetchImpl into the real Add builder', async () => {
  adder.impl = async () => ({ unexpected: true });
  const fetchImpl = vi.fn();
  const factory = build({ endpoint, fetchImpl });
  await expect(
    factory.consumeFixedLegacySidecar(
      { selection, metadata },
      { signal: new AbortController().signal },
    ),
  ).rejects.toThrow('general_legacy_sidecar');
  expect(adder.factoryCalls).toEqual([{ currentnessEndpoint: endpoint, fetchImpl }]);
  expect(adder.addCalls).toHaveLength(1);
  expect(Object.keys(adder.addCalls[0])).toEqual(['manifestId', 'signal']);
  expect(adder.addCalls[0].manifestId).toBe(DEFAULT_LEGACY_MANIFEST_ID);
  expect(adder.addCalls[0].signal).toBeInstanceOf(AbortSignal);
});

it('invalid or extra legacy config is rejected, never treated as a runtime URL', () => {
  for (const legacyConfig of [
    {},
    { endpoint: '' },
    { endpoint, extra: 'no' },
    { endpoint, fetchImpl: 'not-a-function' },
  ])
    expect(() => build(legacyConfig)).toThrow('general_legacy_config');
  expect(() => build({ endpoint: 'not-a-url' })).toThrow(
    'legacy_currentness_endpoint',
  );
});

it('selection and caller abort fail before Add is constructed', async () => {
  const factory = build({ endpoint });
  await expect(
    factory.consumeFixedLegacySidecar(
      { selection: { lanes: 5, difficulty: 'low' }, metadata },
      { signal: new AbortController().signal },
    ),
  ).rejects.toThrow('general_selection');
  expect(adder.factoryCalls).toHaveLength(0);

  const c = new AbortController();
  c.abort(Error('caller stop'));
  await expect(
    factory.consumeFixedLegacySidecar(
      { selection, metadata },
      { signal: c.signal },
    ),
  ).rejects.toThrow('caller stop');
  expect(adder.factoryCalls).toHaveLength(0);
});

it('factory cancel aborts a pending B Add through the merged operation signal', async () => {
  adder.impl = (input) =>
    new Promise((_, reject) =>
      input.signal.addEventListener('abort', () =>
        reject(input.signal.reason),
      ),
    );
  const factory = build({ endpoint });
  const pending = factory.consumeFixedLegacySidecar(
    { selection, metadata },
    { signal: new AbortController().signal },
  );
  await vi.waitFor(() => expect(adder.addCalls).toHaveLength(1));
  factory.cancel();
  await expect(pending).rejects.toThrow('general_superseded');
});

it('registered real3Ihr restore denies without config and never calls canonical transport', async () => {
  const factory = build();
  await expect(
    factory.restoreSourceRecord(real3IhrRecord, {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('general_legacy_unavailable');
  expect(canonical.calls).toHaveLength(0);
  expect(restorer.factoryCalls).toHaveLength(0);
});

it('unknown record keeps the original canonical restore branch', async () => {
  const factory = build();
  const signal = new AbortController().signal;
  await expect(factory.restoreSourceRecord(frostRecord, { signal })).resolves.toBe(
    canonical.result,
  );
  expect(canonical.calls).toHaveLength(1);
  expect(canonical.calls[0].record).toEqual(frostRecord);
  expect(restorer.factoryCalls).toHaveLength(0);
});

it('registered real3Ihr restore uses only the build-owned frozen restorer', async () => {
  await expect(
    build({ endpoint }).restoreSourceRecord(real3IhrRecord, {
      signal: new AbortController().signal,
    }),
  ).resolves.toBeUndefined();
  expect(restorer.factoryCalls).toEqual([{ currentnessEndpoint: endpoint }]);
  expect(restorer.restoreCalls).toHaveLength(1);
  expect(restorer.restoreCalls[0].record).toEqual(real3IhrRecord);
  expect(restorer.restoreCalls[0].signal).toBeInstanceOf(AbortSignal);
  expect(canonical.calls).toHaveLength(0);
});

it('unknown record with legacy config still uses canonical restore', async () => {
  const factory = build({ endpoint });
  await expect(
    factory.restoreSourceRecord(frostRecord, {
      signal: new AbortController().signal,
    }),
  ).resolves.toBe(canonical.result);
  expect(restorer.factoryCalls).toHaveLength(0);
  expect(canonical.calls).toHaveLength(1);
});


it('forwards selected inventory manifestId entries 1 and 18 to the actual Add call', async () => {
  for (const index of [1, 18]) {
    adder.factoryCalls.length = 0;
    adder.addCalls.length = 0;
    adder.impl = async () => ({ unexpected: true });
    const factory = build({ endpoint });
    await expect(
      factory.consumeFixedLegacySidecar(
        {
          selection,
          metadata,
          manifestId: LEGACY_INVENTORY_ENTRIES[index].manifestId,
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow('general_legacy_sidecar');
    expect(adder.addCalls).toHaveLength(1);
    expect(Object.keys(adder.addCalls[0])).toEqual(['manifestId', 'signal']);
    expect(adder.addCalls[0].manifestId).toBe(
      LEGACY_INVENTORY_ENTRIES[index].manifestId,
    );
  }
});

it('unknown manifestId rejects before Add construction and does not abort a pending valid Add', async () => {
  adder.factoryCalls.length = 0;
  adder.addCalls.length = 0;
  let resolveAdd: any;
  adder.impl = () =>
    new Promise((resolve) => {
      resolveAdd = resolve;
    });
  const factory = build({ endpoint });
  const pending = factory.consumeFixedLegacySidecar(
    { selection, metadata, manifestId: LEGACY_INVENTORY_ENTRIES[1].manifestId },
    { signal: new AbortController().signal },
  );
  await vi.waitFor(() => expect(adder.addCalls).toHaveLength(1));
  const factoriesBefore = adder.factoryCalls.length;
  await expect(
    factory.consumeFixedLegacySidecar(
      { selection, metadata, manifestId: 'f'.repeat(64) },
      { signal: new AbortController().signal },
    ),
  ).rejects.toThrow('general_legacy_manifest');
  expect(adder.factoryCalls).toHaveLength(factoriesBefore);
  resolveAdd({ unexpected: true });
  await expect(pending).rejects.toThrow('general_legacy_sidecar');
});


it('factory forwards the internally registered nonfirst manifestId on restore', async () => {
  const nonfirst = JSON.parse(
    fs.readFileSync(
      new URL('../test-support/realNonfirst1016/base-record.raw.json', import.meta.url),
      'utf8',
    ),
  );
  restorer.factoryCalls.length = 0;
  restorer.restoreCalls.length = 0;
  restorer.impl = async () => new ArrayBuffer(0);
  await expect(
    build({ endpoint }).restoreSourceRecord(nonfirst, {
      signal: new AbortController().signal,
    }),
  ).resolves.toBeInstanceOf(ArrayBuffer);
  expect(restorer.restoreCalls).toHaveLength(1);
  expect(restorer.restoreCalls[0].manifestId).toBe(
    LEGACY_INVENTORY_ENTRIES[1].manifestId,
  );
  expect(canonical.calls).toHaveLength(0);
});
