import { traceOpusServerTiming } from './opus-server-timing';
import type { ImportTrace } from '../import-trace';
import type { ImportStage } from '../import-progress';
import {
  AUDIO_BASE,
  AudioJobError,
  validAudioErrorCode,
} from '../external-audio-api';
import { audioAtStage } from '../audio-error-stage';
import { assertRuntimeFetch } from '../client-only-runtime';
import { captureAcquiredOpusV2 } from './opus-acquired-v2-artifacts.mjs';
import { createAcquiredOpusV2Preparer } from './opus-acquired-v2-prepare';
import { prepareOpusOwned } from './opus-chart-worker-client.mjs';
import { saveVerifiedOpus } from './opus-cache.mjs';
import { verifyOpusRecord, type OpusRecord } from './opus-record';
import DecoderUrl from '../opus-codec/opus-decoder.wasm?url';
import ChartWorkerUrl from './opus-chart.worker.mjs?worker&url';
import { DECODER, sha256 } from './opus-descriptor.mjs';
import {
  songShareBodyAtStage,
  songShareFetchAtStage,
  songShareSaveAtStage,
} from '../song-share-save-diagnostic';
const VIDEO = /^[A-Za-z0-9_-]{11}$/,
  SHA = /^[a-f0-9]{64}$/,
  UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const OPUS35_CREATE_ENABLED = true; // Qualified current35 consumer transport.
export interface Opus35Handle {
  jobId: string;
  videoId: string;
  transportVersion: 2;
  audioFormat: 'orvio-opus-v1';
}
export function validateOpus35Handle(j: Opus35Handle) {
  if (
    j.transportVersion !== 2 ||
    j.audioFormat !== 'orvio-opus-v1' ||
    !UUID.test(j.jobId) ||
    !VIDEO.test(j.videoId)
  )
    throw Error('opus35_handle');
  return j;
}
export async function readOpus35Artifact(
  input: any,
  { method, signal }: { method: 'GET'; signal?: AbortSignal },
) {
  if (
    method !== 'GET' ||
    !VIDEO.test(input?.videoId) ||
    !SHA.test(input?.encodedAudioSha256) ||
    !SHA.test(input?.audioDescriptorSha256) ||
    !SHA.test(input?.audioSha256) ||
    !['audio', 'descriptor'].includes(input?.kind)
  )
    throw Error('opus35_artifact_request');
  const root = `${AUDIO_BASE}/v2/audio-sources/${input.videoId}/${input.encodedAudioSha256}/${input.audioDescriptorSha256}`;
  const url = `${root}/${input.kind}`;
  assertRuntimeFetch(url, 'GET');
  return fetch(url, { signal, redirect: 'error' });
}
function exact(o: any, keys: string[]) {
  return (
    o &&
    typeof o === 'object' &&
    !Array.isArray(o) &&
    Object.keys(o).length === keys.length &&
    keys.every((k) => Object.hasOwn(o, k))
  );
}
export function parsePublicOpus35State(
  j: any,
  videoId: string,
  jobId?: string,
) {
  if (j?.status === 'verified') {
    const verified = captureAcquiredOpusV2(j);
    if (verified.videoId !== videoId || (jobId && verified.jobId !== jobId))
      throw Error('opus35_job_changed');
    return verified;
  }
  if (
    !j ||
    j.ok !== true ||
    j.version !== 2 ||
    j.kind !== 'orvio-opus-acquired-job-v2' ||
    !UUID.test(j.jobId) ||
    j.videoId !== videoId ||
    (jobId && j.jobId !== jobId) ||
    typeof j.phase !== 'string' ||
    j.phase.length < 1 ||
    j.phase.length > 64
  )
    throw Error('opus35_state');
  const base = ['ok', 'version', 'kind', 'jobId', 'videoId', 'status', 'phase'];
  if (
    j.status === 'pending' &&
    exact(j, [...base, 'retryAfterSec']) &&
    j.retryAfterSec === 5 &&
    ['QUEUED', 'POLL_READY', 'SOURCE_SEALED'].includes(j.phase)
  )
    return j;
  if (
    j.status === 'unknown' &&
    exact(j, [...base, 'canRetry']) &&
    j.canRetry === false &&
    [
      'PROVIDER_SENDING',
      'COLLECTING',
      'CODEC_RUNNING',
      'WRITING',
      'VERIFYING',
    ].includes(j.phase)
  )
    return j;
  if (
    j.status === 'failed' &&
    exact(j, [...base, 'canRetry', 'error']) &&
    j.phase === 'SOURCE_REJECTED' &&
    j.canRetry === false &&
    exact(j.error, ['code', 'stage', 'durationSec', 'maxDurationSec']) &&
    j.error.code === 'duration_exceeded' &&
    j.error.stage === 'source' &&
    typeof j.error.durationSec === 'number' &&
    Number.isFinite(j.error.durationSec) &&
    j.error.maxDurationSec === 300 &&
    j.error.durationSec > j.error.maxDurationSec
  )
    return j;
  if (
    j.status === 'error' &&
    exact(j, [...base, 'code', 'stage', 'canRetry']) &&
    j.code === 'unavailable' &&
    j.phase === 'FAILED' &&
    (j.canRetry === false || ['fetch', 'status'].includes(j.stage)) &&
    ['fetch', 'status', 'source', 'durable_write', 'codec'].includes(j.stage) &&
    typeof j.canRetry === 'boolean'
  )
    return j;
  throw Error('opus35_state');
}
async function requestState(
  url: string,
  videoId: string,
  init: RequestInit,
  jobId?: string,
  trace?: ImportTrace | null,
) {
  assertRuntimeFetch(url, init.method);
  let response: Response;
  try {
    response = await fetch(url, { ...init, redirect: 'error' });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new AudioJobError('network_error');
  }
  traceOpusServerTiming(trace, response.headers.get('Server-Timing'));
  // HTTP status remains a known service fact even when its optional error
  // body is empty or malformed. Successful responses require valid JSON.
  const j = response.ok
    ? await audioAtStage('response', () => response.json())
    : await response.json().catch(() => null);
  if (!response.ok) {
    const code = j?.error?.code;
    const retry = j?.error?.retryAfterSec ?? j?.retryAfterSec;
    throw new AudioJobError(
      validAudioErrorCode(code) ? code : 'unavailable',
      typeof retry === 'number' && Number.isFinite(retry) && retry >= 0
        ? Math.min(86400, Math.ceil(retry))
        : undefined,
      response.status,
      undefined,
      'service',
    );
  }
  return audioAtStage('response', async () =>
    parsePublicOpus35State(j, videoId, jobId),
  );
}
export async function createOpus35Job(
  videoId: string,
  signal: AbortSignal,
  handle?: Opus35Handle,
  retry = false,
  trace?: ImportTrace | null,
) {
  if (!VIDEO.test(videoId)) throw Error('opus35_video');
  if (handle) {
    validateOpus35Handle(handle);
    if (handle.videoId !== videoId) throw Error('opus35_handle_video');
  }
  return requestState(
    `${AUDIO_BASE}/v2/audio-jobs`,
    videoId,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        youtubeUrl: 'https://www.youtube.com/watch?v=' + videoId,
        generationMode: 'client',
        audioFormat: 'orvio-opus-v1',
        ...(retry && handle ? { retry: true, jobId: handle.jobId } : {}),
      }),
    },
    handle?.jobId,
    trace,
  );
}
export async function readOpus35Job(
  handle: Opus35Handle,
  signal: AbortSignal,
  trace?: ImportTrace | null,
) {
  validateOpus35Handle(handle);
  return requestState(
    `${AUDIO_BASE}/v2/audio-jobs/${handle.jobId}`,
    handle.videoId,
    { signal },
    handle.jobId,
    trace,
  );
}
const prepare = createAcquiredOpusV2Preparer({
  readArtifact: readOpus35Artifact,
});
export async function prepareOpus35Job(
  j: any,
  signal: AbortSignal,
  options?: {
    trace?: ImportTrace | null;
    onStage?: (stage: ImportStage) => void;
  },
) {
  captureAcquiredOpusV2(j);
  return prepare(j, signal, options);
}
export async function restoreOpus35Record(
  record: OpusRecord,
  signal: AbortSignal,
) {
  await songShareSaveAtStage('artifact_verify', async () => {
    if (!(await verifyOpusRecord(record))) throw Error('opus35_record');
  });

  // Stable restore is not an acquired job: bind a supplied verified descriptor
  // rather than invent an acquisition receipt or UUID.
  const descriptorResponse = await songShareFetchAtStage(
    'descriptor_fetch',
    () =>
      readOpus35Artifact(
        { ...record, kind: 'descriptor' },
        { method: 'GET', signal },
      ),
  );
  return restoreOpus35FromDescriptor(record, descriptorResponse, signal);
}
async function restoreOpus35FromDescriptor(
  record: OpusRecord,
  response: Response,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  // Reuse acquired artifact bounds/root checks without a forged job by reading
  // the descriptor once with its own strict, bounded stable-response adapter.
  const { readStableOpus35Artifacts } = await import('./opus35-stable');
  const artifact = await readStableOpus35Artifacts(record, response, signal);
  const wasmResponse = await songShareFetchAtStage('decoder_fetch', () =>
    fetch(DecoderUrl, { signal }),
  );
  const wasm = await songShareBodyAtStage('decoder_verify', async () => {
    const bytes = await wasmResponse.arrayBuffer();
    if ((await sha256(new Uint8Array(bytes))) !== DECODER)
      throw Error('opus35_decoder_identity');
    return bytes;
  });
  const decoded = await songShareSaveAtStage('worker_decode', () =>
    prepareOpusOwned({
      workerUrl: ChartWorkerUrl,
      bytes: artifact.bytes.slice().buffer,
      wasmBytes: wasm,
      descriptorBytes: artifact.descriptorBytes.slice().buffer,
      descriptorSha256: record.audioDescriptorSha256,
      signal,
      frozenRecord: record,
    }),
  );
  await songShareSaveAtStage('worker_decode', async () => {
    if (
      JSON.stringify(decoded.record) !== JSON.stringify(record) ||
      !(await verifyOpusRecord(
        decoded.record,
        decoded.descriptor,
        record.audioDescriptorSha256,
      ))
    )
      throw Error('opus35_frozen_restore');
  });
  await songShareSaveAtStage('cache_write', () =>
    saveVerifiedOpus({ ...artifact, record }, signal),
  );
  return decoded.pcm16;
}
