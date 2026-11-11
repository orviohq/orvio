/** A pending import is only a placeholder for a video that has no completed
 * card on screen yet. Hidden videos and already-rendered videos keep their
 * existing card, never a second loading card. */
export function pendingImportRowVisible(
  videoId: string,
  hiddenSongs: ReadonlySet<string>,
  renderedVideoIds: ReadonlySet<string>,
) {
  return !hiddenSongs.has('yt:' + videoId) && !renderedVideoIds.has(videoId);
}
