import { prepareClientJob } from './prepare-local-job';
import { savedLocalGenerated } from './local-generated-library';
import { jobImportStage, type ImportStage } from './import-progress';
import { loadCanonicalAudio } from './canonical-audio-api';
import { audioAtStage } from './audio-error-stage';
import {
  createAudioJob,
  readAudioJob,
  AudioJobError,
} from './external-audio-api';
import { refreshCanonical } from './canonical-library';
import { localAudio } from './external-local';
import {
  prepareExternalJob,
  type PreparedSource,
} from './external-source-flow';
export interface ImportResult {
  prepared: PreparedSource;
  jobId?: string;
  title?: string;
  author?: string;
}
export function youtubeId(value: string) {
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (
      u.protocol !== 'https:' ||
      !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(
        u.hostname,
      )
    )
      return null;
    const id =
      u.hostname === 'youtu.be'
        ? u.pathname.slice(1)
        : (u.searchParams.get('v') ?? u.pathname.split('/')[2]);
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export async function importYoutube(
  input: string,
  signal: AbortSignal,
  options: {
    /** Only the current explicit re-add may replace a confirmed terminal failure. */
    retryFailed?: boolean;
    jobId?: string;
    onStage?: (stage: ImportStage) => void;
    onJob?: (job: import('./external-audio-api').AudioJob) => void;
  } = {},
): Promise<ImportResult> {
  const id = youtubeId(input);
  if (!id) throw new AudioJobError('invalid_url');
  options.onStage?.('checking');
  const lookup = await refreshCanonical(id, signal);
  if (lookup.state === 'ready') {
    const first = lookup.record;
    options.onStage?.('downloading');
    const cached = await audioAtStage('storage', () => localAudio(first));
    if (cached)
      return {
        prepared: { record: first, bytes: cached.bytes, restored: true },
        jobId: cached.jobId,
        title: cached.title,
        author: cached.author,
      };
    // A published identity is never silently re-extracted because a job handle expired.
    const bytes = await loadCanonicalAudio(first, signal);
    return {
      prepared: { record: first, bytes, restored: true },
      jobId: undefined,
      title: undefined,
      author: undefined,
    };
  }
  const localGenerated =
    lookup.state === 'missing' ? await savedLocalGenerated(id) : null;
  if (localGenerated) {
    const audio = await localAudio(localGenerated);
    if (audio)
      return {
        prepared: {
          record: localGenerated,
          bytes: audio.bytes,
          restored: true,
        },
        jobId: audio.jobId,
        title: audio.title,
        author: audio.author,
      };
  }
  if (lookup.state !== 'missing')
    throw new AudioJobError('request_timeout', lookup.retryAfterSec);
  let job = options.jobId
    ? await readAudioJob(options.jobId, signal)
    : await createAudioJob(
        'https://www.youtube.com/watch?v=' + id,
        signal,
        'client',
      );
  // A timeout/network failure can still own a live job. Read it first, never
  // discard an uncertain handle or create a duplicate while it is running.
  // Only a fresh manual re-add may replace a confirmed terminal unavailable
  // job, once. Reload/resume/poll paths never opt into this branch.
  if (
    options.jobId &&
    options.retryFailed &&
    job.status === 'error' &&
    job.error?.code === 'unavailable'
  )
    job = await createAudioJob(
      'https://www.youtube.com/watch?v=' + id,
      signal,
      'client',
    );
  options.onJob?.(job);
  const stage = jobImportStage(job);
  if (stage) options.onStage?.(stage);
  const deadline = performance.now() + 90000;
  while (job.status === 'queued' || job.status === 'running') {
    if (performance.now() > deadline)
      throw new AudioJobError('request_timeout');
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(
        resolve,
        Math.max(3, Math.min(30, job.retryAfterSec ?? 3)) * 1000,
      );
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });
    job = await readAudioJob(job.jobId, signal);
    options.onJob?.(job);
    const stage = jobImportStage(job);
    if (stage) options.onStage?.(stage);
  }
  if (job.status === 'error')
    throw new AudioJobError(
      job.error?.code ?? 'unavailable',
      undefined,
      undefined,
      undefined,
      'service',
    );
  return {
    prepared:
      (await prepareClientJob(id, job.jobId, signal, options.onStage)) ??
      (await prepareExternalJob(id, job.jobId, signal, options.onStage)),
    jobId: job.jobId,
    title: job.title,
    author: job.author,
  };
}
