import { externalSource } from './external-catalog';
export const ART_FALLBACK = '/wallpapers/first-light.png';
const resolved = new Map<string, string>();
const pending = new Set<string>();
/** YouTube's 4:3 hqdefault wrapper can add black bands around a 16:9 image. */
export function thumbnailCandidates(videoId: string) {
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];
}
function chooseThumbnail(id: string, videoId: string) {
  if (pending.has(id) || typeof Image === 'undefined') return;
  pending.add(id);
  const candidates = thumbnailCandidates(videoId);
  const attempt = (index: number) => {
    if (index >= candidates.length) {
      resolved.set(id, ART_FALLBACK);
      document.dispatchEvent(
        new CustomEvent('orvio:art-ready', { detail: id }),
      );
      return;
    }
    const image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      if (
        image.naturalWidth < 240 ||
        image.naturalHeight < 135 ||
        Math.abs(image.naturalWidth / image.naturalHeight - 16 / 9) > 0.06
      ) {
        attempt(index + 1);
        return;
      }
      resolved.set(id, candidates[index]);
      document.dispatchEvent(
        new CustomEvent('orvio:art-ready', { detail: id }),
      );
    };
    image.onerror = () => attempt(index + 1);
    image.src = candidates[index];
  };
  attempt(0);
}
/** Only a validated video id reaches the public thumbnail host; never an API/job URL. */
export function songArt(id: string): string {
  const source = externalSource(id);
  if (!source) return `/wallpapers/${id}.png`;
  chooseThumbnail(id, source.record.videoId);
  return resolved.get(id) ?? thumbnailCandidates(source.record.videoId)[1];
}
