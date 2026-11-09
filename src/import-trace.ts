/**
 * Private per-stage clock recorder for the YouTube import path.
 *
 * Purpose: attribute accumulated import wall time to the stage that spent it
 * (submit, canonical lookup, job create/poll, canonical wait, audio download
 * TTFB/body/digest, local chart generation, IndexedDB save) instead of
 * guessing from a total. Records wait spans separately from request spans so
 * queued time is never confused with transfer or compute time.
 *
 * Privacy: in-memory only. Nothing is persisted, sent over the network, or
 * exposed outside this page. Recorded details are bounded to fixed stage
 * names, millisecond timings, byte counts, HTTP status codes, retryAfter
 * seconds, poll indices and abort/error codes - never a URL, video id, title,
 * token or user identifier.
 *
 * Readout: window.__orvioImportTrace() returns the last few traces with
 * timings relative to each import's own start.
 */

export type TraceDetailValue = number | string | boolean;

export interface TraceEvent {
  /** Fixed stage label, e.g. 'job-poll-get:end'. */
  stage: string;
  /** performance.now() at record time. */
  at: number;
  detail?: Record<string, TraceDetailValue>;
}

export interface ImportTrace {
  id: number;
  startedAt: number;
  endedAt?: number;
  outcome?: string;
  events: TraceEvent[];
}

/** Bounded retention: the import flow runs one at a time in practice, but
 * overlapping imports get independent traces. */
const MAX_TRACES = 8;
const MAX_EVENTS_PER_TRACE = 256;
const MAX_ACTIVE = 4;

const traces: ImportTrace[] = [];
let nextId = 1;
let activeCount = 0;

/** Start a trace for one import attempt. Returns null when the bounded
 * concurrent-trace budget is exhausted; every helper tolerates null so
 * callers need no branching. */
export function beginTrace(): ImportTrace | null {
  if (activeCount >= MAX_ACTIVE) return null;
  const trace: ImportTrace = {
    id: nextId++,
    startedAt: performance.now(),
    events: [],
  };
  traces.push(trace);
  if (traces.length > MAX_TRACES) traces.shift();
  activeCount++;
  return trace;
}

export function traceMark(
  trace: ImportTrace | null | undefined,
  stage: string,
  detail?: Record<string, TraceDetailValue>,
): void {
  if (!trace) return;
  if (trace.events.length >= MAX_EVENTS_PER_TRACE) return;
  const event: TraceEvent = { stage, at: performance.now() };
  if (detail) event.detail = detail;
  trace.events.push(event);
}

/** Error names are attacker-controllable (new Error().name = arbitrary
 * string, DOMException with a custom name). Only fixed platform names may
 * enter the readout; anything else collapses to 'Error'. */
const KNOWN_ERROR_NAMES: readonly string[] = [
  'AbortError',
  'TimeoutError',
  'NetworkError',
  'NotFoundError',
  'SecurityError',
  'DataError',
  'QuotaExceededError',
  'TypeError',
  'RangeError',
  'Error',
];
export const traceErrorName = (error: unknown): string => {
  // Inspection itself must never throw: instanceof can throw on proxies
  // (getPrototypeOf trap) and .name can be a throwing getter. Any failure
  // collapses to the fixed fallback so the original thrown object is
  // always preserved for the caller.
  try {
    const name =
      error instanceof DOMException || error instanceof Error
        ? error.name
        : typeof error;
    return KNOWN_ERROR_NAMES.includes(name) ? name : 'Error';
  } catch {
    return 'Error';
  }
};

/** Record a :begin mark, run work, then record :end or :error with the
 * elapsed milliseconds. The elapsed span is measured, never inferred. */
export async function traceSpan<T>(
  trace: ImportTrace | null | undefined,
  stage: string,
  work: () => Promise<T>,
  detail?: Record<string, TraceDetailValue>,
): Promise<T> {
  if (!trace) return work();
  const start = performance.now();
  traceMark(trace, stage + ':begin', detail);
  try {
    const result = await work();
    traceMark(trace, stage + ':end', {
      ...detail,
      ms: Math.round((performance.now() - start) * 10) / 10,
    });
    return result;
  } catch (error) {
    traceMark(trace, stage + ':error', {
      ...detail,
      ms: Math.round((performance.now() - start) * 10) / 10,
      error: traceErrorName(error),
    });
    throw error;
  }
}

export function endTrace(
  trace: ImportTrace | null | undefined,
  outcome: string,
): void {
  if (!trace) return;
  if (trace.endedAt === undefined) {
    trace.endedAt = performance.now();
    trace.outcome = outcome;
    activeCount--;
  }
}

export interface PublicTraceEvent {
  stage: string;
  atMs: number;
  [key: string]: TraceDetailValue;
}

export interface PublicTrace {
  id: number;
  totalMs?: number;
  outcome?: string;
  events: PublicTraceEvent[];
}

/** Snapshot for on-device readout. Timings are relative to each trace's own
 * start so wall-clock times never leave the device. */
export function readTraces(): PublicTrace[] {
  return traces.map((trace) => ({
    id: trace.id,
    totalMs:
      trace.endedAt === undefined
        ? undefined
        : Math.round((trace.endedAt - trace.startedAt) * 10) / 10,
    outcome: trace.outcome,
    events: trace.events.map((event) => ({
      stage: event.stage,
      atMs: Math.round((event.at - trace.startedAt) * 10) / 10,
      ...event.detail,
    })),
  }));
}

/** Test-only reset; the app never calls this. */
export function resetTracesForTests(): void {
  traces.length = 0;
  activeCount = 0;
}

declare global {
  interface Window {
    __orvioImportTrace?: () => PublicTrace[];
  }
}

if (typeof window !== 'undefined') window.__orvioImportTrace = readTraces;
