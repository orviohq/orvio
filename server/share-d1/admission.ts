import {
  decodeLocalAllKeysShare,
  encodeLocalAllKeysShare,
  LOCAL_ALLKEYS_SHARE_PREFIX,
  LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS,
} from '../../src/local-allkeys-share';
import {
  decodeProgressiveShare,
  PROGRESSIVE_SHARE_PREFIX,
  PROGRESSIVE_MAX_FRAGMENT_CHARS,
} from '../../src/progressive/share-proof';

export const SHARE_MAX_FRAGMENT_CHARS = Math.max(
  LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS,
  PROGRESSIVE_MAX_FRAGMENT_CHARS,
);

/** ASCII codec fragments plus up to 64 bytes of JSON object overhead. */
export const SHARE_BODY_MAX_BYTES = SHARE_MAX_FRAGMENT_CHARS + 64;

/**
 * Fully validates admission; prefix matching only selects the decoder.
 * Heavy 20-chart/replay verification remains; FreeCPU is unproven.
 */
export async function admitShareFragment(
  fragment: string,
  signal: AbortSignal,
): Promise<string> {
  signal.throwIfAborted();
  try {
    if (typeof fragment !== 'string' || fragment.length === 0) {
      throw new Error('Share fragment must be a nonempty string');
    }
    if (fragment.length > SHARE_MAX_FRAGMENT_CHARS) {
      throw new Error('Share fragment exceeds the maximum length');
    }

    if (fragment.startsWith(PROGRESSIVE_SHARE_PREFIX)) {
      if (fragment.length > PROGRESSIVE_MAX_FRAGMENT_CHARS) {
        throw new Error('Progressive share fragment exceeds the maximum length');
      }
      await decodeProgressiveShare(fragment, signal);
      signal.throwIfAborted();
      // Preserve the entire original d/pm/mh commitment after full validation.
      return fragment;
    }

    if (fragment.startsWith(LOCAL_ALLKEYS_SHARE_PREFIX)) {
      if (fragment.length > LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS) {
        throw new Error('Legacy share fragment exceeds the maximum length');
      }
      const { record, replay } = await decodeLocalAllKeysShare(fragment, { signal });
      signal.throwIfAborted();
      const encoded = await encodeLocalAllKeysShare({record,replay}, { signal });
      signal.throwIfAborted();
      return encoded;
    }

    throw new Error('Unknown share fragment version');
  } finally {
    signal.throwIfAborted();
  }
}
