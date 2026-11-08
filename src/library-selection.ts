export interface LibrarySelection {
  key: string;
  scroll: number;
  pageScroll: number;
}
const STORE = 'orvio.library-selection.v1';
export function readLibrarySelection(
  storage: Pick<Storage, 'getItem'>,
): LibrarySelection | null {
  try {
    const raw = JSON.parse(storage.getItem(STORE) || 'null');
    return raw &&
      typeof raw.key === 'string' &&
      raw.key.length <= 200 &&
      Number.isFinite(raw.scroll) &&
      raw.scroll >= 0 &&
      Number.isFinite(raw.pageScroll) &&
      raw.pageScroll >= 0
      ? raw
      : null;
  } catch {
    return null;
  }
}
export function writeLibrarySelection(
  storage: Pick<Storage, 'setItem'>,
  state: LibrarySelection,
) {
  try {
    storage.setItem(STORE, JSON.stringify(state));
  } catch {
    /* Selection continuity must not block playing when storage is unavailable. */
  }
}
export function resolveLibrarySelection(
  keys: string[],
  key: string | undefined,
): number {
  return key ? keys.indexOf(key) : -1;
}
