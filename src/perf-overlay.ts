// Opt-in (?perf=1) on-device performance overlay. Read-only: uses metrics the
// renderer already records locally. No network, account, fingerprint, or
// telemetry. No fixed refresh-rate assumption: spikes are relative to the
// window's own median.
export interface PerfSample {
  /** Recent presentation-frame intervals in ms (rAF cadence at draw time). */
  intervals: number[];
  /** Recent renderer draw() CPU times in ms. */
  works: number[];
  /** Currently visible note sprites. */
  visible: number;
}

function sorted(xs: number[]) {
  return [...xs].sort((a, b) => a - b);
}
export function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const a = sorted(xs);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
}

export function formatPerf(s: PerfSample): string {
  const n = s.intervals.length;
  if (n < 30) return `perf: collecting ${n}/30 frames`;
  const p50 = percentile(s.intervals, 0.5);
  const p95 = percentile(s.intervals, 0.95);
  const max = sorted(s.intervals).at(-1)!;
  const cpu95 = percentile(s.works, 0.95);
  const spikes = s.intervals.filter((x) => x > 2 * p50).length;
  const f = (x: number) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));
  return `frame ms p50 ${f(p50)} p95 ${f(p95)} max ${f(max)} · >2x ${spikes} · draw cpu p95 ${f(cpu95)} · vis ${s.visible} · last ${n}f`;
}
