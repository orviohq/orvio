import { listOpus35Metadata } from './opus/opus35-store';
import { restoreOpus35Record } from './opus/opus35-api';
import { OPUS35_CREATE_ENABLED } from './opus/opus35-api';
import { importOpus35, type Opus35JobNotice } from './opus/opus35-import';
import { prepareClientJob } from './prepare-local-job';
import { savedLocalGenerated } from './local-generated-library';
import { jobImportStage, type ImportStage } from './import-progress';
import { loadCanonicalAudio, loadRetainedAudio } from './canonical-audio-api';
import { audioAtStage } from './audio-error-stage';
import {
  createAudioJob,
  readAudioJob,
  AudioJobError,
  validAudioErrorCode,
} from './external-audio-api';
import { refreshCanonical } from './canonical-library';
import { localAudio, saveLocalAudio, localMetadata } from './external-local';
import {
  prepareExternalJob,
  type PreparedSource,
} from './external-source-flow';
import {
  beginTrace,
  endTrace,
  traceErrorName,
  traceSpan,
  type ImportTrace,
} from './import-trace';
/** Trace outcome names are readout data: only fixed allowlisted error codes
 * and platform error names may appear, never server- or caller-controlled
 * strings (custom DOMException names, arbitrary abort reasons). */
export function traceOutcome(error: unknown): string {
  // Reading .code can itself throw (throwing getter, proxy). Inspection
  // failures fall back to the fixed name path; the thrown object is never
  // replaced by instrumentation.
  try {
    const code = (error as { code?: unknown } | null | undefined)?.code;
    if (validAudioErrorCode(code)) return 'error:' + code;
  } catch {
    // fall through to the name path
  }
  return 'error:' + traceErrorName(error);
}
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
    transportVersion?: 2;
    audioFormat?: 'orvio-opus-v1';
    onStage?: (stage: ImportStage) => void;
    onJob?: (
      job: import('./external-audio-api').AudioJob | Opus35JobNotice,
    ) => void;
  } = {},
): Promise<ImportResult> {
  const trace = beginTrace();
  try {
    const result = await importYoutubeTraced(input, signal, options, trace);
    endTrace(trace, 'ok');
    return result;
  } catch (error) {
    endTrace(trace, traceOutcome(error));
    throw error;
  }
}
async function importYoutubeTraced(
  input: string,
  signal: AbortSignal,
  options: {
    retryFailed?: boolean;
    jobId?: string;
    transportVersion?: 2;
    audioFormat?: 'orvio-opus-v1';
    onStage?: (stage: ImportStage) => void;
    onJob?: (
      job: import('./external-audio-api').AudioJob | Opus35JobNotice,
    ) => void;
  },
  trace: ImportTrace | null,
): Promise<ImportResult> {
  const id = youtubeId(input);
  if (!id) throw new AudioJobError('invalid_url');
  if (options.transportVersion === 2) {
    if (options.audioFormat !== 'orvio-opus-v1' || !options.jobId)
      throw Error('opus35_pending_identity');
    return importOpus35(id, signal, { ...options, trace });
  }
  if (typeof indexedDB !== 'undefined') {
    const saved = (await listOpus35Metadata())
      .filter((r) => r.record.videoId === id)
      .at(-1);
    if (saved) {
      const audio = await localAudio(saved.record, signal);
      const bytes =
        audio?.bytes ?? (await restoreOpus35Record(saved.record, signal));
      signal.throwIfAborted();
      return {
        prepared: { record: saved.record, bytes, restored: true },
        jobId: saved.jobId,
        title: saved.title,
        author: saved.author,
      };
    }
  }
  options.onStage?.('checking');
  const lookup = await traceSpan(trace, 'canonical-lookup', () =>
    refreshCanonical(id, signal),
  );
  if (lookup.state === 'ready') {
    const first = lookup.record;
    options.onStage?.('downloading');
    const cached = await traceSpan(trace, 'local-audio-lookup', () =>
      audioAtStage('storage', () => localAudio(first)),
    );
    if (cached)
      return {
        prepared: { record: first, bytes: cached.bytes, restored: true },
        jobId: cached.jobId,
        title: cached.title,
        author: cached.author,
      };
    // A published identity is never silently re-extracted because a job handle expired.
    const bytes = await traceSpan(trace, 'canonical-audio-download', () =>
      loadCanonicalAudio(first, signal),
    );
    return {
      prepared: { record: first, bytes, restored: true },
      jobId: undefined,
      title: undefined,
      author: undefined,
    };
  }
  const localGenerated =
    lookup.state === 'missing'
      ? await traceSpan(trace, 'local-generated-lookup', () =>
          savedLocalGenerated(id),
        )
      : null;
  if (localGenerated) {
    const audio = await traceSpan(trace, 'local-audio-lookup', () =>
      localAudio(localGenerated),
    );
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
    options.onStage?.('downloading');
    const metadata = await traceSpan(trace, 'local-metadata-lookup', () =>
      localMetadata(localGenerated),
    );
    const bytes = await traceSpan(trace, 'retained-audio-download', () =>
      loadRetainedAudio(localGenerated, signal),
    );
    const title = metadata?.title ?? 'YouTube · ' + id;
    await traceSpan(trace, 'idb-save', () =>
      saveLocalAudio(
        localGenerated,
        title,
        metadata?.jobId,
        bytes,
        metadata?.author,
      ),
    );
    return {
      prepared: { record: localGenerated, bytes, restored: true },
      jobId: metadata?.jobId,
      title,
      author: metadata?.author,
    };
  }
  if (lookup.state !== 'missing')
    throw new AudioJobError('request_timeout', lookup.retryAfterSec);
  if (OPUS35_CREATE_ENABLED && !options.jobId)
    return importOpus35(id, signal, { ...options, trace });
  let job = options.jobId
    ? await traceSpan(trace, 'job-read', () =>
        readAudioJob(options.jobId!, signal),
      )
    : await traceSpan(trace, 'job-create', () =>
        createAudioJob(
          'https://www.youtube.com/watch?v=' + id,
          signal,
          'client',
        ),
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
    job = await traceSpan(trace, 'job-create', () =>
      createAudioJob('https://www.youtube.com/watch?v=' + id, signal, 'client'),
    );
  options.onJob?.(job);
  const stage = jobImportStage(job);
  if (stage) options.onStage?.(stage);
  const deadline = performance.now() + 90000;
  let poll = 0;
  while (job.status === 'queued' || job.status === 'running') {
    if (performance.now() > deadline)
      throw new AudioJobError('request_timeout');
    const waitSec = Math.max(3, Math.min(30, job.retryAfterSec ?? 3));
    await traceSpan(
      trace,
      'job-poll-wait',
      () =>
        new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, waitSec * 1000);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        }),
      { poll: ++poll, waitSec },
    );
    job = await traceSpan(
      trace,
      'job-poll-get',
      () => readAudioJob(job.jobId, signal),
      { poll },
    );
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
      (await traceSpan(trace, 'prepare-client', () =>
        prepareClientJob(id, job.jobId, signal, options.onStage, trace),
      )) ??
      (await traceSpan(trace, 'prepare-external', () =>
        prepareExternalJob(id, job.jobId, signal, options.onStage, trace),
      )),
    jobId: job.jobId,
    title: job.title,
    author: job.author,
  };
}
