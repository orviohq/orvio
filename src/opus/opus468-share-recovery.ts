import { verifyOpusRecord, type OpusRecord } from './opus-record';
import { parseVerifiedDescriptor } from './opus-descriptor.mjs';
import { readVerifiedOpusByRoots } from './opus-cache.mjs';
import { restoreOpus35Record } from './opus35-api';
type Candidate = { baseSourceRecordJson: string; descriptorBytes: Uint8Array };
type Exchange = (
  request: {
    version: 1;
    requestId: string;
    videoId: string;
    encodedAudioSha256: string;
  },
  options: { signal: AbortSignal },
) => Promise<any>;
/** Playback cache recovery only. Does not install a library row or a session,
 * admit an extension, create a job, or advance a provider request. */
export async function recoverPublic468Source(
  input: Candidate,
  {
    exchangeProjection,
    signal,
  }: { exchangeProjection: Exchange; signal: AbortSignal },
) {
  signal.throwIfAborted();
  const candidate = structuredClone(input),
    base: OpusRecord = JSON.parse(candidate.baseSourceRecordJson);
  const descriptor = await parseVerifiedDescriptor(
    candidate.descriptorBytes,
    base.audioDescriptorSha256,
  );
  if (!(await verifyOpusRecord(base, descriptor, base.audioDescriptorSha256)))
    throw Error('share468_source_record');
  signal.throwIfAborted();
  const requestId = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  const projection = await exchangeProjection(
    {
      version: 1,
      requestId,
      videoId: base.videoId,
      encodedAudioSha256: base.encodedAudioSha256,
    },
    { signal },
  );
  signal.throwIfAborted();
  if (
    projection?.ok !== true ||
    projection.requestId !== requestId ||
    projection.currentAtConfirmation !== true ||
    projection.channels !== 2 ||
    (
      [
        'videoId',
        'encodedAudioSha256',
        'audioDescriptorSha256',
        'audioSha256',
        'decoderWasmSha256',
        'frames',
        'sampleRate',
      ] as const
    ).some((k) => projection[k] !== base[k])
  )
    throw Error('share468_source_unavailable');
  // A successful owner answer is point-in-time audio currentness only. The
  // full extension codec and every later replay still do their fresh gates.
  const cached = await readVerifiedOpusByRoots(base, { signal });
  if (!cached) await restoreOpus35Record(base, signal);
  signal.throwIfAborted();
  return structuredClone(base);
}
