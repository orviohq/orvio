import { it, expect, vi } from 'vitest';
import { deflateSync } from 'node:zlib';
import { createVersionedV7Parser } from '../src/opus/opus468-versioned-v7.mjs';
import {
  LEGACY468_GENERATOR as OLD,
  UNIFIED468_GENERATOR as NEW,
} from '../src/opus/opus468-version-dispatch.mjs';
const fragment = (version: string) =>
  'v=7&d=' +
  deflateSync(
    JSON.stringify({ extension: { generatorVersion: version } }),
  ).toString('base64url');
it('boundeduntrusted stage routes to exact full parser, never acts as admission', async () => {
  const legacy = vi.fn(async () => ({ admitted: false, kind: 'old' })),
    unified = vi.fn(async () => ({ admitted: false, kind: 'new' })),
    parse = createVersionedV7Parser({ legacy, unified });
  expect(await parse(fragment(OLD))).toEqual({ admitted: false, kind: 'old' });
  expect(await parse(fragment(NEW))).toEqual({ admitted: false, kind: 'new' });
  expect(legacy).toHaveBeenCalledOnce();
  expect(unified).toHaveBeenCalledOnce();
});
it('unknown versions and oversized inflated inputs fail before either full parser', async () => {
  const legacy = vi.fn(),
    unified = vi.fn(),
    parse = createVersionedV7Parser({ legacy, unified });
  await expect(parse(fragment('caller-selected'))).rejects.toThrow(
    'extension_generator_unsupported',
  );
  const tooLarge =
    'v=7&d=' + deflateSync(' '.repeat(4194305)).toString('base64url');
  await expect(parse(tooLarge)).rejects.toThrow('share468_size');
  expect(legacy).not.toHaveBeenCalled();
  expect(unified).not.toHaveBeenCalled();
});
it('chosen full parser verification error never tries other version', async () => {
  const legacy = vi.fn(),
    unified = vi.fn(async () => {
      throw Error('local_binding');
    }),
    parse = createVersionedV7Parser({ legacy, unified });
  await expect(parse(fragment(NEW))).rejects.toThrow('local_binding');
  expect(legacy).not.toHaveBeenCalled();
});
