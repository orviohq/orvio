import { waitImportPaint } from './import-paint';
import { recordFailure } from './status-failures';
import { createImportBudget } from './import-budget';
import { earlyYoutubeMetadata } from './early-youtube-metadata';
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
  transportVersion?: 2;
  audioFormat?: 'orvio-opus-v1';
  title?: string;
  thumbnailUrl?: string;
  state: 'loading' | 'error';
  waitingForTurn?: true;
  retryWhenAdmitted?: true;
  stage?: ImportStage;
  error?: AudioErrorCode;
  failure?: AudioJobError;
}
export type YoutubeImportRunner<
  TResult extends { title?: string } = Awaited<ReturnType<typeof importYoutube>>,
> = (
  input: string,
  signal: AbortSignal,
  options: NonNullable<Parameters<typeof importYoutube>[2]> & {
    onVerified?: () => void;
    onMetadata?: (metadata: { title: string; author?: string }) => void;
  },
) => Promise<TResult>;
const KEY = 'orvio.pending-imports.v1';
export class BackgroundImports<
  TResult extends { title?: string } = Awaited<ReturnType<typeof importYoutube>>,
> {
  readonly rows = new Map<string, PendingImport>();
  private active = new Set<string>();
  private queue: { row: PendingImport; retryFailed: boolean }[] = [];
  isWaiting(videoId: string) {
    return this.queue.some((item) => item.row.videoId === videoId);
  }
  constructor(
    private changed: () => void,
    private complete: (result: TResult) => Promise<void>,
    private storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
    private directImport?: YoutubeImportRunner<TResult>,
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
            ...(row.transportVersion === 2 &&
            row.audioFormat === 'orvio-opus-v1' &&
            row.jobId
              ? {
                  transportVersion: 2 as const,
                  audioFormat: 'orvio-opus-v1' as const,
                }
              : {}),
            ...(typeof row.title === 'string' && row.title.length <= 300
              ? { title: row.title }
              : {}),
            state: row.state,
            ...(row.waitingForTurn === true && row.state === 'loading'
              ? { waitingForTurn: true as const }
              : {}),
            ...(row.waitingForTurn === true &&
            row.state === 'loading' &&
            row.jobId &&
            row.retryWhenAdmitted === true
              ? { retryWhenAdmitted: true as const }
              : {}),
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
    if (this.active.has(videoId) || this.isWaiting(videoId)) return videoId;
    const previous = this.rows.get(videoId);
    if (!previous && this.rows.size >= 8)
      throw new AudioJobError('unavailable');
    const row: PendingImport = {
      videoId,
      state: 'loading',
      stage: 'checking',
      waitingForTurn: true,
      ...(previous?.state === 'error' && previous.jobId
        ? { retryWhenAdmitted: true as const }
        : {}),
      ...(previous?.title ? { title: previous.title } : {}),
      ...(previous?.jobId ? { jobId: previous.jobId } : {}),
      ...(previous?.transportVersion === 2
        ? { transportVersion: 2, audioFormat: 'orvio-opus-v1' as const }
        : {}),
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
    // Start optional display metadata immediately, without delaying admission.
    if (!this.directImport)
      void earlyYoutubeMetadata(videoId).then((metadata) => {
        if (
          !metadata ||
          this.rows.get(videoId) !== row ||
          row.state !== 'loading'
        )
          return;
        // Job metadata, when already received, wins over this early display hint.
        if (!row.title) row.title = metadata.title;
        row.thumbnailUrl = metadata.thumbnailUrl;
        this.changed();
      });
    void this.run(row, previous?.state === 'error');
    return videoId;
  }
  retry(videoId: string) {
    if (
      this.rows.get(videoId)?.state !== 'error' ||
      this.active.has(videoId) ||
      this.isWaiting(videoId)
    )
      return;
    return this.enqueue(videoId);
  }
  resume() {
    for (const row of this.rows.values())
      if (row.state === 'loading') {
        if (this.directImport || row.jobId || row.waitingForTurn)
          void this.run(row);
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
    this.queue = this.queue.filter((item) => item.row.videoId !== videoId);
    this.changed();
  }
  private run(
    row: PendingImport,
    retryFailed = row.retryWhenAdmitted === true,
  ) {
    if (this.active.has(row.videoId) || this.isWaiting(row.videoId)) return;
    this.queue.push({ row, retryFailed });
    this.drain();
  }
  private drain() {
    for (;;) {
      const next = this.queue.shift();
      if (!next) return;
      if (this.rows.get(next.row.videoId) !== next.row) continue;
      this.active.add(next.row.videoId);
      void this.perform(next.row, next.retryFailed);
    }
  }
  private async perform(row: PendingImport, retryFailed: boolean) {
    const budget = createImportBudget(this.directImport ? 195000 : 90000);
    try {
      // Clear the durable never-started marker BEFORE any external effect.
      // If this write fails, do not start or resume a request.
      delete row.waitingForTurn;
      delete row.retryWhenAdmitted;
      row.stage = 'checking';
      this.persist();
      this.changed();
      // Let the immediate pending row paint before cached audio/chart work starts.
      await waitImportPaint(budget.signal);
      const options: Parameters<YoutubeImportRunner<TResult>>[2] = {
        jobId: row.jobId,
        transportVersion: row.transportVersion,
        audioFormat: row.audioFormat,
        retryFailed,
        ...(this.directImport ? { onVerified: () => budget.verified() } : {}),
        onMetadata: (metadata) => {
          if (budget.signal.aborted || this.rows.get(row.videoId) !== row || row.state !== 'loading') return;
          if (typeof metadata.title !== 'string' || !metadata.title.trim() || metadata.title.length > 300 || /[\u0000-\u001f\u007f]/.test(metadata.title)) return;
          row.title = metadata.title.trim();
          try { this.persist(); } catch { /* Keep optional display hint in memory. */ }
          this.changed();
        },
        onStage: (stage) => {
          budget.stage(stage);
          row.stage = stage;
          this.changed();
        },
        onJob: (job) => {
          if ('transportVersion' in job && job.transportVersion === 2) {
            row.jobId = job.jobId;
            row.transportVersion = 2;
            row.audioFormat = 'orvio-opus-v1';
          } else row.jobId = job.status === 'error' ? undefined : job.jobId;
          if (job.title) row.title = job.title;
          try {
            this.persist();
          } catch (error) {
            // Keep the known handle in memory, but never advance v2 work
            // without a durable handle for reload/unknown-effect recovery.
            if ('transportVersion' in job && job.transportVersion === 2)
              throw error;
          }
          // Persist the exact handle BEFORE extending beyond acquisition.
          if (
            'transportVersion' in job &&
            job.transportVersion === 2 &&
            job.status === 'done'
          )
            budget.verified();
          this.changed();
        },
      };
      const result = this.directImport
        ? await this.directImport(row.videoId, budget.signal, options)
        : ((await importYoutube(
            row.videoId,
            budget.signal,
            options,
          )) as unknown as TResult);
      budget.signal.throwIfAborted();
      budget.dispose();
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
    } catch (caught) {
      const error = budget.signal.aborted ? budget.signal.reason : caught;
      row.state = 'error';
      row.error =
        error instanceof AudioJobError
          ? error.code
          : error instanceof DOMException && error.name === 'TimeoutError'
            ? 'request_timeout'
            : 'unavailable';
      recordFailure('youtube-add', row.error);
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
      budget.dispose();
      this.active.delete(row.videoId);
      this.drain();
    }
  }
}
