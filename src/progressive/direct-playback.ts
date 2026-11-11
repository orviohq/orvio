import { readVerifiedPart, DirectIntegrityError, DirectServiceError } from './direct-range';
export { DirectIntegrityError, DirectServiceError };
import { validateManifest } from './segments';
import { checkManifestBinding, ManifestTrustError } from './manifest-trust';
import { ProgressiveAudioClock } from './progressive-clock';
import { inspectWav } from '../canonical-pcm.mjs';
import type { ProgressiveRun } from '../progressive-playback';

export type DirectProof = {
  manifest: any;
  pin: any;
  verified: { record: { record: any } };
};
export type DirectPlaybackOptions = {
  providerOrigin: string;
  publicKey: string;
  onBuffering?: (value: boolean) => void;
  fetcher?: typeof fetch;
};

async function sha256(bytes: ArrayBuffer) {
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join('');
}

export function beginDirectProgressivePlayback(
  proof: DirectProof,
  context: AudioContext,
  leadIn: number,
  signal: AbortSignal,
  options: DirectPlaybackOptions,
): ProgressiveRun {
  // 1. Synchronous trust/validation. No audio buffers, no network before pass.
  const { manifest, record, pin } = structuredClone({
    manifest: proof.manifest,
    record: proof.verified.record.record,
    pin: proof.pin,
  });
  try { validateManifest(manifest, record); } catch (error) { throw new DirectIntegrityError(error instanceof Error ? error.message : String(error)); }
  // checkManifestBinding is async in general; terminal binding must be 'verified'.
  // No network/allocation here; pin identity is checked synchronously below.
  if (pin?.videoId !== record.videoId || pin?.audioSha256 !== record.audioSha256 || pin?.chartSetSha256 !== record.chartSetSha256)
    throw new DirectIntegrityError('Trusted new-share manifest required');

  const controller = new AbortController();
  let stopped = false;
  let scheduledAny = false;
  let readySettled = false;
  let doneSettled = false;
  let guardFailure: unknown = null;
  let currentRead: AbortController | null = null;
  let guardTimer: ReturnType<typeof setInterval> | undefined;
  let audioEndTimer: ReturnType<typeof setTimeout> | undefined;
  let ownerAbortListenerRemoved = false;
  const removeOwnerAbortListener = () => {
    if (ownerAbortListenerRemoved) return;
    ownerAbortListenerRemoved = true;
    if (audioEndTimer) { clearTimeout(audioEndTimer); audioEndTimer = undefined; }
    signal.removeEventListener('abort', onAbort);
  };
  const onAbort = () => {
    try { currentRead?.abort(signal.reason ?? 'stopped'); } catch {}
    if (!controller.signal.aborted) controller.abort(signal.reason ?? 'stopped');
    try { clock.stop(); } catch {}
  };
  signal.addEventListener('abort', onAbort);

  const clock = new ProgressiveAudioClock(context);
  if (options.onBuffering) clock.onBuffering = options.onBuffering;
  const scheduleAudioEndCheck = () => {
    if (audioEndTimer) { clearTimeout(audioEndTimer); audioEndTimer = undefined; }
    if (ownerAbortListenerRemoved || stopped || !doneSettled) return;
    const c = clock as any;
    const actualEnd = c.anchor + c.scheduledThroughFrame / manifest.sampleRate;
    if (context.currentTime >= actualEnd - 0.01) {
      removeOwnerAbortListener();
      return;
    }
    const delay = Math.max(0, (actualEnd - context.currentTime) * 1000) + 50;
    audioEndTimer = setTimeout(scheduleAudioEndCheck, delay);
  };
  if (signal.aborted) onAbort();

  let resolveReady!: () => void, rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  let resolveDone!: (bytes: ArrayBuffer) => void, rejectDone!: (error: unknown) => void;
  const done = new Promise<ArrayBuffer>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });

  const settleReadyResolve = () => { if (!readySettled) { readySettled = true; resolveReady(); } };
  const settleReadyReject = (e: unknown) => { if (!readySettled) { readySettled = true; rejectReady(e); } };
  const fail = (error: unknown) => {
    if (doneSettled) {
      removeOwnerAbortListener();
      return;
    }
    doneSettled = true;
    removeOwnerAbortListener();
    try { clock.stop(); } catch {}
    if (!controller.signal.aborted) controller.abort(error);
    settleReadyReject(error);
    rejectDone(error);
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    removeOwnerAbortListener();
    if (!controller.signal.aborted) controller.abort('stopped');
    try { currentRead?.abort('stopped'); } catch {}
    try { clock.stop(); } catch {}
  };

  const run = async () => {
    // Complete async binding proof before any buffer allocation or network.
    let binding;
    try {
      binding = await checkManifestBinding(manifest, pin);
    } catch (error) {
      if (error instanceof ManifestTrustError) throw new DirectIntegrityError(error.message);
      throw error;
    }
    if (binding !== 'verified') throw new DirectIntegrityError('Trusted new-share manifest required');
    controller.signal.throwIfAborted();
    await clock.begin(leadIn);
    controller.signal.throwIfAborted();

    const chunks: ArrayBuffer[] = [];
    let total = 0;
    let prevEtag: string | undefined;
    guardTimer = setInterval(() => {
      void clock.guard(manifest).then(f => {
        if (stopped || doneSettled) return;
        // underflow counted internally by clock; on true no extra action needed
        void f;
      }).catch(e => {
        if (guardFailure || stopped || doneSettled) return;
        guardFailure = e;
        try { currentRead?.abort(e); } catch {}
        try { clock.stop(); } catch {}
        fail(e);
      });
    }, 50);

    for (let index = 0; index < manifest.parts.length; index++) {
      controller.signal.throwIfAborted();
      if (guardFailure) throw guardFailure;
      await clock.waitForGuard?.();
      controller.signal.throwIfAborted();
      if (guardFailure) throw guardFailure;

      const readController = new AbortController();
      currentRead = readController;
      const onRunAbort = () => readController.abort(controller.signal.reason);
      controller.signal.addEventListener('abort', onRunAbort, { once: true });
      if (controller.signal.aborted) onRunAbort();
      let result;
      try {
        try {
          result = await readVerifiedPart({
            manifest, record, pin, index,
            ...(index > 0 ? { etag: prevEtag } : {}),
            providerOrigin: options.providerOrigin,
            publicKey: options.publicKey,
            signal: readController.signal,
            fetcher: options.fetcher,
          });
        } catch (e) {
          const isAbortLike = e === 'stopped' || (e instanceof Error && e.name === 'AbortError') || e === signal.reason || e === controller.signal.reason || e === readController.signal.reason;
          if (isAbortLike) throw e;
          if (e instanceof DirectIntegrityError) throw e;
          if (e instanceof Error && e.message === 'Segment integrity') throw new DirectIntegrityError('Segment integrity');
          throw e;
        }
      } finally {
        controller.signal.removeEventListener('abort', onRunAbort);
        if (currentRead === readController) currentRead = null;
      }
      controller.signal.throwIfAborted();
      if (guardFailure) throw guardFailure;

      chunks.push(result.bytes);
      total += result.bytes.byteLength;
      prevEtag = result.etag;

      await clock.waitForGuard?.();
      controller.signal.throwIfAborted();
      if (guardFailure) throw guardFailure;
      clock.scheduleSegment(result.part, result.channels, manifest);
      scheduledAny = true;
      if (index === 0) settleReadyResolve();
      if (clock.frozen) await clock.resumeFromFreeze();
    }

    if (guardFailure) throw guardFailure;
    controller.signal.throwIfAborted();

    // Terminal gate: assembled whole bytes identity, then done resolves with whole.
    const whole = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { whole.set(new Uint8Array(chunk), offset); offset += chunk.byteLength; }
    const wholeBuffer = whole.buffer;
    const wholeHash = await sha256(wholeBuffer);
    if (wholeHash !== pin.audioSha256) throw new DirectIntegrityError('Whole-file integrity failed');
    const wav = inspectWav(wholeBuffer);
    if (wav.sampleRate !== record.sampleRate || wav.frames !== record.frames)
      throw new DirectIntegrityError('Whole-file integrity failed');
    controller.signal.throwIfAborted();

    if (doneSettled) return;
    doneSettled = true;
    settleReadyResolve();
    resolveDone(wholeBuffer);
  };

  // Background pipeline; no unhandled rejections.
  void run().catch(e => { if (!doneSettled) fail(guardFailure ?? e); }).finally(() => {
    if (guardTimer) clearInterval(guardTimer);
    if (!doneSettled) {
      removeOwnerAbortListener();
    } else if (!stopped && (clock as any).scheduledThroughFrame > 0) {
      scheduleAudioEndCheck();
    } else {
      removeOwnerAbortListener();
    }
    // ensure consumers never see unhandled rejections if somehow unsettled
    if (!readySettled) settleReadyReject(new Error('Playback ended'));
  });

  void ready.catch(() => {});
  void done.catch(() => {});

  return {
    clock,
    ready,
    done,
    stop: () => {
      stop();
      if (!doneSettled) fail(signal.aborted ? (signal.reason ?? new Error('stopped')) : new Error('stopped'));
    },
  };
}
