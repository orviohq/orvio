// analyze-flux-v2.mjs — RESEARCH PROTOTYPE, separate version. Pin 변경 아님.
// Determinism-hardened spectral flux: NO Math.sin/cos/exp/log at runtime.
// Hann window and FFT twiddles come from flux-tables.mjs (embedded decimal literals —
// identical doubles on every JS engine). Remaining arithmetic: +,-,*,/,Math.sqrt —
// all exactly rounded per IEEE-754/ECMAScript, so output is bitwise identical across
// engines/CPUs. (Math.sqrt is correctly rounded per spec; transcendentals are not.)
import { HANN, WRE, WIM } from './flux-tables.mjs';

function fft(re, im) {
  // iterative radix-2 with table twiddles, no recurrence, no transcendentals
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

const BANDS = { low: [20, 250], mid: [250, 2000], high: [2000, 11025] };

export function analyzeFluxV2(samples, sampleRate, opts = {}) {
  const hop = opts.hop ?? 512,
    window = opts.window ?? 1024,
    merge = opts.merge ?? 0.06;
  if (window !== HANN.length) throw new Error('table only for window=1024');
  const binHz = sampleRate / window;
  const bandBins = {};
  for (const [b, [lo, hi]] of Object.entries(BANDS)) {
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
    fft(re, im);
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
        // boundary margin: how far above threshold (relative). Near-0 margins are tie-risk notes.
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
        bands: new Set([p.band]),
        margin: p.margin,
      });
  }
  return { times, flux, bandPeaks, combined, sampleRate, hop, window };
}
