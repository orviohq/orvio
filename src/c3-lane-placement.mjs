// Shared union-time lane placement for new charts. Hold decoration is recomputed
// per tier; hold identities and durations are not promised to stay unchanged.
import { assignLanes, laneGroups, C3_DEFAULT_PARAMS } from './c3-core.mjs';

export function fixedLaneMap(
  analysis,
  highTimes,
  lanes,
  scale,
  onsetInfo,
  P = C3_DEFAULT_PARAMS,
  minGap = 0.15,
) {
  const orig = assignLanes(analysis, highTimes, lanes, scale);
  const groups = laneGroups(lanes);
  const groupOf = (l) => {
    for (const arr of Object.values(groups)) if (arr.includes(l)) return arr;
    return [l];
  };
  // union of tier-wise hold-candidate heads (lane-independent part of decorateTier's cand filter)
  const medStr = [...onsetInfo.info.values()]
    .map((i) => i.strength)
    .sort((x, y) => x - y);
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
  // original per-lane sorted times (for own-head room check)
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
  const placedHeads = new Map(); // lane -> sorted head times
  const fixed = new Map();
  const moves = [];
  const residual = [];
  const room = P.minHold + P.tailClipMargin;
  const laneOK = (l, t) => {
    if (t - lastTime[l] < minGap) return false;
    for (const hc of placedHeads.get(l) || [])
      if (t > hc && t - hc < room) return false; // would clip hc's hold away
    if (candHeads.has(t) && origNextAfter(l, t) - t < room) return false; // t's own hold would have no room on l
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
