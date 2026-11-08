// @ts-nocheck
// Trust binding for progressive manifests (backend analysis F3/F4, 2026-11-09).
// A manifest authenticates early segments ONLY when its sha256 is committed
// by the frozen pin (pin.manifestSha256, NEW pins only). Old records have no
// such field: early playback is UNVERIFIED there and the terminal whole
// audioSha256 gate + never-persist-until-verified semantics remain the only
// anchor. This module never grants verified-early status without the binding.
async function sha256hex(u8) {
  const h = await globalThis.crypto.subtle.digest('SHA-256', u8);
  return Array.from(new Uint8Array(h), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

// F4: deterministic canonical serialization. Fixed key order, lowercase hex,
// integers only, no optional/duplicate keys. Length-prefixed JSON-free
// binary encoding so no implementation can disagree on whitespace/ordering.
export function canonicalManifestBytes(m) {
  const enc = new TextEncoder();
  const chunks = [];
  const u32 = (n) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, false);
    chunks.push(b);
  };
  const u64 = (n) => {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigUint64(0, BigInt(n), false);
    chunks.push(b);
  };
  const str = (s) => {
    const b = enc.encode(s);
    u32(b.byteLength);
    chunks.push(b);
  };
  if (!/^[A-Za-z0-9_-]{11}$/.test(m.videoId)) throw Error('Invalid videoId');
  str('orvio-manifest/1');
  str(m.videoId);
  str(m.codec ?? 'pcm_s16le');
  u32(m.codecRev ?? 1);
  u32(m.sampleRate);
  u32(m.channels);
  u32(m.bps ?? 16);
  u64(m.frames);
  u64(m.dataOffset);
  u64(m.byteLength);
  u32(m.parts.length);
  for (const p of m.parts) {
    if (!/^[a-f0-9]{64}$/.test(p.sha256)) throw Error('Invalid part hash');
    u64(p.startFrame);
    u64(p.byteOffset);
    str(p.sha256);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

export async function manifestSha256(m) {
  return sha256hex(canonicalManifestBytes(m));
}

export class ManifestTrustError extends Error {
  constructor(reason) {
    super(`Manifest trust: ${reason}`);
    this.code = 'integrity_failed';
    this.reason = reason;
  }
}

/**
 * binding = 'verified'  -> pin.manifestSha256 exists and matches: segments
 *                          may be trusted as they verify (F3 chain).
 * binding = 'unverified'-> old record (no manifestSha256 in pin): caller MUST
 *                          treat any pre-completion playback as unverified;
 *                          terminal whole-sha gate and never-persist rule hold.
 * Throws on a committed-but-mismatching manifest (F6: pair-swap fails here,
 * before any audio byte is trusted).
 */
export async function checkManifestBinding(manifest, pin) {
  if (!pin || typeof pin !== 'object') throw new ManifestTrustError('no pin');
  if (pin.manifestSha256 === undefined || pin.manifestSha256 === null)
    return 'unverified';
  if (!/^[a-f0-9]{64}$/.test(pin.manifestSha256))
    throw new ManifestTrustError('malformed pin manifestSha256');
  if (manifest.videoId !== pin.videoId && pin.videoId !== undefined)
    throw new ManifestTrustError('videoId mismatch');
  if (manifest.audioSha256 !== pin.audioSha256)
    throw new ManifestTrustError('audio identity mismatch');
  if ((await manifestSha256(manifest)) !== pin.manifestSha256)
    throw new ManifestTrustError('manifest hash mismatch');
  return 'verified';
}
