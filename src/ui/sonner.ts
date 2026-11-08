// Actual Sonner, adapted from shadcn/ui's manual Toaster wrapper for this
// non-React Astro shell. No next-themes provider is needed: Orvio is dark-only.
// https://ui.shadcn.com/docs/components/radix/sonner
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Toaster, toast } from 'sonner';
import './sonner.css';

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let activeDialog: HTMLDialogElement | undefined;
let lastOpenedDialog: HTMLDialogElement | undefined;
let observer: MutationObserver | undefined;
let resize: ResizeObserver | undefined;
let placement = '';

function mount() {
  if (container) return;
  container = document.createElement('div');
  container.id = 'toast-root';
  // A high z-index alone cannot escape modal clipping/top-layer ordering.
  // A manual popover inside the active dialog stays in its accessible subtree.
  container.setAttribute('popover', 'manual');
  document.body.append(container);
  root = createRoot(container);
  observer = new MutationObserver((records) => {
    for (const { target } of records) {
      if (target instanceof HTMLDialogElement && target.open)
        lastOpenedDialog = target;
    }
    // Judgement and song-card animation classes are not placement changes.
    // Do not force geometry reads on every gameplay effect.
    if (
      records.some(
        ({ target }) =>
          target === document.body ||
          target instanceof HTMLDialogElement ||
          (target instanceof HTMLElement && target.id === 'arena'),
      )
    )
      syncHost();
  });
  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'class', 'data-position'],
  });
  resize = new ResizeObserver(reserveModalRail);
  resize.observe(container);
  // Sonner inserts its first toast asynchronously. Observe that insertion,
  // not just the first animation frame, before measuring wrapped text.
  new MutationObserver(() => {
    const notification = container?.querySelector('[data-sonner-toast]');
    if (notification) resize?.observe(notification);
    reserveModalRail();
  }).observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-visible', 'data-removed'],
  });
  window.addEventListener('resize', syncHost);
}

function reserveModalRail() {
  if (!container || !activeDialog) return;
  const notification = container.querySelector<HTMLElement>(
    '[data-sonner-toast][data-visible="true"][data-removed="false"]',
  );
  // Height includes wrapped localized text. Reserve space ABOVE the dialog,
  // rather than covering its title, score, input, or bottom action buttons.
  const height =
    placement === 'top-center'
      ? (notification?.getBoundingClientRect().height ?? 0)
      : 0;
  const top = notification?.parentElement
    ? parseFloat(getComputedStyle(notification.parentElement).top) || 16
    : 16;
  activeDialog.style.setProperty(
    '--toast-rail',
    `${height ? height + top + 16 : 0}px`,
  );
  activeDialog.toggleAttribute('data-toast-rail', height > 0);
}

function syncHost() {
  if (!container || !root) return;
  const dialogs = [
    ...document.querySelectorAll<HTMLDialogElement>('dialog[open]'),
  ];
  const focusedDialog =
    document.activeElement?.closest<HTMLDialogElement>('dialog[open]');
  const dialog =
    focusedDialog ??
    (lastOpenedDialog?.open ? lastOpenedDialog : dialogs.at(-1));
  if (activeDialog !== dialog) {
    activeDialog?.removeAttribute('data-toast-rail');
    activeDialog?.style.removeProperty('--toast-rail');
    activeDialog = dialog;
  }
  const host = dialog ?? document.body;
  if (container.parentElement !== host) host.append(container);
  const highway = document
    .querySelector('#highway-wrap')
    ?.getBoundingClientRect();
  const rightLane =
    document.body.classList.contains('playing') &&
    highway &&
    highway.right > innerWidth - Math.min(380, innerWidth - 24);
  // Desktop selection's Start button sits in the bottom-right corner.
  // Keep that corner clear; its header has an empty top-center notification slot.
  const selection =
    !document.body.classList.contains('playing') && innerWidth >= 700;
  const gutter =
    dialog?.id === 'results' && innerWidth > 900
      ? (innerWidth - dialog.getBoundingClientRect().width) / 2
      : 0;
  const resultGutter = gutter >= 200;
  const position = resultGutter
    ? 'bottom-right'
    : dialog || rightLane || selection
      ? 'top-center'
      : 'bottom-right';
  container.style.setProperty(
    '--orvio-toast-width',
    resultGutter
      ? `${Math.min(356, gutter - 32)}px`
      : rightLane && !dialog
        ? `${Math.min(356, Math.max(160, 2 * (highway!.left - innerWidth / 2 - 16)))}px`
        : '356px',
  );
  if (placement !== position) {
    placement = position;
    flushSync(() =>
      root!.render(
        createElement(Toaster, {
          theme: 'dark',
          position,
          duration: 3000,
          visibleToasts: 1,
          // Do not steal the game's Alt/T or arrow-key input for notifications.
          hotkey: [],
          customAriaLabel: 'orvio',
          offset: {
            top: 'max(16px, env(safe-area-inset-top))',
            right: 'max(16px, env(safe-area-inset-right))',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          },
          mobileOffset: {
            top: 'max(12px, env(safe-area-inset-top))',
            right: 'max(12px, env(safe-area-inset-right))',
            bottom: 'max(12px, env(safe-area-inset-bottom))',
          },
          toastOptions: { className: 'orvio-toast' },
        }),
      ),
    );
  }
  reserveModalRail();
  // Reopen after moving between body and modal.
  if (!container.matches(':popover-open')) container.showPopover?.();
}

export function showToast(message: string) {
  mount();
  syncHost();
  // The legacy component displayed one latest message. Sonner owns the timeout
  // now: an older timeout cannot hide a newer error/success message.
  toast(message, { id: 'orvio-feedback', duration: 3000 });
  requestAnimationFrame(() => {
    const notification = container?.querySelector('[data-sonner-toast]');
    if (notification) resize?.observe(notification);
    reserveModalRail();
  });
}
