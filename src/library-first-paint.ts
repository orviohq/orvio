/** A small, display-only projection of the verified library. Never contains
 * records, audio, replay state, credentials, or playback authority. */
function textTree(node: Node | null): unknown {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement)) return null;
  return {
    tag: node.tagName.toLowerCase(),
    className: node.className,
    id: node.id,
    actionLabel: node.hasAttribute('data-i18n'),
    children: [...node.childNodes].map(textTree),
  };
}
export function rememberLibraryFirstPaint(ids: string[], selected: string) {
  try {
    const songs = [
      ...document.querySelectorAll<HTMLElement>('#songs [data-song]'),
    ].map((element, index) => ({
      id: ids[index],
      title: element.querySelector('strong')?.textContent ?? '',
      subtitle:
        element.querySelector('.song-copy > span:not(.song-note-count)')
          ?.textContent ?? '',
      meta: element.querySelector('small')?.textContent ?? '',
      notes: element.querySelector('.song-note-count')?.textContent ?? '',
      level: element.querySelector('.song-level')?.textContent ?? '',
      time: [...(element.querySelector('.song-time')?.childNodes ?? [])]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join('')
        .trim(),
      coverClass: element.querySelector('.cover')?.className ?? 'cover',
      external: !!element.querySelector('.youtube-cover'),
      color: element.style.getPropertyValue('--accent'),
      art:
        element.querySelector<HTMLImageElement>('img')?.src ??
        `/wallpapers/${ids[index]}.png`,
    }));
    const projection = {
      v: 1,
      addLabel:
        document.querySelector('#add-youtube')?.getAttribute('aria-label') ??
        'Add YouTube',
      songs,
      selected,
      label:
        document.querySelector('.library .section-title strong')?.textContent ??
        'TRACK SELECT',
      genre: document.querySelector('#selected-genre')?.textContent ?? '',
      bpm: document.querySelector('#selected-bpm')?.textContent ?? '',
      fragments: Object.fromEntries(
        [
          'header nav',
          '.preview-status',
          '.mobile-note',
          '.library .mobile-playback-note',
          '.selection',
          '.start-row',
          '.footer-strip',
        ].map((selector) => [
          selector,
          textTree(document.querySelector('#app ' + selector)!),
        ]),
      ),
    };
    const json = JSON.stringify(projection);
    if (
      json.length < 150000 &&
      localStorage.getItem('orvio.library-display.v1') !== json
    )
      localStorage.setItem('orvio.library-display.v1', json);
  } catch {
    /* Optional paint cache must never block the live library. */
  }
}
export function finishLibraryFirstPaint() {
  document.getElementById('library-first-paint')?.remove();
}
