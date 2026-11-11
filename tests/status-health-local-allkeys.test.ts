import { afterEach, expect, it, vi } from 'vitest';
import { checkArea } from '../src/status-health';

const metadata = [
  'identity',
  'envelope.record.videoId',
  'envelope.record.audioSha256',
  'envelope.record.chartSetSha256',
  'envelope.record.sampleRate',
  'envelope.record.frames',
];
type Plan = {
  mode?: 'exists' | 'missing' | 'throws' | 'keyerror' | 'hang' | 'readhang';
  keyPath?: string | string[];
  fields?: string | string[] | null;
  version?: number;
};

function harness(...plans: Plan[]) {
  const createObjectStore = vi.fn(() => { throw Error('Unexpected creation'); });
  const get = vi.fn(() => { throw Error('Unexpected value read'); });
  const connections: ReturnType<typeof connection>[] = [];
  function connection(plan: Plan) {
    const keyRequest = { onerror: () => {}, result: undefined };
    const store = {
      keyPath: plan.keyPath ?? 'identity',
      get,
      index: vi.fn((name: string) => {
        expect(name).toBe('metadata');
        if (plan.fields === null) throw Error('Missing index');
        return { keyPath: plan.fields ?? metadata };
      }),
      getKey: vi.fn(() => {
        if (plan.mode !== 'readhang') queueMicrotask(() => {
          if (plan.mode === 'keyerror') keyRequest.onerror();
          // An erroneous request must never become healthy on a later event.
          tx.oncomplete();
        });
        return keyRequest;
      }),
    };
    const tx = {
      abort: vi.fn(),
      objectStore: vi.fn(() => store),
      oncomplete: () => {},
      onerror: () => {},
      onabort: () => {},
    };
    const db = {
      version: plan.version ?? 1,
      transaction: vi.fn(() => tx),
      close: vi.fn(),
      createObjectStore,
    };
    const request = {
      result: db,
      transaction: plan.mode === 'missing' ? tx : null,
      onupgradeneeded: () => {},
      onsuccess: () => {},
      onerror: () => {},
      onblocked: () => {},
    };
    return { db, tx, store, request };
  }
  const open = vi.fn((name: string, version: number) => {
    expect(version).toBe(1);
    expect(name).toBe(connections.length === 0 ? 'orvio-audio' : 'orvio-local-allkeys-v1');
    const plan = plans[connections.length];
    if (!plan) throw Error('Unexpected open');
    const item = connection(plan);
    connections.push(item);
    if (plan.mode === 'throws') throw Error('Open denied');
    if (plan.mode !== 'hang') queueMicrotask(() => {
      if (plan.mode === 'missing') item.request.onupgradeneeded();
      else item.request.onsuccess();
    });
    return item.request;
  });
  vi.stubGlobal('indexedDB', { open });
  return { open, connections, createObjectStore, get };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('uses the healthy legacy fast path with only a readonly key lookup', async () => {
  const h = harness({});
  expect(await checkArea('access')).toMatchObject({ state: 'healthy', detail: 'Local cache readable' });
  expect(h.open).toHaveBeenCalledExactlyOnceWith('orvio-audio', 1);
  expect(h.connections[0].db.transaction).toHaveBeenCalledExactlyOnceWith('tracks', 'readonly');
  expect(h.connections[0].store.getKey).toHaveBeenCalledOnce();
  expect(h.connections[0].store.index).not.toHaveBeenCalled();
  expect(h.connections[0].db.close).toHaveBeenCalledOnce();
  expect(h.get).not.toHaveBeenCalled();
});

it('aborts an absent legacy upgrade and accepts the exact new schema even with no sentinel key', async () => {
  const h = harness({ mode: 'missing' }, {});
  expect(await checkArea('access')).toMatchObject({ state: 'healthy', detail: 'Local cache readable' });
  expect(h.open).toHaveBeenCalledTimes(2);
  expect(h.connections[0].tx.abort).toHaveBeenCalledOnce();
  expect(h.connections[0].db.close).toHaveBeenCalledOnce();
  expect(h.connections[1].db.transaction).toHaveBeenCalledExactlyOnceWith('sources', 'readonly');
  expect(h.connections[1].store.getKey).toHaveBeenCalledWith(expect.any(String));
  expect(h.connections[1].db.close).toHaveBeenCalledOnce();
  expect(h.createObjectStore).not.toHaveBeenCalled();
  expect(h.get).not.toHaveBeenCalled();
});

it('finishes both absent upgrades immediately without creating stores or reading values', async () => {
  const h = harness({ mode: 'missing' }, { mode: 'missing' });
  expect(await checkArea('access')).toMatchObject({ state: 'unknown', detail: 'Local cache not initialized' });
  for (const item of h.connections) {
    expect(item.tx.abort).toHaveBeenCalledOnce();
    expect(item.db.close).toHaveBeenCalledOnce();
    expect(item.db.transaction).not.toHaveBeenCalled();
    item.request.onsuccess();
    expect(item.db.close).toHaveBeenCalledTimes(2);
    expect(item.db.transaction).not.toHaveBeenCalled();
  }
  expect(h.open).toHaveBeenCalledTimes(2);
  expect(h.createObjectStore).not.toHaveBeenCalled();
  expect(h.get).not.toHaveBeenCalled();
});

it.each<Plan>([
  { keyPath: 'key' },
  { keyPath: ['identity'] },
  { fields: null },
  { fields: metadata.join(',') },
  { fields: metadata.slice(0, 5) },
  { fields: [...metadata, 'extra'] },
  { fields: [...metadata].reverse() },
  { fields: [...metadata.slice(0, 5), 'frames'] },
  { version: 2 },
])('rejects malformed new schema %j', async (plan) => {
  const h = harness({ mode: 'missing' }, plan);
  expect((await checkArea('access')).state).toBe('unknown');
  expect(h.connections[1].store.getKey).not.toHaveBeenCalled();
  expect(h.connections[1].db.close).toHaveBeenCalledOnce();
  expect(h.get).not.toHaveBeenCalled();
});

it('reports a key request error as unknown, including after a synchronous legacy open error', async () => {
  const h = harness({ mode: 'throws' }, { mode: 'keyerror' });
  expect(await checkArea('access')).toMatchObject({ state: 'unknown', detail: 'Local cache read failed' });
  expect(h.connections[1].store.getKey).toHaveBeenCalledOnce();
  expect(h.connections[1].db.close).toHaveBeenCalledOnce();
  expect(h.get).not.toHaveBeenCalled();
});

it.each(['hang', 'readhang'] as const)('shares one 5s deadline across fallback and cleans up a %s and late success', async (mode) => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
    return controller.signal;
  });
  const add = vi.spyOn(controller.signal, 'addEventListener');
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const h = harness({ mode: 'hang' }, { mode });
  let finished = false;
  const check = checkArea('access').then((result) => { finished = true; return result; });
  await vi.advanceTimersByTimeAsync(3000);
  h.connections[0].request.onerror();
  await vi.advanceTimersByTimeAsync(1999);
  expect(h.open).toHaveBeenCalledTimes(2);
  expect(finished).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await check).toMatchObject({ state: 'unknown', detail: 'Check timed out' });
  expect(timeout).toHaveBeenCalledExactlyOnceWith(5000);
  expect(controller.signal.aborted).toBe(true);
  if (mode === 'readhang') {
    expect(h.connections[1].tx.abort).toHaveBeenCalledOnce();
    expect(h.connections[1].db.close).toHaveBeenCalledOnce();
  }
  for (const item of h.connections) {
    const reads = item.db.transaction.mock.calls.length;
    const closes = item.db.close.mock.calls.length;
    item.request.onsuccess();
    expect(item.db.close).toHaveBeenCalledTimes(closes + 1);
    expect(item.db.transaction).toHaveBeenCalledTimes(reads);
  }
  for (const [event, listener] of add.mock.calls) {
    expect(remove).toHaveBeenCalledWith(event, listener);
  }
  expect(h.get).not.toHaveBeenCalled();
});
