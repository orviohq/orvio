import {
  createAudioJob,
  readAudioJob,
  AudioJobError,
} from './external-audio-api';
import { listPinnedSources } from './external-source-store';
import { localAudio } from './external-local';
import { prepareExternalJob } from './external-source-flow';
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
    jobId?: string;
    onJob?: (job: import('./external-audio-api').AudioJob) => void;
  } = {},
) {
  const id = youtubeId(input);
  if (!id) throw new AudioJobError('invalid_url');
  const first = (await listPinnedSources(id))[0];
  if (first) {
    const cached = await localAudio(first);
    if (cached)
      return {
        prepared: { record: first, bytes: cached.bytes, restored: true },
        jobId: cached.jobId,
        title: cached.title,
        author: cached.author,
      };
  }
  let job = options.jobId
    ? await readAudioJob(options.jobId, signal)
    : await createAudioJob('https://www.youtube.com/watch?v=' + id, signal);
  options.onJob?.(job);
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
  }
  if (job.status === 'error')
    throw new AudioJobError(job.error?.code ?? 'unavailable');
  return {
    prepared: await prepareExternalJob(id, job.jobId, signal),
    jobId: job.jobId,
    title: job.title,
    author: job.author,
  };
}
