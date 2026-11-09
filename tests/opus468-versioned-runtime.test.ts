import { it, expect, vi } from 'vitest';
import { createVersioned468Runtime } from '../src/opus/opus468-versioned-runtime.mjs';
import {
  LEGACY468_GENERATOR as OLD,
  UNIFIED468_GENERATOR as NEW,
} from '../src/opus/opus468-version-dispatch.mjs';
function branch(id: string, version: string) {
  const frontend = {
    restore: vi.fn(async (s: string) => (s === id ? { id } : null)),
    restoreSession: vi.fn(async () => ({ session: { song: id } })),
    list: () => [{ id }],
  };
  return {
    frontend,
    makeCodec: () => ({
      encode: vi.fn(),
      decode: vi.fn(async () => ({ extension: { generatorVersion: version } })),
    }),
    releaseBinding: { generatorVersion: version },
    extendCachedBase: vi.fn(),
    consumeAcquiredJob: vi.fn(),
    exportSharedV7: vi.fn(async () => version),
    makeTransientSharedView: vi.fn(async () => version),
    installSharedReplay: vi.fn(async () => version),
    cancel: vi.fn(),
    revoke: vi.fn(),
  };
}
it('default new generation and explicit old saved result export are separate routes', async () => {
  const legacy = branch('old', OLD),
    unified = branch('new', NEW),
    r = createVersioned468Runtime({ legacy, unified, parseSharedV7: vi.fn() });
  r.extendCachedBase({});
  expect(unified.extendCachedBase).toHaveBeenCalledOnce();
  expect(legacy.extendCachedBase).not.toHaveBeenCalled();
  expect(
    await r.exportSharedV7('old:12345678-1234-1234-1234-123456789abc'),
  ).toBe(OLD);
  expect(legacy.exportSharedV7).toHaveBeenCalledOnce();
  expect(unified.exportSharedV7).not.toHaveBeenCalled();
});
it('transient result chooses exact generator branch, unknown denied without a service call', async () => {
  const legacy = branch('old', OLD),
    unified = branch('new', NEW),
    r = createVersioned468Runtime({ legacy, unified, parseSharedV7: vi.fn() });
  expect(
    await r.makeTransientSharedView({ extension: { generatorVersion: OLD } }),
  ).toBe(OLD);
  expect(
    await r.makeTransientSharedView({ extension: { generatorVersion: NEW } }),
  ).toBe(NEW);
  expect(() =>
    r.makeTransientSharedView({ extension: { generatorVersion: 'forged' } }),
  ).toThrow('extension_generator_unsupported');
});
it('cancellation and revocation reach both branches', () => {
  const legacy = branch('old', OLD),
    unified = branch('new', NEW),
    r = createVersioned468Runtime({ legacy, unified, parseSharedV7: vi.fn() });
  r.cancel();
  r.revoke();
  expect(legacy.cancel).toHaveBeenCalledOnce();
  expect(unified.cancel).toHaveBeenCalledOnce();
  expect(legacy.revoke).toHaveBeenCalledOnce();
  expect(unified.revoke).toHaveBeenCalledOnce();
});
