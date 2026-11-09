import type { Song, Note, Difficulty, Lanes } from './chart';
import {
  isOpusRecord,
  type PlayableSourceRecord as SourceRecord,
} from './playable-source';
import { opus35SourceId, opus35AudioId } from './opus/opus35-identity';
import { opusPcmToAudioBuffer } from './opus/opus-chart-worker-client.mjs';
import { inspectWav } from './canonical-pcm.mjs';
export interface ExternalSong<
  R extends SourceRecord = import('./external-source').SourceRecord,
> {
  song: Song;
  record: R;
  jobId?: string;
  bytes?: ArrayBuffer;
}
const sources = new Map<string, ExternalSong<SourceRecord>>();
export function sourceId(r: SourceRecord) {
  if (isOpusRecord(r)) return opus35SourceId(r);
  return `${sourceAudioId(r)}${r.chartSetSha256 ? `-c${r.chartSetSha256.slice(0, 16)}` : ''}`;
}
export function sourceAudioId(r: SourceRecord) {
  if (isOpusRecord(r)) return opus35AudioId(r);
  return `yt-${r.videoId}-${r.audioSha256.slice(0, 16)}`;
}
export function installExternalSource<R extends SourceRecord>(
  record: R,
  title: string,
  bytes?: ArrayBuffer,
  jobId?: string,
  author?: string,
): ExternalSong<R> {
  const existing = sources.get(sourceId(record));
  if (
    existing &&
    existing.record.audioSha256 === record.audioSha256 &&
    existing.record.chartSetSha256 === record.chartSetSha256 &&
    existing.record.frames === record.frames &&
    existing.record.sampleRate === record.sampleRate
  ) {
    // Every view of this source keeps one song object. A pinned ID-only load
    // must not replace the useful title carried by a verified share.
    const fallback = (value: string) =>
      value === record.videoId || value === sourceId(record);
    if (!fallback(title) || fallback(existing.song.title))
      existing.song.title = title;
    if (author) existing.song.subtitle = author;
    if (bytes !== undefined) existing.bytes = bytes;
    if (jobId !== undefined) existing.jobId = jobId;
    return existing as ExternalSong<R>;
  }
  const song: Song = {
    id: sourceId(record),
    title,
    subtitle: author || 'YouTube',
    bpm: record.estimatedBpm,
    root: 57,
    scale: [0, 2, 4, 7, 9],
    color: '#29d8ff',
    genre: 'YOUTUBE',
    bars: 0,
  };
  const item = { song, record, bytes, jobId };
  sources.set(song.id, item);
  return item;
}
export function externalSource(id: string) {
  return sources.get(id);
}
export function externalNotes(
  id: string,
  difficulty: Difficulty,
  lanes: Lanes,
): Note[] | undefined {
  const source = sources.get(id);
  return source
    ? structuredClone(
        (lanes === 5 || lanes === 7
          ? source.record.charts[`${lanes}:${difficulty}`]?.notes
          : undefined) ?? [],
      )
    : undefined;
}
export function externalDuration(id: string) {
  const r = sources.get(id)?.record;
  return r ? r.frames / r.sampleRate : undefined;
}
export function externalAudio(
  id: string,
  context: BaseAudioContext,
): AudioBuffer {
  const item = sources.get(id);
  if (!item?.bytes) throw Error('Matching source audio unavailable');
  if (isOpusRecord(item.record))
    return opusPcmToAudioBuffer(context, item.bytes, item.record.frames);
  const p = inspectWav(item.bytes),
    buffer = context.createBuffer(p.channels, p.frames, p.sampleRate);
  for (let ch = 0; ch < p.channels; ch++) {
    const out = buffer.getChannelData(ch);
    for (let i = 0; i < p.frames; i++)
      out[i] =
        p.view.getInt16(p.dataOffset + (i * p.channels + ch) * 2, true) / 32768;
  }
  return buffer;
}

export function updateExternalDisplayMetadata(
  record: SourceRecord,
  title: string,
  author: string | null,
) {
  const item = sources.get(sourceId(record));
  if (
    !item ||
    item.record.audioSha256 !== record.audioSha256 ||
    item.record.chartSetSha256 !== record.chartSetSha256
  )
    return false;
  item.song.title = title;
  if (author !== null) item.song.subtitle = author || item.song.subtitle;
  return true;
}
