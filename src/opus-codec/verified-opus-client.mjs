// Private codec boundary. Not a wire-schema parser or adopted production route.
import CodecParser, {
  codecFrames,
  header,
  channels,
  streamCount,
  coupledStreamCount,
  channelMappingTable,
  preSkip,
  isLastPage,
  absoluteGranulePosition,
  data,
} from 'codec-parser';
import { OpusDecoder } from 'opus-decoder';
import { sha256 } from '@noble/hashes/sha2.js';
import { inspectOpusOgg } from './ogg-artifact.mjs';
export const DECODER_SHA256 =
  '8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b';
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const digest = async (bytes) => {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      return hex(new Uint8Array(await subtle.digest('SHA-256', bytes)));
    } catch {}
  }
  return hex(sha256(bytes));
};
export function quantize(v) {
  if (!Number.isFinite(v)) throw Error('opus_nonfinite');
  const x = v * 32768,
    f = Math.floor(x),
    d = x - f,
    q = d > 0.5 ? f + 1 : d < 0.5 ? f : f % 2 === 0 ? f : f + 1;
  return Math.max(-32768, Math.min(32767, q));
}
// Call in an owned worker; terminate the worker for immediate cancellation.
// No PCM escapes this function until complete encoded + decoded verification.
export async function decodeVerifiedOpus({
  bytes,
  wasmBytes,
  expected,
  signal,
  chunkBytes = 65536,
  // Only an owned worker with out-of-band termination may opt out.
  yieldAfterChunk = true,
}) {
  const check = () => signal?.throwIfAborted();
  check();
  if (
    !(bytes instanceof Uint8Array) ||
    !(wasmBytes instanceof Uint8Array) ||
    !expected
  )
    throw Error('opus_input');
  wasmBytes = wasmBytes.slice();
  for (const name of ['oggSha256', 'pcm16Sha256'])
    if (!/^[0-9a-f]{64}$/.test(expected[name])) throw Error('opus_identity');
  if (
    expected.decoderWasmSha256 !== DECODER_SHA256 ||
    (await digest(wasmBytes)) !== DECODER_SHA256
  )
    throw Error('opus_decoder_identity');
  if (
    expected.sampleRate !== 48000 ||
    expected.channels !== 2 ||
    !Number.isSafeInteger(expected.frames) ||
    expected.frames < 1 ||
    expected.frames > 14400000 ||
    !Number.isSafeInteger(expected.oggBytes) ||
    expected.oggBytes !== bytes.byteLength ||
    !Number.isSafeInteger(chunkBytes) ||
    chunkBytes < 1 ||
    chunkBytes > 1048576
  )
    throw Error('opus_descriptor');
  if ((await digest(bytes)) !== expected.oggSha256)
    throw Error('opus_encoded_identity');
  inspectOpusOgg(bytes, {
    expectedFrames: expected.frames,
    expectedChannels: 2,
    expectedPreSkip: expected.preSkip,
  });
  check();
  OpusDecoder.module = await WebAssembly.compile(wasmBytes);
  check();
  let dec;
  let decodedTotal = 0;
  const parser = new CodecParser('application/ogg', {
    onCodec: (c) => {
      if (c !== 'opus') throw Error('opus_codec');
    },
    enableFrameCRC32: false,
  });
  const pcm = new Uint8Array(expected.frames * 4),
    view = new DataView(pcm.buffer),
    i16 = new Int16Array(pcm.buffer),
    le = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  let frames = 0;
  const consume = (r) => {
    if (r.errors?.length) throw Error('opus_decode_error');
    const n = r.samplesDecoded;
    if (
      !Number.isSafeInteger(n) ||
      n < 0 ||
      frames + n > expected.frames ||
      r.sampleRate !== 48000 ||
      r.channelData?.length !== 2 ||
      r.channelData.some((c) => c.length !== n)
    )
      throw Error('opus_decode_shape');
    if (le)
      for (let j = 0; j < n; j++) {
        i16[(frames + j) * 2] = quantize(r.channelData[0][j]);
        i16[(frames + j) * 2 + 1] = quantize(r.channelData[1][j]);
      }
    else
      for (let j = 0; j < n; j++) {
        view.setInt16((frames + j) * 4, quantize(r.channelData[0][j]), true);
        view.setInt16(
          (frames + j) * 4 + 2,
          quantize(r.channelData[1][j]),
          true,
        );
      }
    frames += n;
  };
  const pages = async (parsed) => {
    for (const page of parsed) {
      const packets = page[codecFrames].map((f) => f[data]);
      if (!packets.length) continue;
      if (!dec) {
        const h = page[codecFrames][0][header];
        if (h[channels] !== 2 || h[preSkip] !== expected.preSkip)
          throw Error('opus_header_binding');
        dec = new OpusDecoder({
          channels: h[channels],
          streamCount: h[streamCount],
          coupledStreamCount: h[coupledStreamCount],
          channelMappingTable: h[channelMappingTable],
          preSkip: expected.preSkip,
          sampleRate: 48000,
          forceStereo: true,
        });
        await dec.ready;
      }
      check();
      const r = await dec.decodeFrames(packets),
        n = r.samplesDecoded;
      let keep = n;
      if (page[isLastPage]) {
        if (page[absoluteGranulePosition] === undefined)
          throw Error('opus_trim_missing');
        const N = Number(page[absoluteGranulePosition]) - expected.preSkip,
          excess = decodedTotal + n - N;
        if (
          !Number.isSafeInteger(N) ||
          N !== expected.frames ||
          excess < 0 ||
          excess > expected.preSkip + 1920 ||
          decodedTotal > N
        )
          throw Error('opus_trim_unsupported');
        keep = n - excess;
      }
      decodedTotal += n;
      consume({
        ...r,
        samplesDecoded: keep,
        channelData: r.channelData.map((c) => c.subarray(0, keep)),
      });
    }
  };
  try {
    for (let off = 0; off < bytes.length; off += chunkBytes) {
      check();
      await pages([
        ...parser.parseChunk(
          bytes.subarray(off, Math.min(off + chunkBytes, bytes.length)),
        ),
      ]);
      if (yieldAfterChunk)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await pages([...parser.flush()]);
    check();
    if (frames !== expected.frames || hex(sha256(pcm)) !== expected.pcm16Sha256)
      throw Error('opus_pcm_identity');
    check();
    return { pcm16: pcm, sampleRate: 48000, channels: 2, frames };
  } finally {
    dec?.free();
  }
}
