import { readCanonicalSource } from './canonical-source-api';
import { readCanonicalMetadata } from './canonical-metadata-api';
import { rememberCanonical } from './canonical-library';
import { saveSongMetadata, localAudio, saveLocalAudio } from './external-local';
import { loadCanonicalAudio } from './canonical-audio-api';
import { hiddenLibraryIds, saveHiddenLibraryIds } from './library-removal';
import { sourceId } from './external-catalog';
import { LibraryAddOrder } from './library-add-order';
import type { SourceRecord } from './external-source';

export interface SongIdentity {
  videoId: string;
  audioSha256: string;
  chartSetSha256: string;
  recordSha256: string;
}
const VIDEO = /^[A-Za-z0-9_-]{11}$/;
const SHA = /^[a-f0-9]{64}$/;
/** Identity only: never a replay, local title, job ID, score or person identifier. */
export function songShareFragment(identity: SongIdentity) {
  if (
    !VIDEO.test(identity.videoId) ||
    ![
      identity.audioSha256,
      identity.chartSetSha256,
      identity.recordSha256,
    ].every((s) => SHA.test(s))
  )
    throw Error('Invalid song identity');
  return new URLSearchParams({
    v: '1',
    video: identity.videoId,
    audio: identity.audioSha256,
    chart: identity.chartSetSha256,
    record: identity.recordSha256,
  }).toString();
}
export function parseSongShare(fragment: string): SongIdentity {
  if (fragment.length > 300) throw Error('Invalid song link');
  const p = new URLSearchParams(fragment.replace(/^#/, ''));
  const keys = ['v', 'video', 'audio', 'chart', 'record'];
  if (
    [...p.keys()].length !== keys.length ||
    keys.some((k) => p.getAll(k).length !== 1) ||
    p.get('v') !== '1'
  )
    throw Error('Invalid song link');
  const identity = {
    videoId: p.get('video')!,
    audioSha256: p.get('audio')!,
    chartSetSha256: p.get('chart')!,
    recordSha256: p.get('record')!,
  };
  songShareFragment(identity);
  return identity;
}
export function sameSong(
  identity: SongIdentity,
  record: SourceRecord,
  recordSha256: string,
) {
  return (
    record.videoId === identity.videoId &&
    record.audioSha256 === identity.audioSha256 &&
    record.chartSetSha256 === identity.chartSetSha256 &&
    recordSha256 === identity.recordSha256
  );
}
/** Sender reads only. Archived or changed canonical identities cannot silently share a new chart. */
export async function createSongLink(record: SourceRecord, origin: string) {
  const result = await readCanonicalSource(
    record.videoId,
    AbortSignal.timeout(15000),
  );
  if (
    result.state !== 'ready' ||
    result.record.audioSha256 !== record.audioSha256 ||
    result.record.chartSetSha256 !== record.chartSetSha256
  )
    throw Error('Song unavailable');
  const url = new URL('/song/', origin);
  url.hash = songShareFragment({
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    chartSetSha256: record.chartSetSha256!,
    recordSha256: result.recordSha256,
  });
  return url.href;
}
/** Receiver reads only until explicit Add. No extraction, POST or result-share decoding. */
export async function inspectSongLink(
  identity: SongIdentity,
  signal: AbortSignal,
) {
  const result = await readCanonicalSource(identity.videoId, signal);
  if (result.state !== 'ready')
    throw Error(result.state === 'missing' ? 'missing' : 'pending');
  if (!sameSong(identity, result.record, result.recordSha256))
    throw Error('changed');
  const metadata = await readCanonicalMetadata(result.record, signal);
  if (!metadata) throw Error('metadata');
  return { ...result, metadata };
}
export type InspectedSong = Awaited<ReturnType<typeof inspectSongLink>>;
/** Called only from the recipient's Add gesture. Immutable pins are add-only. */
export async function addSharedSong(song: InspectedSong) {
  // Add is the explicit consent boundary for retained audio GET and local saving.
  // Saving ready audio lets the library open the exact song without a new extraction.
  if (!(await localAudio(song.record))) {
    const bytes = await loadCanonicalAudio(
      song.record,
      AbortSignal.timeout(60000),
    );
    await saveLocalAudio(
      song.record,
      song.metadata.title,
      undefined,
      bytes,
      song.metadata.author ?? undefined,
    );
  }
  await saveSongMetadata(
    song.record,
    song.metadata.title,
    song.metadata.author,
  );
  await rememberCanonical(song.record, song.recordSha256);
  const hidden = hiddenLibraryIds();
  hidden.delete('yt:' + song.record.videoId);
  hidden.delete(sourceId(song.record));
  saveHiddenLibraryIds(hidden);
  new LibraryAddOrder(localStorage).added(song.record.videoId);
  return sourceId(song.record);
}
