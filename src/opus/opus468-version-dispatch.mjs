// Dispatch is not admission. Both exact branches run their original complete
// validation and producer regeneration. Unknown versions fail before either.
export const LEGACY468_GENERATOR = 'orvio-autochart468-nmguard-v1';
export const UNIFIED468_GENERATOR = 'orvio-autochart468-c3unified-v1';
const HEADER = 152,
  CAPS = [1572864, 1572864, 32768, 2097152];
const MAX = HEADER + CAPS.reduce((a, b) => a + b, 0);
const magic = new TextEncoder().encode('ORV468L1');
export function exact468Branch(version, { legacy, unified }) {
  if (version === LEGACY468_GENERATOR) return legacy;
  if (version === UNIFIED468_GENERATOR) return unified;
  throw Error('extension_generator_unsupported');
}
function wireVersion(input) {
  if (
    !(input instanceof Uint8Array) ||
    !(input.buffer instanceof ArrayBuffer) ||
    input.length < HEADER ||
    input.length > MAX
  )
    throw Error('extension_share_wire_limit');
  if (!magic.every((x, i) => input[i] === x))
    throw Error('extension_share_version');
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength),
    lengths = [];
  let total = HEADER;
  for (let i = 0; i < 4; i++) {
    const n = view.getUint32(8 + i * 4, false);
    if (n < 1 || n > CAPS[i]) throw Error('extension_share_section_limit');
    lengths.push(n);
    total += n;
  }
  if (total !== input.length) throw Error('extension_share_wire_length');
  const start = HEADER + lengths[0];
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        input.subarray(start, start + lengths[1]),
      ),
    ).generatorVersion;
  } catch {
    throw Error('extension_share_json');
  }
}
export function createVersioned468Codec({ legacy, unified }) {
  return Object.freeze({
    encode(input, options) {
      const snapshot = structuredClone(input);
      return exact468Branch(snapshot?.extension?.generatorVersion, {
        legacy,
        unified,
      }).encode(snapshot, options);
    },
    decode(input, options) {
      const snapshot = input instanceof Uint8Array ? input.slice() : input;
      return exact468Branch(wireVersion(snapshot), { legacy, unified }).decode(
        snapshot,
        options,
      );
    },
  });
}
