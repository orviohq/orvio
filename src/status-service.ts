import { SHARE_API } from './share-api';
import { APP_VERSION } from './app-version';

export type ServiceArea = 'website' | 'api' | 'provider';
export type ServiceState = 'operational' | 'reachable' | 'degraded' | 'not_monitored' | 'unknown';
export interface ServiceResult {
  state: ServiceState;
  checkedAt: string;
  detail?: string;
}

function mergeSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function isTimeoutAbort(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'TimeoutError'
    : (error as { name?: string } | null)?.name === 'TimeoutError';
}

function isExternalAbort(
  error: unknown,
  signal: AbortSignal | undefined,
): boolean {
  if (!signal?.aborted) return false;
  if (isTimeoutAbort(error)) return false;
  return (error as { name?: string } | null)?.name === 'AbortError';
}

export async function probeWebsite(options?: {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  now?: () => number;
}): Promise<ServiceResult> {
  const fetcher = options?.fetcher ?? fetch;
  const now = options?.now ?? Date.now;
  const checkedAt = new Date().toISOString();
  // Proves the static site/app shell is being served by fetching the
  // cache-busted web manifest from the same origin.
  const url = `/manifest.webmanifest?status-check=${now()}`;
  try {
    const response = await fetcher(url, {
      cache: 'no-store',
      signal: mergeSignal(options?.signal, 8000),
    });
    if (!response.ok) {
      return { state: 'degraded', checkedAt, detail: `HTTP ${response.status}` };
    }
    return { state: 'reachable', checkedAt, detail: `HTTP ${response.status}` };
  } catch (error) {
    if (isExternalAbort(error, options?.signal)) throw options!.signal!.reason;
    if (isTimeoutAbort(error)) {
      return { state: 'degraded', checkedAt, detail: 'timeout' };
    }
    return { state: 'degraded', checkedAt, detail: 'unreachable' };
  }
}

export async function probeApi(options?: {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ServiceResult> {
  const fetcher = options?.fetcher ?? fetch;
  const checkedAt = new Date().toISOString();
  // Proves the public share/audio API read path responds. Any HTTP response at
  // all proves reachability only, never actual service function.
  const url = `${SHARE_API}/v1/replays/AAAAAAAAAAAAAAAAAAAAAA`;
  try {
    const response = await fetcher(url, {
      signal: mergeSignal(options?.signal, 8000),
      cache: 'no-store',
    });
    const status = response.status;
    if (status >= 500) {
      return { state: 'degraded', checkedAt, detail: `HTTP ${status}` };
    }
    return { state: 'reachable', checkedAt, detail: `HTTP ${status}` };
  } catch (error) {
    if (isExternalAbort(error, options?.signal)) throw options!.signal!.reason;
    if (isTimeoutAbort(error)) {
      return { state: 'degraded', checkedAt, detail: 'timeout' };
    }
    return { state: 'degraded', checkedAt, detail: 'unreachable' };
  }
}

export function probeProvider(): ServiceResult {
  // The upstream audio provider is intentionally not probed from the client
  // (request budget and origin protection), so the page shows it as not
  // monitored rather than faking a green status.
  return { state: 'not_monitored', checkedAt: new Date().toISOString() };
}

export function overallServiceState(
  results: Partial<Record<ServiceArea, ServiceResult>>,
): ServiceState | 'unknown' {
  // Considers all three areas. Overall is 'degraded' if any is degraded,
  // 'operational' only if every area is 'operational' (impossible from client
  // probes today), otherwise 'unknown'.
  const areas: ServiceArea[] = ['website', 'api', 'provider'];
  const states = areas.map((area) => results[area]?.state);
  if (states.some((state) => state === 'degraded')) return 'degraded';
  if (states.every((state) => state === 'operational')) return 'operational';
  return 'unknown';
}

export { APP_VERSION };
