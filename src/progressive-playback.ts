import { queryClient } from './query-client';
import type { SourceRecord } from './external-source';
import { readCanonicalSource } from './canonical-source-api';
import { readProgressiveManifest } from './progressive-manifest-api';
import { AUDIO_BASE, AudioJobError } from './external-audio-api';
import { playProgressive } from './progressive/driver';
import { validateManifest } from './progressive/segments';
import { checkManifestBinding } from './progressive/manifest-trust';
import { ProgressiveAudioClock } from './progressive/progressive-clock';
/** A shared/local record is not its own authority for early audio. Recheck the
 * canonical published record (including its whole-byte hash) before any stream. */
export async function acceptedProgressiveManifest(
  record: SourceRecord,
  signal: AbortSignal,
) {
  if (record.manifestSha256 === undefined) return null;
  const canonical = await readCanonicalSource(record.videoId, signal);
  if (
    canonical.state !== 'ready' ||
    canonical.record.audioSha256 !== record.audioSha256 ||
    canonical.record.chartSetSha256 !== record.chartSetSha256 ||
    canonical.record.manifestSha256 !== record.manifestSha256 ||
    canonical.record.frames !== record.frames ||
    canonical.record.sampleRate !== record.sampleRate
  )
    throw new AudioJobError('integrity_failed');
  const anchor = {
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    chartSetSha256: record.chartSetSha256!,
    manifestSha256: canonical.record.manifestSha256!,
  };
  const result = await readProgressiveManifest(record, anchor, signal);
  if (!result) throw new AudioJobError('integrity_failed');
  validateManifest(result.manifest, record);
  if ((await checkManifestBinding(result.manifest, anchor)) !== 'verified')
    throw new AudioJobError('integrity_failed');
  signal.throwIfAborted();
  return result;
}
export interface ProgressiveRun {
  clock: InstanceType<typeof ProgressiveAudioClock>;
  ready: Promise<void>;
  done: Promise<ArrayBuffer>;
  stop: () => void;
}
let progressiveRun = 0;
export function beginProgressivePlayback(
  record: SourceRecord,
  context: AudioContext,
  leadIn: number,
  signal: AbortSignal,
  onBuffering: (value: boolean) => void = () => {},
): ProgressiveRun {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason ?? 'stopped');
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const clock = new ProgressiveAudioClock(context);
  clock.onBuffering = onBuffering;
  let resolveReady!: () => void, rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let response: Response | undefined;
  // Query owns one complete play transport, not a reusable Response/reader.
  // A unique run identity prevents sharing single-consumer stream bodies.
  const done = queryClient.fetchQuery({
    queryKey: [
      'progressive-play',
      record.videoId,
      record.audioSha256,
      record.chartSetSha256,
      record.manifestSha256,
      ++progressiveRun,
    ],
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal: querySignal }) => {
      const queryAbort = () => controller.abort(querySignal.reason);
      querySignal.addEventListener('abort', queryAbort, { once: true });
      if (querySignal.aborted) queryAbort();
      try {
        controller.signal.throwIfAborted();
        const accepted = await acceptedProgressiveManifest(
          record,
          controller.signal,
        );
        if (!accepted) throw new AudioJobError('integrity_failed');
        await clock.begin(leadIn);
        controller.signal.throwIfAborted();
        response = await fetch(
          `${AUDIO_BASE}/v1/chart-sources/${record.videoId}/audio`,
          { signal: controller.signal },
        );
        const result = await playProgressive({
          record,
          pin: accepted.anchor,
          manifest: accepted.manifest,
          response,
          clock,
          signal: controller.signal,
          onEvent: (event: string) => {
            if (event === 'first-segment') resolveReady();
          },
        });
        controller.signal.throwIfAborted();
        return result.bytes as ArrayBuffer;
      } catch (error) {
        clock.stop();
        rejectReady(error);
        if (response && !response.bodyUsed)
          await response.body?.cancel().catch(() => {});
        throw error;
      } finally {
        querySignal.removeEventListener('abort', queryAbort);
        signal.removeEventListener('abort', abort);
      }
    },
  });
  // Consumers attach their own completion handler; no rejected background promise
  // may become an unhandled rejection while first-segment startup is awaited.
  void done.catch(() => {});
  void ready.catch(() => {});
  return {
    clock,
    ready,
    done,
    stop: () => {
      controller.abort('stopped');
      clock.stop();
    },
  };
}
