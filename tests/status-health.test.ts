import { readFileSync } from 'node:fs';
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

it('describes the service-status contract for all thirteen locales', () => {
  expect(Object.keys(STATUS_LABELS).sort()).toEqual(
    Object.keys(LANGUAGES).sort(),
  );
  const { reasons: englishReasons, ...englishStatic } = STATUS_LABELS.en;
  expect(Object.keys(englishStatic)).toHaveLength(27);
  const addedKeys = [
    'statusOverall',
    'statusAllOperational',
    'statusIssueDetected',
    'statusWebsite',
    'statusApi',
    'statusProvider',
    'statusNotMonitored',
    'statusWebsiteDetail',
    'statusApiDetail',
    'statusApiUnreachable',
    'statusProviderDetail',
    'statusVersion',
    'statusPartiallyVerified',
    'statusProbeNote',
    'statusReachable',
    'statusMonitorPrefix',
    'statusBrowserPrefix',
    'statusStale',
    'statusMonitorNote',
  ];
  const removedKeys = ['statusAccess', 'statusPlayback', 'statusYouTubeAdd'];
  addedKeys.forEach((key) => expect(englishStatic).toHaveProperty(key));
  removedKeys.forEach((key) => expect(englishStatic).not.toHaveProperty(key));
  Object.values(STATUS_LABELS).forEach((labels) => {
    expect(Object.keys(labels)).toEqual(Object.keys(STATUS_LABELS.en));
    const { reasons, ...staticLabels } = labels;
    expect(Object.keys(staticLabels)).toHaveLength(27);
    addedKeys.forEach((key) => expect(staticLabels).toHaveProperty(key));
    removedKeys.forEach((key) => expect(staticLabels).not.toHaveProperty(key));
    expect(Object.keys(reasons)).toEqual(Object.keys(englishReasons));
    expect(
      Object.values(staticLabels).every((label) => label.trim().length > 0),
    ).toBe(true);
  });
});

it('announces each monitor card in exactly one polite, atomic live region', () => {
  const source = readFileSync(new URL('../src/pages/status.astro', import.meta.url), 'utf8');
  for (const area of ['website', 'api', 'provider']) {
    const card = source.match(
      new RegExp(`<section\\b[^>]*\\bdata-area\\s*=\\s*"${area}"[^>]*>([\\s\\S]*?)</section\\s*>`),
    )?.[1];
    expect(card).toBeDefined();
    expect(card!.match(/\baria-live\s*=\s*"polite"/g)).toHaveLength(1);
    expect(card!.match(/\baria-atomic\s*=\s*"true"/g)).toHaveLength(1);
    const liveRegion = card!.match(
      /<div\b(?=[^>]*\baria-live\s*=\s*"polite")(?=[^>]*\baria-atomic\s*=\s*"true")[^>]*>([\s\S]*?)<\/div\s*>/,
    )?.[1];
    expect(liveRegion).toBeDefined();
    expect(liveRegion).toMatch(/<p\b[^>]*\bclass\s*=\s*"state"[^>]*\bdata-state\s*=/);
    expect(liveRegion).toMatch(/<p\b[^>]*\bclass\s*=\s*"checked"/);
    expect(liveRegion).toMatch(/<p\b[^>]*\bdata-detail(?=\s|>)/);
    expect(liveRegion!.match(/<p\b/g)).toHaveLength(3);
    expect(liveRegion).not.toMatch(/<h2\b/);
  }
  expect(source.match(/\baria-live\b/g)).toHaveLength(3);
});

it('renders honest empty states before checks resolve, checks once, and refreshes only on demand', async () => {
  vi.useFakeTimers();
  vi.resetModules();
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
  // Monitor JSON fetch on load should fail so fallback browser-probe path runs.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('monitor unavailable')));

  const statusService = await import('../src/status-service');
  const { APP_VERSION } = statusService;
  const complete: Array<(result: import('../src/status-service').ServiceResult) => void> = [];
  const probeWebsite = vi
    .spyOn(statusService, 'probeWebsite')
    .mockImplementation(() => new Promise((resolve) => complete.push(resolve)));
  const probeApi = vi
    .spyOn(statusService, 'probeApi')
    .mockImplementation(() => new Promise((resolve) => complete.push(resolve)));

  await import('../src/status-page');

  expect(probeWebsite).toHaveBeenCalledTimes(1);
  expect(probeApi).toHaveBeenCalledTimes(1);

  const websiteCard = dom.querySelector('[data-area="website"]');
  expect(websiteCard.querySelector('.state[data-state]').textContent).toBe(
    STATUS_LABELS.en.statusUnknown,
  );
  expect(websiteCard.querySelector('[data-checked-at]').textContent).toBe('—');

  const providerCard = dom.querySelector('[data-area="provider"]');
  expect(providerCard.querySelector('[data-detail]').textContent).toBe(
    (STATUS_LABELS.en as any).statusProviderDetail,
  );
  expect(providerCard.querySelector('.state[data-state]').textContent).toBe(
    (STATUS_LABELS.en as any).statusNotMonitored,
  );

  const overall = dom.querySelector('#overall');
  expect(overall.querySelector('[data-version]').textContent).toBe(
    (STATUS_LABELS.en as any).statusVersion + ' ' + APP_VERSION,
  );

  const refresh = dom.querySelector('#status-refresh');
  expect(refresh.disabled).toBe(true);
  complete.forEach((resolve) =>
    resolve({
      state: 'reachable',
      checkedAt: new Date().toISOString(),
      detail: 'HTTP 200',
    }),
  );
  await vi.advanceTimersByTimeAsync(0);
  await Promise.resolve();
  await Promise.resolve();

  const websiteState = websiteCard.querySelector('.state[data-state]');
  expect(websiteState.textContent).toBe(
    (STATUS_LABELS.en as any).statusReachable,
  );
  expect(websiteState.dataset.state).toBe('unknown');
  const apiState = dom
    .querySelector('[data-area="api"]')
    .querySelector('.state[data-state]');
  expect(apiState.textContent).toBe(
    (STATUS_LABELS.en as any).statusReachable,
  );
  expect(apiState.dataset.state).toBe('unknown');
  expect(overall.querySelector('[data-overall-text]').textContent).toBe(
    STATUS_LABELS.en.statusPartiallyVerified,
  );
  expect(overall.querySelector('[data-probe-note]').textContent).toBe(
    STATUS_LABELS.en.statusProbeNote,
  );
  expect(refresh.disabled).toBe(false);

  refresh.events.get('click')!();
  expect(refresh.disabled).toBe(true);
  await Promise.resolve();
  expect(probeWebsite).toHaveBeenCalledTimes(2);
  expect(probeApi).toHaveBeenCalledTimes(2);
  refresh.events.get('click')!();
  await Promise.resolve();
  expect(probeWebsite).toHaveBeenCalledTimes(2);
  expect(probeApi).toHaveBeenCalledTimes(2);

  const reachable = {
    state: 'reachable' as const,
    checkedAt: new Date().toISOString(),
    detail: 'HTTP 200',
  };
  complete.slice(2).forEach((resolve) => resolve(reachable));
  await vi.advanceTimersByTimeAsync(0);
  await Promise.resolve();
  await Promise.resolve();
  expect(refresh.disabled).toBe(false);
  expect(probeWebsite).toHaveBeenCalledTimes(2);
  expect(probeApi).toHaveBeenCalledTimes(2);

  const fetchCount = vi.mocked(fetch).mock.calls.length;
  await vi.advanceTimersByTimeAsync(60000);
  expect(probeWebsite).toHaveBeenCalledTimes(2);
  expect(probeApi).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledTimes(fetchCount);

  let rejectWebsite!: (error: Error) => void;
  probeWebsite.mockImplementationOnce(() => new Promise((_, reject) => {
    rejectWebsite = reject;
  }));
  refresh.events.get('click')!();
  expect(refresh.disabled).toBe(true);
  rejectWebsite(new Error('probe failed'));
  complete.slice(4).forEach((resolve) => resolve(reachable));
  await vi.advanceTimersByTimeAsync(0);
  await Promise.resolve();
  await Promise.resolve();
  expect(refresh.disabled).toBe(false);
});

function freshMonitorReport() {
  return {
    version: 1,
    checkedAt: new Date().toISOString(),
    overall: 'operational',
    components: {
      websiteStatic: { state: 'operational', detail: 'static asset served', latencyMs: 10 },
      websiteFunctional: { state: 'operational', detail: 'hourly E2E passed' },
      shareApiRead: { state: 'reachable', detail: 'read path answered unknown id', latencyMs: 20 },
      transcription: { state: 'not_monitored', detail: '' },
    },
    history: [],
  };
}

async function renderMonitorReport(
  monitorReport: unknown,
  browserState: 'reachable' | 'degraded' = 'reachable',
) {
  vi.useFakeTimers();
  vi.resetModules();
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

  const checkedAt = new Date().toISOString();
  const monitorFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => monitorReport,
  });
  vi.stubGlobal('fetch', monitorFetch);

  const statusService = await import('../src/status-service');
  vi.spyOn(statusService, 'probeWebsite').mockResolvedValue({
    state: browserState,
    checkedAt,
    detail: 'HTTP 200',
  });
  vi.spyOn(statusService, 'probeApi').mockResolvedValue({
    state: 'reachable',
    checkedAt,
    detail: 'HTTP 404',
  });

  await import('../src/status-page');
  await vi.advanceTimersByTimeAsync(0);
  await Promise.resolve();
  await Promise.resolve();

  return dom;
}

it('renders a fresh monitor as partially verified with a healthy website and monitor checked-at', async () => {
  const dom = await renderMonitorReport(freshMonitorReport());
  const overall = dom.querySelector('#overall');
  expect(overall.querySelector('[data-overall-text]').textContent).toBe(
    STATUS_LABELS.en.statusPartiallyVerified,
  );
  expect(overall.querySelector('[data-overall-text]').dataset.state).toBe('unknown');
  const websiteState = dom
    .querySelector('[data-area="website"]')
    .querySelector('.state[data-state]');
  expect(websiteState.textContent).toBe(STATUS_LABELS.en.statusHealthy);
  expect(websiteState.dataset.state).toBe('healthy');
  const apiState = dom.querySelector('[data-area="api"]').querySelector('.state[data-state]');
  expect(apiState.textContent).toBe(STATUS_LABELS.en.statusReachable);
  expect(apiState.dataset.state).toBe('unknown');
  const websiteChecked = dom
    .querySelector('[data-area="website"]')
    .querySelector('[data-checked-at]').textContent;
  expect(websiteChecked).toContain('(monitor)');
});

it.each(['websiteStatic', 'websiteFunctional', 'shareApiRead', 'transcription'] as const)(
  'derives a degraded banner from %s despite an operational report.overall',
  async (component) => {
    const report = freshMonitorReport();
    report.components[component].state = 'degraded';
    const dom = await renderMonitorReport(report);
    const overallState = dom.querySelector('#overall').querySelector('[data-overall-text]');
    expect(overallState.textContent).toBe(STATUS_LABELS.en.statusIssueDetected);
    expect(overallState.dataset.state).toBe('degraded');
    const area = component === 'shareApiRead'
      ? 'api'
      : component === 'transcription' ? 'provider' : 'website';
    const cardState = dom.querySelector(`[data-area="${area}"]`).querySelector('.state[data-state]');
    expect(cardState.textContent).toBe(STATUS_LABELS.en.statusDegraded);
    expect(cardState.dataset.state).toBe('degraded');
  },
);

it.each(['operational', 'degraded'])(
  'renders a two-hour-old %s monitor as unknown with stale markers',
  async (state) => {
    const report = freshMonitorReport();
    report.checkedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    report.overall = state;
    report.components.websiteFunctional.state = state;
    const dom = await renderMonitorReport(report);
    const overall = dom.querySelector('#overall');
    expect(overall.querySelector('[data-overall-text]').textContent).toBe(
      STATUS_LABELS.en.statusPartiallyVerified,
    );
    expect(overall.querySelector('[data-overall-text]').dataset.state).toBe('unknown');
    expect(overall.querySelector('[data-overall-at]').textContent).toContain('(stale)');
    expect(overall.querySelector('[data-probe-note]').textContent).toBe(STATUS_LABELS.en.statusMonitorNote);
    for (const area of ['website', 'api', 'provider']) {
      const card = dom.querySelector(`[data-area="${area}"]`);
      const cardState = card.querySelector('.state[data-state]');
      expect(cardState.textContent).toBe(STATUS_LABELS.en.statusUnknown);
      expect(cardState.dataset.state).toBe('unknown');
      expect(card.querySelector('[data-detail]').textContent).toContain('(stale)');
      expect(card.querySelector('[data-checked-at]').textContent).toContain('(monitor)');
    }
  },
);

it.each([
  ['future timestamp', () => ({ checkedAt: new Date(Date.now() + 6 * 60 * 1000).toISOString() })],
  ['expired timestamp', () => ({ checkedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() })],
  ['invalid timestamp', () => ({ checkedAt: 'not a date' })],
  ['bad version', () => ({ version: 2 })],
  ['array components', () => ({ components: [] })],
  ['missing component', () => ({ components: { ...freshMonitorReport().components, websiteFunctional: undefined } })],
  ['invalid state', () => ({ components: { ...freshMonitorReport().components, shareApiRead: { state: 'healthy', detail: '' } } })],
  ['invalid detail', () => ({ components: { ...freshMonitorReport().components, transcription: { state: 'not_monitored', detail: null } } })],
] as const)('falls back to browser probes for a monitor with %s', async (_name, invalidFields) => {
  const report = { ...freshMonitorReport(), ...invalidFields() };
  const dom = await renderMonitorReport(report, 'degraded');
  const overall = dom.querySelector('#overall');
  expect(overall.querySelector('[data-overall-text]').textContent).toBe(STATUS_LABELS.en.statusIssueDetected);
  expect(overall.querySelector('[data-overall-text]').dataset.state).toBe('degraded');
  expect(overall.querySelector('[data-probe-note]').textContent).toBe(STATUS_LABELS.en.statusProbeNote);
  const website = dom.querySelector('[data-area="website"]');
  expect(website.querySelector('.state[data-state]').dataset.state).toBe('degraded');
  expect(website.querySelector('[data-checked-at]').textContent).not.toContain('(monitor)');
  expect(website.querySelector('[data-detail]').textContent).not.toContain(STATUS_LABELS.en.statusMonitorPrefix);
});
