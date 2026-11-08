import { AudioJobError, type AudioFailureStage } from './external-audio-api';
/** Attach only the boundary we observed. Never infer the service/provider's cause. */
export async function audioAtStage<T>(
  stage: AudioFailureStage,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AudioJobError) {
      if (error.stage || error.code !== 'unavailable') throw error;
      throw new AudioJobError(
        error.code,
        error.retryAfterSec,
        error.status,
        error.limit,
        stage,
      );
    }
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    )
      throw error;
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      stage,
    );
  }
}
