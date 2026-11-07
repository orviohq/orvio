/** Display-only phase tracker. Input/judgment continue to use the audio clock.
 * Small output-timestamp jitter is corrected gradually without changing scroll speed.
 * Pauses, seeks and large discontinuities resync immediately instead of coasting.
 */
export class VisualClock {
  private frame?: number;
  private time = 0;
  reset() {
    this.frame = undefined;
  }
  sample(frame: number, audio: number) {
    const dt = this.frame === undefined ? 0 : (frame - this.frame) / 1000;
    this.frame = frame;
    if (dt <= 0 || dt > 0.1 || Math.abs(audio - (this.time + dt)) > 0.05) {
      this.time = audio;
      return audio;
    }
    const predicted = this.time + dt;
    const correction = (audio - predicted) * (1 - Math.exp(-dt / 0.12));
    this.time = Math.max(
      this.time,
      predicted + Math.max(-0.002, Math.min(0.002, correction)),
    );
    return this.time;
  }
}
