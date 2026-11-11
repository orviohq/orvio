import { LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS } from "./local-allkeys-share";
import { V5_MAX_FRAGMENT_CHARS } from "./external-share";
import {
  PROGRESSIVE_SHARE_PREFIX,
  PROGRESSIVE_MAX_FRAGMENT_CHARS,
} from "./progressive/share-proof";

export type ResolvedShareKind =
  | "local-allkeys"
  | "local-allkeys-progressive"
  | "v5"
  | "v6"
  | "v7"
  | "builtin";
export type ResolvedShareFailure =
  "invalid-route" | "invalid-record" | "expired" | "too-large" | "unsupported";

export class ResolvedShareError extends Error {
  constructor(readonly code: ResolvedShareFailure) {
    super(`Resolved share rejected: ${code}`);
    this.name = "ResolvedShareError";
  }
}

/** A routing envelope, NOT evidence that the payload has passed its decoder. */
export interface ResolvedShareRoute {
  readonly kind: ResolvedShareKind;
  readonly fragment: string;
  readonly arrivalHref: string;
  readonly id: string;
  readonly expiresAt: string;
}

/** Classify only; retain the entire fragment for the existing validating decoder. */
export function classifyResolvedShareFragment(
  fragment: string,
): ResolvedShareKind {
  if (typeof fragment !== "string" || !fragment || fragment.startsWith("#"))
    throw new ResolvedShareError("invalid-record");
  if (
    fragment.length >
    Math.max(
      LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS,
      V5_MAX_FRAGMENT_CHARS,
      PROGRESSIVE_MAX_FRAGMENT_CHARS,
    )
  )
    throw new ResolvedShareError("too-large");
  const params = new URLSearchParams(fragment);
  if (params.getAll("v").length !== 1)
    throw new ResolvedShareError("invalid-record");
  const version = params.get("v");
  if (
    version === "local-allkeys-v1" ||
    ["5", "6", "7"].includes(version ?? "")
  ) {
    if (
      !fragment.startsWith(`v=${version}&d=`) ||
      params.getAll("d").length !== 1 ||
      !params.get("d")
    )
      throw new ResolvedShareError("invalid-record");
    const local = version === "local-allkeys-v1";
    if (
      fragment.length >
      (local ? LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS : V5_MAX_FRAGMENT_CHARS)
    )
      throw new ResolvedShareError("too-large");
    return local ? "local-allkeys" : (`v${version}` as "v5" | "v6" | "v7");
  }
  if (version === "local-allkeys-progressive-v1") {
    if (fragment.length > PROGRESSIVE_MAX_FRAGMENT_CHARS)
      throw new ResolvedShareError("too-large");
    if (
      !fragment.startsWith(PROGRESSIVE_SHARE_PREFIX) ||
      params.getAll("v").length !== 1 ||
      params.getAll("d").length !== 1 ||
      params.getAll("pm").length !== 1 ||
      params.getAll("mh").length !== 1 ||
      !params.get("d") ||
      !params.get("pm") ||
      !params.get("mh")
    )
      throw new ResolvedShareError("invalid-record");
    const parts = fragment.slice(PROGRESSIVE_SHARE_PREFIX.length).split("&");
    if (
      parts.length !== 3 ||
      !parts[0] ||
      !parts[1].startsWith("pm=") ||
      !parts[1].slice(3) ||
      !parts[2].startsWith("mh=") ||
      !parts[2].slice(3)
    )
      throw new ResolvedShareError("invalid-record");
    return "local-allkeys-progressive";
  }
  if (!["1", "2", "3", "4"].includes(version ?? ""))
    throw new ResolvedShareError("unsupported");
  if (new TextEncoder().encode(fragment).length > 160000)
    throw new ResolvedShareError("too-large");
  return "builtin";
}

/** No URL rewriting, cache, storage or network. `now` is supplied by the caller. */
export function prepareResolvedShareRoute(
  arrivalHref: string,
  record: unknown,
  now: number,
): ResolvedShareRoute {
  let url: URL;
  try {
    url = new URL(arrivalHref);
  } catch {
    throw new ResolvedShareError("invalid-route");
  }
  const ids = url.searchParams.getAll("s");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/result/" ||
    url.hash ||
    ids.length !== 1 ||
    !/^[A-Za-z0-9_-]{20,100}$/.test(ids[0])
  )
    throw new ResolvedShareError("invalid-route");
  if (!record || typeof record !== "object" || Array.isArray(record))
    throw new ResolvedShareError("invalid-record");
  const { fragment, expiresAt } = record as {
    fragment?: unknown;
    expiresAt?: unknown;
  };
  if (
    typeof fragment !== "string" ||
    typeof expiresAt !== "string" ||
    !Number.isFinite(now) ||
    !Number.isFinite(Date.parse(expiresAt))
  )
    throw new ResolvedShareError("invalid-record");
  if (Date.parse(expiresAt) <= now) throw new ResolvedShareError("expired");
  return Object.freeze({
    kind: classifyResolvedShareFragment(fragment),
    fragment,
    arrivalHref,
    id: ids[0],
    expiresAt,
  });
}

/** Handlers must invoke the existing full validators; classification is insufficient.
 * Return decoded data, not UI side effects. The route owner checks navigation before publishing.
 * Builtin handlers retain readResult/decodeReplay/entryReplayMatches/rp/rn checks.
 */
export type ResolvedShareDecoders<T> = Record<
  ResolvedShareKind,
  (fragment: string, options: { signal: AbortSignal }) => Promise<T>
>;

export async function decodeResolvedShareRoute<T>(
  arrivalHref: string,
  record: unknown,
  now: number,
  decoders: ResolvedShareDecoders<T>,
  signal: AbortSignal,
): Promise<{ route: ResolvedShareRoute; value: T }> {
  signal.throwIfAborted();
  const route = prepareResolvedShareRoute(arrivalHref, record, now);
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () =>
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    const value = await Promise.race([
      aborted,
      Promise.resolve().then(() => {
        signal.throwIfAborted();
        return decoders[route.kind](route.fragment, { signal });
      }),
    ]);
    signal.throwIfAborted();
    return { route, value };
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
