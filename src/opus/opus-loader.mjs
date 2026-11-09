import {
  FORMAT,
  parseVerifiedDescriptor,
  verifyEncodedParts,
} from './opus-descriptor.mjs';
const hash = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
async function readExact(response, max, expectedLength, signal) {
  const h = response.headers.get('Content-Length');
  if (!h || !/^\d+$/.test(h)) throw Error('opus_content_length');
  const n = Number(h);
  if (
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > max ||
    (expectedLength !== undefined && n !== expectedLength) ||
    !response.body
  )
    throw Error('opus_content_length');
  const out = new Uint8Array(n),
    r = response.body.getReader();
  let off = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await r.read();
      if (done) break;
      if (off + value.length > n) throw Error('opus_body_overflow');
      out.set(value, off);
      off += value.length;
    }
  } finally {
    await r.cancel().catch(() => {});
  }
  signal?.throwIfAborted();
  if (off !== n) throw Error('opus_body_truncated');
  return out;
}
export async function loadVerifiedOpus({
  base,
  videoId,
  oggSha256,
  descriptorSha256,
  signal,
  fetcher = fetch,
}) {
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
    !hash(oggSha256) ||
    !hash(descriptorSha256)
  )
    throw Error('opus_route_identity');
  signal?.throwIfAborted();
  const root = `${base}/v1/opus-sources/${videoId}/${oggSha256}`;
  const dr = await fetcher(root + '/descriptor', { signal });
  if (
    dr.status !== 200 ||
    !dr.headers.get('Content-Type')?.startsWith('application/json') ||
    dr.headers.get('X-Audio-Contract') !== FORMAT ||
    dr.headers.get('X-Descriptor-SHA256') !== descriptorSha256
  )
    throw Error('opus_descriptor_headers');
  const descriptorBytes = await readExact(dr, 32768, undefined, signal),
    d = await parseVerifiedDescriptor(descriptorBytes, descriptorSha256);
  if (d.videoId !== videoId || d.oggSha256 !== oggSha256)
    throw Error('opus_descriptor_route_binding');
  const ar = await fetcher(root + '/audio', { signal });
  if (
    ar.status !== 200 ||
    !ar.headers.get('Content-Type')?.startsWith('audio/ogg') ||
    ar.headers.get('X-Audio-Contract') !== FORMAT ||
    ar.headers.get('X-Content-SHA256') !== d.oggSha256 ||
    ar.headers.get('X-PCM16-SHA256') !== d.pcm16Sha256 ||
    ar.headers.get('X-Descriptor-SHA256') !== descriptorSha256 ||
    ar.headers.get('X-Source-Video-Id') !== videoId ||
    ar.headers.get('ETag') !== `"${d.oggSha256}"`
  )
    throw Error('opus_audio_headers');
  const bytes = await readExact(ar, 6000000, d.oggBytes, signal);
  await verifyEncodedParts(bytes, d);
  signal?.throwIfAborted();
  return { descriptor: d, descriptorBytes, descriptorSha256, bytes };
}
export function opusCacheKey(d, descriptorSha256) {
  return [
    FORMAT,
    d.videoId,
    d.oggSha256,
    descriptorSha256,
    d.pcm16Sha256,
    d.decoderWasmSha256,
  ].join(':');
}
