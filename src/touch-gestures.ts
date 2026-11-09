/** Safari can still dispatch a double-click default gesture on replaced canvases
 * and dialog top-layer descendants. Cancel only that default, not pinch zoom,
 * scrolling, individual clicks, text selection or editable-field behavior. */
export function installDoubleTapGuard(root: Document = document) {
  const prevent = (event: MouseEvent) => {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      target.closest('input,textarea,[contenteditable=true]')
    )
      return;
    if (navigator.maxTouchPoints > 0 && event.cancelable)
      event.preventDefault();
  };
  root.addEventListener('dblclick', prevent, { passive: false });
  return () => root.removeEventListener('dblclick', prevent);
}
