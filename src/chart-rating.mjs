// chart-rating.mjs — Orvio-own estimated chart difficulty rating. Pure, deterministic.
// The rating is computed from the chart itself (notes + duration), so the same chart
// yields the same rating in selection, result and replay. Coefficients are Orvio's own
// estimates: they are NOT a DJMAX calibration
// and make no equivalence claim. 'standard' scale rates NM/HD/MX charts; 'sc' scale rates
// SC charts against the SC population's density range. Integer 1..15 on both scales.

// Feature reference points (full marks) per scale. Own estimates, see RATING.md.
export const RATING_REFS = {
  standard: {
    nps: 8.0,
    peakNps: 14.0,
    chordShare: 0.5,
    holdTimeShare: 0.35,
    jackRate: 0.15,
  },
  sc: {
    nps: 10.0,
    peakNps: 18.0,
    chordShare: 0.6,
    holdTimeShare: 0.4,
    jackRate: 0.2,
  },
};
export const RATING_WEIGHTS = {
  nps: 0.45,
  peakNps: 0.25,
  chord: 0.15,
  hold: 0.1,
  jack: 0.05,
};

export function chartFeatures(notes, durationSec) {
  if (
    !Array.isArray(notes) ||
    notes.length === 0 ||
    !Number.isFinite(durationSec) ||
    durationSec <= 0
  )
    throw new Error('Invalid chart for rating');
  const ts = notes.map((n) => n.time).sort((a, b) => a - b);
  const n = notes.length;
  // peak NPS: max notes inside any 1s window [t, t+1)
  let peak = 1,
    j = 0;
  for (let i = 0; i < n; i++) {
    while (ts[j] < ts[i] - 1 + 1e-9 && j < i) j++;
    peak = Math.max(peak, i - j + 1);
  }
  let chords = 0,
    i = 0;
  while (i < n) {
    let k = i;
    while (k + 1 < n && Math.abs(ts[k + 1] - ts[i]) < 1e-9) k++;
    if (k > i) chords += k - i + 1;
    i = k + 1;
  }
  const holds = notes.filter((x) => x.end !== undefined);
  const holdTime = holds.reduce((s, x) => s + (x.end - x.time), 0);
  let jacks = 0;
  const byLane = new Map();
  for (const x of notes) {
    const p = byLane.get(x.lane);
    if (p !== undefined && x.time - p < 0.15) jacks++;
    byLane.set(x.lane, x.time);
  }
  return {
    notes: n,
    nps: n / durationSec,
    peakNps: peak,
    chordShare: chords / n,
    holdTimeShare: holdTime / durationSec,
    jackRate: jacks / n,
  };
}

export function rateFeatures(f, scale) {
  const R = RATING_REFS[scale];
  if (!R) throw new Error('Unknown rating scale: ' + scale);
  const W = RATING_WEIGHTS;
  const sub = (v, ref) => Math.min(15, (v / ref) * 15);
  const composite =
    W.nps * sub(f.nps, R.nps) +
    W.peakNps * sub(f.peakNps, R.peakNps) +
    W.chord * sub(f.chordShare, R.chordShare) +
    W.hold * sub(f.holdTimeShare, R.holdTimeShare) +
    W.jack * sub(f.jackRate, R.jackRate);
  return Math.max(1, Math.min(15, Math.round(composite)));
}

export function rateDifficulty(notes, durationSec, scale) {
  return rateFeatures(chartFeatures(notes, durationSec), scale);
}
