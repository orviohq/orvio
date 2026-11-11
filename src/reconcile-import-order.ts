/** Reorder actual DOM children, retaining live pending anchors in legacy DOM. */
export function reconcileImportOrder(list: HTMLElement, rows: HTMLElement[]) {
  const kept = new Set(rows);
  for (const child of [...list.children])
    if (!kept.has(child as HTMLElement)) child.remove();
  const movable = list as HTMLElement & {
    moveBefore?: (node: Node, child: Node | null) => void;
  };
  const anchors = new Set<HTMLElement>();
  if (!movable.moveBefore) {
    const rank = new Map(rows.map((row, index) => [row, index]));
    const pending = [...list.children].filter((row) =>
      row.classList.contains('import-pending'),
    ) as HTMLElement[];
    const focused = pending.findIndex((row) =>
      row.contains(list.ownerDocument.activeElement),
    );
    const pivot = focused >= 0 ? focused : 0;
    if (pending.length) {
      anchors.add(pending[pivot]);
      let bound = rank.get(pending[pivot])!;
      for (let i = pivot - 1; i >= 0; i--)
        if (rank.get(pending[i])! < bound) {
          anchors.add(pending[i]);
          bound = rank.get(pending[i])!;
        }
      bound = rank.get(pending[pivot])!;
      for (let i = pivot + 1; i < pending.length; i++)
        if (rank.get(pending[i])! > bound) {
          anchors.add(pending[i]);
          bound = rank.get(pending[i])!;
        }
    }
    // Legacy DOM cannot reverse two connected anchors without detaching one.
    // Keep compatible pending rows (prioritizing focus); move conflicting
    // siblings to preserve the requested DOM/accessibility order honestly.
  }
  let cursor: Element | null = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (
      !anchors.has(row) &&
      (row.parentElement !== list || row.nextElementSibling !== cursor)
    ) {
      if (row.parentElement === list && movable.moveBefore)
        movable.moveBefore(row, cursor);
      else list.insertBefore(row, cursor);
    }
    cursor = row;
  }
}
