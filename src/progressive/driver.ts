// @ts-nocheck
// End-to-end progressive verified playback driver (isolated A16 component).
// Fail-closed entry contract (ALL inside this call, no README assumptions):
//   1. validateManifest(manifest, frozen record identity) - geometry/coverage
//      proof BEFORE any clock or segment use.
//   2. checkManifestBinding - pin-bound ('verified') or old record
//      ('unverified'); a committed-but-mismatching manifest throws.
//   3. Response gate (BOTH branches, mirrors loadCanonicalAudio exactly):
//      status 200 (typed error mapping otherwise), Content-Length integer in
//      [44, AUDIO_MAX_BYTES] and === manifest.byteLength, X-Content-SHA256 ==
//      X-Canonical-Audio-SHA256 == record.audioSha256, X-Source-Video-Id ==
//      record.videoId, X-Audio-Contract == 'audio/1', Content-Type audio/wav*,
//      body present. Any failure cancels the body and throws integrity_failed.
//   4. Deferred branch (old record, default): bounded reader loop with
//      signal abort + exact-size join; NO unbounded arrayBuffer.
//   5. Terminal gate (both branches): whole sha256 == record.audioSha256 AND
//      inspectWav frames/rate identity. Persist only after this.
// Unverified early playback is disabled by default (allowUnverifiedEarly).
// The new trusted-anchor backend pin field is a separate gate, not assumed.
import { sliceStream } from './stream-slicer';
import { checkManifestBinding } from './manifest-trust';
import { validateManifest, verifySegment } from './segments';
import { inspectWav } from '../canonical-pcm.mjs';
import { AUDIO_MAX_BYTES } from '../audio-limits.mjs';

import { AudioJobError } from '../external-audio-api';

function checkResponseGate(response, record, manifest) {
  const lengthHeader = response.headers.get('Content-Length');
  const size =
    lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : NaN;
  if (
    !Number.isSafeInteger(size) ||
    size < 44 ||
    size > AUDIO_MAX_BYTES ||
    size !== manifest.byteLength ||
    response.headers.get('X-Content-SHA256') !== record.audioSha256 ||
    response.headers.get('X-Canonical-Audio-SHA256') !== record.audioSha256 ||
    response.headers.get('X-Source-Video-Id') !== record.videoId ||
    response.headers.get('X-Audio-Contract') !== 'audio/1' ||
    !response.headers.get('Content-Type')?.startsWith('audio/wav') ||
    !response.body
  )
    return false;
  return true;
}

async function readBounded(response, size, signal) {
  const reader = response.body.getReader();
  const joined = new Uint8Array(size);
  let offset = 0;
  // An already-hung pending read must not outlive abort: cancel on abort.
  const cancelOnAbort = () => {
    reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancelOnAbort);
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > size)
        throw new AudioJobError('integrity_failed');
      joined.set(value, offset);
      offset += value.byteLength;
    }
  } catch (error) {
    if (signal?.aborted || error instanceof AudioJobError) throw error;
    throw new AudioJobError(
      'network_error',
      undefined,
      200,
      undefined,
      'response',
    );
  } finally {
    signal?.removeEventListener('abort', cancelOnAbort);
    await reader.cancel().catch(() => {});
  }
  signal?.throwIfAborted();
  if (offset !== size) throw new AudioJobError('integrity_failed');
  return joined.buffer;
}

export async function playProgressive({
  record,
  pin,
  manifest,
  response,
  clock,
  signal,
  allowUnverifiedEarly = false,
  onEvent = (_event: string, ..._args: any[]) => {},
  guardIntervalMs = 50,
}) {
  const t0 = performance.now();
  // 1. Geometry/coverage proof against the frozen identity BEFORE any use.
  validateManifest(manifest, {
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    frames: record.frames,
    sampleRate: record.sampleRate,
  });
  // 2. Trust binding (throws on bound mismatch; old records -> 'unverified').
  const binding = await checkManifestBinding(manifest, pin);
  const earlyVerified = binding === 'verified';
  // 3. Status + canonical header gate BEFORE any body read, both branches.
  if (response.status !== 200) {
    const body = await response.json().catch(() => null);
    throw mapError(response.status, body);
  }
  if (!checkResponseGate(response, record, manifest)) {
    await response.body?.cancel().catch(() => {});
    throw new AudioJobError('integrity_failed');
  }
  const size = Number(response.headers.get('Content-Length'));
  if (!earlyVerified && !allowUnverifiedEarly) {
    // 4. Old-record default: bounded whole read, terminal gate alone decides.
    const bytes = await readBounded(response, size, signal);
    return finalize(bytes, record, {
      mode: 'deferred-whole',
      binding,
      t0,
      onEvent,
    });
  }
  // 5. Progressive verified path.
  const reader = response.body.getReader();
  let firstSegmentAt = -1,
    underflows = 0;
  let scheduledAny = false;
  // Guard policy failure (e.g. suspend failed): freeze state is unknown while
  // scheduling continues, which is unsafe. Fail the driver deterministically:
  // stop scheduling, cancel the reader, silence the clock, reject.
  let guardFailure = null;
  const guardTimer = setInterval(() => {
    clock
      .guard(manifest)
      .then((f) => {
        if (f) {
          underflows++;
          onEvent('underflow', performance.now() - t0);
        }
      })
      .catch((e) => {
        if (!guardFailure) {
          guardFailure = e;
          reader.cancel().catch(() => {});
          try {
            clock.stop();
          } catch {
            /* already stopped */
          }
        }
      });
  }, guardIntervalMs);
  try {
    const whole = await sliceStream(reader, manifest, {
      signal,
      onSegment: async (seg, bytes) => {
        if (guardFailure) throw guardFailure;
        const channels = await verifySegment(seg, bytes); // throws pre-audible on corrupt
        await clock.waitForGuard?.();
        // TOCTOU: the guard may have failed DURING the async verify (clock
        // stopped, reader cancelled). Re-check immediately before scheduling
        // so no new source is ever scheduled after stop.
        if (guardFailure) throw guardFailure;
        signal?.throwIfAborted();
        clock.scheduleSegment(seg, channels, manifest);
        scheduledAny = true;
        if (firstSegmentAt < 0) {
          firstSegmentAt = performance.now() - t0;
          onEvent('first-segment', firstSegmentAt, { verified: earlyVerified });
        }
        if (clock.frozen) await clock.resumeFromFreeze();
      },
    });
    if (guardFailure) throw guardFailure;
    return await finalize(whole, record, {
      mode: 'progressive',
      binding,
      t0,
      firstSegmentAt,
      underflows,
      onEvent,
    });
  } catch (error) {
    // Integrity/abort/guard failure after early-scheduled audio: silence
    // immediately. Verified bytes sounding must not linger past a failed gate.
    if (scheduledAny) clock.stop();
    throw guardFailure ?? error;
  } finally {
    clearInterval(guardTimer);
  }
}

async function finalize(bytes, record, extra) {
  const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
  const sha = Array.from(new Uint8Array(hashBuf), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  if (sha !== record.audioSha256) throw new AudioJobError('integrity_failed');
  const wav = inspectWav(bytes);
  if (wav.sampleRate !== record.sampleRate || wav.frames !== record.frames)
    throw new AudioJobError('integrity_failed');
  extra.onEvent('complete', performance.now() - extra.t0);
  return {
    ...extra,
    bytes,
    verified: true,
    elapsedMs: performance.now() - extra.t0,
  };
}

function mapError(status, body) {
  const code = typeof body?.error === 'string' ? body.error : body?.error?.code;
  const retry = body?.retryAfterSec ?? body?.error?.retryAfterSec;
  const retryAfter = Number.isFinite(retry) && retry >= 0 ? retry : undefined;
  if (
    status === 202 &&
    [
      'chart_source_pending',
      'chart_source_deferred',
      'chart_source_replicating',
    ].includes(code)
  )
    return new AudioJobError(
      'request_timeout',
      retryAfter,
      status,
      undefined,
      'service',
    );
  if (status === 404 && code === 'chart_source_not_found')
    return new AudioJobError(
      'not_found',
      retryAfter,
      status,
      undefined,
      'service',
    );
  if (status === 410 && code === 'audio_expired')
    return new AudioJobError(
      'audio_expired',
      retryAfter,
      status,
      undefined,
      'service',
    );
  if (status === 409 && code === 'audio_changed')
    return new AudioJobError(
      'source_changed',
      retryAfter,
      status,
      undefined,
      'service',
    );
  if (status === 409 && code === 'audio_corrupt')
    return new AudioJobError(
      'integrity_failed',
      retryAfter,
      status,
      undefined,
      'service',
    );
  if (status === 429 && code === 'rate_limited')
    return new AudioJobError(
      'rate_limited',
      retryAfter,
      status,
      undefined,
      'service',
    );
  return new AudioJobError(
    'unavailable',
    retryAfter,
    status,
    undefined,
    'service',
  );
}
