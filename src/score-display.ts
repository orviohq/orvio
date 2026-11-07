/** Display only. The engine, judgments, stored results and replay never read this. */
export class ScoreDisplay {
  private shown = 0;
  private target = 0;
  private from = 0;
  private started = 0;
  private lastPulse = -1000;
  constructor(private element: HTMLElement) {}
  reset() {
    this.shown = this.target = this.from = this.started = 0;
    this.element.getAnimations().forEach((a) => a.cancel());
    this.element.textContent = '0000000';
    this.element.dataset.target = '0';
  }
  update(score: number, now: number, reduced: boolean) {
    if (score !== this.target) {
      this.from = this.shown;
      this.target = score;
      this.started = now;
      this.element.dataset.target = String(score);
      if (!reduced && score > this.shown && now - this.lastPulse > 90) {
        this.lastPulse = now;
        this.element.getAnimations().forEach((a) => a.cancel());
        this.element.animate(
          [
            {
              transform: 'translateY(0) scale(1)',
              color: '#f1f2fc',
              textShadow: '0 0 0 transparent',
            },
            {
              transform: 'translateY(-2px) scale(1.025)',
              color: '#fff4a8',
              textShadow: '0 0 16px #6feaff99',
            },
            {
              transform: 'translateY(0) scale(1)',
              color: '#f1f2fc',
              textShadow: '0 0 0 transparent',
            },
          ],
          { duration: 220, easing: 'ease-out' },
        );
      }
    }
    const progress = Math.min(1, Math.max(0, (now - this.started) / 150));
    this.shown = reduced
      ? this.target
      : Math.round(
          this.from + (this.target - this.from) * (1 - (1 - progress) ** 3),
        );
    this.element.textContent = this.shown.toString().padStart(7, '0');
    if (reduced) this.element.getAnimations().forEach((a) => a.cancel());
  }
}
