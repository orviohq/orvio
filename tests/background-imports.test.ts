import { it, expect, vi, afterEach } from 'vitest';
import { BackgroundImports } from '../src/background-imports';
const api = vi.hoisted(() => ({
  import: vi.fn((..._args: unknown[]) => new Promise(() => {})),
}));
vi.mock('../src/external-import', () => ({
  importYoutube: api.import,
  youtubeId: (s: string) => {
    const id = s.split('v=')[1] ?? s;
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function store(value = '[]') {
  const values = new Map([['orvio.pending-imports.v1', value]]);
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
function raf() {
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => setTimeout(fn, 0));
}
it('adds immediate pending state, joins duplicates and never exposes pending data as a completed source', async () => {
  raf();
  const complete = vi.fn(async () => {}),
    pending = new BackgroundImports(() => {}, complete, store());
  pending.enqueue('AAAAAAAAAAA');
  pending.enqueue('AAAAAAAAAAA');
  expect(pending.rows.size).toBe(1);
  expect(pending.rows.get('AAAAAAAAAAA')?.state).toBe('loading');
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(complete).not.toHaveBeenCalled();
});
it('restores only the known job via importer GET-resume contract, not a new extraction', async () => {
  raf();
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(
      JSON.stringify([
        { videoId: 'AAAAAAAAAAA', jobId: 'known-job', state: 'loading' },
      ]),
    ),
  );
  pending.resume();
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(api.import.mock.calls[0][2]).toMatchObject({ jobId: 'known-job' });
});
it('interrupted pre-job state needs explicit retry and storage failure starts no import', () => {
  raf();
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(JSON.stringify([{ videoId: 'AAAAAAAAAAA', state: 'loading' }])),
  );
  pending.resume();
  expect(pending.rows.get('AAAAAAAAAAA')?.state).toBe('error');
  expect(api.import).not.toHaveBeenCalled();
  const blocked = new BackgroundImports(
    () => {},
    async () => {},
    {
      getItem: () => null,
      setItem: () => {
        throw Error('blocked');
      },
    },
  );
  expect(() => blocked.enqueue('BBBBBBBBBBB')).toThrow('unavailable');
  try {
    blocked.enqueue('BBBBBBBBBBB');
  } catch (error) {
    expect(error).toMatchObject({ stage: 'storage' });
  }
  expect(blocked.rows.size).toBe(0);
  expect(api.import).not.toHaveBeenCalled();
});

it('restores bounded typed failures and reset metadata without retrying, rejecting unknown stored error names', () => {
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(
      JSON.stringify([
        {
          videoId: 'AAAAAAAAAAA',
          state: 'error',
          error: 'rate_limited',
          failure: {
            status: 429,
            limit: { limitScope: 'ip_day', resetAtUnixSec: 1800000000 },
          },
        },
        { videoId: 'BBBBBBBBBBB', state: 'error', error: 'made_up' },
      ]),
    ),
  );
  expect(pending.rows.get('AAAAAAAAAAA')?.failure?.code).toBe('rate_limited');
  expect(pending.rows.get('AAAAAAAAAAA')?.failure?.limit?.limitScope).toBe(
    'ip_day',
  );
  expect(pending.rows.get('BBBBBBBBBBB')?.error).toBe('unavailable');
  expect(api.import).not.toHaveBeenCalled();
});

it('restores only known failure stages, retaining cause classification across reload', () => {
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(
      JSON.stringify([
        {
          videoId: 'AAAAAAAAAAA',
          state: 'error',
          error: 'unavailable',
          failure: { stage: 'storage' },
        },
        {
          videoId: 'BBBBBBBBBBB',
          state: 'error',
          error: 'unavailable',
          failure: { stage: 'invented' },
        },
      ]),
    ),
  );
  expect(pending.rows.get('AAAAAAAAAAA')?.failure?.stage).toBe('storage');
  expect(pending.rows.get('BBBBBBBBBBB')?.failure?.stage).toBeUndefined();
  expect(api.import).not.toHaveBeenCalled();
});
