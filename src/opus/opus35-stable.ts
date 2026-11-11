import {
  parseVerifiedDescriptor,
  verifyEncodedParts,
} from './opus-descriptor.mjs';
import { readOpus35Artifact } from './opus35-api';
import { verifyOpusRecord, type OpusRecord } from './opus-record';
import {
  songShareBodyAtStage,
  songShareFetchAtStage,
  songShareSaveAtStage,
} from '../song-share-save-diagnostic';
async function readBounded(
  r: Response,
  record: OpusRecord,
  kind: 'audio' | 'descriptor',
  max: number,
  size?: number,
  signal?: AbortSignal,
) {
  const expected =
      kind === 'audio'
        ? record.encodedAudioSha256
        : record.audioDescriptorSha256,
    h = r.headers,
    n = h.get('Content-Length');
  if (
    r.status !== 200 ||
    r.redirected ||
    h.get('Content-Type') !==
      (kind === 'audio' ? 'audio/ogg' : 'application/json') ||
    !['no-store', 'no-store, no-transform', 'no-store,no-transform'].includes(
      h.get('Cache-Control') ?? '',
    ) ||
    h.get('X-Content-Type-Options') !== 'nosniff' ||
    h.get('X-Audio-Contract') !== 'orvio-opus-v1' ||
    h.get('X-PCM16-SHA256') !== record.audioSha256 ||
    h.get('X-Content-SHA256') !== expected ||
    h.get('X-Descriptor-SHA256') !== record.audioDescriptorSha256 ||
    h.get('X-Source-Video-Id') !== record.videoId ||
    h.get('ETag') !== `"${expected}"` ||
    !n ||
    !/^\d+$/.test(n) ||
    !Number.isSafeInteger(Number(n)) ||
    Number(n) < 1 ||
    Number(n) > max ||
    (size !== undefined && Number(n) !== size) ||
    !r.body
  ) {
    void r.body?.cancel();
    throw Error('opus35_stable_headers');
  }
  const bytes = new Uint8Array(Number(n)),
    reader = r.body.getReader();
  let off = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const q = await reader.read();
      if (q.done) break;
      if (off + q.value.length > bytes.length)
        throw Error('opus35_stable_overflow');
      bytes.set(q.value, off);
      off += q.value.length;
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
  if (off !== bytes.length) throw Error('opus35_stable_truncated');
  return bytes;
}
export async function readStableOpus35Artifacts(
  record: OpusRecord,
  response: Response,
  signal: AbortSignal,
) {
  const descriptorBytes = await songShareBodyAtStage('artifact_verify', () =>
      readBounded(response, record, 'descriptor', 32768, undefined, signal),
    ),
    descriptor = await songShareSaveAtStage('artifact_verify', () =>
      parseVerifiedDescriptor(
        descriptorBytes,
        record.audioDescriptorSha256,
      ),
    );
  await songShareSaveAtStage('artifact_verify', async () => {
    if (
      !(await verifyOpusRecord(
        record,
        descriptor,
        record.audioDescriptorSha256,
      ))
    )
      throw Error('opus35_stable_binding');
  });
  const audioResponse = await songShareFetchAtStage('audio_fetch', () =>
    readOpus35Artifact(
      { ...record, kind: 'audio' },
      { method: 'GET', signal },
    ),
  );
  const bytes = await songShareBodyAtStage('artifact_verify', () =>
    readBounded(
      audioResponse,
      record,
      'audio',
      6000000,
      descriptor.oggBytes,
      signal,
    ),
  );
  await songShareSaveAtStage('artifact_verify', () =>
    verifyEncodedParts(bytes, descriptor),
  );
  return {
    bytes,
    descriptorBytes,
    descriptorSha256: record.audioDescriptorSha256,
  };
}
