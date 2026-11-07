// One startup owns its deadline and all continuations. Audio/chart time is untouched.
export class StartupAttempt {
  readonly controller = new AbortController();
  readonly signal = this.controller.signal;
  private timer: ReturnType<typeof setTimeout>;
  constructor(timeoutMs = 30000) {
    this.timer = setTimeout(() => this.cancel('timeout'), timeoutMs);
  }
  cancel(reason = 'cancel') {
    this.controller.abort(reason);
    clearTimeout(this.timer);
  }
  finish() {
    clearTimeout(this.timer);
  }
  check() {
    this.signal.throwIfAborted();
  }
  async wait<T>(pending: Promise<T>): Promise<T> {
    this.check();
    let abort!: () => void;
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => reject(this.signal.reason);
      this.signal.addEventListener('abort', abort, { once: true });
    });
    try {
      const value = await Promise.race([pending, cancelled]);
      this.check();
      return value;
    } finally {
      this.signal.removeEventListener('abort', abort);
    }
  }
}
