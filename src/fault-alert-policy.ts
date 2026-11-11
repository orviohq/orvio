/** Pure classification only: these codes are not proof of a root cause. */
export type FaultArea = "access" | "playback" | "youtube-add";

// Stable facts from external-audio-api; no runtime dependency on its services.
const SERVICE_REASONS = [
  "invalid_url",
  "too_long",
  "rate_limited",
  "region_blocked",
  "unavailable",
  "not_found",
  "audio_expired",
  "storage_full",
  "source_changed",
  "integrity_failed",
  "unsupported_format",
  "client_audio_not_cached",
  "client_generation_disabled",
  "network_error",
  "request_timeout",
] as const;

// Only failure facts from status-reason-codes; healthy/untested facts excluded.
const ACCESS_REASONS = [
  "indexeddb_unavailable",
  "local_cache_not_initialized",
  "local_cache_blocked",
  "local_cache_unavailable",
  "local_cache_read_failed",
  "check_timed_out",
  "check_unavailable",
] as const;
const PLAYBACK_REASONS = [
  "audio_context_unavailable",
  "decode_audio_data_unavailable",
  "pcm_decode_failed",
  ...SERVICE_REASONS,
] as const;
const YOUTUBE_ADD_REASONS = [
  "metadata_api_key_not_configured",
  "metadata_http_error",
  "unrecognized_metadata_response",
  ...SERVICE_REASONS,
] as const;

const FALLBACKS = {
  access: "access_failed",
  playback: "playback_failed",
  "youtube-add": "youtube_add_failed",
} as const satisfies Record<FaultArea, string>;

export type FaultReason =
  | (typeof ACCESS_REASONS)[number]
  | (typeof PLAYBACK_REASONS)[number]
  | (typeof YOUTUBE_ADD_REASONS)[number]
  | (typeof FALLBACKS)[FaultArea];

export interface FaultOccurrence {
  readonly area: FaultArea;
  readonly reasonCode: FaultReason;
  /** Caller-supplied detection time, not a claim about fault onset. */
  readonly observedAt: number;
  /** Opaque caller-supplied identity, never derived from an error message. */
  readonly occurrenceId: string;
}

const ALLOWED: Readonly<Record<FaultArea, readonly FaultReason[]>> = {
  access: ACCESS_REASONS,
  playback: PLAYBACK_REASONS,
  "youtube-add": YOUTUBE_ADD_REASONS,
};

/** Match exact stable codes only; never inspect, parse, or stringify raw errors. */
export function normalizeFaultReason(
  area: FaultArea,
  raw: unknown,
): FaultReason {
  const allowed = ALLOWED[area];
  return typeof raw === "string" && allowed.includes(raw as FaultReason)
    ? (raw as FaultReason)
    : FALLBACKS[area];
}

/** Read only own data fields; unknown properties and accessors are never read. */
export function normalizeFaultOccurrence(
  raw: unknown,
): Readonly<FaultOccurrence> | null {
  try {
    if (raw === null || typeof raw !== "object") return null;
    const prototype = Object.getPrototypeOf(raw);
    if (prototype !== null && prototype !== Object.prototype) return null;
    const fields = ["area", "reasonCode", "observedAt", "occurrenceId"].map(
      (key) => Object.getOwnPropertyDescriptor(raw, key),
    );
    if (fields.some((field) => !field || !("value" in field))) return null;
    const [area, reasonCode, observedAt, occurrenceId] = fields.map(
      (field) => field!.value,
    );
    if (area !== "access" && area !== "playback" && area !== "youtube-add")
      return null;
    if (
      typeof observedAt !== "number" ||
      !Number.isInteger(observedAt) ||
      observedAt < 0 ||
      observedAt > 8.64e15
    )
      return null;
    if (
      typeof occurrenceId !== "string" ||
      /^[A-Za-z0-9_-]{1,128}$/.exec(occurrenceId)?.[0] !== occurrenceId
    )
      return null;
    return Object.freeze({
      area,
      reasonCode: normalizeFaultReason(area, reasonCode),
      observedAt: observedAt === 0 ? 0 : observedAt,
      occurrenceId,
    });
  } catch {
    return null;
  }
}

function compareFaultText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Exact identity deduplication, then newest ten in deterministic display order. */
export function selectFaultOccurrences(
  raw: unknown,
): readonly Readonly<FaultOccurrence>[] {
  try {
    if (!Array.isArray(raw)) return Object.freeze([]);
    const length = Object.getOwnPropertyDescriptor(raw, "length")?.value;
    if (!Number.isInteger(length) || length < 0) return Object.freeze([]);
    const byId = new Map<string, Readonly<FaultOccurrence>>();
    for (const key of Object.getOwnPropertyNames(raw)) {
      if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length) continue;
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || !("value" in descriptor)) continue;
      const item = normalizeFaultOccurrence(descriptor.value);
      if (!item) continue;
      const previous = byId.get(item.occurrenceId);
      const order = previous
        ? item.observedAt - previous.observedAt ||
          compareFaultText(item.area, previous.area) ||
          compareFaultText(item.reasonCode, previous.reasonCode)
        : -1;
      if (order < 0) byId.set(item.occurrenceId, item);
    }
    const selected = [...byId.values()]
      .sort(
        (left, right) =>
          left.observedAt - right.observedAt ||
          compareFaultText(left.occurrenceId, right.occurrenceId),
      )
      .slice(-10);
    return Object.freeze(selected);
  } catch {
    return Object.freeze([]);
  }
}
