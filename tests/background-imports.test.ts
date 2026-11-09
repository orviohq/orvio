import { it, expect, vi, afterEach } from 'vitest';
import { BackgroundImports } from '../src/background-imports';
const api = vi.hoisted(() => ({
  import: vi.fn((..._args: unknown[]) => new Promise(() => {})),
}));
vi.mock('../src/early-youtube-metadata', () => ({
  earlyYoutubeMetadata: vi.fn(async () => null),
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

it('manual re-add opts into confirmed terminal retry but reload resume does not', async () => {
  raf();
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(
      JSON.stringify([
        {
          videoId: 'AAAAAAAAAAA',
          jobId: 'known-job',
          state: 'error',
          error: 'unavailable',
        },
      ]),
    ),
  );
  pending.enqueue('AAAAAAAAAAA');
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(api.import.mock.calls[0][2]).toMatchObject({
    jobId: 'known-job',
    retryFailed: true,
  });
});

it('stage transitions reach saving before completion and remove row only after completion', async () => {
  raf();
  let finish!: () => void;
  api.import.mockResolvedValueOnce({
    prepared: {
      record: { videoId: 'AAAAAAAAAAA' },
      bytes: new ArrayBuffer(0),
      restored: false,
    },
  } as never);
  const complete = vi.fn(
    () =>
      new Promise<void>((r) => {
        finish = r;
      }),
  );
  const pending = new BackgroundImports(() => {}, complete, store());
  pending.enqueue('AAAAAAAAAAA');
  await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
  expect(pending.rows.get('AAAAAAAAAAA')?.stage).toBe('saving');
  finish();
  await vi.waitFor(() => expect(pending.rows.size).toBe(0));
});

it('admits one import at a time and starts no timeout while the next waits', async () => {
  raf();
  let release!: (value: unknown) => void;
  api.import.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const timeout = vi.spyOn(globalThis, 'setTimeout');
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(),
  );
  pending.enqueue('AAAAAAAAAAA');
  pending.enqueue('BBBBBBBBBBB');
  pending.enqueue('BBBBBBBBBBB');
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(timeout.mock.calls.filter((c) => c[1] === 90000)).toHaveLength(1);
  expect(pending.isWaiting('BBBBBBBBBBB')).toBe(true);
  expect(pending.rows.get('BBBBBBBBBBB')).toMatchObject({
    stage: 'queued',
    waitingForTurn: true,
  });
  release({ prepared: { record: { videoId: 'AAAAAAAAAAA' } } });
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(2));
  expect(timeout.mock.calls.filter((c) => c[1] === 90000)).toHaveLength(2);
  expect(pending.rows.get('BBBBBBBBBBB')?.waitingForTurn).toBeUndefined();
  timeout.mockRestore();
});
it('cancelled never-started queued work does not issue any request', async () => {
  raf();
  api.import.mockImplementation(() => new Promise(() => {}));
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(),
  );
  pending.enqueue('AAAAAAAAAAA');
  pending.enqueue('BBBBBBBBBBB');
  pending.dismiss('BBBBBBBBBBB');
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(pending.rows.has('BBBBBBBBBBB')).toBe(false);
  expect(pending.isWaiting('BBBBBBBBBBB')).toBe(false);
});
it('reload resumes proven never-started work but not ambiguous interrupted pre-job work', async () => {
  raf();
  api.import.mockImplementation(() => new Promise(() => {}));
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(
      JSON.stringify([
        { videoId: 'AAAAAAAAAAA', state: 'loading', waitingForTurn: true },
        { videoId: 'BBBBBBBBBBB', state: 'loading' },
        {
          videoId: 'CCCCCCCCCCC',
          state: 'loading',
          jobId: 'known-existing',
          transportVersion: 2,
          audioFormat: 'orvio-opus-v1',
        },
      ]),
    ),
  );
  pending.resume();
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(api.import.mock.calls[0][0]).toBe('AAAAAAAAAAA');
  expect(pending.rows.get('BBBBBBBBBBB')?.state).toBe('error');
  expect(pending.rows.get('CCCCCCCCCCC')?.jobId).toBe('known-existing');
  expect(pending.isWaiting('CCCCCCCCCCC')).toBe(true);
});
it('failure to durably clear the never-started marker blocks external effects', async () => {
  raf();
  api.import.mockImplementation(() => new Promise(() => {}));
  let text = '[]';
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    {
      getItem: () => text,
      setItem: (_k, v) => {
        if (!v.includes('waitingForTurn')) throw Error('Storage unavailable');
        text = v;
      },
    },
  );
  pending.enqueue('AAAAAAAAAAA');
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(api.import).not.toHaveBeenCalled();
  expect(pending.rows.get('AAAAAAAAAAA')).toMatchObject({
    state: 'error',
    failure: { stage: 'storage' },
  });
});
it('a failed active import hands off the queue without retrying the failed job', async () => {
  raf();
  api.import
    .mockRejectedValueOnce(new Error('failed'))
    .mockImplementation(() => new Promise(() => {}));
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    store(),
  );
  pending.enqueue('AAAAAAAAAAA');
  pending.enqueue('BBBBBBBBBBB');
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(2));
  expect(pending.rows.get('AAAAAAAAAAA')?.state).toBe('error');
  expect(api.import.mock.calls.map((c) => c[0])).toEqual([
    'AAAAAAAAAAA',
    'BBBBBBBBBBB',
  ]);
});
it('queued explicit retry intent survives reload behind an active job and is consumed at admission', async () => {
  raf();
  const storage = store(
    JSON.stringify([
      { videoId: 'AAAAAAAAAAA', state: 'loading', jobId: 'active-existing' },
      {
        videoId: 'BBBBBBBBBBB',
        state: 'error',
        jobId: 'terminal-existing',
        error: 'unavailable',
        transportVersion: 2,
        audioFormat: 'orvio-opus-v1',
      },
    ]),
  );
  let release!: (value: unknown) => void;
  api.import
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    )
    .mockImplementation(() => new Promise(() => {}));
  const first = new BackgroundImports(
    () => {},
    async () => {},
    storage,
  );
  first.resume();
  first.enqueue('BBBBBBBBBBB');
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(1));
  expect(
    JSON.parse(storage.getItem('orvio.pending-imports.v1')!).find(
      (r: any) => r.videoId === 'BBBBBBBBBBB',
    ),
  ).toMatchObject({
    waitingForTurn: true,
    retryWhenAdmitted: true,
    jobId: 'terminal-existing',
  });
  const reloaded = new BackgroundImports(
    () => {},
    async () => {},
    storage,
  );
  reloaded.resume();
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(2));
  expect(reloaded.isWaiting('BBBBBBBBBBB')).toBe(true);
  release({ prepared: { record: { videoId: 'AAAAAAAAAAA' } } });
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(3));
  expect(api.import.mock.calls[2][2]).toMatchObject({
    jobId: 'terminal-existing',
    retryFailed: true,
    transportVersion: 2,
  });
  const saved = JSON.parse(storage.getItem('orvio.pending-imports.v1')!).find(
    (r: any) => r.videoId === 'BBBBBBBBBBB',
  );
  expect(saved.waitingForTurn).toBeUndefined();
  expect(saved.retryWhenAdmitted).toBeUndefined();
  // An interrupted admitted request has uncertain effects and must not replay retry authority.
  const interrupted = new BackgroundImports(
    () => {},
    async () => {},
    storage,
  );
  interrupted.resume();
  await vi.waitFor(() => expect(api.import).toHaveBeenCalledTimes(4));
  expect(api.import.mock.calls[3][2]).toMatchObject({
    jobId: 'terminal-existing',
    retryFailed: false,
  });
});
it('a v2 job handle must persist before the importer can advance any known job', async () => {
  raf();
  let text = '[]';
  const advance = vi.fn();
  api.import.mockImplementationOnce(async (_id, _signal, options: any) => {
    options.onJob({
      videoId: 'AAAAAAAAAAA',
      jobId: '11111111-2222-4333-8444-555555555555',
      transportVersion: 2,
      audioFormat: 'orvio-opus-v1',
      status: 'queued',
    });
    advance();
    return { prepared: { record: { videoId: 'AAAAAAAAAAA' } } };
  });
  const pending = new BackgroundImports(
    () => {},
    async () => {},
    {
      getItem: () => text,
      setItem: (_key, value) => {
        if (value.includes('11111111-2222-4333-8444-555555555555'))
          throw Error('Storage full');
        text = value;
      },
    },
  );
  pending.enqueue('AAAAAAAAAAA');
  await vi.waitFor(() =>
    expect(pending.rows.get('AAAAAAAAAAA')?.state).toBe('error'),
  );
  expect(advance).not.toHaveBeenCalled();
  expect(pending.rows.get('AAAAAAAAAAA')).toMatchObject({
    jobId: '11111111-2222-4333-8444-555555555555',
    transportVersion: 2,
    error: 'unavailable',
    failure: { stage: 'storage' },
  });
});

it('durably saved verified v2 receipt at88s completes after90s without a second import', async () => {
  vi.useFakeTimers();
  try {
    vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
      fn();
      return 1;
    });
    const complete = vi.fn(async () => {}),
      storage = store();
    api.import.mockImplementationOnce(
      async (_id: any, signal: any, options: any) => {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 88000);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(signal.reason);
            },
            { once: true },
          );
        });
        options.onJob({
          jobId: '11111111-2222-4333-8444-555555555555',
          transportVersion: 2,
          audioFormat: 'orvio-opus-v1',
          status: 'done',
        });
        expect(
          JSON.parse(storage.getItem('orvio.pending-imports.v1')!)[0].jobId,
        ).toBe('11111111-2222-4333-8444-555555555555');
        options.onStage('downloading');
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 4000);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(signal.reason);
            },
            { once: true },
          );
        });
        options.onStage('charting');
        options.onStage('saving');
        return {} as any;
      },
    );
    const pending = new BackgroundImports(() => {}, complete, storage);
    pending.enqueue('AAAAAAAAAAA');
    await vi.advanceTimersByTimeAsync(93000);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(pending.rows.size).toBe(0);
    expect(api.import).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
it('completion transfer timeout keeps exact known handle and accurate failure for explicit resume, never auto imports again', async () => {
  vi.useFakeTimers();
  try {
    vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
      fn();
      return 1;
    });
    const complete = vi.fn(async () => {}),
      storage = store();
    api.import.mockImplementationOnce(
      async (_id: any, signal: any, options: any) => {
        options.onJob({
          jobId: '11111111-2222-4333-8444-555555555555',
          transportVersion: 2,
          audioFormat: 'orvio-opus-v1',
          status: 'done',
        });
        options.onStage('downloading');
        await new Promise<void>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          }),
        );
        return {} as any;
      },
    );
    const pending = new BackgroundImports(() => {}, complete, storage);
    pending.enqueue('AAAAAAAAAAA');
    await vi.advanceTimersByTimeAsync(30001);
    expect(pending.rows.get('AAAAAAAAAAA')).toMatchObject({
      state: 'error',
      jobId: '11111111-2222-4333-8444-555555555555',
      transportVersion: 2,
      error: 'request_timeout',
      failure: { stage: 'response' },
    });
    expect(api.import).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    pending.resume();
    await vi.advanceTimersByTimeAsync(200000);
    expect(api.import).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it('paused paint times out, releases active admission, starts next queued row, and makes no external request', async () => {
  vi.useFakeTimers();
  try {
    const frames = new Map<number, FrameRequestCallback>();
    let next = 1;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      frames.set(next, fn);
      return next++;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const complete = vi.fn(async () => {}),
      pending = new BackgroundImports(() => {}, complete, store());
    pending.enqueue('AAAAAAAAAAA');
    pending.enqueue('BBBBBBBBBBB');
    expect(pending.isWaiting('BBBBBBBBBBB')).toBe(true);
    await vi.advanceTimersByTimeAsync(90000);
    expect(pending.rows.get('AAAAAAAAAAA')).toMatchObject({
      state: 'error',
      error: 'request_timeout',
    });
    expect(pending.isWaiting('BBBBBBBBBBB')).toBe(false);
    expect(frames.size).toBe(1);
    expect(api.import).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(90000);
    expect(pending.rows.get('BBBBBBBBBBB')?.state).toBe('error');
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
