import { describe, expect, it } from 'vitest';
import { outputTime } from '../src/timing';
import { noteLayout } from '../src/note-layout';
import { Engine } from '../src/engine';
describe('automatic audible sync', () => {
  it('uses output timestamp without double subtracting device latency', () => {
    expect(
      outputTime(2100, 2200, 5, 3, 0.01, 0.1, {
        contextTime: 4,
        performanceTime: 2000,
      }),
    ).toBeCloseTo(1.1);
  });
  it('fallback includes graph and device latency and delayed event timestamp', () => {
    expect(outputTime(2100, 2200, 5, 3, 0.01, 0.1)).toBeCloseTo(1.79);
    expect(outputTime(2200, 2200, 5, 3, 0.01, 0.1)).toBeCloseTo(1.89);
  });
  it('unavailable or invalid output timestamps fall back safely', () => {
    expect(
      outputTime(1000, 1000, 2, 1, 0, 0, {
        contextTime: 0,
        performanceTime: 0,
      }),
    ).toBe(1);
    expect(
      outputTime(1000, 1000, 2, 1, 0, 0, {
        contextTime: NaN,
        performanceTime: 500,
      }),
    ).toBe(1);
  });
});
describe('long note visual lifetime', () => {
  it('holds the head at the judgment line after its original head left the screen', () => {
    const e = new Engine([{ id: 0, lane: 0, time: 1, end: 2 }]);
    e.input({ lane: 0, time: 1, down: true, sequence: 0 });
    const p = noteLayout(e.states[0], 528, 1.8, 500, 620);
    expect(p.visible).toBe(true);
    expect(p.showHead).toBe(true);
    expect(p.headY).toBe(528);
    expect(p.bodyHeight).toBeCloseTo(100);
    e.input({ lane: 0, time: 2, down: false, sequence: 1 });
    expect(noteLayout(e.states[0], 528, 2, 500, 620).visible).toBe(false);
  });
  it('hides a broken hold only after release resolves it', () => {
    const e = new Engine([{ id: 0, lane: 0, time: 1, end: 2 }]);
    e.input({ lane: 0, time: 1, down: true, sequence: 0 });
    e.input({ lane: 0, time: 1.2, down: false, sequence: 1 });
    expect(noteLayout(e.states[0], 528, 1.2, 500, 620).visible).toBe(false);
  });
});
