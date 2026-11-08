import type { Song, Note, Difficulty, Lanes } from './chart';
import type { SourceRecord } from './external-source';
import { inspectWav } from './canonical-pcm.mjs';
export interface ExternalSong {
  song: Song;
  record: SourceRecord;
  jobId?: string;
  bytes?: ArrayBuffer;
}
const sources = new Map<string, ExternalSong>();
export function sourceId(r: SourceRecord) {
  return `${sourceAudioId(r)}${r.chartSetSha256 ? `-c${r.chartSetSha256.slice(0, 16)}` : ''}`;
}
export function sourceAudioId(r: SourceRecord) {
  return `yt-${r.videoId}-${r.audioSha256.slice(0, 16)}`;
}
export function installExternalSource(
  record: SourceRecord,
  title: string,
  bytes?: ArrayBuffer,
  jobId?: string,
  author?: string,
): ExternalSong {
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
        source.record.charts[`${lanes}:${difficulty}`]?.notes ?? [],
      )
    : undefined;
}
export function externalDuration(id: string) {
  const r = sources.get(id)?.record;
  return r ? r.frames / r.sampleRate : undefined;
}
export function externalAudio(id: string, context: AudioContext): AudioBuffer {
  const item = sources.get(id);
  if (!item?.bytes) throw Error('Matching source audio unavailable');
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
