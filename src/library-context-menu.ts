export interface LibraryMenuTarget {
  label: string;
  remove: () => void;
  share?: { label: string; run: () => void };
}
/** Actions bind to the context row, independently of the selected preview. */
export function libraryContextMenu(
  host: HTMLElement,
  resolve: (row: HTMLElement) => LibraryMenuTarget | null,
) {
  const menu = document.createElement('div');
  menu.className = 'library-context-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('popover', 'manual');
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'menuitem');
  const share = document.createElement('button');
  share.type = 'button';
  share.setAttribute('role', 'menuitem');
  share.dataset.action = 'share';
  button.dataset.action = 'remove';
  menu.append(share, button);
  document.body.append(menu);
  let anchor: HTMLElement | undefined,
    action: (() => void) | undefined,
    shareAction: (() => void) | undefined;
  let anchoredAt: { top: number; left: number } | undefined;
  function close(focus = false) {
    if (!menu.matches(':popover-open')) return;
    menu.hidePopover();
    if (focus) anchor?.focus();
    action = undefined;
    shareAction = undefined;
  }
  function show(row: HTMLElement, x: number, y: number) {
    const target = resolve(row);
    if (!target) return false;
    close();
    anchor = row;
    action = target.remove;
    shareAction = target.share?.run;
    share.hidden = !target.share;
    share.textContent = target.share?.label ?? '';
    button.textContent = target.label;
    menu.showPopover();
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    menu.style.top =
      Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
    const anchorRect = row.getBoundingClientRect();
    anchoredAt = { top: anchorRect.top, left: anchorRect.left };
    (share.hidden ? button : share).focus({ preventScroll: true });
    return true;
  }
  share.onclick = () => {
    const work = shareAction;
    close();
    work?.();
  };
  button.onclick = () => {
    const work = action;
    close();
    work?.();
  };
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const items = [share, button].filter((x) => !x.hidden);
      const current = items.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const i =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? items.length - 1
            : (current + (e.key === 'ArrowUp' ? -1 : 1) + items.length) %
              items.length;
      items[i].focus();
    }
  });
  host.addEventListener('contextmenu', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('.song-card');
    if (row && show(row, e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  host.addEventListener('keydown', (e) => {
    if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
    const row = (e.target as Element).closest<HTMLElement>('.song-card');
    if (!row) return;
    const r = row.getBoundingClientRect();
    if (show(row, r.left + 20, r.top + 20)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target as Node)) close();
  });
  window.addEventListener('resize', () => close());
  window.addEventListener(
    'scroll',
    () => {
      if (!anchor || !anchoredAt) return;
      const rect = anchor.getBoundingClientRect();
      if (rect.top !== anchoredAt.top || rect.left !== anchoredAt.left) close();
    },
    true,
  );
  return { close };
}
