/**
 * ORV-94 — original synthesized fever activation, 0.78 s, no samples/assets.
 *
 * The old 0.30 s burst was bass-heavy at the attack; its exponentially fading
 * saw was almost inaudible by the top of the sweep. Three short square notes
 * added buzzy, disconnected UI beeps rather than a sustained payoff.
 *
 * Recipe (seconds relative to activation; gains before the user's volume):
 * - Impact: sine 190 -> 58 Hz in 95 ms, gain .48, 3 ms attack, 240 ms lifetime;
 *   a .22 high-passed noise crack (1300 Hz, Q .707) ends at 120 ms.
 * - Lift: three sine partials at 1x/2x/3x of 480 -> 1920 Hz, .025-.315 s,
 *   gains .095/.035/.018, swelling for 145 ms instead of fading immediately.
 *   A quieter .065 high-passed noise swell (3200 Hz) adds air, ending at .52 s.
 * - Payoff: overlapping 1320/1760/2640 Hz bells at .18/.24/.30 s, gains
 *   .070/.058/.046, plus restrained 2.006x partials at .018/.015/.012.
 *   4 ms attacks and staggered .56/.50/.48 s decays make a shimmering tail.
 *
 * Fast bass pitch fall supplies punch; the noise transient survives music
 * masking; the rising harmonic bank supplies excitement without a raw saw's
 * harsh top end. Octave/fourth/fifth-related bells avoid a major/minor fanfare.
 * Positive exponential endpoints followed by 12 ms linear fades reach true
 * zero before stopping. No reverb, limiter or makeup gain: headroom and user
 * volume are preserved. Every voice connects only to the supplied output.
 *
 * Only the small structural Web Audio subset below is required. Scheduling is
 * synchronous, bounded and fire-and-forget (no awaits/timers/resume). Seeded
 * noise is generated once per context and reused. Sources and private nodes
 * disconnect on ended; partial construction failures are contained and cleaned
 * up so an unavailable audio device never interrupts gameplay.
 */

export interface FeverParam {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
}

export interface FeverNode {
  connect(destination: FeverNode): unknown;
  disconnect(): void;
}

export interface FeverSource extends FeverNode {
  start(time: number): void;
  stop(time: number): void;
  addEventListener(
    type: 'ended',
    listener: () => void,
    options: { once: boolean },
  ): void;
}

export interface FeverBuffer {
  getChannelData(channel: number): Float32Array;
}

export interface FeverContext {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state?: string;
  createOscillator(): FeverSource & {
    type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
    frequency: FeverParam;
  };
  createGain(): FeverNode & { gain: FeverParam };
  createBiquadFilter(): FeverNode & {
    type: string;
    frequency: FeverParam;
    Q: FeverParam;
  };
  createBuffer(channels: number, length: number, rate: number): FeverBuffer;
  createBufferSource(): FeverSource & { buffer: FeverBuffer | null };
}

const noiseCache = new WeakMap<FeverContext, FeverBuffer>();

function noise(context: FeverContext): FeverBuffer {
  const cached = noiseCache.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * 0.52),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  let seed = 0x4f5256;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = (seed / 4294967296) * 2 - 1;
  }
  noiseCache.set(context, buffer);
  return buffer;
}

export function playFeverBurst(context: FeverContext, output: FeverNode): void {
  const nodes: FeverNode[] = [];
  const sources: FeverSource[] = [];
  const own = <T extends FeverNode>(node: T): T => {
    nodes.push(node);
    return node;
  };
  const disconnect = (list: FeverNode[]) => {
    for (const node of list) {
      try {
        node.disconnect();
      } catch {
        // Best effort, including contexts closed during scheduling/playback.
      }
    }
  };
  try {
    if (context.state === 'closed') return;
    const t = context.currentTime;
    const envelope = (
      gain: FeverParam,
      at: number,
      attack: number,
      length: number,
      peak: number,
    ) => {
      gain.setValueAtTime(0, at);
      gain.linearRampToValueAtTime(peak, at + attack);
      gain.exponentialRampToValueAtTime(0.0001, at + length - 0.012);
      gain.linearRampToValueAtTime(0, at + length);
    };
    const schedule = (
      source: FeverSource,
      gain: FeverNode,
      at: number,
      length: number,
      filter?: FeverNode,
    ) => {
      const chain = filter ? [source, filter, gain] : [source, gain];
      source.addEventListener('ended', () => disconnect(chain), { once: true });
      if (filter) {
        source.connect(filter);
        filter.connect(gain);
      } else source.connect(gain);
      gain.connect(output);
      source.start(at);
      source.stop(at + length);
    };
    const tone = (
      offset: number,
      from: number,
      to: number,
      sweep: number,
      peak: number,
      attack: number,
      length: number,
    ) => {
      const source = own(context.createOscillator());
      sources.push(source);
      const gain = own(context.createGain());
      const at = t + offset;
      source.type = 'sine';
      source.frequency.setValueAtTime(from, at);
      if (sweep > 0)
        source.frequency.exponentialRampToValueAtTime(to, at + sweep);
      envelope(gain.gain, at, attack, length, peak);
      schedule(source, gain, at, length);
    };
    const air = (
      offset: number,
      cutoff: number,
      peak: number,
      attack: number,
      length: number,
    ) => {
      const source = own(context.createBufferSource());
      sources.push(source);
      source.buffer = noise(context);
      const filter = own(context.createBiquadFilter());
      filter.type = 'highpass';
      filter.frequency.value = cutoff;
      filter.Q.value = Math.SQRT1_2;
      const gain = own(context.createGain());
      const at = t + offset;
      envelope(gain.gain, at, attack, length, peak);
      schedule(source, gain, at, length, filter);
    };

    tone(0, 190, 58, 0.095, 0.48, 0.003, 0.24);
    air(0, 1300, 0.22, 0.001, 0.12);
    [0.095, 0.035, 0.018].forEach((peak, i) => {
      const harmonic = i + 1;
      tone(0.025, 480 * harmonic, 1920 * harmonic, 0.205, peak, 0.145, 0.29);
    });
    air(0.035, 3200, 0.065, 0.165, 0.485);
    [1320, 1760, 2640].forEach((frequency, i) => {
      const at = [0.18, 0.24, 0.3][i];
      const length = [0.56, 0.5, 0.48][i];
      tone(at, frequency, frequency, 0, [0.07, 0.058, 0.046][i], 0.004, length);
      tone(
        at,
        frequency * 2.006,
        frequency * 2.006,
        0,
        [0.018, 0.015, 0.012][i],
        0.004,
        length,
      );
    });
  } catch {
    for (const source of sources) {
      try {
        source.stop(context.currentTime);
      } catch {
        // An unstarted/already ended source may reject stop().
      }
    }
    disconnect(nodes);
  }
}
