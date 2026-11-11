import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as health from '../src/status-health';
import {
  acknowledgeFailures,
  hasUnacknowledgedFailure,
  readFailures,
  recordFailure,
} from '../src/status-failures';
import { LANGUAGES } from '../src/i18n';
import { STATUS_LABELS } from '../src/status-labels';

const KEY = 'orvio-status-failures';
beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  });
  vi.stubGlobal('window', new EventTarget());
  vi.stubEnv('PUBLIC_YOUTUBE_API_KEY', 'public-test');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function fakeDeadline() {
  vi.useFakeTimers();
  return vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
      ms,
    );
    return controller.signal;
  });
}

it('bounds a hanging fetch at 5000ms, even if fetch ignores abort, without retries', async () => {
  const timeout = fakeDeadline();
  const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
  vi.stubGlobal('fetch', fetcher);
  let finished = false;
  const check = health.checkArea('youtube-add').then((result) => {
    finished = true;
    return result;
  });
  await vi.advanceTimersByTimeAsync(4999);
  expect(finished).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await check).toMatchObject({
    state: 'unknown',
    detail: 'Check timed out',
  });
  expect(timeout).toHaveBeenCalledWith(5000);
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it.each([401, 404, 429, 503])(
  'reports metadata HTTP %i as degraded using the existing direct endpoint',
  async (status) => {
    const fetcher = vi.fn(async () => new Response(null, { status }));
    vi.stubGlobal('fetch', fetcher);
    const result = await health.checkArea('youtube-add');
    expect(result.state).toBe('degraded');
    expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      'https://provider.fixture.invalid/v1/videos/WGm2HmXeeRI',
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        redirect: 'error',
        headers: { Authorization: 'Bearer public-test' },
      }),
    );
  },
);

it('requires real metadata, not merely a static 200 response', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response('<html>static fallback</html>'))
    .mockResolvedValueOnce(Response.json({ id: 'other', title: 'Wrong video' }))
    .mockResolvedValueOnce(Response.json({ id: 'WGm2HmXeeRI', title: 'Song' }));
  vi.stubGlobal('fetch', fetcher);
  expect((await health.checkArea('youtube-add')).state).toBe('unknown');
  expect((await health.checkArea('youtube-add')).state).toBe('unknown');
  expect(await health.checkArea('youtube-add')).toMatchObject({
    state: 'healthy',
    detail: 'Metadata readable; audio import untested',
  });
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('does not fetch without the existing public metadata key', async () => {
  vi.stubEnv('PUBLIC_YOUTUBE_API_KEY', '');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect((await health.checkArea('youtube-add')).state).toBe('unknown');
  expect(fetcher).not.toHaveBeenCalled();
});

it('reports missing IndexedDB honestly without any network request', async () => {
  vi.stubGlobal('indexedDB', undefined);
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect((await health.checkArea('access')).state).toBe('degraded');
  expect(fetcher).not.toHaveBeenCalled();
});

it('reads the existing local store, accepting an empty store without inventing a failure', async () => {
  const getKey = vi.fn();
  const tx = {
    objectStore: vi.fn(() => ({ getKey })),
    oncomplete: () => {},
  };
  const db = { transaction: vi.fn(() => tx), close: vi.fn() };
  const request = { result: db, onsuccess: () => {} };
  const open = vi.fn(() => request);
  vi.stubGlobal('indexedDB', { open });
  const check = health.checkArea('access');
  request.onsuccess();
  tx.oncomplete();
  expect((await check).state).toBe('healthy');
  expect(open).toHaveBeenCalledWith('orvio-audio', 1);
  expect(db.transaction).toHaveBeenCalledWith('tracks', 'readonly');
  expect(getKey).toHaveBeenCalledTimes(1);
  expect(db.close).toHaveBeenCalledOnce();
  expect(readFailures()).toEqual([]);
});

it('bounds a hanging local open and closes a connection that arrives after timeout', async () => {
  fakeDeadline();
  const close = vi.fn();
  const request = { result: { close }, onsuccess: () => {} };
  vi.stubGlobal('indexedDB', { open: () => request });
  const check = health.checkArea('access');
  await vi.advanceTimersByTimeAsync(5000);
  expect((await check).state).toBe('unknown');
  request.onsuccess();
  expect(close).toHaveBeenCalledOnce();
});

it('does not create a missing cache or claim it has been checked', async () => {
  const abort = vi.fn();
  const createObjectStore = vi.fn();
  const open = vi.fn(() => {
    const request = {
      result: { close: vi.fn(), createObjectStore },
      transaction: { abort },
      onupgradeneeded: () => {},
    };
    queueMicrotask(() => request.onupgradeneeded());
    return request;
  });
  vi.stubGlobal('indexedDB', { open });
  const check = health.checkArea('access');
  expect((await check).state).toBe('unknown');
  expect(open).toHaveBeenCalledTimes(2);
  expect(abort).toHaveBeenCalledTimes(2);
  expect(createObjectStore).not.toHaveBeenCalled();
});

it('decodes only a generated silent WAV and closes the context without output or fetch', async () => {
  const close = vi.fn(async () => {});
  const decodeAudioData = vi.fn(async (bytes: ArrayBuffer) => {
    const view = new DataView(bytes);
    expect(bytes.byteLength).toBe(46);
    expect(view.getUint32(0)).toBe(0x52494646);
    expect(view.getInt16(44, true)).toBe(0);
    return { length: 1 };
  });
  vi.stubGlobal(
    'AudioContext',
    class {
      close = close;
      decodeAudioData = decodeAudioData;
    },
  );
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect((await health.checkArea('playback')).state).toBe('healthy');
  expect(decodeAudioData).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
  expect(fetcher).not.toHaveBeenCalled();
});

it('bounds a hanging decode and closes the audio context at the deadline', async () => {
  fakeDeadline();
  const close = vi.fn(async () => {});
  vi.stubGlobal(
    'AudioContext',
    class {
      close = close;
      decodeAudioData = () => new Promise(() => {});
    },
  );
  const check = health.checkArea('playback');
  await vi.advanceTimersByTimeAsync(5000);
  expect((await check).state).toBe('unknown');
  expect(close).toHaveBeenCalledOnce();
});

it('reports missing audio capabilities and absorbs unexpected errors', async () => {
  vi.stubGlobal('AudioContext', undefined);
  expect((await health.checkArea('playback')).state).toBe('degraded');
  vi.stubGlobal(
    'AudioContext',
    class {
      close = async () => {};
    },
  );
  expect((await health.checkArea('playback')).state).toBe('degraded');
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        throw Error('denied');
      }
    },
  );
  expect((await health.checkArea('playback')).state).toBe('unknown');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw Error('offline');
    }),
  );
  expect((await health.checkArea('youtube-add')).state).toBe('unknown');
});

it('keeps the last ten failures and acknowledges only failures already seen', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T10:00:00Z'));
  expect(readFailures()).toEqual([]);
  expect(hasUnacknowledgedFailure()).toBe(false);
  const changed = vi.fn();
  window.addEventListener('orvio-status-change', changed);
  for (let i = 0; i < 12; i++) recordFailure('playback', `failure ${i}`);
  expect(readFailures()).toHaveLength(10);
  expect(readFailures()[0]).toEqual({
    area: 'playback',
    message: 'failure 2',
    at: '2026-11-11T10:00:00.000Z',
  });
  expect(changed).toHaveBeenCalledTimes(12);
  expect(hasUnacknowledgedFailure()).toBe(true);
  acknowledgeFailures();
  expect(hasUnacknowledgedFailure()).toBe(false);
  vi.advanceTimersByTime(1);
  recordFailure('access', 'new failure');
  expect(hasUnacknowledgedFailure()).toBe(true);
  expect(readFailures().at(-1)?.message).toBe('new failure');
});

it('treats malformed history as empty and tolerates storage denial or quota errors', () => {
  localStorage.setItem(KEY, '{');
  expect(readFailures()).toEqual([]);
  localStorage.setItem(
    KEY,
    JSON.stringify([{ area: 'access', message: 'x', at: 'invalid' }]),
  );
  expect(readFailures()).toEqual([]);
  vi.stubGlobal('localStorage', {
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('quota');
    },
  });
  expect(readFailures()).toEqual([]);
  expect(() => recordFailure('access', 'failure')).not.toThrow();
  expect(() => acknowledgeFailures()).not.toThrow();
  expect(hasUnacknowledgedFailure()).toBe(false);
});

it('preserves the eleven static label keys and adds reasons for all thirteen locales', () => {
  expect(Object.keys(STATUS_LABELS).sort()).toEqual(
    Object.keys(LANGUAGES).sort(),
  );
  const { reasons: englishReasons, ...englishStatic } = STATUS_LABELS.en;
  expect(Object.keys(englishStatic)).toHaveLength(11);
  Object.values(STATUS_LABELS).forEach((labels) => {
    expect(Object.keys(labels)).toEqual(Object.keys(STATUS_LABELS.en));
    const { reasons, ...staticLabels } = labels;
    expect(Object.keys(reasons)).toEqual(Object.keys(englishReasons));
    expect(
      Object.values(staticLabels).every((label) => label.trim().length > 0),
    ).toBe(true);
  });
});

it('renders honest empty states before checks resolve, checks once, and refreshes only on demand', async () => {
  vi.useFakeTimers();
  // Small DOM adapter: exercise the real module's rendering and event handlers.
  class Element {
    textContent = '';
    value = '';
    disabled = false;
    dataset: Record<string, string> = {};
    children = new Map<string, Element>();
    events = new Map<string, () => void>();
    querySelector(key: string): Element {
      if (!this.children.has(key)) this.children.set(key, new Element());
      return this.children.get(key)!;
    }
    setAttribute() {}
    addEventListener(key: string, handler: () => void) {
      this.events.set(key, handler);
    }
  }
  const dom = new Element();
  vi.stubGlobal(
    'document',
    Object.assign(dom, { documentElement: { lang: '' }, title: '' }),
  );
  vi.stubGlobal('location', { search: '?lang=en' });
  vi.stubGlobal('navigator', { languages: ['en'] });
  vi.stubGlobal('history', { replaceState: vi.fn() });
  const complete: Array<(result: health.HealthResult) => void> = [];
  const check = vi
    .spyOn(health, 'checkArea')
    .mockImplementation(() => new Promise((resolve) => complete.push(resolve)));
  await import('../src/status-page');
  expect(check.mock.calls.map(([area]) => area)).toEqual([
    'access',
    'playback',
    'youtube-add',
  ]);
  const card = dom.querySelector('[data-area="access"]');
  expect(card.querySelector('[data-state]').textContent).toBe(
    STATUS_LABELS.en.statusUnknown,
  );
  expect(card.querySelector('[data-checked-at]').textContent).toBe('—');
  expect(card.querySelector('[data-failure]').textContent).toBe(
    STATUS_LABELS.en.statusNoFailure,
  );
  const refresh = dom.querySelector('#status-refresh');
  expect(refresh.disabled).toBe(true);
  complete.forEach((resolve) =>
    resolve({ state: 'healthy', checkedAt: '2026-11-11T10:00:00Z' }),
  );
  await vi.advanceTimersByTimeAsync(60000);
  expect(refresh.disabled).toBe(false);
  expect(check).toHaveBeenCalledTimes(3);
  recordFailure('access', '<b>literal failure</b>');
  const language = dom.querySelector('#status-language');
  language.value = 'ko';
  language.events.get('change')!();
  expect(card.querySelector('[data-failure]').textContent).toContain(
    STATUS_LABELS.ko.reasons.check_unavailable,
  );
  expect(card.querySelector('[data-failure]').textContent).not.toContain(
    '<b>literal failure</b>',
  );
  expect(check).toHaveBeenCalledTimes(3);
  refresh.events.get('click')!();
  expect(check).toHaveBeenCalledTimes(6);
});
