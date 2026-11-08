import { describe, it, expect, vi } from 'vitest';
import { audioPersistenceRequest } from '../src/audio-storage-persistence';
describe('optional durable audio cache request', () => {
  it('requests once after persistence is absent, sharing concurrent calls', async () => {
    const persist = vi.fn(async () => true),
      persisted = vi.fn(async () => false),
      run = audioPersistenceRequest({ persist, persisted });
    expect(await Promise.all([run(), run(), run()])).toEqual([
      true,
      true,
      true,
    ]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persisted).toHaveBeenCalledTimes(1);
  });
  it('does not prompt again for persistent storage', async () => {
    const persist = vi.fn(),
      run = audioPersistenceRequest({ persist, persisted: async () => true });
    expect(await run()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
  it('denial is honest and does not repeatedly ask', async () => {
    const persist = vi.fn(async () => false),
      run = audioPersistenceRequest({ persist });
    expect(await run()).toBe(false);
    expect(await run()).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it('unsupported and unavailable storage never blocks saving', async () => {
    expect(await audioPersistenceRequest()()).toBe(false);
    expect(await audioPersistenceRequest({})()).toBe(false);
    expect(
      await audioPersistenceRequest({
        persist: async () => {
          throw Error('denied');
        },
      })(),
    ).toBe(false);
  });
});
