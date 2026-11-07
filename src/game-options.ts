import type { Note } from './chart';
export const FADERS = [
  'off',
  'in',
  'in2',
  'out',
  'out2',
  'blink',
  'blink2',
  'fog',
  'pixel',
  'pixel2',
  'blind',
] as const;
export type Fader = (typeof FADERS)[number];
// Beat-locked visibility, separate from input/engine time.
export function blinkAlpha(seconds: number, bpm: number) {
  const phase = ((Math.max(0, seconds) * bpm) / 60) % 1;
  return phase < 0.5 ? 1 : 0;
}
export type Shuffle = 'off' | 'mirror' | 'random';
export function laneOrder(
  lanes: number,
  shuffle: Shuffle,
  seed: number,
): number[] {
  const normal = Array.from({ length: lanes }, (_, i) => i);
  if (shuffle === 'off') return normal;
  if (shuffle === 'mirror') return normal.map((i) => lanes - 1 - i);
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let attempt = 0; attempt < 1000; attempt++) {
    const order = [...normal];
    for (let i = lanes - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (
      order.every((v, i) => v !== i) &&
      order.some((v, i) => v !== lanes - 1 - i)
    )
      return order;
  }
  return normal.map((i) => (i + 1) % lanes);
}
export function transformChart(
  notes: Note[],
  lanes: number,
  shuffle: Shuffle,
  seed: number,
): Note[] {
  const order = laneOrder(lanes, shuffle, seed);
  return notes.map((n) => ({ ...n, lane: order[n.lane] }));
}
export function fadeAlpha(fader: Fader, progress: number) {
  if (fader === 'blind') return 0;
  if (!['in', 'in2', 'out', 'out2'].includes(fader)) return 1;
  const edge =
    fader === 'in'
      ? 0.5
      : fader === 'in2'
        ? 2 / 3
        : fader === 'out'
          ? 2 / 3
          : 0.5;
  return Math.max(
    0,
    Math.min(
      1,
      (fader.startsWith('in') ? progress - edge : edge - progress) / 0.08 + 0.5,
    ),
  );
}
