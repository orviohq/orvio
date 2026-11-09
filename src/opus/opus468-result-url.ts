// A private extension result only has a reload route after durable session save.
// A song ID is never a session key. Failed saves keep their result in memory.
export function privateOpus468ResultUrl(
  song: string,
  session: string | undefined,
  origin: string,
  selection: string,
) {
  const stored = !!session && session.startsWith(song + ':');
  return new URL(
    stored ? '/result/?local=' + encodeURIComponent(session!) : selection,
    origin,
  ).href;
}
