import {
  admitShareFragment,
  SHARE_MAX_FRAGMENT_CHARS,
  SHARE_BODY_MAX_BYTES,
} from "./admission";

interface Statement {
  bind(...values: (string | number)[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}
interface Env {
  DB: { prepare(sql: string): Statement };
  /** Must be supplied only after publisher verifies the actual account and DB. */
  SHARE_ENABLED?: string;
  SHARE_ORIGIN?: string;
}
const YEAR = 31536000000;
const BODY_MAX = SHARE_BODY_MAX_BYTES;
const encoder = new TextEncoder();

async function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort = () => {};
  const deadline = new Promise<never>((_, reject) => {
    abort = () => reject(Error("deadline"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

export function shareId(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function readShareBody(
  request: Request,
  signal: AbortSignal,
): Promise<unknown> {
  if (!request.body) throw Error("body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const part = await reader.read();
      signal.throwIfAborted();
      if (part.done) break;
      size += part.value.length;
      if (size > BODY_MAX) throw Error("size");
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.length;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally {
    signal.removeEventListener("abort", cancel);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Candidate only. No other routes, bindings, scheduled handler or outbound fetch. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
    };
    if (origin && origin === env.SHARE_ORIGIN)
      headers["Access-Control-Allow-Origin"] = origin;
    const reply = (status: number, value: object) =>
      new Response(JSON.stringify(value), { status, headers });
    if (env.SHARE_ENABLED !== "1" || !env.SHARE_ORIGIN)
      return reply(503, { error: "unavailable" });
    const url = new URL(request.url);
    if (url.search || (origin && origin !== env.SHARE_ORIGIN))
      return reply(400, { error: "invalid_request" });
    const create = url.pathname === "/v1/replays";
    const id = url.pathname.match(/^\/v1\/replays\/([A-Za-z0-9_-]{22})$/)?.[1];
    if (!create && !id) return reply(404, { error: "not_found" });
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    if (request.method === "GET" && id) {
      try {
        const row = await bounded(
          env.DB.prepare(
            "SELECT fragment, expires FROM shares WHERE id = ? AND expires > ?",
          )
            .bind(id, Date.now())
            .first<{ fragment: string; expires: number }>(),
          AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
        );
        if (!row) return reply(404, { error: "not_found_or_expired" });
        if (
          typeof row.fragment !== "string" ||
          row.fragment.length > SHARE_MAX_FRAGMENT_CHARS ||
          !Number.isFinite(row.expires)
        )
          return reply(503, { error: "unavailable" });
        if (row.expires <= Date.now())
          return reply(404, { error: "not_found_or_expired" });
        return reply(200, {
          fragment: row.fragment,
          expiresAt: new Date(row.expires).toISOString(),
        });
      } catch {
        return reply(503, { error: "unavailable" });
      }
    }
    if (request.method !== "POST" || !create)
      return reply(405, { error: "method" });
    if (
      request.headers.get("Content-Type")?.split(";")[0].trim() !==
      "application/json"
    )
      return reply(415, { error: "content_type" });
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
    let fragment: string;
    try {
      const body = (await readShareBody(request, signal)) as {
        fragment?: unknown;
      };
      if (
        !body ||
        typeof body !== "object" ||
        Object.keys(body).join(",") !== "fragment" ||
        typeof body.fragment !== "string"
      )
        throw Error("body");
      fragment = body.fragment;
      fragment = await admitShareFragment(fragment, signal);
      signal.throwIfAborted();
    } catch (error) {
      return reply(
        error instanceof Error && error.message === "size" ? 413 : 400,
        { error: "invalid_share" },
      );
    }
    const now = Date.now(),
      idNew = shareId();
    try {
      signal.throwIfAborted();
      const result = await bounded(
        env.DB.prepare(
          "INSERT INTO shares(id, fragment, created, expires, bytes) VALUES (?, ?, ?, ?, ?)",
        )
          .bind(
            idNew,
            fragment,
            now,
            now + YEAR,
            encoder.encode(fragment).length + 256,
          )
          .run(),
        signal,
      );
      if (!result.success) throw Error("store");
      return reply(201, {
        id: idNew,
        expiresAt: new Date(now + YEAR).toISOString(),
      });
    } catch {
      return reply(signal.aborted ? 503 : 429, {
        error: "share_unavailable_or_quota",
      });
    }
  },
};
