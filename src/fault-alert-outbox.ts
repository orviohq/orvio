import {
  normalizeFaultOccurrence,
  normalizeFaultReason,
  selectFaultOccurrences,
  type FaultArea,
  type FaultOccurrence,
} from './fault-alert-policy';

const KEY = 'orvio-fault-alert-outbox';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitize(raw: unknown): readonly Readonly<FaultOccurrence>[] {
  try {
    if (!Array.isArray(raw)) return selectFaultOccurrences([]);
    const items: FaultOccurrence[] = [];
    for (const key of Object.getOwnPropertyNames(raw)) {
      if (!/^(0|[1-9][0-9]*)$/.test(key)) continue;
      const field = Object.getOwnPropertyDescriptor(raw, key);
      if (!field || !('value' in field)) continue;
      const item = normalizeFaultOccurrence(field.value);
      if (item && UUID.test(item.occurrenceId)) items.push(item);
    }
    return selectFaultOccurrences(items);
  } catch {
    return selectFaultOccurrences([]);
  }
}

/** Immutable sanitized snapshot for a future consumer; no delivery is performed. */
export function readFaultOutbox(): readonly Readonly<FaultOccurrence>[] {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return selectFaultOccurrences([]);
  }
}

/** Optional local detection queue. Identity never depends on the failure text. */
export function enqueueFaultOccurrence(area: FaultArea, rawReason: unknown): void {
  try {
    const occurrence = {
      area,
      reasonCode: normalizeFaultReason(area, rawReason),
      observedAt: Date.now(),
      occurrenceId: globalThis.crypto.randomUUID(),
    };
    const queue = sanitize([...readFaultOutbox(), occurrence]);
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* Optional storage/crypto must never interrupt failure history or recovery. */
  }
}
