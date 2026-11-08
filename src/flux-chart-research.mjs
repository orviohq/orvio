// Single isolated C-derived evaluation candidate. No old pin migration.
import { analyzeFluxV2 } from './flux-research.mjs';
export function analyzePcm(samples, rate) {
  const r = analyzeFluxV2(samples, rate);
  return {
    ...r,
    peaks: r.combined,
    duration: samples.length / rate,
    bpm: 0,
    beatConfidence: 0,
  };
}
function choose(source, ratio, gap, burst) {
  const selected = [],
    byTime = [...source].sort((a, b) => a.time - b.time);
  const accept = (p) => {
    if (selected.some((q) => Math.abs(q.time - p.time) < gap)) return false;
    const t = [...selected, p].sort((a, b) => a.time - b.time);
    let j = 0;
    for (let i = 0; i < t.length; i++) {
      while (t[i].time - t[j].time >= 1) j++;
      if (i - j + 1 > burst) return false;
    }
    selected.push(p);
    return true;
  };
  // One strongest representative for each source phrase, where feasible under timing policy.
  const phrases = [];
  for (const p of byTime) {
    if (!phrases.length || p.time - phrases.at(-1).at(-1).time >= 1.5)
      phrases.push([]);
    phrases.at(-1).push(p);
  }
  for (const phrase of phrases) {
    const ranked = [...phrase].sort(
      (a, b) => b.strength - a.strength || a.time - b.time,
    );
    for (const p of ranked) if (accept(p)) break;
  }
  // Four-second active windows cap local note counts by a ratio, not a song-length NPS target.
  const bins = new Map();
  for (const p of byTime) {
    const k = Math.floor(p.time / 4);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push(p);
  }
  for (const ps of bins.values()) {
    const target = Math.max(1, Math.ceil(ps.length * ratio));
    for (const p of [...ps].sort(
      (a, b) => b.strength - a.strength || a.time - b.time,
    )) {
      const count = selected.filter(
        (q) => Math.floor(q.time / 4) === Math.floor(p.time / 4),
      ).length;
      if (count >= target) break;
      accept(p);
    }
  }
  return selected.sort((a, b) => a.time - b.time);
}
const cache = new WeakMap();
export function chartFromAnalysis(a, difficulty, lanes = 5) {
  let bundle = cache.get(a);
  if (!bundle) {
    const strengths = a.peaks.map((p) => p.strength).sort((x, y) => x - y),
      floor = strengths[Math.floor(strengths.length * 0.15)] || 0;
    const pool = a.peaks.filter((p) => p.strength >= floor);
    const high = choose(pool, 1, 0.1, 8),
      mid = choose(high, 0.65, 0.2, 4),
      low = choose(mid, 0.55, 0.32, 3);
    bundle = { high, mid, low };
    cache.set(a, bundle);
  }
  const groups =
      lanes === 5
        ? { low: [0, 1], mid: [2], high: [3, 4] }
        : { low: [0, 1], mid: [2, 3, 4], high: [5, 6] },
    count = { low: 0, mid: 0, high: 0 },
    scale = {};
  for (const b of ['low', 'mid', 'high']) {
    const ss = a.bandPeaks[b].map((p) => p.strength).sort((x, y) => x - y);
    scale[b] = ss[ss.length >> 1] || 1;
  }
  const laneMap = new Map();
  for (const p of bundle.high) {
    const rel = [];
    for (const b of ['low', 'mid', 'high']) {
      const bp = a.bandPeaks[b].find((q) => Math.abs(q.time - p.time) < 0.07);
      if (bp) rel.push({ band: b, score: bp.strength / scale[b] });
    }
    rel.sort(
      (x, y) =>
        y.score - x.score ||
        ['low', 'mid', 'high'].indexOf(x.band) -
          ['low', 'mid', 'high'].indexOf(y.band),
    );
    const band = rel[0]?.band || 'mid',
      g = groups[band];
    laneMap.set(p.time, g[count[band]++ % g.length]);
  }
  return bundle[difficulty].map((p, id) => ({
    id,
    time: p.time,
    lane: laneMap.get(p.time),
  }));
}
