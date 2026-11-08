/** Store frame updates when either judgments or independent FEVER ticks changed. */
export function replayFrameChanged(
  beforeEvents: number,
  afterEvents: number,
  beforeFever: number,
  afterFever: number,
) {
  return beforeEvents !== afterEvents || beforeFever !== afterFever;
}
