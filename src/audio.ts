import { duration, melodyIndex, type Song } from './chart';
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
export interface Soundtrack {
  buffer: AudioBuffer;
  peak: number;
}
export async function renderSong(song: Song): Promise<Soundtrack> {
  const rate = 44100;
  const ctx = new OfflineAudioContext(
    2,
    Math.ceil(duration(song) * rate),
    rate,
  );
  const master = ctx.createGain();
  master.gain.value = 0.45;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 4;
  master.connect(compressor);
  compressor.connect(ctx.destination);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = (60 / song.bpm) * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.24;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);
  const beat = 60 / song.bpm;
  let seed = song.root;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const noise = ctx.createBuffer(1, rate, rate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = random() * 2 - 1;
  function tone(
    t: number,
    f: number,
    length: number,
    volume: number,
    type: OscillatorType = 'sine',
    echo = false,
  ) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(g);
    g.connect(master);
    if (echo) g.connect(delay);
    osc.start(t);
    osc.stop(t + length + 0.03);
  }
  function hat(t: number, loud = false) {
    const n = ctx.createBufferSource();
    n.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(loud ? 0.15 : 0.065, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(filter);
    filter.connect(g);
    g.connect(master);
    n.start(t);
    n.stop(t + 0.08);
  }
  function kick(t: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.27);
  }
  function snare(t: number) {
    const n = ctx.createBufferSource();
    n.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    n.connect(f);
    f.connect(g);
    g.connect(master);
    n.start(t);
    n.stop(t + 0.18);
    tone(t, 180, 0.09, 0.12, 'triangle');
  }
  const progression =
    song.id === 'first-light'
      ? [0, 5, 9, 7]
      : song.id === 'afterimage'
        ? [0, 8, 3, 10]
        : [0, 3, 8, 5];
  for (let bar = 0; bar < song.bars; bar++) {
    const root = song.root + progression[Math.floor(bar / 2) % 4];
    const t = bar * 4 * beat;
    for (const interval of [0, song.id === 'first-light' ? 4 : 3, 7, 14])
      tone(t, midi(root + interval + 12), beat * 3.9, 0.045, 'triangle', true);
    for (let b = 0; b < 4; b++) {
      const at = t + b * beat;
      const drop = bar >= 4 && bar < song.bars - 2;
      if (
        song.id === 'first-light' ||
        b === 0 ||
        b === 2 ||
        (song.id === 'violet-drive' && b === 3)
      )
        kick(at);
      if (b === 1 || b === 3) snare(at);
      for (let h = 0; h < 2; h++) hat(at + (h * beat) / 2, b === 3 && h === 1);
      if (drop && song.id === 'violet-drive') hat(at + beat * 0.75);
      tone(
        at,
        midi(root - 12 + (b === 3 ? 7 : 0)),
        beat * 0.7,
        0.2,
        song.id === 'first-light' ? 'sine' : 'triangle',
      );
      if (song.id === 'afterimage' && drop)
        tone(at + beat * 0.65, midi(root - 12), beat * 0.25, 0.16, 'triangle');
      for (let sub = 0; sub < 2; sub++) {
        const step = bar * 8 + b * 2 + sub;
        const offset = song.scale[melodyIndex(step, song)];
        const at2 = at + (sub * beat) / 2;
        tone(
          at2,
          midi(song.root + 24 + offset),
          beat * (drop ? 0.65 : 0.9),
          drop ? 0.1 : 0.065,
          song.id === 'violet-drive' ? 'sawtooth' : 'sine',
          true,
        );
      }
    }
  }
  const buffer = await ctx.startRendering();
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const a = buffer.getChannelData(c);
    for (let i = 0; i < a.length; i++) peak = Math.max(peak, Math.abs(a[i]));
  }
  return { buffer, peak };
}
export class AudioClock {
  readonly context = new AudioContext({ latencyHint: 'interactive' });
  private source?: AudioBufferSourceNode;
  private anchor = 0;
  private started = false;
  private volume: GainNode;
  constructor() {
    this.volume = this.context.createGain();
    this.volume.gain.value = 0.7;
    this.volume.connect(this.context.destination);
  }
  async play(buffer: AudioBuffer) {
    await this.context.resume();
    this.stop();
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;
    this.source.connect(this.volume);
    this.anchor = this.context.currentTime + 0.15;
    this.source.start(this.anchor);
    this.started = true;
  }
  now(performanceTime = performance.now()): number {
    const stamp = this.context.getOutputTimestamp?.();
    if (
      stamp &&
      typeof stamp.contextTime === 'number' &&
      typeof stamp.performanceTime === 'number' &&
      stamp.contextTime > 0 &&
      stamp.performanceTime > 0
    )
      return (
        stamp.contextTime +
        (performanceTime - stamp.performanceTime) / 1000 -
        this.anchor
      );
    return (
      this.context.currentTime -
      this.anchor -
      (this.context.outputLatency || this.context.baseLatency || 0)
    );
  }
  get active() {
    return this.started;
  }
  stop() {
    try {
      this.source?.stop();
    } catch {
      /* Already ended. */
    }
    this.source = undefined;
    this.started = false;
  }
  setVolume(v: number) {
    this.volume.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.context.currentTime,
      0.02,
    );
  }
  click() {
    const o = this.context.createOscillator();
    const g = this.context.createGain();
    o.frequency.value = 1000;
    g.gain.setValueAtTime(0.12, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + 0.025,
    );
    o.connect(g);
    g.connect(this.volume);
    o.start();
    o.stop(this.context.currentTime + 0.03);
  }
}
