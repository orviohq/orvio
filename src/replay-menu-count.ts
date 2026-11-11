export const REPLAY_COUNT_KEY = 'orvio.replay-count.v1';
export function readReplayCount(
  storage: Pick<Storage, 'getItem'> = localStorage,
): number {
  try {
    const value: unknown = JSON.parse(
      storage.getItem(REPLAY_COUNT_KEY) ?? 'null',
    );
    if (typeof value !== 'object' || value === null) return 0;
    const { v, n } = value as { v?: unknown; n?: unknown };
    return v === 1 &&
      typeof n === 'number' &&
      Number.isInteger(n) &&
      n >= 0 &&
      n <= 100000
      ? n
      : 0;
  } catch {
    return 0;
  }
}
export function writeReplayCount(
  n: number,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage,
): void {
  try {
    if (!Number.isInteger(n) || n <= 0) {
      storage.removeItem(REPLAY_COUNT_KEY);
      return;
    }
    storage.setItem(REPLAY_COUNT_KEY, JSON.stringify({ v: 1, n }));
  } catch {}
}
export function replayMenuVisible(n: number): boolean {
  return n > 0;
}
