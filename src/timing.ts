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
    stamp.performanceTime > 0
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
