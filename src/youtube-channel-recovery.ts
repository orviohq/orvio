import type { CanonicalMetadata } from './canonical-metadata-api';
import type { EarlyYoutubeMetadata } from './early-youtube-metadata';
import { isOpusRecord, type PlayableSourceRecord } from './playable-source';

export interface ChannelMetadataReaders {
  canonical(record: PlayableSourceRecord): Promise<CanonicalMetadata | null>;
  oembed(videoId: string): Promise<EarlyYoutubeMetadata | null>;
}

const channelName = (author: unknown): string | null =>
  typeof author === 'string' && author.trim() ? author : null;

/** Canonical manifest authors are identity-bound and stay authoritative.
 * Opus v2 records and unvalidated legacy records fall back to the oembed
 * author; a failed read is display-only and resolves to null, never a guess. */
export async function resolveYoutubeChannel(
  record: PlayableSourceRecord,
  readers: ChannelMetadataReaders,
): Promise<string | null> {
  if (!isOpusRecord(record)) {
    const canonical = await readers.canonical(record).catch(() => null);
    const author = channelName(canonical?.author);
    if (author) return author;
  }
  const oembed = await readers.oembed(record.videoId).catch(() => null);
  return channelName(oembed?.author);
}
