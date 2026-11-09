/** Presentation only. Never writes to results, replay, storage or the engine. */
export class ResultMotion {
  private frame = 0;
  private generation = 0;
  private animations: Animation[] = [];
  private finalScore = 0;
  private media = matchMedia('(prefers-reduced-motion: reduce)');
  constructor(private dialog: HTMLDialogElement) {
    dialog.addEventListener('close', () => this.finish());
    this.media.addEventListener('change', () => {
      if (this.media.matches) this.finish();
    });
  }
  finish() {
    this.generation++;
    cancelAnimationFrame(this.frame);
    this.animations.forEach((a) => a.cancel());
    this.animations = [];
    this.dialog.querySelector<HTMLElement>('#result-score')!.textContent =
      this.finalScore.toLocaleString('en-US');
    delete this.dialog.dataset.resultAnimating;
  }
  play(score: number, reduced: boolean) {
    this.finish();
    this.finalScore = score;
    const el = this.dialog.querySelector<HTMLElement>('#result-score')!;
    // Assistive technology gets the final value, not forty live updates.
    el.setAttribute('aria-label', score.toLocaleString('en-US'));
    el.setAttribute('role', 'img');
    if (reduced || this.media.matches) {
      this.finish();
      return;
    }
    const generation = this.generation;
    this.dialog.dataset.resultAnimating = 'true';
    const started = performance.now();
    const tick = (now: number) => {
      if (generation !== this.generation) return;
      if (!this.dialog.open) return this.finish();
      const progress = Math.min(1, Math.max(0, (now - started) / 1050));
      const value = Math.round(score * (1 - (1 - progress) ** 3));
      el.textContent = value.toLocaleString('en-US');
      if (progress < 1) this.frame = requestAnimationFrame(tick);
      else {
        el.textContent = score.toLocaleString('en-US');
        delete this.dialog.dataset.resultAnimating;
      }
    };
    el.textContent = '0';
    this.frame = requestAnimationFrame(tick);
    const hold = (animation: Animation) => {
      this.animations.push(animation);
      // Intro animations hold their final keyframe (fill: 'both'); release
      // each one when it finishes so the element returns to its natural
      // style and is re-rendered by the normal style system while sibling
      // intro animations are still running, instead of retaining
      // animation-era raster. Aborted/restarted intros bump the generation;
      // finish() cancels the same animations on close.
      void animation.finished
        .catch(() => {})
        .then(() => {
          if (generation === this.generation) animation.cancel();
        });
    };
    const animate = (
      selector: string,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      this.dialog.querySelectorAll<HTMLElement>(selector).forEach((target) => {
        hold(target.animate(frames, options));
      });
    };
    animate(
      '#result-rank',
      [
        { transform: 'scale(2.4) rotate(-9deg)', opacity: 0 },
        { transform: 'scale(0.9) rotate(2deg)', opacity: 1, offset: 0.58 },
        { transform: 'scale(1.07) rotate(-1deg)', offset: 0.8 },
        { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      ],
      {
        duration: 480,
        delay: 160,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'both',
      },
    );
    animate(
      '.result-rank-block',
      [
        { borderColor: '#9efaff', background: '#25485b' },
        { borderColor: '#39566a', background: '#142637' },
      ],
      { duration: 650, delay: 340, easing: 'ease-out', fill: 'both' },
    );
    const rows = this.dialog.querySelectorAll<HTMLElement>(
      '.result-stats > div, #result-fever:not(.hidden), #judgment-list > div',
    );
    rows.forEach((target, i) => {
      hold(
        target.animate(
          [
            { opacity: 0, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 320,
            delay: 300 + i * 48,
            easing: 'ease-out',
            fill: 'both',
          },
        ),
      );
    });
  }
}
