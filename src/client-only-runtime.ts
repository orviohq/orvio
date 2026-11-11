import {
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';

/** Version of the client-only contract. Bump when admission semantics change. */
export const CLIENT_ONLY_RUNTIME = 'client-only/1' as const;

/** The whole app is built and running in client-only mode. */
export const CLIENT_ONLY_MODE = true as const;

export const CLIENT_ONLY_UNAVAILABLE =
  'CLIENT_ONLY_REMOTE_UNAVAILABLE' as const;

export type ClientOnlyNetworkKind =
  | 'same-origin-static'
  | 'runtime-api'
  | 'non-static-path'
  | 'cross-origin'
  | 'unsupported-method'
  | 'unsupported-protocol'
  | 'invalid-url';

export interface ClientOnlyNetworkRequest {
  url: string | URL;
  method?: string;
  /** The app origin, not the request origin. Relative URLs resolve against it. */
  origin: string;
}

export type ClientOnlyNetworkAdmission =
  | { allowed: true; kind: 'same-origin-static'; url: string }
  | {
      allowed: false;
      kind: Exclude<ClientOnlyNetworkKind, 'same-origin-static'>;
      url: string;
    };

/** Any versioned API namespace, including future `/v2`, is never static. */
const RUNTIME_API_PATH = /^\/(?:api|v\d+)(?:\/|$)/i;
const STATIC_EXTENSION =
  /\.(?:js|mjs|cjs|css|map|json|webmanifest|wasm|html|txt|xml|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|mp3|wav|ogg|oga|opus|m4a|aac|flac|mp4|webm)$/i;
const STATIC_BUILD_PREFIX = /^\/(?:_astro|assets|build|static|fonts|icons)\//;
const ROOT_DOCUMENT = /^\/(?:index\.html)?$/;

function isStaticAsset(pathname: string): boolean {
  return (
    ROOT_DOCUMENT.test(pathname) ||
    STATIC_BUILD_PREFIX.test(pathname) ||
    STATIC_EXTENSION.test(pathname)
  );
}

/**
 * Central admission for the client-only runtime.
 *
 * The browser may fetch only explicit static build assets and root documents
 * from its own origin. It may not reach runtime APIs, including versioned
 * `/api`, `/v1`, `/v2` namespaces, and it may not call another origin.
 * Extensionless or arbitrary same-origin paths are denied by default so a
 * hidden server route cannot be admitted merely because it is a GET.
 *
 * This is an admission decision at the service boundary; it deliberately does
 * not patch `fetch` globally, so unrelated browser features (workers, media
 * elements, static imports) keep their normal semantics.
 */
export function admitClientOnlyNetwork(
  request: ClientOnlyNetworkRequest,
): ClientOnlyNetworkAdmission {
  const raw = typeof request.url === 'string' ? request.url : request.url.href;
  const method = (request.method ?? 'GET').toUpperCase();
  let url: URL;
  try {
    url = new URL(raw, request.origin);
  } catch {
    return { allowed: false, kind: 'invalid-url', url: raw };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    return { allowed: false, kind: 'unsupported-protocol', url: url.href };
  if (url.origin !== new URL(request.origin).origin)
    return { allowed: false, kind: 'cross-origin', url: url.href };
  if (method !== 'GET' && method !== 'HEAD')
    return { allowed: false, kind: 'unsupported-method', url: url.href };
  if (RUNTIME_API_PATH.test(url.pathname))
    return { allowed: false, kind: 'runtime-api', url: url.href };
  if (!isStaticAsset(url.pathname))
    return { allowed: false, kind: 'non-static-path', url: url.href };
  return { allowed: true, kind: 'same-origin-static', url: url.href };
}

export type ClientOnlyNetworkFailureKind = Exclude<
  ClientOnlyNetworkKind,
  'same-origin-static'
>;

/** Central runtime-network refusal. Thrown before any server `fetch` starts. */
export class ClientOnlyNetworkError extends Error {
  readonly code = 'CLIENT_ONLY_NETWORK' as const;
  constructor(
    readonly kind: ClientOnlyNetworkFailureKind,
    readonly url: string,
  ) {
    super(`Client-only runtime rejected ${kind} request: ${url}`);
    this.name = 'ClientOnlyNetworkError';
  }
}

function runtimeOrigin(): string {
  return typeof location !== 'undefined' ? location.origin : 'http://localhost';
}

/**
 * Service-boundary assertion for every actual runtime network call.
 * Static build assets (including the opus decoder WASM) still pass admission;
 * all runtime API/remote calls throw here before `fetch` is invoked.
 */
export function assertClientOnlyNetwork(
  request: Omit<ClientOnlyNetworkRequest, 'origin'> & { origin?: string },
): void {
  if (!CLIENT_ONLY_MODE) return;
  const admission = admitClientOnlyNetwork({
    ...request,
    origin: request.origin ?? runtimeOrigin(),
  });
  if (!admission.allowed)
    throw new ClientOnlyNetworkError(admission.kind, admission.url);
}

export function assertRuntimeFetch(
  input: string | URL | Request,
  method = 'GET',
): void {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  assertClientOnlyNetwork({ url, method });
}

/** Server-backed features that have no honest local implementation yet. */
export type RemoteOnlyCapability =
  | 'canonical-refresh'
  | 'audio-job-read'
  | 'provider-fetch'
  | 'external-import'
  | 'share-upload'
  | 'share-download'
  | 'opus-bridge';

export interface ClientOnlyUnavailable {
  readonly available: false;
  readonly code: typeof CLIENT_ONLY_UNAVAILABLE;
  readonly capability: RemoteOnlyCapability;
}

export class ClientOnlyUnavailableError extends Error {
  readonly code = CLIENT_ONLY_UNAVAILABLE;
  constructor(readonly capability: RemoteOnlyCapability) {
    super(
      `Remote-only feature is unavailable in the local client: ${capability}`,
    );
    this.name = 'ClientOnlyUnavailableError';
  }
}

/** A safe, non-throwing result for UI/service boundaries. */
export function unavailableRemoteOnly(
  capability: RemoteOnlyCapability,
): ClientOnlyUnavailable {
  return { available: false, code: CLIENT_ONLY_UNAVAILABLE, capability };
}

/** Throwing variant for call sites that must not continue silently. */
export function rejectRemoteOnly(capability: RemoteOnlyCapability): never {
  throw new ClientOnlyUnavailableError(capability);
}

export type ClientOnlyLocalAudioReason = 'missing' | 'corrupt';

/** Strict local-audio failure. It must never be translated into a remote fetch. */
export class ClientOnlyLocalAudioError extends Error {
  readonly code = 'CLIENT_ONLY_LOCAL_AUDIO' as const;
  constructor(
    readonly reason: ClientOnlyLocalAudioReason,
    readonly videoId: string,
  ) {
    super(
      reason === 'missing'
        ? `Local audio file is required for ${videoId}`
        : `Local audio failed verification for ${videoId}`,
    );
    this.name = 'ClientOnlyLocalAudioError';
  }
}

export interface LocalAudioLike {
  bytes: ArrayBuffer;
  jobId?: string;
}

/**
 * Resolve already-persisted local audio or fail explicitly.
 *
 * `read` is the existing local reader (for example `localAudio`). A rejection
 * from that reader is corruption, not a cue to download again. Abort remains
 * an abort so callers can discard the attempt safely.
 */
export async function requireLocalAudio<T extends LocalAudioLike>(
  videoId: string,
  read: () => Promise<T | null>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted)
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  let local: T | null;
  try {
    local = await read();
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    )
      throw error;
    throw new ClientOnlyLocalAudioError('corrupt', videoId);
  }
  // The reader may have ignored its signal; never return bytes after abort.
  if (signal?.aborted)
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  if (!local) throw new ClientOnlyLocalAudioError('missing', videoId);
  return local;
}

export interface CachedLocalSourceIdentity {
  /** Cached identity. Required, never synthesized for a local file. */
  videoId: string;
  audioSha256: string;
  chartSetSha256?: string;
  /** Digest of the exact cached SourceRecord JSON. */
  recordSha256: string;
}

export interface LocalReadDeps {
  /** Read-only lookup of the cached record. Must not refresh or fetch. */
  readRecord(
    identity: CachedLocalSourceIdentity,
    signal?: AbortSignal,
  ): Promise<unknown | null>;
  /** Read-only lookup of local audio bytes. Must not fetch or generate. */
  readAudio(
    record: SourceRecord,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null>;
  /** Injectable for tests; defaults to WebCrypto SHA-256. */
  sha256?(bytes: Uint8Array): Promise<string>;
}

export interface LocalSourceIds {
  videoId: string;
  audioSha256: string;
  chartSetSha256?: string;
}

export type LocalLoadFailure =
  | { state: 'missing-record'; identity: CachedLocalSourceIdentity }
  | {
      state: 'missing-audio';
      needsFile: true;
      identity: CachedLocalSourceIdentity;
      record: SourceRecord;
      recordSha256: string;
    }
  | {
      state: 'corrupt';
      reason: 'identity' | 'record' | 'audio';
      identity: CachedLocalSourceIdentity;
    }
  | { state: 'aborted'; identity: CachedLocalSourceIdentity };

export type LocalLoadResult =
  | {
      state: 'ready';
      record: SourceRecord;
      bytes: ArrayBuffer;
      ids: LocalSourceIds;
      recordSha256: string;
    }
  | LocalLoadFailure;

const SHA = /^[a-f0-9]{64}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function validIdentity(identity: CachedLocalSourceIdentity): boolean {
  return (
    !!identity &&
    VIDEO_ID.test(identity.videoId) &&
    SHA.test(identity.audioSha256) &&
    SHA.test(identity.recordSha256) &&
    (identity.chartSetSha256 === undefined || SHA.test(identity.chartSetSha256))
  );
}

async function defaultSha256(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest('SHA-256', owned);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * First local-only load primitive.
 *
 * It is intentionally dependency-injected and read-only: no `fetch`, no
 * `refreshCanonical`, no `readAudioJob`, no provider call, no cache write and
 * no ID synthesis. A missing audio file is reported as an explicit file need
 * rather than becoming a new YouTube identity. A bad record/audio hash is a
 * corruption result, not a regeneration hint.
 */
export async function loadCachedLocalSource(
  identity: CachedLocalSourceIdentity,
  deps: LocalReadDeps,
  signal?: AbortSignal,
): Promise<LocalLoadResult> {
  if (!validIdentity(identity))
    return { state: 'corrupt', reason: 'identity', identity };
  if (signal?.aborted) return { state: 'aborted', identity };
  const sha256 = deps.sha256 ?? defaultSha256;

  let raw: unknown;
  try {
    raw = await deps.readRecord(identity, signal);
  } catch (error) {
    if (isAbort(error, signal)) return { state: 'aborted', identity };
    throw error;
  }
  if (signal?.aborted) return { state: 'aborted', identity };
  if (raw === null) return { state: 'missing-record', identity };

  if (
    !validSourceRecord(raw) ||
    raw.videoId !== identity.videoId ||
    raw.audioSha256 !== identity.audioSha256 ||
    raw.chartSetSha256 !== identity.chartSetSha256 ||
    !(await verifyChartHashes(raw))
  )
    return { state: 'corrupt', reason: 'record', identity };

  const recordDigest = await sha256(
    new TextEncoder().encode(JSON.stringify(raw)),
  );
  if (recordDigest !== identity.recordSha256)
    return { state: 'corrupt', reason: 'record', identity };
  if (signal?.aborted) return { state: 'aborted', identity };

  let bytes: ArrayBuffer | null;
  try {
    bytes = await deps.readAudio(raw, signal);
  } catch (error) {
    if (isAbort(error, signal)) return { state: 'aborted', identity };
    throw error;
  }
  if (signal?.aborted) return { state: 'aborted', identity };
  if (bytes === null)
    return {
      state: 'missing-audio',
      needsFile: true,
      identity,
      record: raw,
      recordSha256: recordDigest,
    };

  const audioDigest = await sha256(new Uint8Array(bytes));
  if (audioDigest !== raw.audioSha256)
    return { state: 'corrupt', reason: 'audio', identity };

  return {
    state: 'ready',
    record: raw,
    bytes,
    ids: {
      videoId: raw.videoId,
      audioSha256: raw.audioSha256,
      ...(raw.chartSetSha256 === undefined
        ? {}
        : { chartSetSha256: raw.chartSetSha256 }),
    },
    recordSha256: recordDigest,
  };
}
