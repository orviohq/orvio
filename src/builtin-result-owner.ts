import { readBuiltinSession } from './builtin-replay-library';
import { builtinShareFragment } from './builtin-share-fragment';
import type { SharedResult } from './share';
const KEY = 'orvio.own-result-index.v1';
const digest = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
/** Completion alone writes one direct hash-to-local-archive pointer. No retention cutoff. */
export async function rememberBuiltinResultOwner(
  fragment: string,
  key: string,
) {
  if (!/^builtin:[a-f0-9-]{36}$/.test(key)) return;
  try {
    localStorage.setItem(KEY + ':' + (await digest(fragment)), key);
  } catch {
    /* optional label metadata never affects save/share */
  }
}
/** Old/unindexed entries default to recipient Start, without scanning or creating IDB. */
export async function isArchivedBuiltinResult(fragment: string) {
  try {
    const key = localStorage.getItem(KEY + ':' + (await digest(fragment)));
    if (!key || !/^builtin:[a-f0-9-]{36}$/.test(key)) return false;
    const session = await readBuiltinSession(key);
    return (
      !!session &&
      (await builtinShareFragment(
        session.replay,
        session.result as SharedResult,
        session.chart,
      )) === fragment
    );
  } catch {
    return false;
  }
}
