const KEY = 'orvio.library-add-order.v1';
const VIDEO = /^[A-Za-z0-9_-]{11}$/;
/** Local explicit-add order, separate from job completion, play and replay times.
 * Legacy rows without an add record keep their prior stable order. */
export class LibraryAddOrder {
  private ids: string[] = [];
  private ranks = new Map<string, number>();
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const raw = JSON.parse(storage.getItem(KEY) ?? '[]');
      if (Array.isArray(raw))
        this.ids = [
          ...new Set(raw.filter((x) => typeof x === 'string' && VIDEO.test(x))),
        ];
      this.index();
    } catch {
      /* Optional ordering must not block the saved library. */
    }
  }
  private index() {
    this.ranks = new Map(this.ids.map((id, index) => [id, index]));
  }
  added(videoId: string) {
    if (!VIDEO.test(videoId) || this.ranks.has(videoId)) return;
    this.ids.unshift(videoId);
    this.index();
    try {
      this.storage.setItem(KEY, JSON.stringify(this.ids));
    } catch {
      /* Keep this visit ordered; never alter audio/history to fix optional storage. */
    }
  }
  rank(videoId?: string) {
    const index = videoId ? (this.ranks.get(videoId) ?? -1) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER - (videoId ? 1 : 0) : index;
  }
}
