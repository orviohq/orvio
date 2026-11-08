// @ts-nocheck
// ProgressiveAudioClock: frame-exact progressive scheduling with the SAME
// anchor/output-time contract as src/audio.ts AudioClock. Only VERIFIED
// segments (per-segment sha under a pin-bound manifest) are scheduled.
// Underflow freezes the context BEFORE an unverified gap becomes audible and
// resumes sample-exact (prototype-verified suspend/resume semantics).
// outputTime below is verbatim src/timing.ts (integration imports the real one).
import { outputTime } from '../timing';
export class ProgressiveAudioClock {
  frozen = false;
  onBuffering: (value: boolean) => void = () => {};
  constructor(context, { guardSec = 0.25 } = {}) {
    this.context = context;
    this.guardSec = guardSec;
    this.volume = context.createGain();
    this.volume.gain.value = 0.7;
    this.volume.connect(context.destination);
    this.anchor = 0;
    this._leadIn = 0.15;
    this._anchored = false;
    this.started = false;
    this.frozenTime = undefined;
    this.scheduledThroughFrame = 0; // contiguous verified+scheduled coverage
    this.frozen = false;
    this.underflowCount = 0;
    this.lateBy = 0;
    this._sources = [];
    this.manualPaused = false;
  }
  activate() {
    return this.context.resume().then(() => {
      if (this.context.state !== 'running')
        throw new Error('Audio playback unavailable');
    });
  }
  /** Call in the play gesture, before network awaits. The anchor is set when
   *  the FIRST verified segment is scheduled (same moment AudioClock.play
   *  would anchor): the chart clock never runs ahead of verified audio, so
   *  startup buffering is a wait, not an underflow. */
  async begin(leadIn = 0.15) {
    await this.activate();
    this._leadIn = leadIn;
    this.started = true;
  }
  now(performanceTime = performance.now()) {
    if (this.frozenTime !== undefined) return this.frozenTime;
    return outputTime(
      performanceTime,
      performance.now(),
      this.context.currentTime,
      this.anchor,
      this.context.baseLatency,
      this.context.outputLatency,
      this.context.getOutputTimestamp?.(),
    );
  }
  /** Schedule a verified segment. Segments may arrive in order only
   *  (stream is ordered); frames map to anchor + startFrame/sampleRate. */
  scheduleSegment(segment, channels, manifest) {
    if (!this.started) throw Error('begin() first');
    if (!this._anchored) {
      this.anchor = this.context.currentTime + this._leadIn;
      this._anchored = true;
    }
    if (segment.startFrame !== this.scheduledThroughFrame)
      throw Error('Out-of-order segment'); // stream order is the only order
    const buffer = this.context.createBuffer(
      2,
      segment.frameCount,
      manifest.sampleRate,
    );
    buffer.copyToChannel(channels[0], 0);
    buffer.copyToChannel(channels[1], 1);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.volume);
    const when = this.anchor + segment.startFrame / manifest.sampleRate;
    // During a freeze the timeline holds; when stays in the future. After a
    // LATE freeze (gap already reached) resume shifts the anchor, and the
    // in-flight segment resumes mid-buffer at the exact frame offset.
    const offset = Math.max(0, this.context.currentTime - when);
    if (offset > 0 && offset >= segment.frameCount / manifest.sampleRate)
      throw Error('Segment fully expired'); // caller skips to the live edge
    source.start(Math.max(when, this.context.currentTime), offset);
    this._sources.push(source);
    source.onended = () => {
      const i = this._sources.indexOf(source);
      if (i >= 0) this._sources.splice(i, 1);
      source.disconnect();
    };
    this.scheduledThroughFrame = segment.startFrame + segment.frameCount;
    return when;
  }
  /** Lookahead check the driver runs when a segment completes AND on a timer.
   *  If unscheduled audio would run out within guardSec, freeze first. */
  async waitForGuard() {
    await this.guardTask;
  }
  async guard(manifest) {
    if (this.guardTask) return this.guardTask;
    const task = this.checkGuard(manifest);
    this.guardTask = task;
    try {
      return await task;
    } finally {
      if (this.guardTask === task) this.guardTask = undefined;
    }
  }
  async checkGuard(manifest) {
    if (this.manualPaused || this.frozen || !this.started || !this._anchored)
      return false;
    if (this.scheduledThroughFrame >= manifest.frames) return false; // fully scheduled
    const nextAt =
      this.anchor + this.scheduledThroughFrame / manifest.sampleRate;
    if (this.context.currentTime >= nextAt - this.guardSec) {
      // Late freeze: the unverified gap was already reached. Record how far
      // in; the anchor is NOT shifted (replay ops are time-ordered, now()
      // must stay monotonic). The next verified segment resumes mid-buffer
      // at exactly the lateBy offset, so audio and chart skip the gap
      // together and stay locked. The missed span is never fabricated.
      this.lateBy = Math.max(0, this.context.currentTime - nextAt);
      this.frozenTime = this.now();
      await this.context.suspend();
      if (!this.started) return false;
      this.frozen = true;
      this.frozenAtFrame = this.scheduledThroughFrame;
      this.onBuffering(true);
      this.underflowCount++;
      return true;
    }
    return false;
  }
  /** Resume after a freeze once the next segment is scheduled. */
  async resumeFromFreeze() {
    if (!this.started || !this.frozen || this.manualPaused) return;
    this.lateBy = 0;
    await this.activate();
    this.frozen = false;
    this.frozenTime = undefined;
    this.onBuffering(false);
  }
  async pause() {
    this.manualPaused = true;
    await this.waitForGuard();
    if (this.frozenTime === undefined) this.frozenTime = this.now();
    await this.context.suspend();
  }
  async resume() {
    this.manualPaused = false;
    await this.waitForGuard();
    if (this.frozen && this.scheduledThroughFrame === this.frozenAtFrame)
      return;
    this.frozen = false;
    this.onBuffering(false);
    await this.activate();
    this.frozenTime = undefined;
  }
  get active() {
    return this.started;
  }
  stop() {
    for (const s of this._sources) {
      try {
        s.stop();
      } catch {
        /* ended */
      }
    }
    this._sources = [];
    this.frozenTime = undefined;
    this.frozen = false;
    this.started = false;
  }
  dispose() {
    this.stop();
    void this.context.close().catch(() => {});
  }
  setVolume(v) {
    this.volume.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.context.currentTime,
      0.02,
    );
  }
}
