// c3-core.mjs — PURE browser-safe C3 core. No fs/crypto/path, no absolute imports, no globals.
// All table bytes (HANN/WRE/WIM) are INJECTED by the caller so the host's own pinned tables
// are used (identical numerics to the host analyzer). Owns: band magnitudes, sustain,
// lane assignment (C2 rule, 5K/7K), hold/chord decoration, dense-high seeded selection.
// Host (frontend) owns: analyzePcm/chartFromAnalysis, runtime adapter, pin/version, tests.

export const C3_DEFAULT_PARAMS = {
  sustainRel: 0.25,
  sustainFloorMul: 1.5,
  stayFrames: 3,
  minHold: 0.3,
  capHold: 2.0,
  holdSpacing: 2.0,
  chordRatio: 0.6,
  chordSpacing: 0.5,
  chordHoldMargin: 0.15,
  tailClipMargin: 0.2, // >= tail late-release threshold 116.67ms + buffer (frontend runtime semantics)
  chordCap: { low: 0.0, mid: 0.05, high: 0.15 },
  holdTierStrengthMul: { low: 1.5, mid: 1.0, high: 0.7 },
  holdMinSustain: { low: 0.6, mid: 0.3, high: 0.3 },
  holdCapShare: { low: 0.1, mid: 0.15, high: 0.25 },
  bandWindow: 0.07,
};
export const C3D_DENSE = { gap: 0.08, burst: 12 }; // dense-high candidate values

export function laneGroups(lanes) {
  if (lanes === 5) return { low: [0, 1], mid: [2], high: [3, 4] };
  if (lanes === 7) return { low: [0, 1], mid: [2, 3, 4], high: [5, 6] };
  throw new Error('unsupported lanes: ' + lanes);
}

function fft(re, im, WRE, WIM) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1,
      step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < half; j++) {
        const t = j * step,
          cwr = WRE[t],
          cwi = WIM[t];
        const ur = re[i + j],
          ui = im[i + j];
        const vr = re[i + j + half] * cwr - im[i + j + half] * cwi;
        const vi = re[i + j + half] * cwi + im[i + j + half] * cwr;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + half] = ur - vr;
        im[i + j + half] = ui - vi;
      }
    }
  }
}
const BANDS = { low: [20, 250], mid: [250, 2000], high: [2000, 11025] };

// Per-frame band magnitude sums. tables={HANN,WRE,WIM} injected (host's pinned tables).
export function computeBandMags(
  samples,
  sampleRate,
  tables,
  hop = 512,
  window = 1024,
) {
  const { HANN, WRE, WIM } = tables;
  const binHz = sampleRate / window;
  const bandBins = {};
  for (const [b, [lo, hi]] of Object.entries(BANDS))
    bandBins[b] = [
      Math.max(1, Math.floor(lo / binHz)),
      Math.min(window / 2 - 1, Math.ceil(hi / binHz)),
    ];
  const re = new Float64Array(window),
    im = new Float64Array(window);
  const times = [],
    mags = { low: [], mid: [], high: [] };
  for (let i = 0; i + window < samples.length; i += hop) {
    for (let j = 0; j < window; j++) {
      re[j] = samples[i + j] * HANN[j];
      im[j] = 0;
    }
    fft(re, im, WRE, WIM);
    const sums = { low: 0, mid: 0, high: 0 };
    for (let k = 1; k < window / 2; k++) {
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      for (const [b, [lo, hi]] of Object.entries(bandBins))
        if (k >= lo && k <= hi) {
          sums[b] += m;
          break;
        }
    }
    for (const b of Object.keys(BANDS))
      mags[b].push(sums[b] / (bandBins[b][1] - bandBins[b][0] + 1));
    times.push((i + window / 2) / sampleRate);
  }
  return { times, mags, frameDur: hop / sampleRate };
}

// analysis: {peaks, bandPeaks, duration} (host analyzePcm result)
export function makeOnsetInfo(analysis, bm, P = C3_DEFAULT_PARAMS) {
  const { times, mags, frameDur } = bm;
  const floors = {};
  for (const b of ['low', 'mid', 'high']) {
    const s = [...mags[b]].sort((x, y) => x - y);
    floors[b] = s[Math.floor(s.length * 0.2)];
  }
  const scale = {};
  for (const b of ['low', 'mid', 'high']) {
    const ss = analysis.bandPeaks[b]
      .map((p) => p.strength)
      .sort((x, y) => x - y);
    scale[b] = ss[ss.length >> 1] || 1;
  }
  function bandScores(t) {
    const r = [];
    for (const b of ['low', 'mid', 'high']) {
      let best = 0;
      for (const p of analysis.bandPeaks[b])
        if (Math.abs(p.time - t) < P.bandWindow && p.strength / scale[b] > best)
          best = p.strength / scale[b];
      if (best > 0) r.push({ band: b, score: best });
    }
    r.sort(
      (x, y) =>
        y.score - x.score ||
        ['low', 'mid', 'high'].indexOf(x.band) -
          ['low', 'mid', 'high'].indexOf(y.band),
    );
    return r;
  }
  function sustainAt(t, dom) {
    let fi = 0,
      best = 1e9;
    for (let i = 0; i < times.length; i++) {
      const d = Math.abs(times[i] - t);
      if (d < best) {
        best = d;
        fi = i;
      }
    }
    const thr = Math.max(
      P.sustainRel * mags[dom][fi],
      floors[dom] * P.sustainFloorMul,
    );
    let below = 0,
      end = fi;
    for (let i = fi + 1; i < times.length; i++) {
      if (mags[dom][i] >= thr) {
        below = 0;
        end = i;
      } else {
        below++;
        if (below >= P.stayFrames) break;
      }
    }
    return (end - fi) * frameDur;
  }
  const info = new Map();
  for (const p of analysis.peaks) {
    const bs = bandScores(p.time);
    const dom = bs[0]?.band || 'mid';
    info.set(p.time, {
      bands: bs,
      dom,
      chord: bs.length >= 2 && bs[1].score >= P.chordRatio * bs[0].score,
      sustain: sustainAt(p.time, dom),
      strength: p.strength,
    });
  }
  return { info, scale };
}

// C2 lane rule over an arbitrary ordered note-time set (bundle.high or dense high).
export function assignLanes(analysis, highTimes, lanes, scale) {
  const groups = laneGroups(lanes);
  const count = { low: 0, mid: 0, high: 0 };
  const laneMap = new Map();
  const bandGroup = { low: 'low', mid: 'mid', high: 'high' };
  for (const t of highTimes) {
    const rel = [];
    for (const b of ['low', 'mid', 'high']) {
      const bp = analysis.bandPeaks[b].find((q) => Math.abs(q.time - t) < 0.07);
      if (bp) rel.push({ band: b, score: bp.strength / scale[b] });
    }
    rel.sort(
      (x, y) =>
        y.score - x.score ||
        ['low', 'mid', 'high'].indexOf(x.band) -
          ['low', 'mid', 'high'].indexOf(y.band),
    );
    const band = rel[0]?.band || 'mid';
    const g = groups[band];
    laneMap.set(t, g[count[band]++ % g.length]);
  }
  return laneMap;
}

// Dense high: mid seeded, full pool, gap/burst. Returns peak objects sorted by time. Nested: mid ⊆ high.
export function denseHighSelection(analysis, midPeaks, dense = C3D_DENSE) {
  const selected = [...midPeaks];
  const byTime = [...analysis.peaks].sort((a, b) => a.time - b.time);
  const seedTimes = new Set(midPeaks.map((p) => p.time));
  const accept = (p) => {
    if (selected.some((q) => Math.abs(q.time - p.time) < dense.gap))
      return false;
    const t = [...selected, p].sort((a, b) => a.time - b.time);
    let j = 0;
    for (let i = 0; i < t.length; i++) {
      while (t[i].time - t[j].time >= 1) j++;
      if (i - j + 1 > dense.burst) return false;
    }
    selected.push(p);
    return true;
  };
  const phrases = [];
  for (const p of byTime) {
    if (!phrases.length || p.time - phrases.at(-1).at(-1).time >= 1.5)
      phrases.push([]);
    phrases.at(-1).push(p);
  }
  for (const phrase of phrases) {
    if (phrase.some((p) => seedTimes.has(p.time))) continue;
    const ranked = [...phrase].sort(
      (a, b) => b.strength - a.strength || a.time - b.time,
    );
    for (const p of ranked) if (accept(p)) break;
  }
  for (const p of byTime) if (!selected.includes(p)) accept(p);
  return selected.sort((a, b) => a.time - b.time);
}

// Decorate one tier's base chart [{time,lane}] with holds + chords.
export function decorateTier(
  base,
  tier,
  onsetInfo,
  lanes,
  P = C3_DEFAULT_PARAMS,
) {
  const groups = laneGroups(lanes);
  const bandGroup = { low: 'low', mid: 'mid', high: 'high' };
  const medStr = [...onsetInfo.info.values()]
    .map((i) => i.strength)
    .sort((x, y) => x - y);
  const med = medStr[Math.floor(medStr.length / 2)] || 0;
  const getStr = (n) => (onsetInfo.info.get(n.time) || {}).strength || 0;
  // holds
  const cand = base
    .filter((n) => {
      const info = onsetInfo.info.get(n.time);
      return (
        info &&
        info.sustain >= P.holdMinSustain[tier] &&
        info.sustain >= P.minHold &&
        getStr(n) >= med * P.holdTierStrengthMul[tier]
      );
    })
    .map((n) => ({ ...n, info: onsetInfo.info.get(n.time) }))
    .sort((x, y) => getStr(y) - getStr(x) || x.time - y.time);
  const holds = [];
  const holdCapN = Math.floor(base.length * P.holdCapShare[tier]);
  for (const c of cand) {
    if (holds.length >= holdCapN) break;
    if (holds.some((h) => Math.abs(h.time - c.time) < P.holdSpacing)) continue;
    const next = base
      .filter((q) => q.time > c.time && q.lane === c.lane)
      .sort((x, y) => x.time - y.time)[0];
    let dur = Math.min(P.capHold, c.info.sustain);
    if (next) dur = Math.min(dur, next.time - c.time - P.tailClipMargin);
    if (dur >= P.minHold)
      holds.push({ time: c.time, duration: +dur.toFixed(4) });
  }
  const holdMap = new Map(holds.map((h) => [h.time, h.duration]));
  // chords
  const chordCapN = Math.floor(base.length * P.chordCap[tier]);
  const chordCands = base
    .filter((n) => onsetInfo.info.get(n.time)?.chord)
    .sort((x, y) => getStr(y) - getStr(x) || x.time - y.time);
  const chordPicks = [];
  for (const c of chordCands) {
    if (chordPicks.length >= chordCapN) break;
    if (chordPicks.some((h) => Math.abs(h.time - c.time) < P.chordSpacing))
      continue;
    const info = onsetInfo.info.get(c.time);
    const g2 = groups[info.bands[1].band];
    const used = new Set(
      base.filter((q) => Math.abs(q.time - c.time) < 0.001).map((q) => q.lane),
    );
    for (const h of holds) {
      if (
        c.time >= h.time - P.chordHoldMargin &&
        c.time < h.time + h.duration + P.chordHoldMargin
      )
        used.add((base.find((q) => q.time === h.time) || {}).lane);
    }
    const laneTimes = new Map();
    for (const q of base) {
      if (!laneTimes.has(q.lane)) laneTimes.set(q.lane, []);
      laneTimes.get(q.lane).push(q.time);
    }
    let pickLane = -1;
    for (const l of g2) {
      if (used.has(l)) continue;
      const ts = laneTimes.get(l) || [];
      if (
        ts.some(
          (t) => Math.abs(t - c.time) < 0.15 && Math.abs(t - c.time) > 0.001,
        )
      )
        continue;
      pickLane = l;
      break;
    }
    if (pickLane >= 0) chordPicks.push({ time: c.time, lane: pickLane });
  }
  const notes = [];
  for (const n of base) {
    const d = holdMap.get(n.time);
    notes.push({
      time: n.time,
      lane: n.lane,
      type: d ? 'hold' : 'tap',
      ...(d ? { duration: d } : {}),
    });
  }
  for (const cp of chordPicks)
    notes.push({ time: cp.time, lane: cp.lane, type: 'tap' });
  notes.sort((x, y) => x.time - y.time || x.lane - y.lane);
  notes.forEach((n, i) => (n.id = i));
  return notes;
}
