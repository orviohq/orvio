import { externalSource } from './external-catalog';
/** Only a validated video id goes to the public thumbnail host. No API or job URL. */
export function songArt(id: string): string {
  const source = externalSource(id);
  return source
    ? `https://i.ytimg.com/vi/${source.record.videoId}/hqdefault.jpg`
    : `/wallpapers/${id}.png`;
}
export const ART_FALLBACK = '/wallpapers/first-light.png';
