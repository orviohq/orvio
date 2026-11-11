/** Enumerated, local-only diagnostic for an explicit shared-song Add.
 * Records only the observed boundary and a coarse cause. Never carries a raw
 * stack, URL, video id, provider response or storage key. */
export const SONG_SHARE_SAVE_STAGES = [
  'descriptor_fetch',
  'audio_fetch',
  'artifact_verify',
  'decoder_fetch',
  'decoder_verify',
  'worker_decode',
  'cache_write',
  'local_save',
  'visibility_write',
  'order_write',
] as const;
export type SongShareSaveStage = (typeof SONG_SHARE_SAVE_STAGES)[number];
export const SONG_SHARE_SAVE_CAUSES = [
  'connection',
  'http',
  'integrity',
  'quota',
  'storage',
  'aborted',
  'unknown',
] as const;
export type SongShareSaveCause = (typeof SONG_SHARE_SAVE_CAUSES)[number];
export function validSongShareSaveStage(
  value: unknown,
): value is SongShareSaveStage {
  return (
    typeof value === 'string' &&
    (SONG_SHARE_SAVE_STAGES as readonly string[]).includes(value)
  );
}
export function validSongShareSaveCause(
  value: unknown,
): value is SongShareSaveCause {
  return (
    typeof value === 'string' &&
    (SONG_SHARE_SAVE_CAUSES as readonly string[]).includes(value)
  );
}
export class SongShareSaveError extends Error {
  constructor(
    readonly stage: SongShareSaveStage,
    readonly cause: SongShareSaveCause,
  ) {
    super('song_share_save_failed');
    this.name = 'SongShareSaveError';
  }
}
const CONNECTION_ERRORS = new Set([
  'network_error',
  'request_timeout',
]);
const HTTP_ERRORS = new Set(['opus35_decoder_unavailable']);
const INTEGRITY_ERRORS = new Set([
  'integrity_failed',
  'source_changed',
  'opus35_record',
  'opus35_metadata_changed',
  'opus35_frozen_record_changed',
  'opus35_stable_headers',
  'opus35_stable_binding',
  'opus35_stable_overflow',
  'opus35_stable_truncated',
  'opus35_decoder_identity',
  'opus35_frozen_restore',
  'opus35_pcm_identity',
  'opus35_cached_chart_changed',
  'opus35_frozen_decode',
  'share468_source_record',
  'share468_source_unavailable',
]);
const STORAGE_ERRORS = new Set([
  'storage_full',
  'List change could not be saved',
]);
type CauseBoundary = 'fetch' | 'body';
export function songShareSaveCause(
  error: unknown,
  boundary?: CauseBoundary,
): SongShareSaveCause {
  if (error instanceof SongShareSaveError) return error.cause;
  if (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  )
    return 'aborted';
  if (
    boundary &&
    error instanceof TypeError &&
    !(error instanceof DOMException)
  )
    return 'connection';
  const value = error as
    | {
        name?: unknown;
        code?: unknown;
        status?: unknown;
        message?: unknown;
      }
    | null
    | undefined;
  const name = typeof value?.name === 'string' ? value.name : '';
  const code = value?.code;
  if (name === 'QuotaExceededError' || code === 22 || code === 1014)
    return 'quota';
  if (typeof code === 'string') {
    if (CONNECTION_ERRORS.has(code)) return 'connection';
    if (HTTP_ERRORS.has(code)) return 'http';
    if (INTEGRITY_ERRORS.has(code)) return 'integrity';
    if (STORAGE_ERRORS.has(code)) return 'storage';
  }
  const message =
    typeof value?.message === 'string' ? value.message : '';
  if (CONNECTION_ERRORS.has(message)) return 'connection';
  if (HTTP_ERRORS.has(message)) return 'http';
  if (INTEGRITY_ERRORS.has(message)) return 'integrity';
  if (STORAGE_ERRORS.has(message)) return 'storage';
  if (typeof value?.status === 'number') return 'http';
  return 'unknown';
}
export async function songShareSaveAtStage<T>(
  stage: SongShareSaveStage,
  work: () => Promise<T> | T,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof SongShareSaveError) throw error;
    throw new SongShareSaveError(stage, songShareSaveCause(error));
  }
}
export async function songShareFetchAtStage(
  stage: 'descriptor_fetch' | 'audio_fetch' | 'decoder_fetch',
  work: () => Promise<Response>,
): Promise<Response> {
  let response: Response;
  try {
    response = await work();
  } catch (error) {
    if (error instanceof SongShareSaveError) throw error;
    throw new SongShareSaveError(
      stage,
      songShareSaveCause(error, 'fetch'),
    );
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new SongShareSaveError(stage, 'http');
  }
  return response;
}
export async function songShareBodyAtStage<T>(
  stage: SongShareSaveStage,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof SongShareSaveError) throw error;
    throw new SongShareSaveError(
      stage,
      songShareSaveCause(error, 'body'),
    );
  }
}
