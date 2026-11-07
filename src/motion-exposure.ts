// One continuous shutter footprint, never duplicate note heads. Anchored at the
// current note position, extending only toward its previous-frame position.
export function motionExposure(
  pxPerSecond: number,
  frameMs: number,
  held: boolean,
) {
  if (held || frameMs <= 0 || frameMs > 50) return 0;
  const distance = (pxPerSecond * Math.min(frameMs, 1000 / 60)) / 1000;
  return distance > 10 ? Math.min(48, distance - 10) : 0;
}
