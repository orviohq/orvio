import { parseOpus35Canonical } from './opus35-canonical.mjs';
import { exactKeys, OPTIONS_KEYS } from './opus35-schema';
/** New v6 only: inspect raw bounded R2 metadata before legacy decoder sanitizes it. */
export function inspectOpus35RawR2(bytes: Uint8Array) {
  if (!(bytes instanceof Uint8Array) || bytes[0] !== 82 || bytes[1] !== 50)
    throw Error('opus35_raw_r2');
  let p = 2,
    n = 0n,
    done = false;
  for (let shift = 0n; shift < 70n; shift += 7n) {
    if (p >= bytes.length) throw Error('opus35_raw_r2');
    const b = bytes[p++];
    n |= BigInt(b & 127) << shift;
    if (!(b & 128)) {
      done = true;
      break;
    }
  }
  if (!done || n > 4096n || n < 1n || p + Number(n) > bytes.length)
    throw Error('opus35_raw_r2');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(
    bytes.subarray(p, p + Number(n)),
  );
  const meta = parseOpus35Canonical(text);
  if (
    !Array.isArray(meta) ||
    meta.length < 6 ||
    meta.length > 8 ||
    !exactKeys(meta[3], OPTIONS_KEYS) ||
    (meta.length === 8 && !exactKeys(meta[7], ['version', 'rulesId', 'auto']))
  )
    throw Error('opus35_raw_r2_schema');
  return meta;
}
