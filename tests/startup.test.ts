import { describe, it, expect, vi } from 'vitest';
import { StartupAttempt } from '../src/startup';
describe('startup ownership', () => {
  it('rejects on cancel and never resumes a late continuation', async () => {
    const attempt = new StartupAttempt();
    let release!: (x: number) => void;
    const source = new Promise<number>((r) => (release = r));
    let starts = 0;
    const run = attempt.wait(source).then(() => starts++);
    attempt.cancel();
    await expect(run).rejects.toBe('cancel');
    release(1);
    await Promise.resolve();
    expect(starts).toBe(0);
  });
  it('expires pending work and consumes late rejection', async () => {
    vi.useFakeTimers();
    const attempt = new StartupAttempt(30);
    let reject!: (x: string) => void;
    const pending = attempt.wait(new Promise((_, r) => (reject = r)));
    const check = expect(pending).rejects.toBe('timeout');
    await vi.advanceTimersByTimeAsync(30);
    await check;
    reject('late');
    await Promise.resolve();
    vi.useRealTimers();
  });
  it('finishing removes the deadline', async () => {
    vi.useFakeTimers();
    const attempt = new StartupAttempt(30);
    expect(await attempt.wait(Promise.resolve(7))).toBe(7);
    attempt.finish();
    await vi.advanceTimersByTimeAsync(31);
    expect(attempt.signal.aborted).toBe(false);
    vi.useRealTimers();
  });
});
