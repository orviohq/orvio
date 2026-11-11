import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { GENERAL468_LEGACY_CONFIG } from '../src/opus/opus468-legacy-build-config';
import { createVersioned468Runtime } from '../src/opus/opus468-versioned-runtime.mjs';

const branch = (extra: any = {}) => ({
  frontend: {},
  makeCodec: () => ({}),
  cancel: vi.fn(),
  revoke: vi.fn(),
  ...extra,
});

it('production general entry build config is explicitly enabled', () => {
  expect(GENERAL468_LEGACY_CONFIG).toEqual({
    endpoint: 'https://orvio-share.pn-26f.workers.dev/v2/published-legacy-audio-projection',
  });
});

it('versioned runtime forwards fixed Add and restore only to unified', async () => {
  const unified = branch({
    consumeFixedLegacySidecar: vi.fn(async () => 'add'),
    restoreSourceRecord: vi.fn(async () => 'restore'),
  });
  const runtime = createVersioned468Runtime({
    legacy: branch(),
    unified,
    parseSharedV7: () => ({}),
  });
  await expect(runtime.consumeFixedLegacySidecar({ a: 1 }, { signal: {} })).resolves.toBe('add');
  await expect(runtime.restoreSourceRecord({ b: 2 }, { signal: {} })).resolves.toBe('restore');
  expect(unified.consumeFixedLegacySidecar).toHaveBeenCalledOnce();
  expect(unified.restoreSourceRecord).toHaveBeenCalledOnce();
});

it('missing unified capability fails closed instead of using legacy', () => {
  const runtime = createVersioned468Runtime({
    legacy: branch(),
    unified: branch(),
    parseSharedV7: () => ({}),
  });
  expect(() => runtime.consumeFixedLegacySidecar()).toThrow(
    'versioned_unified_capability',
  );
  expect(() => runtime.restoreSourceRecord()).toThrow(
    'versioned_unified_capability',
  );
});


it('main source structurally forwards optional manifestId (not a DOM/browser proof)', () => {
  const source = fs.readFileSync(
    new URL('../src/main.ts', import.meta.url),
    'utf8',
  );
  expect(source).toContain('manifestId?: string;');
  expect(source).toContain('manifestId: captured.manifestId');
  expect(source).toContain('createBuildOwnedLegacySidecarAdd');
});
