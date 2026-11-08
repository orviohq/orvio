import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS } from './audio-limits.mjs';
import { readAudioLimit, type AudioLimit } from './audio-limit-message';
import { queryClient, queryKeys, runMutation } from './query-client';
export const AUDIO_BASE = 'https://orvio-share.pn-26f.workers.dev';
const JOB = /^[A-Za-z0-9_-]{1,128}$/;
const SHA = /^[a-f0-9]{64}$/;
const ERRORS = [
  'invalid_url',
  'too_long',
  'rate_limited',
  'region_blocked',
  'unavailable',
  'not_found',
  'audio_expired',
  'storage_full',
  'source_changed',
  'integrity_failed',
  'unsupported_format',
] as const;
export type AudioErrorCode =
  (typeof ERRORS)[number] | 'network_error' | 'request_timeout';
export function validAudioErrorCode(value: unknown): value is AudioErrorCode {
  return (
    typeof value === 'string' &&
    [...ERRORS, 'network_error', 'request_timeout'].includes(
      value as AudioErrorCode,
    )
  );
}
export const AUDIO_FAILURE_STAGES = [
  'service',
  'response',
  'analysis',
  'storage',
  'browser',
] as const;
export type AudioFailureStage = (typeof AUDIO_FAILURE_STAGES)[number];
export function validAudioFailureStage(
  stage: unknown,
): stage is AudioFailureStage {
  return (
    typeof stage === 'string' &&
    (AUDIO_FAILURE_STAGES as readonly string[]).includes(stage)
  );
}
export class AudioJobError extends Error {
  constructor(
    readonly code: AudioErrorCode,
    readonly retryAfterSec?: number,
    readonly status?: number,
    readonly limit?: AudioLimit,
    readonly stage?: AudioFailureStage,
  ) {
    super(code);
  }
}
export interface AudioArtifact {
  sha256: string;
  sizeBytes: number;
  contentType: string;
  durationSec: number;
  contractVersion: 'audio/1';
  expiresAt: number | null;
}
export interface CanonicalJobStatus {
  status:
    | 'queued'
    | 'generating'
    | 'published'
    | 'audio_changed'
    | 'audio_expired'
    | 'deferred';
  retryAfterSec?: number;
  attempts?: number;
  audioSha256?: string;
  chartSetSha256?: string;
}
export interface AudioJob {
  jobId: string;
  title?: string;
  author?: string;
  status: 'queued' | 'running' | 'done' | 'error';
  audio?: AudioArtifact;
  canonical?: CanonicalJobStatus;
  error?: { code: AudioErrorCode };
  retryAfterSec?: number;
}
function seconds(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(86400, Math.ceil(value))
    : undefined;
}
async function fetchAudio(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (
      init?.signal?.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    )
      throw error;
    throw new AudioJobError('network_error');
  }
}
async function readJob(response: Response): Promise<AudioJob> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof body?.error === 'string' ? body.error : body?.error?.code;
    throw new AudioJobError(
      ERRORS.includes(code) ? code : 'unavailable',
      seconds(body?.error?.retryAfterSec ?? body?.retryAfterSec),
      response.status,
      code === 'rate_limited' ? readAudioLimit(body?.error) : undefined,
      'service',
    );
  }
  if (
    !body ||
    !JOB.test(body.jobId) ||
    !['queued', 'running', 'done', 'error'].includes(body.status)
  )
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  if (
    (body.title !== undefined &&
      (typeof body.title !== 'string' || body.title.length > 200)) ||
    (body.author !== undefined &&
      (typeof body.author !== 'string' || body.author.length > 100))
  )
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  if (body.status === 'done') {
    const a = body.audio;
    if (
      !a ||
      !SHA.test(a.sha256) ||
      !Number.isSafeInteger(a.sizeBytes) ||
      a.sizeBytes < 44 ||
      a.sizeBytes > AUDIO_MAX_BYTES ||
      a.contentType !== 'audio/wav' ||
      a.contractVersion !== 'audio/1' ||
      !Number.isFinite(a.durationSec) ||
      a.durationSec <= 0 ||
      a.durationSec > AUDIO_MAX_SECONDS ||
      !(
        a.expiresAt === null ||
        (typeof a.expiresAt === 'number' &&
          Number.isFinite(a.expiresAt) &&
          a.expiresAt > 0)
      )
    )
      throw new AudioJobError(
        'unavailable',
        undefined,
        undefined,
        undefined,
        'response',
      );
  }
  if (body.status === 'error' && !ERRORS.includes(body.error?.code))
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  if (
    body.canonical !== undefined &&
    (!body.canonical ||
      ![
        'queued',
        'generating',
        'published',
        'audio_changed',
        'audio_expired',
        'deferred',
      ].includes(body.canonical.status) ||
      (body.canonical.audioSha256 !== undefined &&
        !SHA.test(body.canonical.audioSha256)) ||
      (body.canonical.chartSetSha256 !== undefined &&
        !SHA.test(body.canonical.chartSetSha256)) ||
      (body.canonical.retryAfterSec !== undefined &&
        seconds(body.canonical.retryAfterSec) === undefined))
  )
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  return body;
}
/** Explicit user submission only; callers never auto-rePOST a failed or expired job. */
export async function createAudioJob(
  youtubeUrl: string,
  signal?: AbortSignal,
): Promise<AudioJob> {
  if (youtubeUrl.length > 2048) throw new AudioJobError('invalid_url');
  return runMutation(['create-audio-job'], async () =>
    readJob(
      await fetchAudio(`${AUDIO_BASE}/v1/audio-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
        signal,
      }),
    ),
  );
}
export async function readAudioJob(jobId: string, signal?: AbortSignal) {
  if (!JOB.test(jobId)) throw new AudioJobError('not_found');
  // Always live (staleTime 0): job status drives polling loops that own
  // their retryAfterSec handling, so the query layer never retries here —
  // it only dedups concurrent same-tick reads.
  return queryClient.fetchQuery({
    queryKey: queryKeys.audioJob(jobId),
    retry: false,
    queryFn: async ({ signal: querySignal }) =>
      readJob(
        await fetchAudioSignal(
          `${AUDIO_BASE}/v1/audio-jobs/${jobId}`,
          signal ? AbortSignal.any([querySignal, signal]) : querySignal,
          signal,
        ),
      ),
    staleTime: 0,
    gcTime: 0,
  });
}
async function fetchAudioSignal(
  input: string,
  signal: AbortSignal,
  callerSignal?: AbortSignal,
): Promise<Response> {
  try {
    return await fetch(input, { signal });
  } catch (error) {
    if (
      callerSignal?.aborted ||
      signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    )
      throw error;
    throw new AudioJobError('network_error');
  }
}
function waitForAudio(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const done = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}
export async function loadAudio(
  job: AudioJob,
  expectedVideoId: string,
  expectedHash?: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  if (
    job.status !== 'done' ||
    !job.audio ||
    !JOB.test(job.jobId) ||
    !Number.isSafeInteger(job.audio.sizeBytes) ||
    job.audio.sizeBytes < 44 ||
    job.audio.sizeBytes > AUDIO_MAX_BYTES ||
    job.audio.durationSec <= 0 ||
    !Number.isFinite(job.audio.durationSec) ||
    job.audio.durationSec > AUDIO_MAX_SECONDS
  )
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  // Query-coordinated transport: concurrent reads of the same finished
  // job's bytes dedup onto one download. staleTime 0 keeps every call live
  // and gcTime 0 drops the bytes the moment no caller holds them - the PCM
  // is never retained by the query cache and never persisted.
  const doneJob = job as AudioJob & { audio: NonNullable<AudioJob['audio']> };
  return queryClient.fetchQuery({
    queryKey: queryKeys.audioJobBytes(job.jobId, job.audio.sha256),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: ({ signal: querySignal }) =>
      downloadJobAudio(
        doneJob,
        expectedVideoId,
        signal ? AbortSignal.any([querySignal, signal]) : querySignal,
        expectedHash,
      ),
  });
}
async function downloadJobAudio(
  job: AudioJob & { audio: NonNullable<AudioJob['audio']> },
  expectedVideoId: string,
  signal: AbortSignal,
  expectedHash?: string,
): Promise<ArrayBuffer> {
  const deadline = Date.now() + 90000;
  let response: Response;
  for (;;) {
    response = await fetchAudio(
      `${AUDIO_BASE}/v1/audio-jobs/${job.jobId}/audio`,
      { signal },
    );
    if (response.ok) break;
    const raw = await response.json().catch(() => null);
    const retry = seconds(raw?.error?.retryAfterSec);
    // Only the existing artifact GET can retry. Never create a replacement job.
    if (
      response.status === 409 &&
      raw?.error?.code === 'unavailable' &&
      retry !== undefined &&
      retry > 0 &&
      retry <= 30
    ) {
      const delay = retry * 1000;
      if (Date.now() + delay > deadline)
        throw new AudioJobError('request_timeout');
      await waitForAudio(delay, signal);
      continue;
    }
    throw new AudioJobError(
      response.status === 410
        ? 'audio_expired'
        : response.status === 404
          ? 'not_found'
          : ERRORS.includes(raw?.error?.code)
            ? raw.error.code
            : 'unavailable',
      retry,
      response.status,
      raw?.error?.code === 'rate_limited'
        ? readAudioLimit(raw?.error)
        : undefined,
      'service',
    );
  }
  const hash = response.headers.get('X-Content-SHA256');
  if (
    hash !== job.audio.sha256 ||
    response.headers.get('X-Source-Video-Id') !== expectedVideoId ||
    response.headers.get('X-Audio-Contract') !== 'audio/1' ||
    !response.headers.get('Content-Type')?.startsWith('audio/wav')
  )
    throw new AudioJobError('integrity_failed');
  if (expectedHash && hash !== expectedHash)
    throw new AudioJobError('source_changed');
  if (!response.body)
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  const reader = response.body.getReader(),
    joined = new Uint8Array(job.audio.sizeBytes);
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (length + value.byteLength > joined.byteLength) {
      await reader.cancel();
      throw new AudioJobError('integrity_failed');
    }
    joined.set(value, length);
    length += value.byteLength;
  }
  const bytes = joined.buffer;
  if (length !== job.audio.sizeBytes || bytes.byteLength > AUDIO_MAX_BYTES)
    throw new AudioJobError('integrity_failed');
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== hash) throw new AudioJobError('integrity_failed');
  return bytes;
}
