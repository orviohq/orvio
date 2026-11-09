// opus468-generator.mjs — NEW isolated 4/6/8-lane chart generator (ORV29 sub-scope).
//
// Isolation contract:
//  - Imports ONLY lane-independent pure math from the existing pinned modules
//    (analyzePcm/chartFromAnalysis tier TIMES, computeBandMags, makeOnsetInfo,
//    denseHighSelection, C3 params). The existing 5/7 modules are never edited:
//    their laneGroups/adapt paths throw for lanes outside [5,7], so the four
//    lane-dependent functions are mirrored HERE with explicit 4/6/8 groups.
//  - 4/6/8 lane groups mirror the retained old29 producer semantics exactly:
//    4={low:[0],mid:[1,2],high:[3]}, 6={low:[0,1],mid:[2,3],high:[4,5]},
//    8={low:[0,1],mid:[2,3,4,5],high:[6,7]}.
//  - chartFromAnalysis is used for tier TIME selection only (same as the
//    retained producer); its internal lane field is discarded, so its 5/7
//    group literal never influences 4/6/8 output.
//  - NOT the same version claim as any 5/7 pipeline: distinct generatorVersion
//    is supplied by the caller (record module rejects old-family literals).
import { analyzePcm, chartFromAnalysis } from '../flux-chart-research.mjs';
import {
  computeBandMags,
  makeOnsetInfo,
  denseHighSelection,
  C3_DEFAULT_PARAMS,
  C3_SC_PARAMS,
} from '../c3-core.mjs';
import { HANN, WRE, WIM } from '../flux-tables.mjs';

export const OPUS468_LANES = [4, 6, 8];
export const OPUS468_TIERS = ['low', 'mid', 'high', 'sc'];
export const OPUS468_CHART_KEYS = [
  '4:low', '4:mid', '4:high', '4:sc',
  '6:low', '6:mid', '6:high', '6:sc',
  '8:low', '8:mid', '8:high', '8:sc',
];
// csx/1 contract caps (fixed 12-slot family): per-tier caps + total + body cap.
export const OPUS468_TIER_NOTE_CAP = { low: 910, mid: 1270, high: 2770, sc: 3130 };
export const OPUS468_MAX_TOTAL_NOTES = 24300;
export const OPUS468_SC_MARKER = 'sc_collapsed_into_mx';

export function laneGroups468(lanes) {
  if (lanes === 4) return { low: [0], mid: [1, 2], high: [3] };
  if (lanes === 6) return { low: [0, 1], mid: [2, 3], high: [4, 5] };
  if (lanes === 8) return { low: [0, 1], mid: [2, 3, 4, 5], high: [6, 7] };
  throw new Error('opus468_unsupported_lanes: ' + lanes);
}

// Mirror of c3-core assignLanes (C2 rule) with 4/6/8 groups. Identical scoring.
export function assignLanes468(analysis, highTimes, lanes, scale) {
  const groups = laneGroups468(lanes);
  const count = { low: 0, mid: 0, high: 0 };
  const laneMap = new Map();
  for (const t of highTimes) {
    const rel = [];
    for (const b of ['low', 'mid', 'high']) {
      const bp = analysis.bandPeaks[b].find((q) => Math.abs(q.time - t) < 0.07);
      if (bp) rel.push({ band: b, score: bp.strength / scale[b] });
    }
    rel.sort(
      (x, y) =>
        y.score - x.score ||
        ['low', 'mid', 'high'].indexOf(x.band) - ['low', 'mid', 'high'].indexOf(y.band),
    );
    const band = rel[0]?.band || 'mid';
    const g = groups[band];
    laneMap.set(t, g[count[band]++ % g.length]);
  }
  return laneMap;
}

// Mirror of c3-lane-placement fixedLaneMap with 4/6/8 groups. Same policy.
export function fixedLaneMap468(
  analysis,
  highTimes,
  lanes,
  scale,
  onsetInfo,
  P = C3_DEFAULT_PARAMS,
  minGap = 0.15,
) {
  const orig = assignLanes468(analysis, highTimes, lanes, scale);
  const groups = laneGroups468(lanes);
  const groupOf = (l) => {
    for (const arr of Object.values(groups)) if (arr.includes(l)) return arr;
    return [l];
  };
  const medStr = [...onsetInfo.info.values()].map((i) => i.strength).sort((x, y) => x - y);
  const med = medStr[Math.floor(medStr.length / 2)] || 0;
  const candHeads = new Set();
  for (const t of highTimes) {
    const info = onsetInfo.info.get(t);
    if (!info) continue;
    for (const tier of ['low', 'mid', 'high']) {
      if (
        info.sustain >= P.holdMinSustain[tier] &&
        info.sustain >= P.minHold &&
        (info.strength || 0) >= med * P.holdTierStrengthMul[tier]
      ) {
        candHeads.add(t);
        break;
      }
    }
  }
  const origByLaneTime = new Map();
  for (const t of highTimes) {
    const l = orig.get(t);
    if (!origByLaneTime.has(l)) origByLaneTime.set(l, []);
    origByLaneTime.get(l).push(t);
  }
  for (const arr of origByLaneTime.values()) arr.sort((a, b) => a - b);
  const origNextAfter = (l, t) => {
    const a = origByLaneTime.get(l) || [];
    for (const x of a) if (x > t + 1e-9) return x;
    return Infinity;
  };
  const lastTime = new Array(lanes).fill(-Infinity);
  const placedHeads = new Map();
  const fixed = new Map();
  const moves = [];
  const residual = [];
  const room = P.minHold + P.tailClipMargin;
  const laneOK = (l, t) => {
    if (t - lastTime[l] < minGap) return false;
    for (const hc of placedHeads.get(l) || [])
      if (t > hc && t - hc < room) return false;
    if (candHeads.has(t) && origNextAfter(l, t) - t < room) return false;
    return true;
  };
  const pref = (from, t) => {
    const out = [];
    const seen = new Set();
    const push = (l) => {
      if (l >= 0 && l < lanes && !seen.has(l)) {
        seen.add(l);
        out.push(l);
      }
    };
    for (const l of groupOf(from)) if (l !== from) push(l);
    const info = onsetInfo.info.get(t);
    const sec = info && info.bands && info.bands[1] ? info.bands[1].band : null;
    if (sec) for (const l of groups[sec]) push(l);
    for (let d = 1; d < lanes; d++) {
      push(from - d);
      push(from + d);
    }
    return out;
  };
  const sorted = [...highTimes].sort((a, b) => a - b);
  for (const t of sorted) {
    const ol = orig.get(t);
    let target = ol;
    if (t - lastTime[ol] < minGap) {
      target = -1;
      for (const l of pref(ol, t)) {
        if (laneOK(l, t)) {
          target = l;
          break;
        }
      }
      if (target < 0) {
        target = ol;
        residual.push(t);
      } else moves.push({ time: t, from: ol, to: target });
    }
    fixed.set(t, target);
    lastTime[target] = t;
    if (candHeads.has(t)) {
      if (!placedHeads.has(target)) placedHeads.set(target, []);
      placedHeads.get(target).push(t);
    }
  }
  return { map: fixed, moves, residual };
}

// Mirror of c3-core decorateTier with 4/6/8 groups. Identical hold/chord policy.
export function decorateTier468(base, tier, onsetInfo, lanes, P = C3_DEFAULT_PARAMS) {
  const groups = laneGroups468(lanes);
  const medStr = [...onsetInfo.info.values()].map((i) => i.strength).sort((x, y) => x - y);
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
    if (dur >= P.minHold) holds.push({ time: c.time, duration: +dur.toFixed(4) });
  }
  const holdMap = new Map(holds.map((h) => [h.time, h.duration]));
  const chordCapN = Math.floor(base.length * P.chordCap[tier]);
  const chordCands = base
    .filter((n) => onsetInfo.info.get(n.time)?.chord)
    .sort((x, y) => getStr(y) - getStr(x) || x.time - y.time);
  const chordPicks = [];
  for (const c of chordCands) {
    if (chordPicks.length >= chordCapN) break;
    if (chordPicks.some((h) => Math.abs(h.time - c.time) < P.chordSpacing)) continue;
    const info = onsetInfo.info.get(c.time);
    const g2 = groups[info.bands[1].band];
    const used = new Set(base.filter((q) => Math.abs(q.time - c.time) < 0.001).map((q) => q.lane));
    for (const h of holds) {
      if (c.time >= h.time - P.chordHoldMargin && c.time < h.time + h.duration + P.chordHoldMargin)
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
      if (ts.some((t) => Math.abs(t - c.time) < 0.15 && Math.abs(t - c.time) > 0.001)) continue;
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
  for (const cp of chordPicks) notes.push({ time: cp.time, lane: cp.lane, type: 'tap' });
  notes.sort((x, y) => x.time - y.time || x.lane - y.lane);
  notes.forEach((n, i) => (n.id = i));
  return notes;
}

// Mirror of external-chart-adapter adaptDecoratedChart accepting lanes [4,6,8].
// Same representation change only; never timing or lanes.
export function adaptDecoratedChart468(raw, lanes, duration) {
  if (
    ![4, 6, 8].includes(lanes) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Array.isArray(raw) ||
    !raw.length ||
    raw.length > 10000
  )
    throw new Error('opus468_invalid_candidate_chart');
  const ids = new Set();
  const laneUntil = new Map();
  let previous = -Infinity;
  return raw.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('opus468_invalid_candidate_note');
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
      throw new Error('opus468_invalid_candidate_note');
    ids.add(n.id);
    previous = n.time;
    const note = { id: n.id, time: n.time, lane: n.lane };
    if (n.type === 'hold') {
      if (!Number.isFinite(n.duration) || n.duration <= 0 || n.time + n.duration > duration)
        throw new Error('opus468_invalid_candidate_hold');
      note.end = n.time + n.duration;
    } else if (n.duration !== undefined)
      throw new Error('opus468_tap_hold_duration');
    laneUntil.set(n.lane, note.end ?? note.time);
    return note;
  });
}

// Core generation: parsed = {samples: Float32Array @22050, sampleRate: 48000, frames}.
// Returns { charts: {key: Note[]}, duration } for the 12 keys (SC always present
// pre-collapse; collapse is applied at record assembly, same as retained producer).
export function generateOpus468Charts(parsed) {
  if (
    !parsed ||
    !(parsed.samples instanceof Float32Array) ||
    !parsed.samples.length ||
    parsed.sampleRate !== 48000 ||
    !Number.isSafeInteger(parsed.frames) ||
    parsed.frames < 1 ||
    parsed.frames > 14400000 ||
    // frames must actually describe the samples (parsePinnedPcmAnalysis relation)
    parsed.samples.length !== Math.floor(parsed.frames / (48000 / 22050))
  )
    throw new Error('opus468_pcm_shape');
  const samples = parsed.samples;
  const rate = 22050;
  const analysis = analyzePcm(samples, rate);
  const bands = computeBandMags(samples, rate, { HANN, WRE, WIM });
  const info = makeOnsetInfo(analysis, bands);
  const charts = {};
  let totalNotes = 0;
  for (const lanes of OPUS468_LANES) {
    const low = chartFromAnalysis(analysis, 'low', lanes).map((n) => n.time);
    const mid = chartFromAnalysis(analysis, 'mid', lanes).map((n) => n.time);
    const high = chartFromAnalysis(analysis, 'high', lanes).map((n) => n.time);
    const laneMap = fixedLaneMap468(analysis, high, lanes, info.scale, info).map;
    for (const [tier, times] of [['low', low], ['mid', mid], ['high', high]]) {
      const base = times.map((time) => {
        const lane = laneMap.get(time);
        if (lane === undefined) throw Error('opus468_missing_inherited_lane');
        return { time, lane };
      });
      const key = `${lanes}:${tier}`;
      const adapted = adaptDecoratedChart468(decorateTier468(base, tier, info, lanes), lanes, samples.length / rate);
      if (adapted.length > OPUS468_TIER_NOTE_CAP[tier]) throw Error('opus468_cap_' + tier);
      totalNotes += adapted.length;
      charts[key] = adapted;
    }
    const scBase = high.map((time) => {
      const lane = laneMap.get(time);
      if (lane === undefined) throw Error('opus468_missing_inherited_lane');
      return { time, lane };
    });
    const scKey = `${lanes}:sc`;
    const scAdapted = adaptDecoratedChart468(
      decorateTier468(scBase, 'sc', info, lanes, C3_SC_PARAMS),
      lanes,
      samples.length / rate,
    );
    if (scAdapted.length > OPUS468_TIER_NOTE_CAP.sc) throw Error('opus468_cap_sc');
    totalNotes += scAdapted.length;
    charts[scKey] = scAdapted;
  }
  if (totalNotes > OPUS468_MAX_TOTAL_NOTES) throw Error('opus468_cap_total');
  return { charts, duration: samples.length / rate, analysis };
}
