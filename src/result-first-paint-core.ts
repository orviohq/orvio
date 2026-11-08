/** Pure helpers behind the result first-paint projection. No DOM access so
 * the identity, expiry and cache-pressure rules are unit-testable directly;
 * the inline bootstrap mirrors fnv128/identity validation by necessity (it
 * runs before modules) and a parity test pins the two implementations. */
import type { SharedResult } from './share';

type UiResult = Omit<SharedResult, 'song'> & { song: string };

/** FNV-1a-style lookup hash over the full fragment string. This is ONLY a
 * storage key: fragment-keyed entries carry the full original fragment and
 * the bootstrap requires exact string equality before painting, so a hash
 * collision can never paint a different result. */
export function fnv128(value: string): string {
  let a1 = 0x811c9dc5,
    a2 = 0x811c9dc5,
    b1 = 0x811c9dc5,
    b2 = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    a1 = Math.imul(a1 ^ c, 0x01000193) >>> 0;
    a2 =
      (a2 + ((a2 << 1) + (a2 << 4) + (a2 << 7) + (a2 << 8) + (a2 << 24))) >>> 0;
    b1 = Math.imul(b1 ^ (c ^ 0x9e3779b9), 0x01000193) >>> 0;
    b2 =
      (b2 + ((b2 << 3) + (b2 << 5) + (b2 << 11) + (b2 << 16) + (b2 << 22))) >>>
      0;
  }
  return (
    a1.toString(16).padStart(8, '0') +
    a2.toString(16).padStart(8, '0') +
    b1.toString(16).padStart(8, '0') +
    b2.toString(16).padStart(8, '0')
  );
}

/** The bootstrap's identity derivation, mirrored: ?s=, ?local=, or a 128-bit
 * hash of the full fragment. Returns null when the route carries no result
 * identity. */
export function resultIdentityKey(href: string): string | null {
  try {
    const url = new URL(href);
    if (!/^\/result\/?$/.test(url.pathname)) return null;
    const share = url.searchParams.get('s');
    const local = url.searchParams.get('local');
    if (share && /^[A-Za-z0-9_-]{20,100}$/.test(share)) return 's:' + share;
    if (local && local.length <= 300) return 'local:' + local;
    if (url.hash.length > 1) {
      const fragment = url.hash.slice(1);
      if (fragment.length <= 130000) return 'h:' + fnv128(fragment);
    }
    return null;
  } catch {
    return null;
  }
}

export function resultFingerprint(result: UiResult): string {
  return [
    result.song,
    result.lanes,
    result.difficulty,
    result.score,
    result.accuracy.toFixed(2),
    result.combo,
    (result.judgments ?? []).join(','),
    JSON.stringify(result.options ?? null),
  ].join('|');
}

/** A projection with a verified share expiry must never paint once expired:
 * the app would reject the share after a visible wrong/stale paint. */
export function isProjectionExpired(
  expiresAt: number | undefined,
  now: number,
): boolean {
  return (
    expiresAt !== undefined && (!Number.isFinite(expiresAt) || expiresAt <= now)
  );
}

/** Storage pressure handling: evict the oldest DISPLAY projections until the
 * serialized store fits the budget. The just-written keys are never evicted;
 * if they alone exceed the budget the write is still attempted, and if the
 * browser then refuses it (hard quota) this optional paint cache simply
 * skips the update - it never breaks the verified result. Insertion order
 * is the LRU order because writers delete-then-set. This touches only the
 * display-projection store, never functional replay/session history. */
export function evictResultDisplayEntries<T>(
  entries: Record<string, T>,
  keep: ReadonlySet<string>,
  budget: number,
): Record<string, T> {
  const size = (e: Record<string, T>) =>
    JSON.stringify({ v: 2, entries: e }).length;
  if (size(entries) <= budget) return entries;
  const out: Record<string, T> = { ...entries };
  for (const key of Object.keys(out)) {
    if (size(out) <= budget) break;
    if (keep.has(key)) continue;
    if (Object.keys(out).every((k) => keep.has(k))) break;
    delete out[key];
  }
  return out;
}
