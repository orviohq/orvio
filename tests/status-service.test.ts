import { afterEach, expect, it, vi } from 'vitest';
import { APP_VERSION as SRC_APP_VERSION } from '../src/app-version';
import {
  APP_VERSION,
  overallServiceState,
  probeApi,
  probeProvider,
  probeWebsite,
} from '../src/status-service';

afterEach(() => {
  vi.restoreAllMocks();
});

it('probeWebsite returns reachable for ok 200 and uses manifest URL with cache-busting ts and signal', async () => {
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: true, status: 200 } as Response));
  const result = await probeWebsite({ fetcher, now: () => 12345 });
  expect(result.state).toBe('reachable');
  expect(result.detail).toBe('HTTP 200');
  expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, init] = fetcher.mock.calls[0];
  expect(String(url)).toContain('/manifest.webmanifest');
  expect(String(url)).toContain('status-check=');
  expect(init?.signal).toBeInstanceOf(AbortSignal);
});

it('probeWebsite returns degraded with detail containing 503 for ok false', async () => {
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 503 } as Response));
  const result = await probeWebsite({ fetcher });
  expect(result.state).toBe('degraded');
  expect(result.detail).toContain('503');
});

it('probeWebsite returns degraded on rejection and timeout but rethrows external AbortError', async () => {
  const rejecting = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    throw new Error('network down');
  });
  expect(await probeWebsite({ fetcher: rejecting })).toMatchObject({ state: 'degraded', detail: 'unreachable' });

  const timeout = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const err = new Error('timed out');
    (err as { name?: string }).name = 'TimeoutError';
    throw err;
  });
  expect(await probeWebsite({ fetcher: timeout })).toMatchObject({ state: 'degraded', detail: 'timeout' });

  const controller = new AbortController();
  controller.abort(new DOMException('Aborted', 'AbortError'));
  const aborting = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    throw controller.signal.reason;
  });
  await expect(
    probeWebsite({ fetcher: aborting, signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

it('probeApi treats any HTTP response as reachable with HTTP status, 5xx as degraded, rejection and timeout as degraded', async () => {
  const ok404 = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 404 } as Response));
  const result = await probeApi({ fetcher: ok404 });
  expect(result).toMatchObject({ state: 'reachable', detail: 'HTTP 404' });
  expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);

  const ok200 = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: true, status: 200 } as Response));
  expect(await probeApi({ fetcher: ok200 })).toMatchObject({ state: 'reachable', detail: 'HTTP 200' });

  const ok401 = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 401 } as Response));
  expect(await probeApi({ fetcher: ok401 })).toMatchObject({ state: 'reachable', detail: 'HTTP 401' });

  const ok429 = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 429 } as Response));
  expect(await probeApi({ fetcher: ok429 })).toMatchObject({ state: 'reachable', detail: 'HTTP 429' });

  const redirect302 = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 302 } as Response));
  expect(await probeApi({ fetcher: redirect302 })).toMatchObject({ state: 'reachable', detail: 'HTTP 302' });

  const err500 = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 500 } as Response));
  expect(await probeApi({ fetcher: err500 })).toMatchObject({ state: 'degraded', detail: 'HTTP 500' });

  const rejecting = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    throw new Error('offline');
  });
  expect(await probeApi({ fetcher: rejecting })).toMatchObject({ state: 'degraded', detail: 'unreachable' });

  const timeout = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const err = new Error('timed out');
    (err as { name?: string }).name = 'TimeoutError';
    throw err;
  });
  expect(await probeApi({ fetcher: timeout })).toMatchObject({ state: 'degraded', detail: 'timeout' });
});

it('probeProvider returns not_monitored and never calls its fetcher', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const result = probeProvider();
  expect(result.state).toBe('not_monitored');
  expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);
  expect(fetcher).not.toHaveBeenCalled();
});

it('overallServiceState aggregates website, api, and provider', () => {
  const op = { state: 'operational' as const, checkedAt: 't' };
  const reach = { state: 'reachable' as const, checkedAt: 't' };
  const deg = { state: 'degraded' as const, checkedAt: 't' };
  const nm = { state: 'not_monitored' as const, checkedAt: 't' };
  expect(overallServiceState({ website: reach, api: reach, provider: nm })).toBe('unknown');
  expect(overallServiceState({ website: op, api: op, provider: op })).toBe('operational');
  expect(overallServiceState({ website: op, api: op, provider: nm })).toBe('unknown');
  expect(overallServiceState({ website: reach, api: deg, provider: nm })).toBe('degraded');
  expect(overallServiceState({ website: deg, api: reach, provider: op })).toBe('degraded');
  expect(overallServiceState({})).toBe('unknown');
  expect(overallServiceState({ website: reach })).toBe('unknown');
});

it('APP_VERSION re-export equals src/app-version', () => {
  expect(APP_VERSION).toBe(SRC_APP_VERSION);
});
