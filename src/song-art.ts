import { externalSource } from "./external-catalog";
import { localAllKeysVideoId } from "./local-allkeys-catalog";
import { youtubeArtwork } from "./youtube-artwork";
import { createVerifiedOpusPresentationRegistry } from "./opus/opus468-presentation-registry";
import type { OpusRecord } from "./opus/opus-record";
export { ART_FALLBACK, thumbnailCandidates } from "./youtube-artwork";
const extensionPresentation = createVerifiedOpusPresentationRegistry();
export const attachOpus468Artwork = (
  song: string,
  record: OpusRecord,
  options?: { signal?: AbortSignal },
) => extensionPresentation.attach(song, record, options);
export function songVideoId(id: string) {
  return (
    localAllKeysVideoId(id) ??
    externalSource(id)?.record.videoId ??
    extensionPresentation.videoId(id)
  );
}
const songs = new Map<string, string>();
if (typeof document !== "undefined")
  document.addEventListener("orvio:youtube-art-ready", (event) => {
    for (const [id, videoId] of songs)
      if (videoId === (event as CustomEvent<string>).detail)
        document.dispatchEvent(
          new CustomEvent("orvio:art-ready", { detail: id }),
        );
  });
/** Only a validated video id reaches the public thumbnail host. */
export function songArt(id: string): string {
  const videoId = songVideoId(id);
  if (!videoId) return `/wallpapers/${id}.png`;
  songs.set(id, videoId);
  return youtubeArtwork(videoId);
}
