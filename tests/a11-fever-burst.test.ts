import { it, expect, vi } from 'vitest';
import { AudioClock } from '../src/audio';

class Param {
  value = 0;
  events: Array<[string, number, number]> = [];
  setValueAtTime(v: number, t: number) {
    this.events.push(['set', v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(['linear', v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.events.push(['exponential', v, t]);
  }
  setTargetAtTime(v: number, t: number) {
    this.value = v;
    this.events.push(['target', v, t]);
  }
}
class Node {
  outputs: Node[] = [];
  disconnects = 0;
  connect(node: Node) {
    this.outputs.push(node);
    return node;
  }
  disconnect() {
    this.disconnects++;
    this.outputs = [];
  }
}
class Source extends Node {
  type = '';
  frequency = new Param();
  buffer: unknown = null;
  starts: number[] = [];
  stops: number[] = [];
  ended?: () => void;
  addEventListener(type: string, listener: () => void, options: unknown) {
    expect(type).toBe('ended');
    expect(options).toEqual({ once: true });
    this.ended = listener;
  }
  start(t: number) { this.starts.push(t); }
  stop(t: number) { this.stops.push(t); }
}
class MockContext {
  currentTime = 1.5;
  sampleRate = 48000;
  state = 'running';
  destination = new Node();
  oscillators: Source[] = [];
  buffers: Source[] = [];
  gains: Array<Node & { gain: Param }> = [];
  filters: Array<Node & { type: string; frequency: Param; Q: Param }> = [];
  createOscillator() {
    const node = new Source();
    this.oscillators.push(node);
    return node;
  }
  createBufferSource() {
    const node = new Source();
    this.buffers.push(node);
    return node;
  }
  createGain() {
    const node = Object.assign(new Node(), { gain: new Param() });
    this.gains.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = Object.assign(new Node(), {
      type: '', frequency: new Param(), Q: new Param(),
    });
    this.filters.push(node);
    return node;
  }
  createBuffer(channels: number, length: number, rate: number) {
    expect(channels).toBe(1);
    expect(rate).toBe(this.sampleRate);
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

it('AudioClock schedules 10 sine + 2 noise voices through user volume and cleans up only private nodes', () => {
  const ctx = new MockContext();
  vi.stubGlobal('AudioContext', function () { return ctx; });
  try {
    const clock = new AudioClock();
    clock.setVolume(0.37);
    const volume = ctx.gains[0];
    const volumeEvents = structuredClone(volume.gain.events);
    expect(() => clock.feverBurst()).not.toThrow();
    expect(ctx.gains).toHaveLength(13);
    expect(ctx.oscillators).toHaveLength(10);
    expect(ctx.buffers).toHaveLength(2);
    expect(ctx.oscillators.every((o) => o.type === 'sine')).toBe(true);
    expect(ctx.filters.map((f) => f.type)).toEqual(['highpass', 'highpass']);
    expect(ctx.buffers[0].buffer).toBe(ctx.buffers[1].buffer);
    const sources = [...ctx.oscillators, ...ctx.buffers];
    for (const source of sources) {
      expect(source.starts).toHaveLength(1);
      expect(source.stops).toHaveLength(1);
      expect(source.starts[0]).toBeGreaterThanOrEqual(ctx.currentTime);
      expect(source.stops[0]).toBeGreaterThan(source.starts[0]);
      let node: Node = source;
      const seen = new Set<Node>();
      while (node !== volume) {
        expect(seen.has(node)).toBe(false);
        seen.add(node);
        expect(node.outputs).toHaveLength(1);
        node = node.outputs[0];
      }
    }
    expect(Math.min(...sources.map((s) => s.starts[0]))).toBe(ctx.currentTime);
    expect(Math.max(...sources.map((s) => s.stops[0])) - ctx.currentTime).toBeCloseTo(0.78);
    expect(volume.outputs).toEqual([ctx.destination]);
    expect(volume.gain.value).toBe(0.37);
    expect(volume.gain.events).toEqual(volumeEvents);
    for (const gain of ctx.gains.slice(1)) {
      expect(gain.outputs).toEqual([volume]);
      expect(gain.gain.events[0][1]).toBe(0);
      expect(gain.gain.events.at(-1)?.slice(0, 2)).toEqual(['linear', 0]);
    }
    for (const source of sources) source.ended!();
    for (const node of [...sources, ...ctx.filters, ...ctx.gains.slice(1)]) {
      expect(node.disconnects).toBe(1);
      expect(node.outputs).toEqual([]);
    }
    expect(volume.disconnects).toBe(0);
    expect(volume.outputs).toEqual([ctx.destination]);
  } finally {
    vi.unstubAllGlobals();
  }
});
