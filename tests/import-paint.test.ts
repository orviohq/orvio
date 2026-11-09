import { it, expect, vi, afterEach } from 'vitest';
import { waitImportPaint } from '../src/import-paint';
afterEach(() => vi.unstubAllGlobals());
it('aborts before either paint with the exact reason and cancels pending first/second frames', async () => {
  for (const count of [0, 1]) {
    const frames = new Map<number, FrameRequestCallback>();
    let next = 1;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      frames.set(next, fn);
      return next++;
    });
    const cancel = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const c = new AbortController(),
      reason = new DOMException('cancel', 'AbortError');
    const p = waitImportPaint(c.signal);
    const caught = p.catch((e) => e);
    if (count) {
      const fn = frames.get(1)!;
      frames.delete(1);
      fn(1);
    }
    c.abort(reason);
    expect(await caught).toBe(reason);
    expect(frames.size).toBe(0);
    expect(cancel).toHaveBeenCalled();
  }
});
it('already aborted wait requests no frame; two completed frames settle once', async () => {
  const raf = vi.fn();
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const c = new AbortController();
  c.abort();
  await expect(waitImportPaint(c.signal)).rejects.toBe(c.signal.reason);
  expect(raf).not.toHaveBeenCalled();
  const frames: FrameRequestCallback[] = [];
  raf.mockImplementation((fn: FrameRequestCallback) => {
    frames.push(fn);
    return frames.length;
  });
  const live = new AbortController(),
    p = waitImportPaint(live.signal);
  frames[0](1);
  frames[1](2);
  await p;
  live.abort();
});
