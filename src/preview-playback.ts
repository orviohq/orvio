export type PreviewKind = 'builtin' | 'external' | 'native468';

export interface PreviewSourceLike {
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  start(when?: number, offset?: number): void;
}

export type PreviewEndSource = Pick<AudioBufferSourceNode, 'onended'>;

export const PREVIEW_START = 8;
export const PREVIEW_LOOP_END = 24;

/** Only built-ins keep the short looping clip. External YouTube previews
 * start at the same offset but continue through the natural buffer end. */
export function startPreview(
  source: PreviewSourceLike,
  kind: PreviewKind,
  duration = 0,
) {
  if (kind === 'native468') {
    source.loop = false;
    source.start(0, 0);
    return;
  }
  if (kind === 'external') {
    source.loop = false;
    source.start(0, PREVIEW_START);
    return;
  }
  source.loop = true;
  source.loopStart = PREVIEW_START;
  source.loopEnd = Math.min(PREVIEW_LOOP_END, duration);
  source.start(0, PREVIEW_START);
}

/** An ended event may arrive after a newer preview (or a game) has taken
 * over. Only the exact current source is allowed to clear preview state. */
export function guardPreviewEnd<T extends PreviewEndSource>(
  source: T,
  current: () => T | undefined,
  onEnd: () => void,
) {
  source.onended = () => {
    if (current() !== source) return;
    onEnd();
  };
}
