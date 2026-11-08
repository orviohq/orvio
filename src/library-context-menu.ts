export interface LibraryMenuTarget {
  label: string;
  remove: () => void;
}
/** Only asks the existing caller to open its removal confirmation. */
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
  menu.append(button);
  document.body.append(menu);
  let anchor: HTMLElement | undefined, action: (() => void) | undefined;
  let anchoredAt: { top: number; left: number } | undefined;
  function close(focus = false) {
    if (!menu.matches(':popover-open')) return;
    menu.hidePopover();
    if (focus) anchor?.focus();
    action = undefined;
  }
  function show(row: HTMLElement, x: number, y: number) {
    const target = resolve(row);
    if (!target) return false;
    close();
    anchor = row;
    action = target.remove;
    button.textContent = target.label;
    menu.showPopover();
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    menu.style.top =
      Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
    const anchorRect = row.getBoundingClientRect();
    anchoredAt = { top: anchorRect.top, left: anchorRect.left };
    button.focus({ preventScroll: true });
    return true;
  }
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
      button.focus();
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
