import type { HealthArea } from './status-health';
import { enqueueFaultOccurrence } from './fault-alert-outbox';

const KEY = 'orvio-status-failures';
const VISIT_KEY = 'orvio-status-last-visit';
export interface StatusFailure {
  area: HealthArea;
  message: string;
  at: string;
}

export function readFailures(): StatusFailure[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is StatusFailure =>
          !!item &&
          ['access', 'playback', 'youtube-add'].includes(item.area) &&
          typeof item.message === 'string' &&
          typeof item.at === 'string' &&
          Number.isFinite(Date.parse(item.at)),
      )
      .slice(-10);
  } catch {
    return [];
  }
}

export function recordFailure(area: HealthArea, message: string): void {
  enqueueFaultOccurrence(area, message);
  try {
    const failures = readFailures();
    failures.push({ area, message, at: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(failures.slice(-10)));
    window.dispatchEvent(new Event('orvio-status-change'));
  } catch {
    /* Optional history must never interrupt recovery. */
  }
}

export function hasUnacknowledgedFailure(): boolean {
  try {
    const visited = Date.parse(localStorage.getItem(VISIT_KEY) ?? '') || 0;
    return readFailures().some((failure) => Date.parse(failure.at) > visited);
  } catch {
    return false;
  }
}

export function acknowledgeFailures(): void {
  try {
    localStorage.setItem(VISIT_KEY, new Date().toISOString());
  } catch {}
}
