import { afterEach, expect, it, vi } from 'vitest';
import { AudioClock } from '../src/audio';
afterEach(() => vi.unstubAllGlobals());
function context() {
  const resume = vi.fn(() => Promise.resolve());
  class Context {
    destination = {};
    currentTime = 0;
    state = 'running';
    resume = resume;
    createGain() {
      return { gain: { value: 0, setTargetAtTime() {} }, connect() {} };
    }
  }
  vi.stubGlobal('AudioContext', Context);
  return resume;
}
it('declares optional media playback intent before synchronously resuming', () => {
  const resume = context(),
    order: string[] = [];
  const session = {
    set type(value: string) {
      order.push(value);
    },
  };
  vi.stubGlobal('navigator', { audioSession: session });
  resume.mockImplementation(() => {
    order.push('resume');
    return Promise.resolve();
  });
  const clock = new AudioClock();
  const p = clock.activate();
  expect(order).toEqual(['playback', 'resume']);
  expect(p).toBeInstanceOf(Promise);
});
it('missing or rejecting AudioSession does not stop audio activation', async () => {
  const resume = context();
  for (const nav of [
    {},
    Object.defineProperty({}, 'audioSession', {
      get() {
        throw Error('unsupported');
      },
    }),
    {
      audioSession: Object.defineProperty({}, 'type', {
        set() {
          throw Error('rejected');
        },
      }),
    },
  ]) {
    vi.stubGlobal('navigator', nav);
    await new AudioClock().activate();
  }
  expect(resume).toHaveBeenCalledTimes(3);
});

it('reports a rejected or still interrupted activation instead of claiming playback', async () => {
  const resume = context();
  vi.stubGlobal('navigator', {});
  resume.mockRejectedValueOnce(Error('interrupted'));
  await expect(new AudioClock().activate()).rejects.toThrow('interrupted');
  const clock = new AudioClock();
  Object.assign(clock.context, { state: 'interrupted' });
  await expect(clock.activate()).rejects.toThrow('Audio playback unavailable');
});
