import { it, expect, beforeEach } from 'vitest';

interface MockParam {
  value: number;
  sets: Array<[number, number]>;
  ramps: Array<[number, number]>;
  setValueAtTime(v: number, t: number): void;
  exponentialRampToValueAtTime(v: number, t: number): void;
}
const mockParam = (): MockParam => ({
  value: 0,
  sets: [],
  ramps: [],
  setValueAtTime(v: number, t: number) {
    this.sets.push([v, t]);
  },
  exponentialRampToValueAtTime(v: number, t: number) {
    this.ramps.push([v, t]);
  },
});

class MockContext {
  currentTime = 1.5;
  destination = {};
  oscillators: Array<{
    type: string;
    frequency: MockParam;
    connectedTo: unknown[];
    starts: number[];
    stops: number[];
  }> = [];
  gains: Array<{ gain: MockParam; connectedTo: unknown[] }> = [];
  createOscillator() {
    const o = {
      type: '',
      frequency: mockParam(),
      connectedTo: [] as unknown[],
      starts: [] as number[],
      stops: [] as number[],
      connect(node: unknown) {
        this.connectedTo.push(node);
        return node;
      },
      start(t = 0) {
        this.starts.push(t);
      },
      stop(t = 0) {
        this.stops.push(t);
      },
    };
    this.oscillators.push(o);
    return o;
  }
  createGain() {
    const g = {
      gain: mockParam(),
      connectedTo: [] as unknown[],
      connect(node: unknown) {
        this.connectedTo.push(node);
        return node;
      },
    };
    this.gains.push(g);
    return g;
  }
}

let AudioClock: typeof import('../src/audio').AudioClock;
let clock: InstanceType<typeof AudioClock>;
let ctx: MockContext;

beforeEach(async () => {
  ctx = new MockContext();
  (globalThis as { AudioContext?: unknown }).AudioContext = function () {
    return ctx;
  };
  ({ AudioClock } = await import('../src/audio'));
  clock = new AudioClock();
});

it('feverBurst layers sub + sweep + three sparkles through the user volume node', () => {
  expect(() => clock.feverBurst()).not.toThrow();
  // constructor volume gain + sub + sweep + 3 sparkle gains
  expect(ctx.gains.length).toBe(6);
  // sub, sweep, 3 sparkles
  expect(ctx.oscillators.length).toBe(5);
  expect(ctx.oscillators[0].type).toBe('sine');
  expect(ctx.oscillators[1].type).toBe('sawtooth');
  expect(ctx.oscillators.slice(2).map((o) => o.type)).toEqual([
    'square',
    'square',
    'square',
  ]);
  // every oscillator is started and stopped (no node leaks)
  for (const o of ctx.oscillators) {
    expect(o.starts.length).toBe(1);
    expect(o.stops.length).toBe(1);
  }
  // the whole burst finishes well under a second
  const lastStop = Math.max(...ctx.oscillators.map((o) => o.stops[0]));
  expect(lastStop - ctx.currentTime).toBeLessThan(0.5);
  // every effect gain routes into the constructor volume node (first gain),
  // which connects to the destination: user volume setting is respected
  const volume = ctx.gains[0];
  expect(volume.connectedTo).toContain(ctx.destination);
  for (const g of ctx.gains.slice(1)) {
    expect(g.connectedTo).toContain(volume);
  }
  // sparkles ascend
  const freqs = ctx.oscillators.slice(2).map((o) => o.frequency.value);
  expect(freqs).toEqual([...freqs].sort((a, b) => a - b));
});
