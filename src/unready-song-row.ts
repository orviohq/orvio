/** An unready row is information, not a selectable song. Recovery buttons stay usable. */
export function disableUnreadySongRow(row: HTMLElement) {
  row.tabIndex = -1;
  row.setAttribute('aria-disabled', 'true');
  row.classList.add('song-unready');
  for (const button of row.querySelectorAll('button'))
    button.setAttribute('aria-disabled', 'false');
  const recovery = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('button');
  row.addEventListener('click', (event) => {
    if (!recovery(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  row.addEventListener('keydown', (event) => {
    if (
      !recovery(event.target) &&
      ['Enter', 'Space', ' '].includes(event.code || event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}
