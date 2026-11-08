// @ts-nocheck
// Verified streaming slicer for the EXISTING canonical audio GET.
// Reads one ordered byte stream (the whole-WAV response body) and yields
// manifest segments as each completes, after per-segment SHA-256 proof.
// Early abort: a corrupt segment throws before its bytes can be scheduled.
// The completion gate (whole-file SHA + WAV identity) lives in the caller.
// Browser-safe: no static node:* imports (subtle crypto; node fallback).

// Incremental hasher that works in both Node and the browser.
async function makeHasher() {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    let parts = [];
    return {
      update(u8) {
        parts.push(u8);
      },
      async digest() {
        const all = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
        let o = 0;
        for (const p of parts) {
          all.set(p, o);
          o += p.byteLength;
        }
        const h = await subtle.digest('SHA-256', all);
        parts = [];
        return Array.from(new Uint8Array(h), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
      },
    };
  }
  throw Error('Secure hashing unavailable');
}

export class SegmentIntegrityError extends Error {
  constructor(segment) {
    super('Segment integrity');
    this.code = 'integrity_failed';
    this.segment = segment;
  }
}
export class StreamTruncatedError extends Error {
  constructor() {
    super('Stream truncated');
    this.code = 'integrity_failed';
  }
}

/**
 * sliceStream(reader, manifest, { signal, onSegment })
 * Pulls the reader until every manifest segment is delivered in order.
 * Each segment's bytes are hashed incrementally and verified before
 * onSegment(segment, bytes, channels) runs. Returns the reassembled whole
 * for the completion gate. Throws SegmentIntegrityError/StreamTruncatedError.
 */
export async function sliceStream(
  reader,
  manifest,
  { signal, onSegment } = {},
) {
  // Abort cancels a possibly-hung pending read; finally releases the reader
  // on EVERY exit (corrupt, truncated, abort, or clean completion).
  const cancelOnAbort = () => {
    reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancelOnAbort);
  try {
    return await sliceStreamInner(reader, manifest, { signal, onSegment });
  } finally {
    signal?.removeEventListener('abort', cancelOnAbort);
    await reader.cancel().catch(() => {});
  }
}

async function sliceStreamInner(reader, manifest, { signal, onSegment } = {}) {
  const whole = new Uint8Array(manifest.byteLength);
  let offset = 0,
    carry = new Uint8Array(0),
    index = 0;
  const feed = async (chunk) => {
    const buf = new Uint8Array(carry.byteLength + chunk.byteLength);
    buf.set(carry, 0);
    buf.set(chunk, carry.byteLength);
    carry = buf;
    while (index < manifest.parts.length) {
      const seg = manifest.parts[index];
      const segEnd = seg.byteOffset + seg.byteLength;
      const available = offset + carry.byteLength;
      if (available < segEnd) break;
      // Slice this segment out of carry (segments are contiguous from 0).
      const localStart = seg.byteOffset - offset;
      const localEnd = localStart + seg.byteLength;
      const bytes = carry.slice(localStart, localEnd);
      const hasher = await makeHasher();
      hasher.update(bytes);
      if ((await hasher.digest()) !== seg.sha256)
        throw new SegmentIntegrityError(index);
      whole.set(bytes, seg.byteOffset);
      carry = carry.slice(localEnd);
      offset = segEnd;
      index++;
      if (onSegment) await onSegment(seg, bytes);
    }
  };
  for (;;) {
    signal?.throwIfAborted();
    const { value, done } = await reader.read();
    if (done) break;
    if (offset + carry.byteLength + value.byteLength > manifest.byteLength)
      throw new SegmentIntegrityError(index);
    await feed(value);
  }
  signal?.throwIfAborted();
  if (index !== manifest.parts.length || offset !== manifest.byteLength)
    throw new StreamTruncatedError();
  return whole.buffer;
}
