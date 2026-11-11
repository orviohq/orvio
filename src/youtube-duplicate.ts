/** Only an installed, preferred source is an added song. A matching ID string
 * alone (including a built-in ID) is not evidence of YouTube ownership. */
export function youtubeDuplicateState(
  videoId: string,
  preferredId: string | undefined,
  songs: readonly { id: string }[],
  videoIdForSong: (id: string) => string | undefined,
  loading: boolean,
): 'added' | 'adding' | undefined {
  if (
    preferredId &&
    songs.some(
      (song) => song.id === preferredId && videoIdForSong(song.id) === videoId,
    )
  )
    return 'added';
  return loading ? 'adding' : undefined;
}
