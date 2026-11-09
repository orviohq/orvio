/** Keep keyboard ownership on the same logical library row across sync renders.
 * Never invent a next-row target or steal focus back from a dialog/control. */
export function captureLibraryRowFocus(host: HTMLElement, enabled: boolean) {
  const active = document.activeElement;
  if (!enabled || !(active instanceof HTMLElement) || !host.contains(active))
    return () => {};
  const row = active.closest<HTMLElement>('[data-library-focus-key]');
  if (!row) return () => {};
  const key = row.dataset.libraryFocusKey;
  const action = active === row ? '' : active.dataset.libraryFocusAction;
  // Unknown children are not a license to focus a different control.
  if (!key || action === undefined) return () => {};
  return (stillEnabled: boolean) => {
    if (
      !stillEnabled ||
      active.isConnected ||
      document.activeElement !== document.body ||
      document.querySelector('dialog[open]')
    )
      return;
    const next = [
      ...host.querySelectorAll<HTMLElement>('[data-library-focus-key]'),
    ].find((e) => e.dataset.libraryFocusKey === key);
    const target =
      action === ''
        ? next
        : [
            ...(next?.querySelectorAll<HTMLElement>(
              '[data-library-focus-action]',
            ) ?? []),
          ].find((e) => e.dataset.libraryFocusAction === action);
    if (
      !target ||
      !target.isConnected ||
      target.hidden ||
      target.closest('[hidden],.hidden,[inert]') ||
      target.matches(':disabled') ||
      !target.getClientRects().length
    )
      return;
    target.focus({ preventScroll: true });
  };
}
