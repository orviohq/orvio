import { it, expect, vi } from 'vitest';
import {
  createVersioned468Codec,
  LEGACY468_GENERATOR as OLD,
  UNIFIED468_GENERATOR as NEW,
} from '../src/opus/opus468-version-dispatch.mjs';
function wire(version: string) {
  const section = new TextEncoder().encode(
    JSON.stringify({ generatorVersion: version }),
  );
  const b = new Uint8Array(152 + 3 + section.length);
  b.set(new TextEncoder().encode('ORV468L1'));
  const view = new DataView(b.buffer);
  [1, section.length, 1, 1].forEach((n, i) =>
    view.setUint32(8 + i * 4, n, false),
  );
  b.set(section, 153);
  return b;
}
function codec() {
  return {
    encode: vi.fn(async (_input: any, _options?: any) => 1),
    decode: vi.fn(async (_input: any, _options?: any) => 2),
  };
}
it('routes exact old and new generators to their own full codec without fallback', async () => {
  const legacy = codec(),
    unified = codec(),
    c = createVersioned468Codec({ legacy, unified });
  await c.encode({ extension: { generatorVersion: OLD } });
  await c.decode(wire(NEW));
  expect(legacy.encode).toHaveBeenCalledOnce();
  expect(unified.decode).toHaveBeenCalledOnce();
  expect(legacy.decode).not.toHaveBeenCalled();
  unified.decode.mockRejectedValue(Error('fresh_derived_record'));
  await expect(c.decode(wire(NEW))).rejects.toThrow('fresh_derived_record');
  expect(legacy.decode).not.toHaveBeenCalled();
});
it('unknown/self-described versions cannot choose a producer', () => {
  const legacy = codec(),
    unified = codec(),
    c = createVersioned468Codec({ legacy, unified });
  expect(() => c.decode(wire('research-c3'))).toThrow(
    'extension_generator_unsupported',
  );
  expect(legacy.decode).not.toHaveBeenCalled();
  expect(unified.decode).not.toHaveBeenCalled();
});
it('bounded header parsing precedes any codec call', () => {
  const legacy = codec(),
    unified = codec(),
    c = createVersioned468Codec({ legacy, unified });
  const b = wire(NEW);
  new DataView(b.buffer).setUint32(8, 0xffffffff, false);
  expect(() => c.decode(b)).toThrow('extension_share_section_limit');
  expect(unified.decode).not.toHaveBeenCalled();
});
it('dispatch snapshots data against mutation before downstream checks', async () => {
  const legacy = codec(),
    unified = codec(),
    c = createVersioned468Codec({ legacy, unified });
  const input = { extension: { generatorVersion: NEW } };
  await c.encode(input);
  input.extension.generatorVersion = OLD;
  expect(unified.encode.mock.calls[0][0].extension.generatorVersion).toBe(NEW);
});
