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
  'source_changed',
  'integrity_failed',
  'unsupported_format',
] as const;
export type AudioErrorCode = (typeof ERRORS)[number];
export class AudioJobError extends Error {
  constructor(
    readonly code: AudioErrorCode,
    readonly retryAfterSec?: number,
    readonly status?: number,
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
  expiresAt: number;
}
export interface AudioJob {
  jobId: string;
  title?: string;
  author?: string;
  status: 'queued' | 'running' | 'done' | 'error';
  audio?: AudioArtifact;
  error?: { code: AudioErrorCode };
  retryAfterSec?: number;
}
function seconds(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(86400, Math.ceil(value))
    : undefined;
}
async function readJob(response: Response): Promise<AudioJob> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code;
    throw new AudioJobError(
      ERRORS.includes(code) ? code : 'unavailable',
      seconds(body?.error?.retryAfterSec ?? body?.retryAfterSec),
      response.status,
    );
  }
  if (
    !body ||
    !JOB.test(body.jobId) ||
    !['queued', 'running', 'done', 'error'].includes(body.status)
  )
    throw new AudioJobError('unavailable');
  if (
    (body.title !== undefined &&
      (typeof body.title !== 'string' || body.title.length > 200)) ||
    (body.author !== undefined &&
      (typeof body.author !== 'string' || body.author.length > 100))
  )
    throw new AudioJobError('unavailable');
  if (body.status === 'done') {
    const a = body.audio;
    if (
      !a ||
      !SHA.test(a.sha256) ||
      !Number.isSafeInteger(a.sizeBytes) ||
      a.sizeBytes < 44 ||
      a.sizeBytes > 24056664 ||
      a.contentType !== 'audio/wav' ||
      a.contractVersion !== 'audio/1' ||
      !Number.isFinite(a.durationSec) ||
      a.durationSec <= 0 ||
      a.durationSec > 130 ||
      !(
        typeof a.expiresAt === 'number' &&
        Number.isFinite(a.expiresAt) &&
        a.expiresAt > 0
      )
    )
      throw new AudioJobError('unavailable');
  }
  if (body.status === 'error' && !ERRORS.includes(body.error?.code))
    throw new AudioJobError('unavailable');
  return body;
}
/** Explicit user submission only; callers never auto-rePOST a failed or expired job. */
export async function createAudioJob(
  youtubeUrl: string,
  signal?: AbortSignal,
): Promise<AudioJob> {
  if (youtubeUrl.length > 2048) throw new AudioJobError('invalid_url');
  return readJob(
    await fetch(`${AUDIO_BASE}/v1/audio-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl }),
      signal,
    }),
  );
}
export async function readAudioJob(jobId: string, signal?: AbortSignal) {
  if (!JOB.test(jobId)) throw new AudioJobError('not_found');
  return readJob(
    await fetch(`${AUDIO_BASE}/v1/audio-jobs/${jobId}`, { signal }),
  );
}
export async function loadAudio(
  job: AudioJob,
  expectedVideoId: string,
  expectedHash?: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  if (job.status !== 'done' || !job.audio || !JOB.test(job.jobId))
    throw new AudioJobError('unavailable');
  const response = await fetch(
    `${AUDIO_BASE}/v1/audio-jobs/${job.jobId}/audio`,
    { signal },
  );
  if (!response.ok) {
    const raw = await response.json().catch(() => null);
    throw new AudioJobError(
      response.status === 410 ? 'audio_expired' : 'unavailable',
      seconds(raw?.error?.retryAfterSec),
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
  if (!response.body) throw new AudioJobError('unavailable');
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > job.audio.sizeBytes || length > 24056664) {
      await reader.cancel();
      throw new AudioJobError('integrity_failed');
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const bytes = joined.buffer;
  if (bytes.byteLength !== job.audio.sizeBytes || bytes.byteLength > 24056664)
    throw new AudioJobError('integrity_failed');
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== hash) throw new AudioJobError('integrity_failed');
  return bytes;
}
