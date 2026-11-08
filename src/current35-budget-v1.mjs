import { parseWavAnalysis } from './fused-resampler.mjs';
// src/chart-rating.mjs
var RATING_REFS = {
  standard: {
    nps: 8,
    peakNps: 14,
    chordShare: 0.5,
    holdTimeShare: 0.35,
    jackRate: 0.15,
  },
  sc: {
    nps: 10,
    peakNps: 18,
    chordShare: 0.6,
    holdTimeShare: 0.4,
    jackRate: 0.2,
  },
};
var RATING_WEIGHTS = {
  nps: 0.45,
  peakNps: 0.25,
  chord: 0.15,
  hold: 0.1,
  jack: 0.05,
};
function chartFeatures(notes, durationSec) {
  if (
    !Array.isArray(notes) ||
    notes.length === 0 ||
    !Number.isFinite(durationSec) ||
    durationSec <= 0
  )
    throw new Error('Invalid chart for rating');
  const ts = notes.map((n2) => n2.time).sort((a, b) => a - b);
  const n = notes.length;
  let peak = 1,
    j = 0;
  for (let i2 = 0; i2 < n; i2++) {
    while (ts[j] < ts[i2] - 1 + 1e-9 && j < i2) j++;
    peak = Math.max(peak, i2 - j + 1);
  }
  let chords = 0,
    i = 0;
  while (i < n) {
    let k = i;
    while (k + 1 < n && Math.abs(ts[k + 1] - ts[i]) < 1e-9) k++;
    if (k > i) chords += k - i + 1;
    i = k + 1;
  }
  const holds = notes.filter((x) => x.end !== void 0);
  const holdTime = holds.reduce((s, x) => s + (x.end - x.time), 0);
  let jacks = 0;
  const byLane = /* @__PURE__ */ new Map();
  for (const x of notes) {
    const p = byLane.get(x.lane);
    if (p !== void 0 && x.time - p < 0.15) jacks++;
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
function rateFeatures(f, scale) {
  const R = RATING_REFS[scale];
  if (!R) throw new Error('Unknown rating scale: ' + scale);
  const W2 = RATING_WEIGHTS;
  const sub = (v, ref) => Math.min(15, (v / ref) * 15);
  const composite =
    W2.nps * sub(f.nps, R.nps) +
    W2.peakNps * sub(f.peakNps, R.peakNps) +
    W2.chord * sub(f.chordShare, R.chordShare) +
    W2.hold * sub(f.holdTimeShare, R.holdTimeShare) +
    W2.jack * sub(f.jackRate, R.jackRate);
  return Math.max(1, Math.min(15, Math.round(composite)));
}
function rateDifficulty(notes, durationSec, scale) {
  return rateFeatures(chartFeatures(notes, durationSec), scale);
}

// src/chart-difficulty.ts
var CHART_FAMILIES = ['NM', 'HD', 'MX', 'SC'];
function familyForKey(key) {
  const tier = key.slice(2);
  return tier === 'low'
    ? 'NM'
    : tier === 'mid'
      ? 'HD'
      : tier === 'high'
        ? 'MX'
        : 'SC';
}
var UNRATED_CHART = Object.freeze({
  version: 1,
  family: null,
  rating: null,
  status: 'unrated',
});
function validDifficultyMetadata(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const m = raw;
  if (
    m.version !== 1 ||
    (m.family !== null && !CHART_FAMILIES.includes(m.family))
  )
    return false;
  if (m.status === 'unrated') return m.rating === null;
  if (m.status !== 'rated' || m.family === null || !m.rating) return false;
  return (
    Number.isInteger(m.rating.level) &&
    m.rating.level >= 1 &&
    m.rating.level <= 15 &&
    m.rating.scale === (m.family === 'SC' ? 'sc' : 'standard')
  );
}
function difficultyForChart(notes, durationSec, key) {
  const family = familyForKey(key);
  const scale = family === 'SC' ? 'sc' : 'standard';
  return {
    version: 1,
    family,
    rating: { scale, level: rateDifficulty(notes, durationSec, scale) },
    status: 'rated',
  };
}

// src/audio-limits.mjs
var AUDIO_MAX_SECONDS = 300;
var AUDIO_MAX_BYTES = 578e5;

// src/canonical-pcm.mjs
function inspectWav(buf) {
  const dv =
    buf instanceof DataView
      ? buf
      : new DataView(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
  if (
    dv.byteLength > AUDIO_MAX_BYTES ||
    dv.byteLength < 44 ||
    dv.getUint32(4, true) + 8 !== dv.byteLength
  )
    throw Error('Invalid WAV length');
  if (dv.getUint32(0) !== 1380533830 || dv.getUint32(8) !== 1463899717)
    throw new Error('not RIFF/WAVE');
  let pos = 12,
    fmt = null,
    dataOff = -1,
    dataLen = 0;
  while (pos + 8 <= dv.byteLength) {
    const id = dv.getUint32(pos),
      sz = dv.getUint32(pos + 4, true);
    if (pos + 8 + sz + (sz & 1) > dv.byteLength)
      throw Error('Truncated WAV chunk');
    if (id === 1718449184) {
      if (fmt || sz < 16) throw Error('Invalid fmt chunk');
      fmt = {
        format: dv.getUint16(pos + 8, true),
        channels: dv.getUint16(pos + 10, true),
        sampleRate: dv.getUint32(pos + 12, true),
        bits: dv.getUint16(pos + 22, true),
      };
    } else if (id === 1684108385) {
      if (dataOff >= 0) throw Error('Duplicate data chunk');
      dataOff = pos + 8;
      dataLen = sz;
    }
    pos += 8 + sz + (sz & 1);
  }
  if (!fmt || dataOff < 0) throw new Error('missing fmt or data chunk');
  if (
    fmt.format !== 1 ||
    fmt.bits !== 16 ||
    fmt.channels !== 2 ||
    ![44100, 48e3].includes(fmt.sampleRate)
  )
    throw Error('Unsupported canonical format');
  if (
    dataLen === 0 ||
    dataLen % 4 ||
    dataLen > fmt.sampleRate * 4 * AUDIO_MAX_SECONDS
  )
    throw Error('Invalid canonical PCM length');
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    bitsPerSample: fmt.bits,
    frames: dataLen / 4,
    view: dv,
    dataOffset: dataOff,
  };
}
function parseWavMono(buf) {
  const p = inspectWav(buf),
    samples = new Float32Array(p.frames);
  for (let i = 0; i < p.frames; i++) {
    const o = p.dataOffset + i * 4;
    samples[i] =
      (p.view.getInt16(o, true) / 32768 +
        p.view.getInt16(o + 2, true) / 32768) /
      2;
  }
  return { sampleRate: p.sampleRate, frames: p.frames, samples };
}
function resampleLinear(mono, fromRate, toRate) {
  if (fromRate === toRate) return mono;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(mono.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio,
      j = Math.floor(x),
      f = x - j;
    const a = mono[j],
      b = j + 1 < mono.length ? mono[j + 1] : a;
    out[i] = a + (b - a) * f;
  }
  return out;
}

// src/sample-analyzer.mjs
function analyzePcm(samples, sampleRate) {
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
      novelty[i] > Math.max(floor * 2.5, median * 3, 5e-4) &&
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

// src/external-source.ts
var hash = /^[a-f0-9]{64}$/;
var keys = ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'];
function validSourceRecord(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw;
  if (
    r.version !== 1 ||
    !Number.isFinite(r.estimatedBpm) ||
    r.estimatedBpm < 0 ||
    r.estimatedBpm > 400 ||
    !/^[A-Za-z0-9_-]{11}$/.test(r.videoId) ||
    !hash.test(r.audioSha256) ||
    !Number.isInteger(r.frames) ||
    r.frames <= 0 ||
    !Number.isInteger(r.sampleRate) ||
    r.sampleRate < 8e3 ||
    r.sampleRate > 192e3 ||
    r.frames / r.sampleRate > AUDIO_MAX_SECONDS ||
    typeof r.pipelineVersion !== 'string' ||
    !r.pipelineVersion ||
    r.pipelineVersion.length > 128 ||
    typeof r.analyzerVersion !== 'string' ||
    !r.analyzerVersion ||
    r.analyzerVersion.length > 128 ||
    typeof r.config !== 'string' ||
    r.config.length > 4096 ||
    (r.chartSetSha256 !== void 0 && !hash.test(r.chartSetSha256)) ||
    !r.charts
  )
    return false;
  for (const key of presentChartKeys(r)) {
    const c = r.charts[key],
      lanes = Number(key[0]);
    if (
      !c ||
      !hash.test(c.sha256) ||
      !Array.isArray(c.notes) ||
      c.notes.length === 0 ||
      c.notes.length > 1e4
    )
      return false;
    if (
      r.chartMetadata &&
      (!validDifficultyMetadata(r.chartMetadata[key]) ||
        r.chartMetadata[key].family !== familyForKey(key))
    )
      return false;
    const ids = /* @__PURE__ */ new Set();
    let previous = -Infinity;
    for (const n of c.notes) {
      if (
        !n ||
        !Number.isInteger(n.id) ||
        ids.has(n.id) ||
        !Number.isInteger(n.lane) ||
        n.lane < 0 ||
        n.lane >= lanes ||
        !Number.isFinite(n.time) ||
        n.time < 0 ||
        n.time < previous ||
        n.time >= r.frames / r.sampleRate ||
        (n.end !== void 0 &&
          (!Number.isFinite(n.end) ||
            n.end <= n.time ||
            n.end > r.frames / r.sampleRate))
      )
        return false;
      ids.add(n.id);
      previous = n.time;
    }
  }
  return true;
}
async function verifyChartHashes(record) {
  if (!validSourceRecord(record)) return false;
  if (
    record.chartSetSha256 !== void 0 &&
    record.chartSetSha256 !== (await chartSetHash(record))
  )
    return false;
  for (const key of presentChartKeys(record)) {
    const bytes = new TextEncoder().encode(
      JSON.stringify(record.charts[key].notes),
    );
    const actual = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    if (actual !== record.charts[key].sha256) return false;
  }
  return true;
}
async function chartSetHash(record) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      analyzer: record.analyzerVersion,
      config: record.config,
      charts: presentChartKeys(record).map((key) => [
        key,
        record.charts[key].sha256,
      ]),
      ...(record.chartMetadata ? { chartMetadata: record.chartMetadata } : {}),
    }),
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
function presentChartKeys(record) {
  return [
    ...keys,
    ...['5:sc', '7:sc'].filter((key) => record.charts[key] !== void 0),
  ];
}

// src/c3-core.mjs
var C3_DEFAULT_PARAMS = {
  sustainRel: 0.25,
  sustainFloorMul: 1.5,
  stayFrames: 3,
  minHold: 0.3,
  capHold: 2,
  holdSpacing: 2,
  chordRatio: 0.6,
  chordSpacing: 0.5,
  chordHoldMargin: 0.15,
  tailClipMargin: 0.2,
  // >= tail late-release threshold 116.67ms + buffer (frontend runtime semantics)
  chordCap: { low: 0, mid: 0.05, high: 0.15 },
  holdTierStrengthMul: { low: 1.5, mid: 1, high: 0.7 },
  holdMinSustain: { low: 0.6, mid: 0.3, high: 0.3 },
  holdCapShare: { low: 0.1, mid: 0.15, high: 0.25 },
  bandWindow: 0.07,
};
function laneGroups(lanes) {
  if (lanes === 5) return { low: [0, 1], mid: [2], high: [3, 4] };
  if (lanes === 7) return { low: [0, 1], mid: [2, 3, 4], high: [5, 6] };
  throw new Error('unsupported lanes: ' + lanes);
}
function fft(re, im, WRE2, WIM2) {
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
          cwr = WRE2[t],
          cwi = WIM2[t];
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
var BANDS = { low: [20, 250], mid: [250, 2e3], high: [2e3, 11025] };
function computeBandMags(
  samples,
  sampleRate,
  tables,
  hop = 512,
  window = 1024,
) {
  const { HANN: HANN2, WRE: WRE2, WIM: WIM2 } = tables;
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
      re[j] = samples[i + j] * HANN2[j];
      im[j] = 0;
    }
    fft(re, im, WRE2, WIM2);
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
function makeOnsetInfo(analysis, bm, P = C3_DEFAULT_PARAMS) {
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
  const info = /* @__PURE__ */ new Map();
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
function decorateTier(base, tier, onsetInfo, lanes, P = C3_DEFAULT_PARAMS) {
  const groups = laneGroups(lanes);
  const bandGroup = { low: 'low', mid: 'mid', high: 'high' };
  const medStr = [...onsetInfo.info.values()]
    .map((i) => i.strength)
    .sort((x, y) => x - y);
  const med = medStr[Math.floor(medStr.length / 2)] || 0;
  const getStr = (n) => (onsetInfo.info.get(n.time) || {}).strength || 0;
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
      base.filter((q) => Math.abs(q.time - c.time) < 1e-3).map((q) => q.lane),
    );
    for (const h of holds) {
      if (
        c.time >= h.time - P.chordHoldMargin &&
        c.time < h.time + h.duration + P.chordHoldMargin
      )
        used.add((base.find((q) => q.time === h.time) || {}).lane);
    }
    const laneTimes = /* @__PURE__ */ new Map();
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
          (t) => Math.abs(t - c.time) < 0.15 && Math.abs(t - c.time) > 1e-3,
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
var C3_SC_PARAMS = {
  ...C3_DEFAULT_PARAMS,
  chordRatio: C3_DEFAULT_PARAMS.chordRatio,
  // reuse proved multi-band onset evidence
  chordSpacing: 0.3,
  // standard: 0.5
  holdSpacing: 1.2,
  // standard: 2.0
  chordCap: { low: 0, mid: 0.05, high: 0.15, sc: 0.3 },
  holdTierStrengthMul: { low: 1.5, mid: 1, high: 0.7, sc: 0.5 },
  holdMinSustain: { low: 0.6, mid: 0.3, high: 0.3, sc: 0.2 },
  holdCapShare: { low: 0.1, mid: 0.15, high: 0.25, sc: 0.4 },
};

// src/flux-tables.mjs
var HANN = Float64Array.of(
  0,
  943076911874563e-20,
  3772272071722593e-20,
  8487478753615996e-20,
  15088519085437735e-20,
  23575144055643094e-20,
  33947033522635506e-20,
  4620379622682358e-19,
  6034496980542037e-19,
  7637002080985167e-19,
  9427834472588992e-19,
  0.0011406926599646372,
  0.0013574203804713747,
  0.0015929584331427216,
  0.0018472979327587291,
  0.0021204292848509554,
  0.0024123421860645644,
  0.0027230256245468487,
  0.003052467880362675,
  0.003400656525936685,
  0.003767578426521867,
  0.004153219740695435,
  0.00455756592088058,
  0.004980601713895361,
  0.005422311161528193,
  0.005882677601139863,
  0.006361683666291973,
  0.006859311287402081,
  0.007375541692425325,
  0.007910355407562741,
  0.008463732257995571,
  0.009035651368646647,
  0.009626091164967543,
  0.010235029373752758,
  0.010862443023979595,
  0.011508308447674975,
  0.012172601280808104,
  0.012855296464209687,
  0.013556368244517059,
  0.014275790175145853,
  0.01501353511728759,
  0.015769575240933364,
  0.01654388202592383,
  0.01733642626302484,
  0.018147178055029578,
  0.01897610681788614,
  0.01982318128185151,
  0.020688369492670833,
  0.021571638812783067,
  0.022472955922552107,
  0.023392286821523722,
  0.02432959682970809,
  0.025284850588888075,
  0.026258012063953118,
  0.02724904454425836,
  0.028257910645009876,
  0.02928457230867454,
  0.030328990806415934,
  0.03139112673955513,
  0.03247094004105716,
  0.0335683899770422,
  0.034683435148322506,
  0.03581603349196372,
  0.03696614228287187,
  0.038133718135405226,
  0.03931871700501044,
  0.0405210941898847,
  0.04174080433266136,
  0.04297780142212154,
  0.044232038794929374,
  0.04550346913739256,
  0.046792044487247,
  0.048097716235466326,
  0.04942043512809524,
  0.050760151268107845,
  0.05211681411728969,
  0.05349037249814442,
  0.05488077459582419,
  0.05628796796008434,
  0.05771189950726191,
  0.05915251552227829,
  0.060609761660665395,
  0.06208358295061572,
  0.063573923795056,
  0.06508072797374453,
  0.06660393864539216,
  0.06814349834980615,
  0.06969934901005809,
  0.0712714319346745,
  0.07285968781985097,
  0.07446405675168938,
  0.0760844782084577,
  0.07772089106287344,
  0.0793732335844094,
  0.08104144344162223,
  0.0827254577045039,
  0.08442521284685561,
  0.08614064474868416,
  0.08787168869862061,
  0.08961827939636186,
  0.09138035095513325,
  0.09315783690417473,
  0.09495067019124787,
  0.09675878318516545,
  0.0985821076783428,
  0.10042057488937056,
  0.1022741154656096,
  0.10414265948580692,
  0.10602613646273357,
  0.1079244753458436,
  0.10983760452395408,
  0.11176545182794673,
  0.1137079445334902,
  0.11566500936378377,
  0.11763657249232101,
  0.11962255954567536,
  0.12162289560630529,
  0.12363750521538053,
  0.12566631237562886,
  0.12770924055420257,
  0.1297662126855657,
  0.13183715117440137,
  0.13392197789853838,
  0.13602061421189898,
  0.1381329809474649,
  0.1402589984202643,
  0.14239858643037745,
  0.14455166426596217,
  0.14671815070629868,
  0.14889796402485328,
  0.15109102199236146,
  0.15329724187992977,
  0.15551654046215668,
  0.15774883402027212,
  0.1599940383452954,
  0.16225206874121212,
  0.16452284002816892,
  0.16680626654568692,
  0.16910226215589297,
  0.17141074024676906,
  0.17373161373541962,
  0.17606479507135658,
  0.17841019623980203,
  0.18076772876500824,
  0.1831373037135955,
  0.18551883169790678,
  0.1879122228793798,
  0.19031738697193612,
  0.19273423324538658,
  0.19516267052885444,
  0.19760260721421435,
  0.20005395125954806,
  0.20251661019261674,
  0.20499049111434925,
  0.20747550070234622,
  0.20997154521440087,
  0.21247853049203536,
  0.21499636196405225,
  0.21752494465010247,
  0.22006418316426785,
  0.2226139817186597,
  0.22517424412703235,
  0.22774487380841102,
  0.2303257737907356,
  0.23291684671451895,
  0.2355179948365187,
  0.23812912003342568,
  0.24075012380556393,
  0.24338090728060802,
  0.24602137121731177,
  0.24867141600925197,
  0.2513309416885865,
  0.25399984792982444,
  0.2566780340536119,
  0.2593653990305288,
  0.2620618414849004,
  0.2647672596986222,
  0.2674815516149957,
  0.2702046148425794,
  0.272936346659051,
  0.2756766440150822,
  0.2784254035382263,
  0.28118252153681766,
  0.2839478940038831,
  0.28672141662106565,
  0.2895029847625594,
  0.29229249349905667,
  0.29508983760170626,
  0.2978949115460823,
  0.30070760951616615,
  0.303527825408337,
  0.30635545283537513,
  0.309190385130475,
  0.31203251535126864,
  0.3148817362838605,
  0.3177379404468714,
  0.3206010200954933,
  0.32347086722555374,
  0.32634737357758986,
  0.3292304306409326,
  0.3321199296577997,
  0.335015761627399,
  0.3379178173100396,
  0.340825987231253,
  0.3437401616859229,
  0.34666023074242347,
  0.3495860842467663,
  0.3525176118267561,
  0.3554547028961537,
  0.35839724665884803,
  0.3613451321130356,
  0.364298248055408,
  0.367256483085347,
  0.37021972560912597,
  0.3731878638441208,
  0.37616078582302565,
  0.37913837939807754,
  0.38212053224528636,
  0.385107131868672,
  0.38809806560450877,
  0.3910932206255743,
  0.3940924839454067,
  0.3970957424225666,
  0.40010288276490463,
  0.40311379153383575,
  0.4061283551486183,
  0.40914645989063825,
  0.41216799190769987,
  0.4151928372183196,
  0.4182208817160266,
  0.42125201117366684,
  0.42428611124771165,
  0.42732306748257215,
  0.43036276531491585,
  0.4334050900779891,
  0.43644992700594226,
  0.43949716123815885,
  0.44254667782358914,
  0.4455983617250855,
  0.4486520978237429,
  0.45170777092324094,
  0.45476526575418963,
  0.4578244669784776,
  0.460885259193623,
  0.46394752693712715,
  0.4670111546908299,
  0.47007602688526684,
  0.4731420279040302,
  0.4762090420881288,
  0.4792769537403521,
  0.48234564712963435,
  0.4854150064954201,
  0.48848491605203115,
  0.49155525999303445,
  0.4946259224956109,
  0.4976967877249241,
  0.50076773983849,
  0.5038386629905474,
  0.5069094413364271,
  0.5099799590369228,
  0.5130501002626607,
  0.5161197491984684,
  0.5191887900477443,
  0.5222571070368258,
  0.5253245844193564,
  0.5283911064806522,
  0.531456557542067,
  0.534520821965356,
  0.5375837841570382,
  0.5406453285727563,
  0.5437053397216364,
  0.5467637021706436,
  0.5498203005489378,
  0.5528750195522244,
  0.5559277439471046,
  0.558978358575423,
  0.5620267483586104,
  0.565072798302026,
  0.5681163934992949,
  0.5711574191366425,
  0.5741957604972264,
  0.5772313029654628,
  0.5802639320313512,
  0.5832935332947936,
  0.5863199924699095,
  0.5893431953893482,
  0.5923630280085946,
  0.595379376410272,
  0.5983921268084391,
  0.6014011655528819,
  0.6044063791334021,
  0.6074076541840977,
  0.6104048774876404,
  0.6133979359795466,
  0.6163867167524417,
  0.6193711070603203,
  0.6223509943227981,
  0.6253262661293602,
  0.6282968102436011,
  0.6312625146074574,
  0.6342232673454371,
  0.6371789567688378,
  0.6401294713799617,
  0.6430746998763204,
  0.6460145311548339,
  0.6489488543160223,
  0.6518775586681886,
  0.6548005337315943,
  0.6577176692426278,
  0.6606288551579629,
  0.6635339816587107,
  0.6664329391545624,
  0.6693256182879223,
  0.6722119099380344,
  0.675091705225098,
  0.6779648955143753,
  0.6808313724202893,
  0.6836910278105124,
  0.6865437538100456,
  0.689389442805288,
  0.6922279874480959,
  0.6950592806598326,
  0.6978832156354079,
  0.7006996858473067,
  0.7035085850496078,
  0.7063098072819918,
  0.709103246873738,
  0.7118887984477116,
  0.7146663569243369,
  0.7174358175255634,
  0.720197075778817,
  0.7229500275209416,
  0.725694568902128,
  0.7284305963898314,
  0.7311580067726783,
  0.7338766971643578,
  0.7365865650075044,
  0.7392875080775664,
  0.7419794244866618,
  0.7446622126874216,
  0.7473357714768221,
  0.7499999999999999,
  0.7526547977540592,
  0.755300064591861,
  0.7579357007258021,
  0.7605616067315792,
  0.7631776835519389,
  0.7657838325004158,
  0.7683799552650534,
  0.7709659539121142,
  0.7735417308897734,
  0.7761071890317994,
  0.7786622315612182,
  0.7812067620939651,
  0.7837406846425203,
  0.7862639036195297,
  0.7887763238414108,
  0.7912778505319435,
  0.7937683893258454,
  0.7962478462723304,
  0.7987161278386553,
  0.8011731409136453,
  0.8036187928112085,
  0.8060529912738315,
  0.808475644476059,
  0.8108866610279595,
  0.8132859499785707,
  0.8156734208193327,
  0.8180489834874998,
  0.8204125483695401,
  0.8227640263045148,
  0.8251033285874421,
  0.8274303669726424,
  0.8297450536770695,
  0.8320473013836196,
  0.834337023244426,
  0.8366141328841364,
  0.8388785444031694,
  0.8411301723809563,
  0.8433689318791624,
  0.8455947384448923,
  0.8478075081138745,
  0.8500071574136294,
  0.8521936033666186,
  0.8543667634933741,
  0.8565265558156103,
  0.8586728988593157,
  0.8608057116578284,
  0.8629249137548873,
  0.8650304252076702,
  0.8671221665898072,
  0.8692000589943786,
  0.8712640240368896,
  0.8733139838582298,
  0.8753498611276077,
  0.8773715790454695,
  0.8793790613463954,
  0.8813722323019773,
  0.8833510167236747,
  0.8853153399656513,
  0.8872651279275916,
  0.8892003070574949,
  0.8911208043544511,
  0.8930265473713936,
  0.8949174642178332,
  0.8967934835625686,
  0.898654534636379,
  0.9005005472346923,
  0.902331451720234,
  0.9041471790256541,
  0.9059476606561327,
  0.9077328286919637,
  0.9095026157911166,
  0.9112569551917773,
  0.9129957807148665,
  0.9147190267665359,
  0.9164266283406433,
  0.9181185210212033,
  0.9197946409848194,
  0.9214549250030899,
  0.9230993104449938,
  0.9247277352792532,
  0.9263401380766738,
  0.9279364580124613,
  0.9295166348685169,
  0.931080609035708,
  0.9326283215161177,
  0.9341597139252698,
  0.935674728494331,
  0.937173308072291,
  0.9386553961281179,
  0.9401209367528907,
  0.9415698746619078,
  0.9430021551967743,
  0.9444177243274616,
  0.9458165286543475,
  0.9471985154102291,
  0.9485636324623146,
  0.9499118283141887,
  0.9512430521077563,
  0.9525572536251606,
  0.9538543832906772,
  0.9551343921725842,
  0.9563972319850091,
  0.957642855089749,
  0.958871214498068,
  0.9600822638724704,
  0.9612759575284481,
  0.9624522504362039,
  0.9636110982223505,
  0.9647524571715842,
  0.9658762842283343,
  0.9669825369983864,
  0.968071173750483,
  0.9691421534178966,
  0.970195435599979,
  0.9712309805636863,
  0.9722487492450764,
  0.9732487032507835,
  0.9742308048594664,
  0.9751950170232309,
  0.9761413033690276,
  0.9770696282000244,
  0.9779799564969529,
  0.978872253919429,
  0.9797464868072486,
  0.9806026221816581,
  0.9814406277465968,
  0.982260471889917,
  0.9830621236845754,
  0.9838455528897998,
  0.9846107299522304,
  0.9853576260070347,
  0.9860862128789953,
  0.9867964630835742,
  0.9874883498279483,
  0.9881618470120215,
  0.9888169292294076,
  0.9894535717683901,
  0.990071750612854,
  0.9906714424431913,
  0.9912526246371813,
  0.9918152752708436,
  0.9923593731192655,
  0.9928848976574018,
  0.9933918290608507,
  0.9938801482065998,
  0.9943498366737487,
  0.9948008767442034,
  0.9952332514033447,
  0.9956469443406706,
  0.9960419399504106,
  0.9964182233321149,
  0.9967757802912172,
  0.9971145973395684,
  0.9974346616959475,
  0.9977359612865423,
  0.9980184847454051,
  0.998282221414882,
  0.9985271613460143,
  0.9987532952989144,
  0.9989606147431138,
  0.9991491118578855,
  0.999318779532538,
  0.999469611366685,
  0.9996016016704854,
  0.999714745464859,
  0.9998090384816739,
  0.9998844771639073,
  0.99994105866578,
  0.9999787808528637,
  0.9999976423021616,
  0.9999976423021616,
  0.9999787808528637,
  0.99994105866578,
  0.9998844771639073,
  0.9998090384816739,
  0.999714745464859,
  0.9996016016704854,
  0.999469611366685,
  0.999318779532538,
  0.9991491118578855,
  0.9989606147431139,
  0.9987532952989144,
  0.9985271613460144,
  0.998282221414882,
  0.9980184847454051,
  0.9977359612865423,
  0.9974346616959475,
  0.9971145973395684,
  0.996775780291217,
  0.9964182233321149,
  0.9960419399504106,
  0.9956469443406706,
  0.9952332514033448,
  0.9948008767442034,
  0.9943498366737487,
  0.9938801482065998,
  0.9933918290608508,
  0.9928848976574018,
  0.9923593731192655,
  0.9918152752708437,
  0.9912526246371813,
  0.9906714424431913,
  0.990071750612854,
  0.9894535717683901,
  0.9888169292294076,
  0.9881618470120215,
  0.9874883498279484,
  0.9867964630835742,
  0.9860862128789953,
  0.9853576260070347,
  0.9846107299522304,
  0.9838455528897998,
  0.9830621236845754,
  0.982260471889917,
  0.9814406277465968,
  0.9806026221816581,
  0.9797464868072487,
  0.978872253919429,
  0.9779799564969529,
  0.9770696282000244,
  0.9761413033690276,
  0.9751950170232309,
  0.9742308048594666,
  0.9732487032507837,
  0.9722487492450764,
  0.9712309805636864,
  0.9701954355999791,
  0.9691421534178966,
  0.968071173750483,
  0.9669825369983864,
  0.9658762842283342,
  0.9647524571715842,
  0.9636110982223505,
  0.962452250436204,
  0.9612759575284482,
  0.9600822638724705,
  0.9588712144980681,
  0.9576428550897489,
  0.9563972319850091,
  0.9551343921725843,
  0.9538543832906772,
  0.9525572536251605,
  0.9512430521077564,
  0.9499118283141887,
  0.9485636324623146,
  0.9471985154102293,
  0.9458165286543476,
  0.9444177243274617,
  0.9430021551967742,
  0.9415698746619079,
  0.9401209367528907,
  0.938655396128118,
  0.937173308072291,
  0.9356747284943311,
  0.9341597139252698,
  0.932628321516118,
  0.9310806090357082,
  0.9295166348685169,
  0.9279364580124614,
  0.9263401380766738,
  0.9247277352792533,
  0.9230993104449937,
  0.92145492500309,
  0.9197946409848194,
  0.9181185210212034,
  0.9164266283406433,
  0.9147190267665362,
  0.9129957807148665,
  0.9112569551917774,
  0.9095026157911167,
  0.9077328286919637,
  0.9059476606561327,
  0.9041471790256541,
  0.9023314517202341,
  0.9005005472346923,
  0.8986545346363792,
  0.8967934835625688,
  0.8949174642178331,
  0.8930265473713939,
  0.8911208043544512,
  0.889200307057495,
  0.8872651279275915,
  0.8853153399656515,
  0.8833510167236747,
  0.8813722323019773,
  0.8793790613463955,
  0.8773715790454696,
  0.8753498611276078,
  0.8733139838582299,
  0.8712640240368899,
  0.8692000589943785,
  0.8671221665898073,
  0.8650304252076703,
  0.8629249137548874,
  0.8608057116578283,
  0.858672898859316,
  0.8565265558156102,
  0.8543667634933743,
  0.8521936033666189,
  0.8500071574136296,
  0.8478075081138745,
  0.8455947384448924,
  0.8433689318791626,
  0.8411301723809563,
  0.8388785444031694,
  0.8366141328841366,
  0.8343370232444263,
  0.8320473013836195,
  0.8297450536770697,
  0.8274303669726426,
  0.8251033285874423,
  0.8227640263045148,
  0.8204125483695403,
  0.8180489834875,
  0.8156734208193328,
  0.8132859499785706,
  0.8108866610279596,
  0.8084756444760592,
  0.8060529912738317,
  0.8036187928112086,
  0.8011731409136454,
  0.7987161278386554,
  0.7962478462723304,
  0.7937683893258455,
  0.7912778505319438,
  0.7887763238414112,
  0.7862639036195296,
  0.7837406846425203,
  0.7812067620939651,
  0.7786622315612183,
  0.7761071890317995,
  0.7735417308897737,
  0.7709659539121145,
  0.7683799552650534,
  0.7657838325004158,
  0.763177683551939,
  0.7605616067315796,
  0.7579357007258022,
  0.755300064591861,
  0.7526547977540594,
  0.7500000000000002,
  0.747335771476822,
  0.7446622126874216,
  0.7419794244866621,
  0.7392875080775665,
  0.7365865650075045,
  0.7338766971643579,
  0.7311580067726784,
  0.7284305963898313,
  0.7256945689021281,
  0.722950027520942,
  0.7201970757788175,
  0.7174358175255635,
  0.714666356924337,
  0.7118887984477117,
  0.7091032468737379,
  0.706309807281992,
  0.7035085850496081,
  0.700699685847307,
  0.6978832156354079,
  0.6950592806598327,
  0.6922279874480959,
  0.6893894428052881,
  0.6865437538100458,
  0.6836910278105126,
  0.6808313724202896,
  0.6779648955143752,
  0.675091705225098,
  0.6722119099380344,
  0.6693256182879228,
  0.6664329391545625,
  0.6635339816587109,
  0.6606288551579631,
  0.6577176692426275,
  0.6548005337315942,
  0.6518775586681885,
  0.6489488543160228,
  0.646014531154834,
  0.6430746998763205,
  0.6401294713799619,
  0.6371789567688381,
  0.6342232673454369,
  0.6312625146074577,
  0.6282968102436013,
  0.6253262661293603,
  0.6223509943227981,
  0.6193711070603203,
  0.6163867167524419,
  0.6133979359795464,
  0.6104048774876407,
  0.607407654184098,
  0.6044063791334024,
  0.601401165552882,
  0.5983921268084391,
  0.5953793764102722,
  0.5923630280085943,
  0.5893431953893483,
  0.5863199924699097,
  0.5832935332947938,
  0.5802639320313512,
  0.5772313029654628,
  0.5741957604972264,
  0.5711574191366431,
  0.568116393499295,
  0.5650727983020263,
  0.5620267483586107,
  0.5589783585754229,
  0.5559277439471045,
  0.5528750195522243,
  0.5498203005489383,
  0.5467637021706437,
  0.5437053397216365,
  0.5406453285727565,
  0.5375837841570384,
  0.5345208219653559,
  0.5314565575420669,
  0.5283911064806526,
  0.5253245844193564,
  0.5222571070368258,
  0.5191887900477444,
  0.5161197491984686,
  0.5130501002626605,
  0.5099799590369232,
  0.5069094413364275,
  0.5038386629905477,
  0.50076773983849,
  0.4976967877249241,
  0.494625922495611,
  0.4915552599930341,
  0.48848491605203126,
  0.4854150064954203,
  0.4823456471296347,
  0.4792769537403521,
  0.4762090420881288,
  0.4731420279040302,
  0.4700760268852674,
  0.46701115469083,
  0.4639475269371274,
  0.4608852591936232,
  0.4578244669784774,
  0.4547652657541895,
  0.451707770923241,
  0.44865209782374343,
  0.4455983617250856,
  0.44254667782358925,
  0.43949716123815913,
  0.43644992700594254,
  0.433405090077989,
  0.4303627653149158,
  0.4273230674825725,
  0.42428611124771165,
  0.4212520111736669,
  0.41822088171602684,
  0.41519283721831984,
  0.4121679919076997,
  0.4091464598906386,
  0.4061283551486186,
  0.4031137915338362,
  0.4001028827649047,
  0.3970957424225666,
  0.3940924839454068,
  0.39109322062557395,
  0.3880980656045089,
  0.38510713186867235,
  0.3821205322452867,
  0.37913837939807754,
  0.3761607858230257,
  0.3731878638441208,
  0.3702197256091265,
  0.3672564830853471,
  0.3642982480554083,
  0.3613451321130358,
  0.35839724665884787,
  0.35545470289615366,
  0.35251761182675617,
  0.34958608424676685,
  0.3466602307424236,
  0.34374016168592303,
  0.34082598723125324,
  0.33791781731003984,
  0.3350157616273989,
  0.33211992965779963,
  0.32923043064093294,
  0.32634737357758986,
  0.32347086722555385,
  0.3206010200954935,
  0.31773794044687165,
  0.31488173628386035,
  0.31203251535126897,
  0.3091903851304753,
  0.30635545283537513,
  0.303527825408337,
  0.30070760951616615,
  0.2978949115460824,
  0.295089837601706,
  0.29229249349905695,
  0.28950298476255976,
  0.286721416621066,
  0.2839478940038831,
  0.28118252153681766,
  0.2784254035382264,
  0.2756766440150823,
  0.2729363466590511,
  0.27020461484257957,
  0.26748155161499587,
  0.26476725969862214,
  0.26206184148490047,
  0.2593653990305288,
  0.25667803405361234,
  0.25399984792982455,
  0.25133094168858655,
  0.24867141600925213,
  0.2460213712173116,
  0.24338090728060796,
  0.24075012380556388,
  0.23812912003342596,
  0.2355179948365188,
  0.23291684671451907,
  0.23032577379073582,
  0.22774487380841119,
  0.22517424412703219,
  0.22261398171865998,
  0.22006418316426812,
  0.21752494465010247,
  0.2149963619640523,
  0.21247853049203547,
  0.20997154521440103,
  0.207475500702346,
  0.20499049111434942,
  0.20251661019261702,
  0.20005395125954833,
  0.1976026072142143,
  0.19516267052885444,
  0.19273423324538663,
  0.1903173869719359,
  0.18791222287938003,
  0.185518831697907,
  0.1831373037135957,
  0.18076772876500818,
  0.17841019623980203,
  0.17606479507135664,
  0.17373161373542,
  0.17141074024676917,
  0.16910226215589308,
  0.1668062665456871,
  0.1645228400281688,
  0.162252068741212,
  0.15999403834529535,
  0.15774883402027245,
  0.15551654046215674,
  0.15329724187992988,
  0.15109102199236157,
  0.14889796402485345,
  0.14671815070629857,
  0.1445516642659624,
  0.14239858643037773,
  0.1402589984202643,
  0.13813298094746496,
  0.13602061421189904,
  0.1339219778985385,
  0.1318371511744012,
  0.12976621268556593,
  0.1277092405542028,
  0.12566631237562909,
  0.12363750521538053,
  0.12162289560630529,
  0.11962255954567541,
  0.11763657249232085,
  0.11566500936378388,
  0.11370794453349042,
  0.11176545182794695,
  0.10983760452395402,
  0.1079244753458436,
  0.10602613646273362,
  0.10414265948580725,
  0.10227411546560966,
  0.10042057488937067,
  0.09858210767834297,
  0.0967587831851654,
  0.09495067019124781,
  0.09315783690417467,
  0.09138035095513353,
  0.08961827939636186,
  0.08787168869862072,
  0.08614064474868421,
  0.08442521284685572,
  0.08272545770450385,
  0.0810414434416224,
  0.07937323358440962,
  0.0777208910628735,
  0.0760844782084577,
  0.07446405675168943,
  0.07285968781985108,
  0.07127143193467439,
  0.0696993490100582,
  0.06814349834980632,
  0.06660393864539232,
  0.06508072797374453,
  0.063573923795056,
  0.06208358295061578,
  0.060609761660665284,
  0.059152515522278404,
  0.05771189950726202,
  0.056287967960084506,
  0.05488077459582419,
  0.05349037249814442,
  0.052116814117289745,
  0.05076015126810807,
  0.0494204351280953,
  0.04809771623546638,
  0.04679204448724711,
  0.045503469137392505,
  0.04423203879492932,
  0.04297780142212154,
  0.041740804332661585,
  0.0405210941898847,
  0.039318717005010495,
  0.03813371813540528,
  0.03696614228287198,
  0.03581603349196366,
  0.03468343514832262,
  0.03356838997704237,
  0.03247094004105716,
  0.03139112673955513,
  0.03032899080641599,
  0.029284572308674595,
  0.02825791064500982,
  0.02724904454425847,
  0.02625801206395323,
  0.025284850588888075,
  0.02432959682970809,
  0.023392286821523778,
  0.022472955922552162,
  0.02157163881278301,
  0.02068836949267089,
  0.01982318128185162,
  0.01897610681788625,
  0.018147178055029578,
  0.01733642626302484,
  0.01654388202592383,
  0.01576957524093342,
  0.015013535117287646,
  0.014275790175145908,
  0.013556368244517114,
  0.012855296464209631,
  0.012172601280808104,
  0.011508308447674975,
  0.010862443023979707,
  0.010235029373752758,
  0.009626091164967598,
  0.009035651368646702,
  0.008463732257995571,
  0.007910355407562741,
  0.007375541692425325,
  0.006859311287402137,
  0.006361683666291973,
  0.0058826776011399184,
  0.005422311161528248,
  0.004980601713895361,
  0.004557565920880524,
  0.004153219740695491,
  0.0037675784265219225,
  0.003400656525936685,
  0.003052467880362675,
  0.0027230256245468487,
  0.0024123421860645644,
  0.0021204292848509554,
  0.0018472979327587291,
  0.0015929584331427216,
  0.0013574203804713747,
  0.0011406926599646372,
  9427834472588992e-19,
  7637002080985167e-19,
  6034496980542037e-19,
  4620379622682358e-19,
  33947033522635506e-20,
  23575144055643094e-20,
  15088519085437735e-20,
  8487478753615996e-20,
  3772272071722593e-20,
  943076911874563e-20,
  0,
);
var WRE = Float64Array.of(
  1,
  0.9999811752826011,
  0.9999247018391445,
  0.9998305817958234,
  0.9996988186962042,
  0.9995294175010931,
  0.9993223845883495,
  0.9990777277526454,
  0.9987954562051724,
  0.9984755805732948,
  0.9981181129001492,
  0.9977230666441916,
  0.9972904566786902,
  0.9968202992911657,
  0.996312612182778,
  0.9957674144676598,
  0.9951847266721969,
  0.9945645707342554,
  0.9939069700023561,
  0.9932119492347945,
  0.99247953459871,
  0.9917097536690995,
  0.99090263542778,
  0.9900582102622971,
  0.989176509964781,
  0.9882575677307495,
  0.9873014181578584,
  0.9863080972445987,
  0.9852776423889412,
  0.984210092386929,
  0.9831054874312163,
  0.9819638691095552,
  0.9807852804032304,
  0.9795697656854405,
  0.9783173707196277,
  0.9770281426577544,
  0.9757021300385286,
  0.9743393827855759,
  0.9729399522055602,
  0.9715038909862518,
  0.970031253194544,
  0.9685220942744174,
  0.9669764710448521,
  0.9653944416976894,
  0.9637760657954398,
  0.9621214042690416,
  0.9604305194155658,
  0.9587034748958716,
  0.9569403357322088,
  0.9551411683057708,
  0.9533060403541939,
  0.9514350209690083,
  0.9495281805930367,
  0.9475855910177411,
  0.9456073253805213,
  0.9435934581619604,
  0.9415440651830208,
  0.9394592236021899,
  0.937339011912575,
  0.9351835099389476,
  0.932992798834739,
  0.9307669610789837,
  0.9285060804732156,
  0.9262102421383114,
  0.9238795325112867,
  0.921514039342042,
  0.9191138516900578,
  0.9166790599210427,
  0.9142097557035307,
  0.9117060320054299,
  0.9091679830905224,
  0.9065957045149153,
  0.9039892931234433,
  0.901348847046022,
  0.8986744656939538,
  0.8959662497561852,
  0.8932243011955153,
  0.8904487232447579,
  0.8876396204028539,
  0.8847970984309378,
  0.881921264348355,
  0.8790122264286335,
  0.8760700941954066,
  0.8730949784182901,
  0.8700869911087115,
  0.8670462455156926,
  0.8639728561215868,
  0.8608669386377673,
  0.8577286100002721,
  0.8545579883654005,
  0.8513551931052652,
  0.8481203448032972,
  0.8448535652497071,
  0.8415549774368984,
  0.8382247055548381,
  0.83486287498638,
  0.8314696123025452,
  0.8280450452577558,
  0.8245893027850253,
  0.8211025149911046,
  0.8175848131515837,
  0.8140363297059484,
  0.8104571982525948,
  0.8068475535437993,
  0.8032075314806449,
  0.799537269107905,
  0.7958369046088836,
  0.7921065773002124,
  0.7883464276266063,
  0.7845565971555752,
  0.7807372285720945,
  0.7768884656732324,
  0.773010453362737,
  0.7691033376455797,
  0.765167265622459,
  0.7612023854842618,
  0.7572088465064846,
  0.7531867990436125,
  0.7491363945234594,
  0.7450577854414661,
  0.7409511253549591,
  0.7368165688773699,
  0.7326542716724128,
  0.7284643904482252,
  0.724247082951467,
  0.7200025079613817,
  0.7157308252838186,
  0.7114321957452164,
  0.7071067811865476,
  0.7027547444572253,
  0.6983762494089729,
  0.693971460889654,
  0.6895405447370669,
  0.6850836677727004,
  0.6806009977954531,
  0.676092703575316,
  0.6715589548470183,
  0.6669999223036375,
  0.6624157775901718,
  0.6578066932970786,
  0.6531728429537768,
  0.6485144010221126,
  0.6438315428897915,
  0.6391244448637757,
  0.6343932841636455,
  0.6296382389149271,
  0.6248594881423865,
  0.6200572117632892,
  0.6152315905806268,
  0.6103828062763095,
  0.6055110414043255,
  0.600616479383869,
  0.5956993044924335,
  0.5907597018588743,
  0.5857978574564389,
  0.5808139580957645,
  0.5758081914178453,
  0.5707807458869674,
  0.5657318107836132,
  0.560661576197336,
  0.5555702330196023,
  0.5504579729366048,
  0.5453249884220465,
  0.540171472729893,
  0.5349976198870973,
  0.5298036246862948,
  0.5245896826784688,
  0.5193559901655895,
  0.5141027441932217,
  0.508830142543107,
  0.5035383837257176,
  0.49822766697278187,
  0.4928981922297841,
  0.48755016014843605,
  0.48218377207912283,
  0.47679923006332225,
  0.4713967368259978,
  0.4659764957679661,
  0.46053871095824,
  0.45508358712634384,
  0.4496113296546066,
  0.44412214457042926,
  0.4386162385385277,
  0.433093818853152,
  0.4275550934302822,
  0.4220002707997998,
  0.4164295600976373,
  0.4108431710579039,
  0.40524131400498986,
  0.3996241998456468,
  0.3939920400610481,
  0.3883450466988263,
  0.38268343236508984,
  0.3770074102164183,
  0.3713171939518376,
  0.36561299780477396,
  0.3598950365349883,
  0.3541635254204905,
  0.3484186802494345,
  0.3426607173119944,
  0.33688985339222005,
  0.33110630575987643,
  0.325310292162263,
  0.31950203081601575,
  0.3136817403988916,
  0.307849640041535,
  0.3020059493192282,
  0.29615088824362396,
  0.29028467725446233,
  0.2844075372112718,
  0.27851968938505306,
  0.272621355449949,
  0.2667127574748984,
  0.26079411791527557,
  0.2548656596045146,
  0.24892760574572026,
  0.24298017990326398,
  0.23702360599436734,
  0.23105810828067128,
  0.22508391135979278,
  0.21910124015686977,
  0.21311031991609136,
  0.20711137619221856,
  0.20110463484209196,
  0.19509032201612833,
  0.18906866414980628,
  0.18303988795514106,
  0.17700422041214886,
  0.17096188876030136,
  0.1649131204899701,
  0.1588581433338614,
  0.1527971852584434,
  0.14673047445536175,
  0.14065823933284924,
  0.13458070850712622,
  0.12849811079379322,
  0.12241067519921628,
  0.11631863091190488,
  0.11022220729388318,
  0.10412163387205473,
  0.09801714032956077,
  0.0919089564971327,
  0.08579731234443988,
  0.07968243797143013,
  0.07356456359966745,
  0.0674439195636641,
  0.06132073630220865,
  0.05519524434969003,
  0.049067674327418126,
  0.04293825693494096,
  0.03680722294135899,
  0.03067480317663658,
  0.024541228522912264,
  0.01840672990580482,
  0.012271538285719944,
  0.006135884649154515,
  6123233995736766e-32,
  -0.006135884649154393,
  -0.012271538285719823,
  -0.018406729905804695,
  -0.024541228522912142,
  -0.03067480317663646,
  -0.036807222941358866,
  -0.042938256934940834,
  -0.04906767432741801,
  -0.05519524434968991,
  -0.06132073630220853,
  -0.06744391956366398,
  -0.07356456359966733,
  -0.07968243797143001,
  -0.08579731234443976,
  -0.09190895649713257,
  -0.09801714032956065,
  -0.1041216338720546,
  -0.11022220729388306,
  -0.11631863091190475,
  -0.12241067519921615,
  -0.1284981107937931,
  -0.1345807085071261,
  -0.14065823933284913,
  -0.14673047445536164,
  -0.1527971852584433,
  -0.15885814333386128,
  -0.16491312048996995,
  -0.17096188876030124,
  -0.17700422041214875,
  -0.18303988795514092,
  -0.18906866414980616,
  -0.1950903220161282,
  -0.20110463484209182,
  -0.20711137619221845,
  -0.21311031991609125,
  -0.21910124015686966,
  -0.22508391135979267,
  -0.23105810828067114,
  -0.23702360599436723,
  -0.24298017990326387,
  -0.24892760574572012,
  -0.2548656596045145,
  -0.26079411791527546,
  -0.2667127574748983,
  -0.27262135544994887,
  -0.27851968938505295,
  -0.2844075372112717,
  -0.29028467725446216,
  -0.29615088824362384,
  -0.3020059493192281,
  -0.30784964004153487,
  -0.3136817403988914,
  -0.31950203081601564,
  -0.32531029216226287,
  -0.3311063057598763,
  -0.33688985339221994,
  -0.34266071731199427,
  -0.3484186802494344,
  -0.3541635254204904,
  -0.35989503653498817,
  -0.36561299780477385,
  -0.3713171939518375,
  -0.3770074102164182,
  -0.3826834323650897,
  -0.3883450466988262,
  -0.393992040061048,
  -0.3996241998456467,
  -0.40524131400498975,
  -0.4108431710579038,
  -0.416429560097637,
  -0.4220002707997997,
  -0.42755509343028186,
  -0.4330938188531519,
  -0.4386162385385274,
  -0.44412214457042914,
  -0.4496113296546067,
  -0.4550835871263437,
  -0.46053871095824006,
  -0.465976495767966,
  -0.4713967368259977,
  -0.4767992300633219,
  -0.4821837720791227,
  -0.4875501601484357,
  -0.492898192229784,
  -0.4982276669727816,
  -0.5035383837257175,
  -0.5088301425431071,
  -0.5141027441932217,
  -0.5193559901655896,
  -0.5245896826784687,
  -0.5298036246862947,
  -0.534997619887097,
  -0.5401714727298929,
  -0.5453249884220462,
  -0.5504579729366047,
  -0.555570233019602,
  -0.5606615761973359,
  -0.5657318107836132,
  -0.5707807458869671,
  -0.5758081914178453,
  -0.5808139580957644,
  -0.5857978574564389,
  -0.590759701858874,
  -0.5956993044924334,
  -0.6006164793838688,
  -0.6055110414043254,
  -0.6103828062763096,
  -0.6152315905806267,
  -0.6200572117632892,
  -0.6248594881423862,
  -0.6296382389149271,
  -0.6343932841636454,
  -0.6391244448637757,
  -0.6438315428897913,
  -0.6485144010221124,
  -0.6531728429537765,
  -0.6578066932970786,
  -0.6624157775901719,
  -0.6669999223036374,
  -0.6715589548470184,
  -0.6760927035753158,
  -0.680600997795453,
  -0.6850836677727002,
  -0.6895405447370669,
  -0.6939714608896538,
  -0.6983762494089728,
  -0.7027547444572251,
  -0.7071067811865475,
  -0.7114321957452165,
  -0.7157308252838186,
  -0.7200025079613817,
  -0.7242470829514668,
  -0.7284643904482252,
  -0.7326542716724127,
  -0.7368165688773699,
  -0.7409511253549589,
  -0.745057785441466,
  -0.7491363945234591,
  -0.7531867990436124,
  -0.7572088465064846,
  -0.7612023854842617,
  -0.765167265622459,
  -0.7691033376455795,
  -0.773010453362737,
  -0.7768884656732323,
  -0.7807372285720945,
  -0.784556597155575,
  -0.7883464276266062,
  -0.7921065773002122,
  -0.7958369046088835,
  -0.7995372691079051,
  -0.8032075314806448,
  -0.8068475535437993,
  -0.8104571982525947,
  -0.8140363297059484,
  -0.8175848131515836,
  -0.8211025149911046,
  -0.8245893027850251,
  -0.8280450452577557,
  -0.8314696123025453,
  -0.83486287498638,
  -0.8382247055548381,
  -0.8415549774368983,
  -0.8448535652497071,
  -0.8481203448032971,
  -0.8513551931052652,
  -0.8545579883654004,
  -0.857728610000272,
  -0.8608669386377671,
  -0.8639728561215867,
  -0.8670462455156928,
  -0.8700869911087113,
  -0.8730949784182901,
  -0.8760700941954065,
  -0.8790122264286335,
  -0.8819212643483549,
  -0.8847970984309378,
  -0.8876396204028538,
  -0.8904487232447579,
  -0.8932243011955152,
  -0.8959662497561851,
  -0.8986744656939539,
  -0.9013488470460219,
  -0.9039892931234433,
  -0.9065957045149153,
  -0.9091679830905224,
  -0.9117060320054298,
  -0.9142097557035307,
  -0.9166790599210426,
  -0.9191138516900578,
  -0.9215140393420418,
  -0.9238795325112867,
  -0.9262102421383114,
  -0.9285060804732155,
  -0.9307669610789837,
  -0.9329927988347388,
  -0.9351835099389476,
  -0.9373390119125748,
  -0.9394592236021899,
  -0.9415440651830207,
  -0.9435934581619604,
  -0.9456073253805212,
  -0.9475855910177411,
  -0.9495281805930367,
  -0.9514350209690083,
  -0.9533060403541939,
  -0.9551411683057707,
  -0.9569403357322088,
  -0.9587034748958715,
  -0.9604305194155658,
  -0.9621214042690415,
  -0.9637760657954398,
  -0.9653944416976893,
  -0.9669764710448521,
  -0.9685220942744174,
  -0.970031253194544,
  -0.9715038909862518,
  -0.9729399522055601,
  -0.9743393827855759,
  -0.9757021300385285,
  -0.9770281426577544,
  -0.9783173707196275,
  -0.9795697656854405,
  -0.9807852804032304,
  -0.9819638691095552,
  -0.9831054874312163,
  -0.984210092386929,
  -0.9852776423889412,
  -0.9863080972445986,
  -0.9873014181578584,
  -0.9882575677307495,
  -0.989176509964781,
  -0.990058210262297,
  -0.99090263542778,
  -0.9917097536690995,
  -0.99247953459871,
  -0.9932119492347945,
  -0.9939069700023561,
  -0.9945645707342554,
  -0.9951847266721968,
  -0.9957674144676598,
  -0.996312612182778,
  -0.9968202992911657,
  -0.9972904566786902,
  -0.9977230666441916,
  -0.9981181129001492,
  -0.9984755805732948,
  -0.9987954562051724,
  -0.9990777277526454,
  -0.9993223845883495,
  -0.9995294175010931,
  -0.9996988186962042,
  -0.9998305817958234,
  -0.9999247018391445,
  -0.9999811752826011,
);
var WIM = Float64Array.of(
  -0,
  -0.006135884649154475,
  -0.012271538285719925,
  -0.01840672990580482,
  -0.024541228522912288,
  -0.030674803176636626,
  -0.03680722294135883,
  -0.04293825693494082,
  -0.049067674327418015,
  -0.055195244349689934,
  -0.06132073630220858,
  -0.06744391956366405,
  -0.07356456359966743,
  -0.07968243797143013,
  -0.0857973123444399,
  -0.09190895649713272,
  -0.0980171403295606,
  -0.10412163387205459,
  -0.11022220729388306,
  -0.11631863091190475,
  -0.1224106751992162,
  -0.12849811079379317,
  -0.13458070850712617,
  -0.1406582393328492,
  -0.14673047445536175,
  -0.15279718525844344,
  -0.15885814333386145,
  -0.16491312048996992,
  -0.17096188876030122,
  -0.17700422041214875,
  -0.18303988795514095,
  -0.1890686641498062,
  -0.19509032201612825,
  -0.2011046348420919,
  -0.20711137619221856,
  -0.21311031991609136,
  -0.2191012401568698,
  -0.22508391135979283,
  -0.2310581082806711,
  -0.2370236059943672,
  -0.24298017990326387,
  -0.24892760574572015,
  -0.25486565960451457,
  -0.2607941179152755,
  -0.26671275747489837,
  -0.272621355449949,
  -0.27851968938505306,
  -0.2844075372112719,
  -0.29028467725446233,
  -0.2961508882436238,
  -0.3020059493192281,
  -0.30784964004153487,
  -0.3136817403988915,
  -0.3195020308160157,
  -0.3253102921622629,
  -0.33110630575987643,
  -0.33688985339222005,
  -0.3426607173119944,
  -0.34841868024943456,
  -0.35416352542049034,
  -0.3598950365349881,
  -0.36561299780477385,
  -0.37131719395183754,
  -0.37700741021641826,
  -0.3826834323650898,
  -0.38834504669882625,
  -0.3939920400610481,
  -0.3996241998456468,
  -0.40524131400498986,
  -0.4108431710579039,
  -0.41642956009763715,
  -0.4220002707997997,
  -0.4275550934302821,
  -0.43309381885315196,
  -0.43861623853852766,
  -0.4441221445704292,
  -0.44961132965460654,
  -0.45508358712634384,
  -0.46053871095824,
  -0.4659764957679662,
  -0.47139673682599764,
  -0.4767992300633221,
  -0.4821837720791227,
  -0.487550160148436,
  -0.49289819222978404,
  -0.49822766697278187,
  -0.5035383837257176,
  -0.508830142543107,
  -0.5141027441932217,
  -0.5193559901655896,
  -0.524589682678469,
  -0.5298036246862946,
  -0.5349976198870972,
  -0.5401714727298929,
  -0.5453249884220465,
  -0.5504579729366048,
  -0.5555702330196022,
  -0.560661576197336,
  -0.5657318107836131,
  -0.5707807458869673,
  -0.5758081914178453,
  -0.5808139580957645,
  -0.5857978574564389,
  -0.5907597018588742,
  -0.5956993044924334,
  -0.600616479383869,
  -0.6055110414043255,
  -0.6103828062763095,
  -0.6152315905806268,
  -0.6200572117632891,
  -0.6248594881423863,
  -0.629638238914927,
  -0.6343932841636455,
  -0.6391244448637757,
  -0.6438315428897914,
  -0.6485144010221124,
  -0.6531728429537768,
  -0.6578066932970786,
  -0.6624157775901718,
  -0.6669999223036375,
  -0.6715589548470183,
  -0.6760927035753159,
  -0.680600997795453,
  -0.6850836677727004,
  -0.6895405447370668,
  -0.693971460889654,
  -0.6983762494089729,
  -0.7027547444572253,
  -0.7071067811865475,
  -0.7114321957452164,
  -0.7157308252838186,
  -0.7200025079613817,
  -0.7242470829514669,
  -0.7284643904482252,
  -0.7326542716724128,
  -0.7368165688773698,
  -0.7409511253549591,
  -0.745057785441466,
  -0.7491363945234593,
  -0.7531867990436124,
  -0.7572088465064845,
  -0.7612023854842618,
  -0.765167265622459,
  -0.7691033376455796,
  -0.773010453362737,
  -0.7768884656732324,
  -0.7807372285720944,
  -0.7845565971555752,
  -0.7883464276266062,
  -0.7921065773002124,
  -0.7958369046088835,
  -0.799537269107905,
  -0.8032075314806448,
  -0.8068475535437992,
  -0.8104571982525948,
  -0.8140363297059483,
  -0.8175848131515837,
  -0.8211025149911046,
  -0.8245893027850253,
  -0.8280450452577558,
  -0.8314696123025452,
  -0.83486287498638,
  -0.838224705554838,
  -0.8415549774368983,
  -0.844853565249707,
  -0.8481203448032971,
  -0.8513551931052652,
  -0.8545579883654005,
  -0.8577286100002721,
  -0.8608669386377673,
  -0.8639728561215867,
  -0.8670462455156926,
  -0.8700869911087113,
  -0.8730949784182901,
  -0.8760700941954066,
  -0.8790122264286334,
  -0.8819212643483549,
  -0.8847970984309378,
  -0.8876396204028539,
  -0.8904487232447579,
  -0.8932243011955153,
  -0.8959662497561851,
  -0.8986744656939538,
  -0.901348847046022,
  -0.9039892931234433,
  -0.9065957045149153,
  -0.9091679830905223,
  -0.9117060320054299,
  -0.9142097557035307,
  -0.9166790599210427,
  -0.9191138516900578,
  -0.9215140393420419,
  -0.9238795325112867,
  -0.9262102421383113,
  -0.9285060804732155,
  -0.9307669610789837,
  -0.9329927988347388,
  -0.9351835099389475,
  -0.937339011912575,
  -0.9394592236021899,
  -0.9415440651830208,
  -0.9435934581619604,
  -0.9456073253805213,
  -0.9475855910177411,
  -0.9495281805930367,
  -0.9514350209690083,
  -0.9533060403541938,
  -0.9551411683057707,
  -0.9569403357322089,
  -0.9587034748958716,
  -0.9604305194155658,
  -0.9621214042690416,
  -0.9637760657954398,
  -0.9653944416976894,
  -0.9669764710448521,
  -0.9685220942744173,
  -0.970031253194544,
  -0.9715038909862518,
  -0.9729399522055601,
  -0.9743393827855759,
  -0.9757021300385286,
  -0.9770281426577544,
  -0.9783173707196277,
  -0.9795697656854405,
  -0.9807852804032304,
  -0.9819638691095552,
  -0.9831054874312163,
  -0.984210092386929,
  -0.9852776423889412,
  -0.9863080972445987,
  -0.9873014181578584,
  -0.9882575677307495,
  -0.989176509964781,
  -0.9900582102622971,
  -0.99090263542778,
  -0.9917097536690995,
  -0.99247953459871,
  -0.9932119492347945,
  -0.9939069700023561,
  -0.9945645707342554,
  -0.9951847266721968,
  -0.9957674144676598,
  -0.996312612182778,
  -0.9968202992911657,
  -0.9972904566786902,
  -0.9977230666441916,
  -0.9981181129001492,
  -0.9984755805732948,
  -0.9987954562051724,
  -0.9990777277526454,
  -0.9993223845883495,
  -0.9995294175010931,
  -0.9996988186962042,
  -0.9998305817958234,
  -0.9999247018391445,
  -0.9999811752826011,
  -1,
  -0.9999811752826011,
  -0.9999247018391445,
  -0.9998305817958234,
  -0.9996988186962042,
  -0.9995294175010931,
  -0.9993223845883495,
  -0.9990777277526454,
  -0.9987954562051724,
  -0.9984755805732948,
  -0.9981181129001492,
  -0.9977230666441916,
  -0.9972904566786902,
  -0.9968202992911658,
  -0.996312612182778,
  -0.9957674144676598,
  -0.9951847266721969,
  -0.9945645707342554,
  -0.9939069700023561,
  -0.9932119492347945,
  -0.99247953459871,
  -0.9917097536690995,
  -0.99090263542778,
  -0.9900582102622971,
  -0.989176509964781,
  -0.9882575677307495,
  -0.9873014181578584,
  -0.9863080972445987,
  -0.9852776423889412,
  -0.984210092386929,
  -0.9831054874312163,
  -0.9819638691095552,
  -0.9807852804032304,
  -0.9795697656854405,
  -0.9783173707196277,
  -0.9770281426577544,
  -0.9757021300385286,
  -0.9743393827855759,
  -0.9729399522055602,
  -0.9715038909862518,
  -0.970031253194544,
  -0.9685220942744174,
  -0.9669764710448521,
  -0.9653944416976894,
  -0.9637760657954398,
  -0.9621214042690416,
  -0.9604305194155659,
  -0.9587034748958716,
  -0.9569403357322089,
  -0.9551411683057707,
  -0.9533060403541939,
  -0.9514350209690083,
  -0.9495281805930367,
  -0.9475855910177412,
  -0.9456073253805214,
  -0.9435934581619604,
  -0.9415440651830208,
  -0.9394592236021899,
  -0.937339011912575,
  -0.9351835099389476,
  -0.9329927988347388,
  -0.9307669610789837,
  -0.9285060804732156,
  -0.9262102421383114,
  -0.9238795325112867,
  -0.921514039342042,
  -0.9191138516900578,
  -0.9166790599210427,
  -0.9142097557035307,
  -0.9117060320054299,
  -0.9091679830905225,
  -0.9065957045149153,
  -0.9039892931234434,
  -0.901348847046022,
  -0.8986744656939539,
  -0.8959662497561852,
  -0.8932243011955152,
  -0.890448723244758,
  -0.8876396204028539,
  -0.8847970984309379,
  -0.881921264348355,
  -0.8790122264286335,
  -0.8760700941954066,
  -0.8730949784182902,
  -0.8700869911087115,
  -0.8670462455156928,
  -0.8639728561215868,
  -0.8608669386377672,
  -0.8577286100002721,
  -0.8545579883654005,
  -0.8513551931052652,
  -0.8481203448032972,
  -0.8448535652497072,
  -0.8415549774368984,
  -0.8382247055548382,
  -0.8348628749863801,
  -0.8314696123025455,
  -0.8280450452577558,
  -0.8245893027850252,
  -0.8211025149911048,
  -0.8175848131515837,
  -0.8140363297059485,
  -0.8104571982525948,
  -0.8068475535437994,
  -0.8032075314806449,
  -0.7995372691079052,
  -0.7958369046088836,
  -0.7921065773002123,
  -0.7883464276266063,
  -0.7845565971555751,
  -0.7807372285720946,
  -0.7768884656732324,
  -0.7730104533627371,
  -0.7691033376455796,
  -0.7651672656224591,
  -0.7612023854842619,
  -0.7572088465064847,
  -0.7531867990436125,
  -0.7491363945234593,
  -0.7450577854414661,
  -0.740951125354959,
  -0.73681656887737,
  -0.7326542716724128,
  -0.7284643904482253,
  -0.7242470829514669,
  -0.7200025079613818,
  -0.7157308252838187,
  -0.7114321957452167,
  -0.7071067811865476,
  -0.7027547444572252,
  -0.6983762494089729,
  -0.693971460889654,
  -0.689540544737067,
  -0.6850836677727004,
  -0.6806009977954532,
  -0.6760927035753159,
  -0.6715589548470186,
  -0.6669999223036376,
  -0.662415777590172,
  -0.6578066932970787,
  -0.6531728429537766,
  -0.6485144010221126,
  -0.6438315428897914,
  -0.6391244448637758,
  -0.6343932841636455,
  -0.6296382389149272,
  -0.6248594881423863,
  -0.6200572117632894,
  -0.6152315905806269,
  -0.6103828062763097,
  -0.6055110414043257,
  -0.6006164793838689,
  -0.5956993044924335,
  -0.5907597018588742,
  -0.585797857456439,
  -0.5808139580957645,
  -0.5758081914178454,
  -0.5707807458869673,
  -0.5657318107836135,
  -0.5606615761973361,
  -0.5555702330196022,
  -0.5504579729366049,
  -0.5453249884220464,
  -0.540171472729893,
  -0.5349976198870972,
  -0.5298036246862948,
  -0.524589682678469,
  -0.5193559901655898,
  -0.5141027441932218,
  -0.5088301425431073,
  -0.5035383837257177,
  -0.49822766697278176,
  -0.49289819222978415,
  -0.4875501601484359,
  -0.4821837720791229,
  -0.4767992300633221,
  -0.47139673682599786,
  -0.4659764957679662,
  -0.4605387109582402,
  -0.4550835871263439,
  -0.4496113296546069,
  -0.4441221445704293,
  -0.43861623853852755,
  -0.43309381885315207,
  -0.42755509343028203,
  -0.42200027079979985,
  -0.41642956009763715,
  -0.41084317105790413,
  -0.4052413140049899,
  -0.39962419984564707,
  -0.39399204006104815,
  -0.3883450466988266,
  -0.3826834323650899,
  -0.37700741021641815,
  -0.3713171939518377,
  -0.3656129978047738,
  -0.35989503653498833,
  -0.3541635254204904,
  -0.3484186802494348,
  -0.34266071731199443,
  -0.33688985339222033,
  -0.3311063057598765,
  -0.32531029216226326,
  -0.3195020308160158,
  -0.3136817403988914,
  -0.30784964004153503,
  -0.30200594931922803,
  -0.296150888243624,
  -0.2902846772544624,
  -0.2844075372112721,
  -0.27851968938505317,
  -0.27262135544994925,
  -0.2667127574748985,
  -0.26079411791527585,
  -0.2548656596045147,
  -0.2489276057457201,
  -0.24298017990326407,
  -0.23702360599436717,
  -0.23105810828067133,
  -0.22508391135979283,
  -0.21910124015687005,
  -0.21311031991609142,
  -0.20711137619221884,
  -0.201104634842092,
  -0.1950903220161286,
  -0.18906866414980636,
  -0.1830398879551409,
  -0.17700422041214894,
  -0.17096188876030122,
  -0.16491312048997014,
  -0.15885814333386147,
  -0.15279718525844369,
  -0.1467304744553618,
  -0.14065823933284954,
  -0.13458070850712628,
  -0.12849811079379309,
  -0.12241067519921635,
  -0.11631863091190471,
  -0.11022220729388324,
  -0.10412163387205457,
  -0.09801714032956083,
  -0.09190895649713275,
  -0.08579731234444016,
  -0.0796824379714302,
  -0.07356456359966773,
  -0.06744391956366418,
  -0.06132073630220849,
  -0.055195244349690094,
  -0.049067674327417966,
  -0.04293825693494102,
  -0.03680722294135883,
  -0.030674803176636865,
  -0.024541228522912326,
  -0.0184067299058051,
  -0.012271538285720007,
  -0.006135884649154799,
);

// src/external-chart-adapter.ts
function adaptDecoratedChart(raw, lanes, duration) {
  if (
    ![5, 7].includes(lanes) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Array.isArray(raw) ||
    !raw.length ||
    raw.length > 1e4
  )
    throw new Error('Invalid candidate chart');
  const ids = /* @__PURE__ */ new Set();
  const laneUntil = /* @__PURE__ */ new Map();
  let previous = -Infinity;
  return raw.map((candidate) => {
    if (!candidate || typeof candidate !== 'object')
      throw new Error('Invalid candidate note');
    const n = candidate;
    if (
      !Number.isInteger(n.id) ||
      ids.has(n.id) ||
      !Number.isInteger(n.lane) ||
      n.lane < 0 ||
      n.lane >= lanes ||
      !Number.isFinite(n.time) ||
      n.time < 0 ||
      n.time < previous ||
      n.time >= duration ||
      !['tap', 'hold'].includes(n.type) ||
      (laneUntil.get(n.lane) ?? -Infinity) >= n.time
    )
      throw new Error('Invalid candidate note');
    ids.add(n.id);
    previous = n.time;
    const note = { id: n.id, time: n.time, lane: n.lane };
    if (n.type === 'hold') {
      if (
        !Number.isFinite(n.duration) ||
        n.duration <= 0 ||
        n.time + n.duration > duration
      )
        throw new Error('Invalid candidate hold');
      note.end = n.time + n.duration;
    } else if (n.duration !== void 0)
      throw new Error('Tap cannot carry a hold duration');
    laneUntil.set(n.lane, note.end ?? note.time);
    return note;
  });
}

// src/state11/flux-v3.mjs
function fft2(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
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
var BANDS2 = { low: [20, 250], mid: [250, 2e3], high: [2e3, 11025] };
function analyzeFluxV3(samples, sampleRate, opts = {}) {
  const hop = opts.hop ?? 512,
    window = opts.window ?? 1024,
    merge = opts.merge ?? 0.06;
  if (window !== HANN.length) throw new Error('table only for window=1024');
  const binHz = sampleRate / window;
  const bandBins = {};
  for (const [b, [lo, hi]] of Object.entries(BANDS2)) {
    bandBins[b] = [
      Math.max(1, Math.floor(lo / binHz)),
      Math.min(window / 2 - 1, Math.ceil(hi / binHz)),
    ];
  }
  const re = new Float64Array(window),
    im = new Float64Array(window);
  let prev = null;
  const flux = { low: [], mid: [], high: [] };
  const times = [];
  for (let i = 0; i + window < samples.length; i += hop) {
    for (let j = 0; j < window; j++) {
      re[j] = samples[i + j] * HANN[j];
      im[j] = 0;
    }
    fft2(re, im);
    const mag = new Float64Array(window / 2);
    for (let k = 0; k < window / 2; k++)
      mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    if (prev) {
      for (const [b, [lo, hi]] of Object.entries(bandBins)) {
        let s = 0;
        for (let k = lo; k <= hi; k++) {
          const d = mag[k] - prev[k];
          if (d > 0) s += d;
        }
        flux[b].push(s / (hi - lo + 1));
      }
      times.push((i + window / 2) / sampleRate);
    }
    prev = mag;
  }
  function pick(series) {
    const sorted = [...series].sort((a, b) => a - b),
      floorGlobal = sorted[Math.floor(sorted.length * 0.65)] || 0;
    const maxAbs = sorted[sorted.length - 1] || 0,
      absFloor = maxAbs * 1e-4;
    const frameSec = hop / sampleRate;
    const WIN = Math.round(9 / frameSec),
      STEP = Math.max(1, Math.round(1 / frameSec));
    const anchors = [];
    for (let a = 0; a < series.length; a += STEP) {
      const lo = Math.max(0, a - WIN),
        hi = Math.min(series.length, a + WIN + 1);
      const w = series.slice(lo, hi).sort((x, y) => x - y);
      anchors.push(w[Math.floor(w.length * 0.65)] || 0);
    }
    const floorAt = (i) => {
      const a = anchors[Math.min(anchors.length - 1, Math.round(i / STEP))];
      return Math.min(floorGlobal, a);
    };
    const peaks = [];
    for (let i = 2; i < series.length - 2; i++) {
      const local = series
        .slice(Math.max(0, i - 20), i + 1)
        .sort((a, b) => a - b);
      const median = local[Math.floor(local.length / 2)];
      const thr = Math.max(floorAt(i) * 2.5, median * 3, absFloor);
      if (
        series[i] > thr &&
        series[i] >= series[i - 1] &&
        series[i] > series[i + 1]
      ) {
        const time = times[i];
        const margin = (series[i] - thr) / (thr || 1);
        if (peaks.length && time - peaks[peaks.length - 1].time < merge) {
          if (series[i] > peaks[peaks.length - 1].strength)
            peaks[peaks.length - 1] = { time, strength: series[i], margin };
        } else peaks.push({ time, strength: series[i], margin });
      }
    }
    return peaks;
  }
  const bandPeaks = {
    low: pick(flux.low),
    mid: pick(flux.mid),
    high: pick(flux.high),
  };
  const all = [];
  for (const [b, ps] of Object.entries(bandPeaks))
    for (const p of ps)
      all.push({
        time: p.time,
        strength: p.strength,
        band: b,
        margin: p.margin,
      });
  all.sort((a, b) => a.time - b.time);
  const combined = [];
  for (const p of all) {
    if (
      combined.length &&
      p.time - combined[combined.length - 1].time < merge
    ) {
      const c = combined[combined.length - 1];
      c.strength += p.strength;
      c.bands.add(p.band);
      c.margin = Math.min(c.margin, p.margin);
      c.time = Math.min(c.time, p.time);
    } else
      combined.push({
        time: p.time,
        strength: p.strength,
        bands: /* @__PURE__ */ new Set([p.band]),
        margin: p.margin,
      });
  }
  return { times, flux, bandPeaks, combined, sampleRate, hop, window };
}

// src/state11/combined-v4.mjs
function analyzeV4(samples, rate) {
  const r = analyzeFluxV3(samples, rate);
  return {
    ...r,
    peaks: r.combined,
    duration: samples.length / rate,
    bpm: 0,
    beatConfidence: 0,
  };
}

// src/state11/select-v4.mjs
function chooseV4(source, seedEntries, ratio, gap, burst, phraseNoteSec) {
  const selected = [...seedEntries].sort((a, b) => a.time - b.time);
  const accept = (p) => {
    if (selected.some((q) => Math.abs(q.time - p.time) < gap)) return false;
    const t = [...selected.map((q) => q.time), p.time].sort((a, b) => a - b);
    let j = 0;
    for (let i = 0; i < t.length; i++) {
      while (t[i] - t[j] >= 1) j++;
      if (i - j + 1 > burst) return false;
    }
    return true;
  };
  const push = (p) => {
    selected.push({ time: p.time, strength: p.strength, peak: p.peak || p });
  };
  const byTime = [...source].sort((a, b) => a.time - b.time);
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
    for (const p of ranked)
      if (accept(p)) {
        push(p);
        break;
      }
  }
  const bins = /* @__PURE__ */ new Map();
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
      if (accept(p)) push(p);
    }
  }
  if (phraseNoteSec > 0) {
    for (const phrase of phrases) {
      const dur = phrase.at(-1).time - phrase[0].time;
      if (dur < 0.6) continue;
      const cap = Math.max(1, Math.ceil((dur + 1e-9) / phraseNoteSec));
      const inPhrase = selected.filter((q) =>
        phrase.some((p) => Math.abs(q.time - p.time) < 1e-9),
      ).length;
      let room = cap - inPhrase;
      if (room <= 0) continue;
      for (const p of [...phrase].sort(
        (a, b) => b.strength - a.strength || a.time - b.time,
      )) {
        if (room <= 0) break;
        if (accept(p)) {
          push(p);
          room--;
        }
      }
    }
  }
  return selected.sort((a, b) => a.time - b.time);
}
function nearestPeak(poolTimes, poolByTime, t, win = 0.03) {
  let lo = 0,
    hi = poolTimes.length - 1,
    best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = poolTimes[mid];
    if (best === null || Math.abs(v - t) < Math.abs(best - t)) best = v;
    if (v < t) lo = mid + 1;
    else hi = mid - 1;
  }
  return best !== null && Math.abs(best - t) <= win
    ? poolByTime.get(best)
    : null;
}
function chartFromPoolV4(a, pool, v2tierTimes, lanes = 5) {
  const poolTimes = pool.map((p) => p.time).sort((x, y) => x - y);
  const poolByTime = new Map(pool.map((p) => [p.time, p]));
  const highSeeds = [];
  for (const t of v2tierTimes.high) {
    const ev = nearestPeak(poolTimes, poolByTime, t);
    if (ev) highSeeds.push({ time: t, strength: ev.strength, peak: ev });
  }
  const high = chooseV4(pool, highSeeds, 1, 0.1, 8, 0.75);
  const highByTime = new Map(high.map((h) => [h.time, h]));
  const midSeeds = [];
  for (const t of v2tierTimes.mid) {
    const h = highByTime.get(t);
    if (h) midSeeds.push({ time: t, strength: h.strength, peak: h.peak });
  }
  const mid = chooseV4(high, midSeeds, 0.65, 0.2, 4, 1);
  const midByTime = new Map(mid.map((m) => [m.time, m]));
  const lowSeeds = [];
  for (const t of v2tierTimes.low) {
    const m = midByTime.get(t);
    if (m) lowSeeds.push({ time: t, strength: m.strength, peak: m.peak });
  }
  const low = chooseV4(mid, lowSeeds, 0.55, 0.32, 3, 1.3);
  return { high, mid, low };
}

// src/flux-research.mjs
function fft3(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
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
var BANDS3 = { low: [20, 250], mid: [250, 2e3], high: [2e3, 11025] };
function analyzeFluxV2(samples, sampleRate, opts = {}) {
  const hop = opts.hop ?? 512,
    window = opts.window ?? 1024,
    merge = opts.merge ?? 0.06;
  if (window !== HANN.length) throw new Error('table only for window=1024');
  const binHz = sampleRate / window;
  const bandBins = {};
  for (const [b, [lo, hi]] of Object.entries(BANDS3)) {
    bandBins[b] = [
      Math.max(1, Math.floor(lo / binHz)),
      Math.min(window / 2 - 1, Math.ceil(hi / binHz)),
    ];
  }
  const re = new Float64Array(window),
    im = new Float64Array(window);
  let prev = null;
  const flux = { low: [], mid: [], high: [] };
  const times = [];
  for (let i = 0; i + window < samples.length; i += hop) {
    for (let j = 0; j < window; j++) {
      re[j] = samples[i + j] * HANN[j];
      im[j] = 0;
    }
    fft3(re, im);
    const mag = new Float64Array(window / 2);
    for (let k = 0; k < window / 2; k++)
      mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    if (prev) {
      for (const [b, [lo, hi]] of Object.entries(bandBins)) {
        let s = 0;
        for (let k = lo; k <= hi; k++) {
          const d = mag[k] - prev[k];
          if (d > 0) s += d;
        }
        flux[b].push(s / (hi - lo + 1));
      }
      times.push((i + window / 2) / sampleRate);
    }
    prev = mag;
  }
  function pick(series) {
    const sorted = [...series].sort((a, b) => a - b),
      floor = sorted[Math.floor(sorted.length * 0.65)] || 0;
    const maxAbs = sorted[sorted.length - 1] || 0,
      absFloor = maxAbs * 1e-4;
    const peaks = [];
    for (let i = 2; i < series.length - 2; i++) {
      const local = series
        .slice(Math.max(0, i - 20), i + 1)
        .sort((a, b) => a - b);
      const median = local[Math.floor(local.length / 2)];
      const thr = Math.max(floor * 2.5, median * 3, absFloor);
      if (
        series[i] > thr &&
        series[i] >= series[i - 1] &&
        series[i] > series[i + 1]
      ) {
        const time = times[i];
        const margin = (series[i] - thr) / (thr || 1);
        if (peaks.length && time - peaks[peaks.length - 1].time < merge) {
          if (series[i] > peaks[peaks.length - 1].strength)
            peaks[peaks.length - 1] = { time, strength: series[i], margin };
        } else peaks.push({ time, strength: series[i], margin });
      }
    }
    return peaks;
  }
  const bandPeaks = {
    low: pick(flux.low),
    mid: pick(flux.mid),
    high: pick(flux.high),
  };
  const all = [];
  for (const [b, ps] of Object.entries(bandPeaks))
    for (const p of ps)
      all.push({
        time: p.time,
        strength: p.strength,
        band: b,
        margin: p.margin,
      });
  all.sort((a, b) => a.time - b.time);
  const combined = [];
  for (const p of all) {
    if (
      combined.length &&
      p.time - combined[combined.length - 1].time < merge
    ) {
      const c = combined[combined.length - 1];
      c.strength += p.strength;
      c.bands.add(p.band);
      c.margin = Math.min(c.margin, p.margin);
      c.time = Math.min(c.time, p.time);
    } else
      combined.push({
        time: p.time,
        strength: p.strength,
        bands: /* @__PURE__ */ new Set([p.band]),
        margin: p.margin,
      });
  }
  return { times, flux, bandPeaks, combined, sampleRate, hop, window };
}

// src/flux-chart-research.mjs
function analyzePcm2(samples, rate) {
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
  const bins = /* @__PURE__ */ new Map();
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
var cache = /* @__PURE__ */ new WeakMap();
function chartFromAnalysis(a, difficulty, lanes = 5) {
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
  const laneMap = /* @__PURE__ */ new Map();
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

// src/state11/lane-v3.mjs
function assignLanesV3(highPeaks, a, lanes = 5) {
  const scale = {};
  for (const b of ['low', 'mid', 'high']) {
    const ss = a.bandPeaks[b].map((p) => p.strength).sort((x, y) => x - y);
    scale[b] = ss[ss.length >> 1] || 1;
  }
  const bandOf = /* @__PURE__ */ new Map();
  const counts = { low: 0, mid: 0, high: 0 };
  for (const p of highPeaks) {
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
    const band = rel[0]?.band || 'mid';
    bandOf.set(p.time, band);
    counts[band]++;
  }
  const total = Math.max(1, counts.low + counts.mid + counts.high);
  const size = { low: 1, mid: 1, high: 1 };
  let left = lanes - 3;
  const frac = ['low', 'mid', 'high'].map((b) => ({
    b,
    exact: (counts[b] / total) * lanes - 1,
  }));
  frac.sort(
    (x, y) =>
      y.exact - Math.floor(y.exact) - (x.exact - Math.floor(x.exact)) ||
      y.exact - x.exact,
  );
  const base = { low: 0, mid: 0, high: 0 };
  for (const f of frac) {
    base[f.b] = Math.max(0, Math.floor(f.exact));
  }
  let assigned = base.low + base.mid + base.high;
  // Minimum one lane per band must not let rounded quotas exceed the keyboard.
  // Only overflowing allocations change; preserve the qualified mapping otherwise.
  while (assigned > left) {
    const donor = ['low', 'mid', 'high']
      .filter((b) => base[b] > 0)
      .sort((a, b) => base[b] - base[a] || counts[b] - counts[a])[0];
    base[donor]--;
    assigned--;
  }
  for (const f of frac) {
    if (assigned >= left) break;
    base[f.b]++;
    assigned++;
  }
  for (const b of ['low', 'mid', 'high']) size[b] += base[b];
  const groups = {};
  let at = 0;
  for (const b of ['low', 'mid', 'high']) {
    groups[b] = [];
    for (let i = 0; i < size[b]; i++) groups[b].push(at++);
  }
  const lastAt = new Array(lanes).fill(-1e9);
  const MIN_SAME = 0.12;
  const laneMap = /* @__PURE__ */ new Map();
  for (const p of highPeaks) {
    const band = bandOf.get(p.time),
      g = groups[band];
    let lane = g[0];
    for (const l of g) if (lastAt[l] < lastAt[lane]) lane = l;
    if (p.time - lastAt[lane] < MIN_SAME) {
      const neighbors = [];
      if (g[0] > 0) neighbors.push(g[0] - 1);
      if (g[g.length - 1] < lanes - 1) neighbors.push(g[g.length - 1] + 1);
      for (const nl of neighbors)
        if (p.time - lastAt[nl] >= MIN_SAME) {
          lane = nl;
          break;
        }
    }
    lastAt[lane] = p.time;
    laneMap.set(p.time, lane);
  }
  return { laneMap, size, groups };
}

// src/state11/jack-repair.mjs
var W = 0.15;
function repairSameLaneJacks(raw, laneCount) {
  const keys2 = [
    `${laneCount}:low`,
    `${laneCount}:mid`,
    `${laneCount}:high`,
    `${laneCount}:sc`,
  ];
  const repairs = [],
    skipped = [];
  for (let iter = 0; iter < 50; iter++) {
    const high = raw[`${laneCount}:high`];
    const last = new Array(laneCount).fill(-1e9);
    let pair = null;
    for (const n of [...high].sort((a, b) => a.time - b.time)) {
      const d = n.time - last[n.lane];
      if (!n.__skip && d > 0 && d < W - 1e-9) {
        pair = {
          t1: +(n.time - d).toFixed(6),
          t2: +n.time.toFixed(6),
          lane: n.lane,
        };
        break;
      }
      last[n.lane] = n.time;
    }
    if (!pair) break;
    const { t2, lane } = pair;
    const containing = keys2.filter((k) =>
      raw[k].some((n) => Math.abs(n.time - t2) < 1e-6),
    );
    const notesAt = (k, t) => raw[k].filter((n) => Math.abs(n.time - t) < 1e-6);
    let why = null;
    for (const k of containing) {
      const ns = notesAt(k, t2);
      if (ns.some((n) => n.type === 'hold')) why = 'later note is hold head';
      if (ns.length > 1) why = 'later note chord-involved';
    }
    const targets = [lane - 1, lane + 1].filter((l) => l >= 0 && l < laneCount);
    const ok = [];
    for (const tl of targets) {
      let good = true,
        clearance = Infinity;
      for (const k of containing) {
        for (const n of raw[k]) {
          if (n.lane !== tl) continue;
          const d = Math.abs(n.time - t2);
          if (d < 1e-6) {
            good = false;
            break;
          }
          if (d < W - 1e-9) {
            good = false;
            break;
          }
          clearance = Math.min(clearance, d);
        }
        if (!good) break;
        for (const h of raw[k]) {
          if (
            h.lane === tl &&
            h.type === 'hold' &&
            t2 > h.time - 1e-9 &&
            t2 < h.time + h.duration + 0.05
          ) {
            good = false;
            break;
          }
        }
        if (!good) break;
      }
      if (good) ok.push({ tl, clearance });
    }
    ok.sort((a, b) => b.clearance - a.clearance || a.tl - b.tl);
    if (why || !ok.length) {
      skipped.push({
        ...pair,
        reason: why || 'no adjacent lane with >=W clearance',
      });
      for (const n of high) if (Math.abs(n.time - t2) < 1e-6) n.__skip = true;
      continue;
    }
    const target = ok[0].tl;
    for (const k of containing) for (const n of notesAt(k, t2)) n.lane = target;
    repairs.push({ ...pair, keys: containing, to: target });
  }
  return { repairs, skipped };
}

// src/state11/gen-state11.mjs
function generateC3RuntimeState11(samples, rate) {
  const analysis = analyzeV4(samples, rate);
  const bands = computeBandMags(samples, rate, { HANN, WRE, WIM });
  const info = makeOnsetInfo(analysis, bands);
  const raw = {},
    charts = {};
  const peaks = [...analysis.peaks].sort((x, y) => x.time - y.time);
  const strs = peaks.map((p) => p.strength);
  const gs = [...strs].sort((x, y) => x - y);
  const globalFloor = gs[Math.floor(gs.length * 0.15)] || 0;
  const pool = peaks.filter((p) => {
    const win = [];
    for (const q of peaks) {
      if (q.time < p.time - 9) continue;
      if (q.time > p.time + 9) break;
      win.push(q.strength);
    }
    win.sort((x, y) => x - y);
    return (
      p.strength >=
      Math.min(globalFloor, win[Math.floor(win.length * 0.15)] || 0)
    );
  });
  const a2 = analyzePcm2(samples, rate);
  const repairLog = {};
  for (const lanes of [5, 7]) {
    const v2tierTimes = {};
    for (const tier of ['low', 'mid', 'high'])
      v2tierTimes[tier] = chartFromAnalysis(a2, tier, lanes).map((n) => n.time);
    const bundle = chartFromPoolV4(analysis, pool, v2tierTimes, lanes);
    const tierNotes = {};
    for (const tier of ['low', 'mid', 'high']) tierNotes[tier] = bundle[tier];
    const high = tierNotes.high.map((n) => n.time);
    const evPeaks = [
      ...new Map(tierNotes.high.map((n) => [n.peak.time, n.peak])).values(),
    ];
    const { laneMap: evLaneMap, size } = assignLanesV3(
      evPeaks,
      analysis,
      lanes,
    );
    const laneMap = new Map(
      tierNotes.high.map((n) => [n.time, evLaneMap.get(n.peak.time)]),
    );
    for (const [tier, notes] of Object.entries(tierNotes)) {
      const base = notes.map((n) => {
        const lane = laneMap.get(n.time);
        if (lane === void 0) throw Error('Missing inherited lane');
        return { time: n.time, lane };
      });
      raw[`${lanes}:${tier}`] = decorateTier(base, tier, info, lanes);
    }
    const scBase = high.map((time) => {
      const lane = laneMap.get(time);
      if (lane === void 0) throw Error('Missing inherited lane');
      return { time, lane };
    });
    raw[`${lanes}:sc`] = decorateTier(scBase, 'sc', info, lanes, C3_SC_PARAMS);
    repairLog[lanes] = repairSameLaneJacks(raw, lanes);
    for (const k of [
      `${lanes}:low`,
      `${lanes}:mid`,
      `${lanes}:high`,
      `${lanes}:sc`,
    ])
      charts[k] = adaptDecoratedChart(raw[k], lanes, samples.length / rate);
    charts.laneSizes = charts.laneSizes || {};
    charts.laneSizes[lanes] = size;
  }
  return {
    raw,
    charts,
    duration: samples.length / rate,
    analysis,
    repairLog,
    analyzerVersion:
      'research-c3-c2-a35local-fill-lanev3-budget-v1-jackrepair150-hold-chord-tail20-union-v3',
  };
}

// ../a35/backend-entry-state11.ts
async function generateSourceRecord(bytes, videoId, audioSha256) {
  const actual = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== audioSha256) throw Error('Source audio integrity failed');
  return generateVerifiedSourceRecord(bytes, videoId, audioSha256);
}
async function generateVerifiedSourceRecord(bytes, videoId, audioSha256) {
  if (!/^[a-f0-9]{64}$/.test(audioSha256))
    throw Error('Invalid verified audio hash');
  const parsed = parseWavAnalysis(bytes);
  return generateRecordFromAnalysis(parsed, videoId, audioSha256);
}
export async function generateRecordFromAnalysis(parsed, videoId, audioSha256) {
  const samples = parsed.samples,
    generated = generateC3RuntimeState11(samples, 22050),
    summary = analyzePcm(samples, 22050);
  const charts = {},
    chartMetadata = {};
  for (const lanes of [5, 7])
    for (const difficulty of ['low', 'mid', 'high', 'sc']) {
      const notes = generated.charts[`${lanes}:${difficulty}`];
      if (
        difficulty === 'sc' &&
        JSON.stringify(notes) ===
          JSON.stringify(generated.charts[`${lanes}:high`])
      )
        continue;
      chartMetadata[`${lanes}:${difficulty}`] = difficultyForChart(
        notes,
        generated.duration,
        `${lanes}:${difficulty}`,
      );
      const data = new TextEncoder().encode(JSON.stringify(notes)),
        sha256 = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', data)),
          (b) => b.toString(16).padStart(2, '0'),
        ).join('');
      charts[`${lanes}:${difficulty}`] = { notes, sha256 };
    }
  const record = {
    version: 1,
    videoId,
    audioSha256,
    sampleRate: parsed.sampleRate,
    estimatedBpm: summary.bpm,
    frames: parsed.frames,
    pipelineVersion: 'pcm16-stereo44100-48000-linear-v1',
    analyzerVersion: generated.analyzerVersion,
    config: JSON.stringify({
      mono: 'left-to-right-mean',
      analysisSampleRate: 22050,
      hop: 512,
      window: 1024,
      onset: 'table-stft-band-flux-c2-a35localfloor',
      selection: 'nested-c2-high-gap0.10-burst8-a35poolfill-pace',
      grid: 'none',
      decoration: 'm17c-band-sustain-hold-chord-tail20',
      tailClipMargin: 0.2,
      lanePlacement:
        'a35-lanev3-budget-v1-adaptive-share-lru-guard120ms+jackrepair150-postpass',
      highMode: 'c2',
      sc: 'a4-sc-chordcap30-hold-emphasis-v1',
    }),
    charts,
    chartMetadata,
  };
  record.chartSetSha256 = await chartSetHash(record);
  if (!(await verifyChartHashes(record)))
    throw Error('Invalid generated chart');
  return record;
}
export { generateSourceRecord, generateVerifiedSourceRecord };
