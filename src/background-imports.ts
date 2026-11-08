import { IMPORT_STAGES, type ImportStage } from './import-progress';
import { readAudioLimit } from './audio-limit-message';
import { importYoutube, youtubeId } from './external-import';
import {
  AudioJobError,
  validAudioFailureStage,
  validAudioErrorCode,
  type AudioErrorCode,
} from './external-audio-api';
export interface PendingImport {
  videoId: string;
  jobId?: string;
  title?: string;
  state: 'loading' | 'error';
  stage?: ImportStage;
  error?: AudioErrorCode;
  failure?: AudioJobError;
}
const KEY = 'orvio.pending-imports.v1';
export class BackgroundImports {
  readonly rows = new Map<string, PendingImport>();
  private active = new Set<string>();
  constructor(
    private changed: () => void,
    private complete: (
      result: Awaited<ReturnType<typeof importYoutube>>,
    ) => Promise<void>,
    private storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  ) {
    try {
      const data = JSON.parse(storage.getItem(KEY) ?? '[]');
      if (Array.isArray(data))
        for (const row of data.slice(0, 8)) {
          if (
            !row ||
            !/^[A-Za-z0-9_-]{11}$/.test(row.videoId) ||
            !['loading', 'error'].includes(row.state) ||
            (row.jobId !== undefined &&
              !/^[A-Za-z0-9_-]{1,128}$/.test(row.jobId))
          )
            continue;
          this.rows.set(row.videoId, {
            videoId: row.videoId,
            ...(row.jobId ? { jobId: row.jobId } : {}),
            ...(typeof row.title === 'string' && row.title.length <= 300
              ? { title: row.title }
              : {}),
            state: row.state,
            ...(IMPORT_STAGES.includes(row.stage)
              ? { stage: row.stage as ImportStage }
              : {}),
            ...(row.state === 'error'
              ? {
                  error: validAudioErrorCode(row.error)
                    ? (row.error as AudioErrorCode)
                    : 'unavailable',
                  failure: new AudioJobError(
                    validAudioErrorCode(row.error)
                      ? (row.error as AudioErrorCode)
                      : 'unavailable',
                    undefined,
                    row.failure?.status,
                    readAudioLimit(row.failure?.limit),
                    validAudioFailureStage(row.failure?.stage)
                      ? row.failure.stage
                      : undefined,
                  ),
                }
              : {}),
          });
        }
    } catch {
      /* Invalid optional pending state never touches the playable library. */
    }
  }
  private persist() {
    try {
      const text = JSON.stringify([...this.rows.values()]);
      this.storage.setItem(KEY, text);
      if (this.storage.getItem(KEY) !== text)
        throw Error('Pending import save failed');
    } catch {
      throw new AudioJobError(
        'unavailable',
        undefined,
        undefined,
        undefined,
        'storage',
      );
    }
  }
  enqueue(input: string) {
    const videoId = youtubeId(input);
    if (!videoId) throw new AudioJobError('invalid_url');
    if (this.active.has(videoId)) return videoId;
    const previous = this.rows.get(videoId);
    if (!previous && this.rows.size >= 8)
      throw new AudioJobError('unavailable');
    const row: PendingImport = {
      videoId,
      state: 'loading',
      stage: 'checking',
      ...(previous?.title ? { title: previous.title } : {}),
      ...(previous?.jobId ? { jobId: previous.jobId } : {}),
    };
    this.rows.set(videoId, row);
    try {
      this.persist();
    } catch (error) {
      if (previous) this.rows.set(videoId, previous);
      else this.rows.delete(videoId);
      throw error;
    }
    this.changed();
    void this.run(row, previous?.state === 'error');
    return videoId;
  }
  resume() {
    for (const row of this.rows.values())
      if (row.state === 'loading') {
        if (row.jobId) void this.run(row);
        else {
          row.state = 'error';
          row.error = 'request_timeout';
          try {
            this.persist();
          } catch {}
          this.changed();
        }
      }
  }
  dismiss(videoId: string) {
    if (this.active.has(videoId)) return;
    const previous = this.rows.get(videoId);
    this.rows.delete(videoId);
    try {
      this.persist();
    } catch (error) {
      if (previous) this.rows.set(videoId, previous);
      throw error;
    }
    this.changed();
  }
  private async run(row: PendingImport, retryFailed = false) {
    if (this.active.has(row.videoId)) return;
    this.active.add(row.videoId);
    try {
      // Let the immediate pending row paint before cached audio/chart work starts.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const result = await importYoutube(
        row.videoId,
        AbortSignal.timeout(90000),
        {
          jobId: row.jobId,
          retryFailed,
          onStage: (stage) => {
            row.stage = stage;
            this.changed();
          },
          onJob: (job) => {
            row.jobId = job.status === 'error' ? undefined : job.jobId;
            if (job.title) row.title = job.title;
            try {
              this.persist();
            } catch {
              /* Preserve the known job in memory; never restart with another POST. */
            }
            this.changed();
          },
        },
      );
      row.stage = 'saving';
      this.changed();
      await this.complete({ ...result, title: result.title ?? row.title });
      this.rows.delete(row.videoId);
      try {
        this.persist();
      } catch {
        /* Ready source is independently persisted before pending removal. */
      }
      this.changed();
    } catch (error) {
      row.state = 'error';
      row.error =
        error instanceof AudioJobError
          ? error.code
          : error instanceof DOMException && error.name === 'TimeoutError'
            ? 'request_timeout'
            : 'unavailable';
      if (row.error === 'audio_expired' || row.error === 'not_found')
        row.jobId = undefined;
      row.failure =
        error instanceof AudioJobError
          ? error
          : new AudioJobError(
              row.error,
              undefined,
              undefined,
              undefined,
              'browser',
            );
      try {
        this.persist();
      } catch {}
      this.changed();
    } finally {
      this.active.delete(row.videoId);
    }
  }
}
