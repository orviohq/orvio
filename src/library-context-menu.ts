import {
  openSourceInNewTab,
  type LibrarySourceAction,
} from './library-source-open';

export interface LibraryMenuTarget {
  label: string;
  remove: () => void;
  share?: { label: string; run: () => void };
  source?: LibrarySourceAction;
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
  const source = document.createElement('button');
  source.type = 'button';
  source.setAttribute('role', 'menuitem');
  source.dataset.action = 'source';
  share.dataset.action = 'share';
  button.dataset.action = 'remove';
  menu.append(source, share, button);
  document.body.append(menu);
  let anchor: HTMLElement | undefined,
    action: (() => void) | undefined,
    shareAction: (() => void) | undefined,
    sourceAction: LibrarySourceAction | undefined;
  let anchoredAt: { top: number; left: number } | undefined;
  function close(focus = false) {
    if (!menu.matches(':popover-open')) return;
    menu.hidePopover();
    if (focus) anchor?.focus();
    action = undefined;
    shareAction = undefined;
    sourceAction = undefined;
  }
  function show(row: HTMLElement, x: number, y: number) {
    const target = resolve(row);
    if (!target) return false;
    close();
    anchor = row;
    action = target.remove;
    shareAction = target.share?.run;
    sourceAction = target.source;
    source.hidden = !target.source;
    source.textContent = target.source?.label ?? '';
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
    (share.hidden ? (source.hidden ? button : source) : share).focus({
      preventScroll: true,
    });
    return true;
  }
  source.onclick = () => {
    const work = sourceAction;
    close();
    if (work) openSourceInNewTab(work.url);
  };
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
      const items = [source, share, button].filter((x) => !x.hidden);
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
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (menu.contains(e.target as Node)) return;
      const bounds = menu.getBoundingClientRect();
      if (
        e.clientX < bounds.left - 4 ||
        e.clientX > bounds.right + 4 ||
        e.clientY < bounds.top - 4 ||
        e.clientY > bounds.bottom + 4
      )
        close();
    },
    true, // Dismiss even when an outside control stops propagation.
  );
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
