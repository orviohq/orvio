import { describe, expect, it, beforeEach } from 'vitest';
import { countdownTiming } from '../src/timing';

// A5: AudioClock.play(buffer, leadIn) must anchor the buffer `leadIn` seconds
// in the future and always start at the buffer head (no offset), so the 0.15s
// floor used for late-first-note charts never truncates the audio head.
class FakeSource {
  startArgs: unknown[] | null = null;
  buffer: unknown = null;
  connect() {}
  start(...args: unknown[]) {
    this.startArgs = args;
  }
  stop() {}
}
class FakeContext {
  currentTime = 1.25;
  baseLatency = 0;
  outputLatency = 0;
  destination = {};
  sources: FakeSource[] = [];
  async resume() {}
  async suspend() {}
  createGain() {
    return { gain: { value: 0 }, connect() {} };
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
}

let ctx: FakeContext;
beforeEach(() => {
  ctx = new FakeContext();
  (globalThis as Record<string, unknown>).AudioContext = function () {
    return ctx;
  };
});

describe('A5 leadIn clamp', () => {
  it('anchors play at currentTime + leadIn and starts at buffer head', async () => {
    const { AudioClock } = await import('../src/audio');
    const clock = new AudioClock();
    await clock.play({} as AudioBuffer, 0.15);
    expect(ctx.sources).toHaveLength(1);
    // anchor exactly currentTime + 0.15 (the floor) ...
    expect(ctx.sources[0].startArgs).toEqual([1.25 + 0.15]);
    // ... and a single-argument start() means offset 0: the head plays in full.
    expect(ctx.sources[0].startArgs).toHaveLength(1);
  });
  it('default leadIn stays 0.15', async () => {
    const { AudioClock } = await import('../src/audio');
    const clock = new AudioClock();
    await clock.play({} as AudioBuffer);
    expect(ctx.sources[0].startArgs).toEqual([1.25 + 0.15]);
  });
  it('countdownTiming floors at 0.15 for a late first note (firstFall > 5 beats)', () => {
    // synthetic late-first-note chart: first note 12s in, 120 BPM, speed 1
    const { leadIn, firstFall } = countdownTiming(120, 1, 12);
    expect(firstFall).toBe(10);
    expect(leadIn).toBe(0.15);
    // built-in matrix never reaches the floor: first-light 110BPM speed 1
    const b = countdownTiming(110, 1, 2.1818181818181817);
    expect(b.firstFall).toBeCloseTo(0.1818, 4);
    expect(b.leadIn).toBeCloseTo(2.6955, 4);
  });
});
