// Map both drawing and event timestamps to the audible output timeline.
export function outputTime(
  performanceTime: number,
  sampledAt: number,
  currentTime: number,
  anchor: number,
  baseLatency: number,
  outputLatency: number,
  stamp?: { contextTime?: number; performanceTime?: number },
): number {
  if (
    stamp &&
    typeof stamp.contextTime === 'number' &&
    typeof stamp.performanceTime === 'number' &&
    Number.isFinite(stamp.contextTime) &&
    Number.isFinite(stamp.performanceTime) &&
    stamp.contextTime > 0 &&
    stamp.performanceTime > 0 &&
    // Some WebKit outputs use an incompatible performance-time origin.
    // Never map a future/stale output timestamp into the chart clock.
    stamp.performanceTime <= sampledAt + 100 &&
    sampledAt - stamp.performanceTime <= 1000 &&
    stamp.contextTime <= currentTime + 0.1
  )
    return (
      stamp.contextTime +
      (performanceTime - stamp.performanceTime) / 1000 -
      anchor
    );
  // baseLatency is graph-to-system; outputLatency is system-to-device.
  // Preserve the event's original time even when its handler runs late.
  return (
    currentTime -
    anchor -
    Math.max(0, baseLatency || 0) -
    Math.max(0, outputLatency || 0) +
    (performanceTime - sampledAt) / 1000
  );
}

/**
 * A5: countdown window anchored to the first note's fall start.
 * Notes travel for 2/speed seconds before their judgment time, so without a
 * lead-in the earliest note is visible during the countdown at high speeds.
 * leadIn delays the audio/chart anchor so the first fall begins exactly when
 * the countdown clears; the 0.15 floor keeps the anchor in the future for
 * charts whose first note is more than five beats in.
 * firstFall stays signed: external charts can start their first note inside
 * the travel window (firstNoteTime < 2/speed), and clamping it to 0 would let
 * that note fall during the countdown. A negative firstFall simply moves the
 * countdown earlier; the countdown clears exactly when the first fall starts,
 * before the audio head at chart time 0.
 */
export function countdownTiming(
  bpm: number,
  speed: number,
  firstNoteTime: number,
): { leadIn: number; firstFall: number; beat: number } {
  const beat = 60 / bpm;
  const firstFall = firstNoteTime - 2 / speed;
  return {
    leadIn: Math.max(0.15, 5 * beat - firstFall + 0.15),
    firstFall,
    beat,
  };
}

/** A5: countdown readout; numbers always span the 4 beats before firstFall. */
export function countdownText(
  time: number,
  firstFall: number,
  beat: number,
): string {
  return time < firstFall - 4 * beat
    ? 'READY'
    : time < firstFall
      ? String(
          Math.max(1, 4 - Math.floor((time - (firstFall - 4 * beat)) / beat)),
        )
      : '';
}

/** All supported live speeds are >=1. Reserve 1x travel up front so changing
 * speed cannot make a note visible during the countdown. The renderer keeps
 * its actual speed throughout; this is not a hidden-note visibility gate. */
export function startupCountdownTiming(bpm: number, firstNoteTime: number) {
  return countdownTiming(bpm, 1, firstNoteTime);
}
