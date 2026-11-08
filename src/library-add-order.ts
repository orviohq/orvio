const KEY = 'orvio.library-add-order.v1';
const VIDEO = /^[A-Za-z0-9_-]{11}$/;
/** Local explicit-add order, separate from job completion, play and replay times.
 * Legacy rows without an add record keep their prior stable order. */
export class LibraryAddOrder {
  private ids: string[] = [];
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const raw = JSON.parse(storage.getItem(KEY) ?? '[]');
      if (Array.isArray(raw))
        this.ids = [
          ...new Set(raw.filter((x) => typeof x === 'string' && VIDEO.test(x))),
        ];
    } catch {
      /* Optional ordering must not block the saved library. */
    }
  }
  added(videoId: string) {
    if (!VIDEO.test(videoId) || this.ids.includes(videoId)) return;
    this.ids.unshift(videoId);
    try {
      this.storage.setItem(KEY, JSON.stringify(this.ids));
    } catch {
      /* Keep this visit ordered; never alter audio/history to fix optional storage. */
    }
  }
  rank(videoId?: string) {
    const index = videoId ? this.ids.indexOf(videoId) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER - (videoId ? 1 : 0) : index;
  }
}
