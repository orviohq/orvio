// Keep the original 620px playfield's 528px judgment distance as the speed
// reference. Viewport height changes lookahead, never CSS pixels per second.
export const SCROLL_REFERENCE = 528;
export const JUDGMENT_INSET = 92;
export const NOTE_ENTRY_MARGIN = 30;
export function scrollPixels(travel: number) {
  return SCROLL_REFERENCE / travel;
}
export function visibleTravel(height: number, speed = 1) {
  return (
    (Math.max(0, Math.round(height) - JUDGMENT_INSET) + NOTE_ENTRY_MARGIN) /
    scrollPixels(2 / speed)
  );
}
