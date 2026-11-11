import { expect, test } from 'vitest';
import { reconcileImportOrder } from '../src/reconcile-import-order';

// A structural DOM double records every legacy detach; browser animation and
// focus qualification remain a separate real-browser gate.
class Row {
  parentElement: Host | null = null;
  detaches = 0;
  constructor(readonly id: string, readonly pending = false) {}
  classList = { contains: (name: string) => name === 'import-pending' && this.pending };
  contains(node: unknown) { return node === this; }
  get nextElementSibling(): Row | null {
    const host = this.parentElement;
    return host?.children[host.children.indexOf(this) + 1] ?? null;
  }
  remove() {
    if (this.parentElement) {
      const host = this.parentElement;
      host.children.splice(host.children.indexOf(this), 1);
      this.parentElement = null;
      this.detaches++;
      if (host.ownerDocument.activeElement === this) host.ownerDocument.activeElement = null;
    }
  }
}
class Host {
  children: Row[] = [];
  ownerDocument: { activeElement: Row | null } = { activeElement: null };
  moveBefore?: (row: Row, cursor: Row | null) => void;
  constructor(rows: Row[], native = false) {
    this.children = [...rows];
    for (const row of rows) row.parentElement = this;
    if (native) this.moveBefore = (row, cursor) => {
      this.children.splice(this.children.indexOf(row), 1);
      this.place(row, cursor);
    };
  }
  place(row: Row, cursor: Row | null) {
    this.children.splice(cursor ? this.children.indexOf(cursor) : this.children.length, 0, row);
    row.parentElement = this;
  }
  insertBefore(row: Row, cursor: Row | null) { row.remove(); this.place(row, cursor); }
  reconcile(rows: Row[]) {
    reconcileImportOrder(this as unknown as HTMLElement, rows as unknown as HTMLElement[]);
    expect(this.children.map(row => row.id)).toEqual(rows.map(row => row.id));
  }
}

test('legacy actual reorder keeps displaced focused B connected by moving siblings', () => {
  const a = new Row('A', true), b = new Row('B', true), ready = new Row('ready');
  const list = new Host([a, ready, b]);
  list.ownerDocument.activeElement = b;
  list.reconcile([b, a, ready]);
  expect(b.detaches).toBe(0);
  expect(list.ownerDocument.activeElement).toBe(b);
  // Reversing A/B in legacy DOM necessarily moves one: do not claim both.
  expect(a.detaches).toBe(1);
});

test('multiple compatible pending anchors survive ready reorder, insertion and removal', () => {
  const a = new Row('A', true), b = new Row('B', true), c = new Row('C', true);
  const x = new Row('X'), y = new Row('Y'), obsolete = new Row('obsolete'), fresh = new Row('fresh');
  const list = new Host([x, a, obsolete, y, b, c]);
  list.ownerDocument.activeElement = b;
  list.reconcile([a, fresh, b, x, c, y]);
  expect([a.detaches, b.detaches, c.detaches]).toEqual([0, 0, 0]);
  expect(obsolete.parentElement).toBeNull();
  expect(fresh.parentElement).toBe(list);
  expect(list.ownerDocument.activeElement).toBe(b);
  list.reconcile([a, fresh, b, x, c, y]);
  expect([a.detaches, b.detaches, c.detaches]).toEqual([0, 0, 0]);
});

test('native reorder preserves all pending nodes even when their relative order reverses', () => {
  const a = new Row('A', true), b = new Row('B', true), fresh = new Row('fresh');
  const list = new Host([a, b], true);
  list.ownerDocument.activeElement = b;
  list.reconcile([b, fresh, a]);
  expect([a.detaches, b.detaches]).toEqual([0, 0]);
  expect(list.ownerDocument.activeElement).toBe(b);
});

test('legacy single anchor and detached pending insertion preserve actual order', () => {
  const a = new Row('A', true), b = new Row('B', true), x = new Row('X'), y = new Row('Y');
  const list = new Host([x, y, a]);
  list.reconcile([b, a, y, x]);
  expect(a.detaches).toBe(0);
  expect(b.detaches).toBe(0);
});
