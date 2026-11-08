/** A small, display-only projection of the last verified result for one
 * route identity. Never contains records, audio, replay state, credentials,
 * or playback authority: hydration re-verifies the result and only then
 * makes any control live. All persisted content is typed data (text, numbers,
 * booleans, validated SVG element descriptors) - never markup. */
import type { SharedResult } from './share';
import type { ResultBadgeDatum } from './result-badges';
import {
  evictResultDisplayEntries,
  resultFingerprint,
  resultIdentityKey,
} from './result-first-paint-core';

export { resultIdentityKey, resultFingerprint } from './result-first-paint-core';

type UiResult = Omit<SharedResult, 'song'> & { song: string };

const STORAGE_KEY = 'orvio.result-display.v2';
const LEGACY_STORAGE_KEY = 'orvio.result-display.v1';
const STORAGE_BUDGET = 400000;

interface ResultProjection {
  fp: string;
  locale: string;
  title: string;
  metadata: string;
  badges: ResultBadgeDatum[];
  badge: string;
  rank: string;
  scoreText: string;
  scoreCaption: string;
  rateText: string;
  combo: number;
  breakText: string;
  statsLabels: string[];
  judgments: number[] | null;
  fever: { text: string; hidden: boolean };
  note: string;
  backLabel: string;
  retryLabel: string;
  retryDisabled: boolean;
  shareLabel: string;
  watchReplay: { label: string; hidden: boolean };
  preview: { label: string; hidden: boolean };
  systemLabel: string;
  art: string;
  expiresAt?: number;
}

export interface ResultFirstPaintDetails {
  /** Verified share expiry (ms epoch) when the result came from a share;
   * carried onto every identity the projection is written under so an
   * expired share can never paint before the app rejects it. */
  expiresAt?: number;
  /** Typed option badges, captured from the same data that rendered the live
   * dialog (resultBadgeData), so the projection reuses the real design. */
  badges?: ResultBadgeDatum[];
  /** settings.language at write time; the bootstrap refuses to paint a
   * projection whose labels are in the wrong language. */
  locale?: string;
}

/** Snapshot the live, verified result DOM exactly as rendered (locale
 * included) under every route identity that resolves to it. */
export function rememberResultFirstPaint(
  keys: (string | null)[],
  result: UiResult,
  details: ResultFirstPaintDetails = {},
) {
  try {
    const wanted = [...new Set(keys.filter((k): k is string => !!k))];
    if (!wanted.length) return;
    const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
      document.querySelector<T>('#results ' + selector);
    const feverNode = $('#result-fever');
    const watchNode = $<HTMLButtonElement>('#watch-replay');
    const previewNode = $<HTMLButtonElement>('#result-preview');
    const projection: ResultProjection = {
      fp: resultFingerprint(result),
      locale: details.locale ?? document.documentElement.lang ?? '',
      title: $('#result-song')?.textContent ?? '',
      metadata: $('#result-metadata')?.textContent ?? '',
      badges: details.badges ?? [],
      badge: $('#result-badge')?.textContent ?? '',
      rank: $('#result-rank')?.textContent ?? '',
      scoreText: result.score.toLocaleString('en-US'),
      scoreCaption: $('.result-score-caption')?.textContent ?? '',
      rateText: result.accuracy.toFixed(2) + '%',
      combo: result.combo,
      breakText: $('#result-break')?.textContent ?? '--',
      statsLabels: [
        ...document.querySelectorAll('#results .result-stats > div > span'),
      ].map((n) => n.textContent ?? ''),
      judgments:
        result.judgments?.length === 12 ? [...result.judgments] : null,
      fever: {
        text: feverNode?.textContent ?? '',
        hidden:
          !feverNode ||
          feverNode.classList.contains('hidden') ||
          (feverNode as HTMLElement).hidden === true,
      },
      note:
        document.querySelector('#results .mobile-playback-note')
          ?.textContent ?? '',
      backLabel: $('#back')?.textContent ?? '',
      retryLabel: $('#retry')?.textContent ?? '',
      retryDisabled: $<HTMLButtonElement>('#retry')?.disabled === true,
      shareLabel: ($('#share-result')?.textContent ?? '').trim(),
      watchReplay: {
        label: watchNode?.textContent ?? '',
        hidden:
          !watchNode ||
          watchNode.classList.contains('hidden') ||
          watchNode.hidden === true,
      },
      preview: {
        label: previewNode?.textContent ?? '',
        hidden:
          !previewNode ||
          previewNode.classList.contains('hidden') ||
          previewNode.hidden === true,
      },
      systemLabel:
        document.querySelector('#results .result-system > span')?.textContent ??
        '',
      art: document.querySelector<HTMLImageElement>('#result-art')?.src ?? '',
      ...(details.expiresAt !== undefined
        ? { expiresAt: details.expiresAt }
        : {}),
    };
    const raw = localStorage.getItem(STORAGE_KEY);
    const store = raw
      ? (JSON.parse(raw) as { v: 2; entries: Record<string, ResultProjection> })
      : { v: 2 as const, entries: {} };
    if (store.v !== 2 || typeof store.entries !== 'object') return;
    for (const key of wanted) {
      delete store.entries[key];
      store.entries[key] = projection;
    }
    store.entries = evictResultDisplayEntries(
      store.entries,
      new Set(wanted),
      STORAGE_BUDGET,
    );
    const json = JSON.stringify(store);
    if (localStorage.getItem(STORAGE_KEY) !== json)
      localStorage.setItem(STORAGE_KEY, json);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* Optional paint cache must never block the verified result. */
  }
}

/** Remove the projection. Returns true when it was painted for one of the
 * given route identities with a matching fingerprint, so the caller can skip
 * the count-up replay: the user has already seen the final values. */
export function finishResultFirstPaint(
  result: UiResult | null,
  keys: (string | null)[] = [resultIdentityKey(location.href)],
): boolean {
  const painted = (
    window as unknown as {
      __resultFirstPaint?: { key: string; fp: string };
    }
  ).__resultFirstPaint;
  const paintedAt = document.getElementById('result-first-paint')?.dataset
    .paintedAt;
  document.getElementById('result-first-paint')?.remove();
  if (typeof window !== 'undefined')
    delete (window as unknown as { __resultFirstPaint?: unknown })
      .__resultFirstPaint;
  const matched =
    !!painted &&
    !!result &&
    keys.some((key) => key !== null && key === painted!.key) &&
    painted!.fp === resultFingerprint(result!);
  // Read-only outcome marker for verification tooling: records whether the
  // verified render consumed a projection, and when that projection painted.
  (window as unknown as { __resultFirstPaintOutcome?: unknown })
    .__resultFirstPaintOutcome = {
    painted: !!painted,
    matched,
    paintedAt: paintedAt ? Number(paintedAt) : null,
  };
  return matched;
}
