// Orvio internal prototype analyzer, tuned 2026-11-07 against aubio cross-check on one CC-BY track.
// Tuned params: envelope smoothing 7 hops, onset merge 0.12s (F1 0.687 vs aubio specflux on that track; reference, not ground truth).
// Deterministic: same PCM input -> same output.
export function analyzePcm(samples, sampleRate) {
  const hop = 512,
    window = 1024,
    SMOOTH = 7,
    MERGE = 0.12;
  const raw = [];
  for (let i = 0; i + window < samples.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + window; j++) sum += samples[j] * samples[j];
    raw.push(Math.sqrt(sum / window));
  }
  const h = Math.floor(SMOOTH / 2);
  const envelope = raw.map((_, i) => {
    let s = 0,
      n = 0;
    for (let k = -h; k <= h; k++) {
      const j = i + k;
      if (j >= 0 && j < raw.length) {
        s += raw[j];
        n++;
      }
    }
    return s / n;
  });
  const novelty = envelope.map((e, i) =>
    Math.max(0, e - (envelope[i - 1] || 0)),
  );
  const sorted = [...novelty].sort((a, b) => a - b),
    floor = sorted[Math.floor(sorted.length * 0.65)] || 0;
  const peaks = [];
  for (let i = 2; i < novelty.length - 2; i++) {
    const local = novelty
      .slice(Math.max(0, i - 20), i + 1)
      .sort((a, b) => a - b);
    const median = local[Math.floor(local.length / 2)];
    if (
      novelty[i] > Math.max(floor * 2.5, median * 3, 0.0005) &&
      novelty[i] >= novelty[i - 1] &&
      novelty[i] > novelty[i + 1]
    ) {
      const time = (i * hop + window / 2) / sampleRate;
      if (peaks.length && time - peaks.at(-1).time < MERGE) {
        if (novelty[i] > peaks.at(-1).strength)
          peaks[peaks.length - 1] = { time, strength: novelty[i] };
      } else peaks.push({ time, strength: novelty[i] });
    }
  }
  const candidates = [];
  for (let bpm = 60; bpm <= 180; bpm += 0.5) {
    const beat = 60 / bpm;
    let score = 0,
      weight = 0;
    for (let i = 0; i < peaks.length; i++)
      for (let j = i + 1; j < Math.min(i + 9, peaks.length); j++) {
        const delta = peaks[j].time - peaks[i].time;
        if (delta > 2.5) break;
        const nearest = Math.round(delta / beat);
        if (nearest < 1 || nearest > 4) continue;
        const error = Math.abs(delta - nearest * beat);
        const w = Math.sqrt(peaks[i].strength * peaks[j].strength);
        score += w * Math.exp(-Math.pow(error / 0.035, 2));
        weight += w;
      }
    candidates.push({ bpm, score: weight ? score / weight : 0 });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || { bpm: 0, score: 0 };
  return {
    duration: samples.length / sampleRate,
    hopSeconds: hop / sampleRate,
    envelope,
    peaks,
    bpm: best.bpm,
    beatConfidence: best.score,
    tempoCandidates: candidates.slice(0, 5),
  };
}
const GAP = { low: 0.38, mid: 0.23, high: 0.12 },
  KEEP = { low: 0.35, mid: 0.18, high: 0 };
// Engine-format chart: Note[]{id,lane,time,end?}, time-sorted, tap notes only (no holds/chords yet).
// Optional grid snap +-0.04s to 16th grid at detected bpm; off-grid onsets kept raw.
export function chartFromAnalysis(analysis, difficulty, lanes = 5) {
  const gap = GAP[difficulty],
    minimum = KEEP[difficulty];
  const strength = [...analysis.peaks]
      .map((p) => p.strength)
      .sort((a, b) => a - b),
    threshold = strength[Math.floor(strength.length * minimum)] || 0;
  const grid = analysis.bpm > 0 ? 60 / analysis.bpm / 4 : 0;
  const selected = [];
  for (const p of analysis.peaks) {
    if (p.strength < threshold) continue;
    let time = p.time;
    if (grid) {
      const snapped = Math.round(time / grid) * grid;
      if (Math.abs(snapped - time) <= 0.04) time = snapped;
    }
    if (selected.length && time - selected.at(-1).time < gap) {
      if (p.strength > selected.at(-1).strength)
        selected[selected.length - 1] = { time, strength: p.strength };
    } else selected.push({ time, strength: p.strength });
  }
  // lane assignment: deterministic, strength-ordered zigzag with last-lane avoidance, no same-time same-lane
  let last = -1;
  const byTime = new Map();
  const notes = selected.map((p, i) => {
    let lane = (i * 3 + Math.round(p.strength * 100000)) % lanes;
    if (lane === last) lane = (lane + 1) % lanes;
    const key = time2key(p.time);
    const used = byTime.get(key) || new Set();
    let tries = 0;
    while (used.has(lane) && tries < lanes) {
      lane = (lane + 1) % lanes;
      tries++;
    }
    used.add(lane);
    byTime.set(key, used);
    last = lane;
    return { id: i, time: p.time, lane };
  });
  function time2key(t) {
    return Math.round(t * 1000);
  }
  return notes
    .sort((a, b) => a.time - b.time || a.lane - b.lane)
    .map((n, id) => ({ ...n, id }));
}
