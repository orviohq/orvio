import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const seam = vi.hoisted(() => ({
  makeReader: null as null | (() => any),
  readSignals: [] as AbortSignal[],
  exchangeSignals: [] as AbortSignal[],
  exchangeCalls: 0,
}));

vi.mock('../src/opus/unified/fresh-store.mjs', () => ({
  createOpus468FreshStore: (options: any) => {
    seam.makeReader = options.makeReader;
    return {};
  },
  createOpus468FreshStoreSingleRestore: (options: any) => {
    seam.makeReader = options.makeReader;
    return {};
  },
}));
vi.mock('../src/opus/unified/frontend', () => ({
  createOpus468FrontendSharing1935: () => ({
    saveSession: vi.fn(),
    pin: vi.fn(),
    restore: vi.fn(),
  }),
}));
vi.mock('../src/opus/unified/legacy-source-registry.mjs', () => ({
  findLegacySourceRoots: () => null,
  resolveVerifiedLegacySource: vi.fn(async () => null),
}));
vi.mock('../src/opus/unified/split-projection-reader.mjs', () => ({
  createProduction468SplitProjectionReader: ({ exchangeProjection }: any) => ({
    readChart: async (
      _record: any,
      _descriptor: any,
      _choice: any,
      { signal }: any,
    ) => {
      seam.readSignals.push(signal);
      seam.exchangeCalls++;
      seam.exchangeSignals.push(signal);
      await exchangeProjection({}, { signal });
      return {};
    },
  }),
}));
vi.mock('../src/opus/unified/legacy-split-projection-reader.mjs', () => ({
  createProductionLegacySplitProjectionReader: () => ({
    readChart: async () => ({}),
  }),
}));

import { createUnified468Candidate } from '../src/opus/unified/factory';

const input = {
  baseSourceRecordJson: JSON.stringify({}),
  extension: {},
};

function setup() {
  const exchangeProjection = vi.fn(async () => ({}));
  const factory = createUnified468Candidate({
    readArtifact: vi.fn(),
    exchangeProjection,
  });
  const reader = seam.makeReader!();
  return { factory, reader, exchangeProjection };
}

beforeEach(() => {
  seam.makeReader = null;
  seam.readSignals.length = 0;
  seam.exchangeSignals.length = 0;
  seam.exchangeCalls = 0;
});
afterEach(() => vi.restoreAllMocks());

it('keeps one composite signal per raw operation and exchanges freshly per read', async () => {
  const { reader, exchangeProjection } = setup();
  const outer = new AbortController();
  await reader.readChart(input, new Uint8Array(), {}, { signal: outer.signal });
  await reader.readChart(input, new Uint8Array(), {}, { signal: outer.signal });
  expect(seam.readSignals[0]).toBe(seam.readSignals[1]);
  expect(seam.exchangeSignals).toHaveLength(2);
  expect(seam.exchangeCalls).toBe(2);
  expect(exchangeProjection).toHaveBeenCalledTimes(2);

  const other = new AbortController();
  await reader.readChart(input, new Uint8Array(), {}, { signal: other.signal });
  expect(seam.readSignals[2]).not.toBe(seam.readSignals[0]);

  await reader.readChart(input, new Uint8Array(), {});
  expect(seam.readSignals[3]).not.toBe(seam.readSignals[2]);
});

it('preserves nested composite identity and caller/lifetime abort behavior', async () => {
  const { factory, reader } = setup();
  const outer = new AbortController();
  await reader.readChart(input, new Uint8Array(), {}, { signal: outer.signal });
  const merged = seam.readSignals[0];
  await reader.readChart(input, new Uint8Array(), {}, { signal: merged });
  expect(seam.readSignals[1]).toBe(merged);

  outer.abort(Error('caller_abort'));
  await expect(
    reader.readChart(input, new Uint8Array(), {}, { signal: outer.signal }),
  ).rejects.toThrow('caller_abort');

  factory.revoke();
  expect(merged.aborted).toBe(true);
  await expect(
    reader.readChart(
      input,
      new Uint8Array(),
      {},
      { signal: new AbortController().signal },
    ),
  ).rejects.toThrow('general_revoked');
});
