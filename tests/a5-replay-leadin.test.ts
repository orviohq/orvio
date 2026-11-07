import { describe, expect, it } from 'vitest';
import { packReplay, unpackReplay } from '../src/replay-binary';
import { validateRuntimeReplay } from '../src/replay';
import { SONGS } from '../src/chart';

// A5 replay compatibility: new recordings stamp their exact audio lead-in as
// an optional trailing meta element; pre-A5 payloads have 6 meta elements and
// must stay byte-identical and decode with audioLeadIn undefined (= 0.15s).
const base = {
  version: 1 as const,
  song: SONGS[0].id,
  lanes: 5 as const,
  difficulty: 'low' as const,
  options: {
    speed: 1.5,
    fader: 'off' as const,
    shuffle: 'off' as const,
    seed: 7,
  },
  ops: [
    [3, 0, -0.1, 1.5, 'off'],
    [0, 2332, 2.1818, 4, 1],
    [0, 2340, 2.19, 4, 0],
    [1, 39000, 38.85],
  ] as any[],
  end: 39000,
};

describe('A5 replay audioLeadIn schema', () => {
  it('roundtrips a new recording with its exact lead-in', () => {
    const r = { ...base, audioLeadIn: 2.028787878787879 };
    const out = unpackReplay(packReplay(r as any));
    expect(out.audioLeadIn).toBe(2.028787878787879);
    expect(out.ops).toHaveLength(4);
    expect(out.end).toBe(39000);
  });
  it('keeps pre-A5 payloads byte-identical (no 7th meta element)', () => {
    const oldBytes = packReplay(base as any);
    const out = unpackReplay(oldBytes);
    expect(out.audioLeadIn).toBeUndefined();
    // packing the decoded old replay again yields the same bytes
    expect(packReplay(out as any)).toEqual(oldBytes);
  });
  it('validates old v1 replays without the field', () => {
    const ok = validateRuntimeReplay(base, () => true);
    expect(ok).not.toBeNull();
    expect(ok!.audioLeadIn).toBeUndefined();
  });
  it('bounds the stamped lead-in', () => {
    expect(
      validateRuntimeReplay({ ...base, audioLeadIn: 11 }, () => true),
    ).toBeNull();
    expect(
      validateRuntimeReplay({ ...base, audioLeadIn: NaN }, () => true),
    ).toBeNull();
    expect(
      validateRuntimeReplay({ ...base, audioLeadIn: 0.15 }, () => true),
    ).not.toBeNull();
  });
  it('ties negative chart-time bounds to the replay lead-in', () => {
    // Preserve the old validator boundary exactly when metadata is absent.
    const oldPause = { ...base, ops: [[2, 1000, -1.2, 1]] };
    expect(validateRuntimeReplay(oldPause, () => true)).not.toBeNull();
    expect(
      validateRuntimeReplay({ ...base, ops: [[2, 1000, -2, 1]] }, () => true),
    ).not.toBeNull();
    expect(
      validateRuntimeReplay(
        { ...base, ops: [[2, 1000, -2.001, 1]] },
        () => true,
      ),
    ).toBeNull();
    const oldOk = { ...base, ops: [[2, 1000, -0.15, 1]] };
    expect(
      validateRuntimeReplay(oldOk, () => true),
      'old pause at -0.15 ok',
    ).not.toBeNull();
    // new recording with a 2.88s lead-in may pause at chart -2.88
    const newPause = {
      ...base,
      audioLeadIn: 2.877272727272727,
      ops: [[2, 500, -2.8773, 1]],
    };
    expect(validateRuntimeReplay(newPause, () => true)).not.toBeNull();
    const newTooFar = {
      ...base,
      audioLeadIn: 2.877272727272727,
      ops: [[2, 500, -3.9, 1]],
    };
    expect(validateRuntimeReplay(newTooFar, () => true)).toBeNull();
  });
});
