import { parseOpus35Canonical } from './opus35-canonical.mjs';
import { strictOpus35Record } from './opus35-schema';
import { shareB64, shareUnb64, shareTransform } from '../external-share';
import { readVerifiedOpusByRoots } from './opus-cache.mjs';
import { parseVerifiedDescriptor, sha256 } from './opus-descriptor.mjs';
import { verifyOpusRecord, type OpusRecord } from './opus-record';
const RAW_MAX = 4194304,
  PACK_MAX = 524288,
  TEXT_MAX = 699058;
export interface Opus35SongIdentity {
  kind: 'opus35-song';
  videoId: string;
  record: OpusRecord;
  descriptorBytes: Uint8Array;
  title: string;
  author: string | null;
}
function text(s: unknown, n: number) {
  return (
    typeof s === 'string' &&
    s.length > 0 &&
    s.length <= n &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(s)
  );
}
async function verify(
  record: OpusRecord,
  bytes: Uint8Array,
  title: string,
  author: string | null,
): Promise<Opus35SongIdentity> {
  const d = await parseVerifiedDescriptor(bytes, record.audioDescriptorSha256);
  if (
    !strictOpus35Record(record) ||
    !(await verifyOpusRecord(record, d, record.audioDescriptorSha256)) ||
    !text(title, 300) ||
    (author !== null && !text(author, 100))
  )
    throw Error('opus35_song');
  return {
    kind: 'opus35-song',
    videoId: record.videoId,
    record,
    descriptorBytes: bytes,
    title,
    author,
  };
}
export async function encodeOpus35Song(
  record: OpusRecord,
  title: string,
  author: string | null,
) {
  const cached = await readVerifiedOpusByRoots(record);
  if (!cached) throw Error('opus35_song_descriptor');
  await verify(record, cached.descriptorBytes, title, author);
  const sourceRecord = JSON.stringify(record),
    body = {
      kind: 'opus35-song',
      sourceRecord,
      sourceRecordSha256: await sha256(new TextEncoder().encode(sourceRecord)),
      descriptor: shareB64(cached.descriptorBytes),
      title,
      author,
    };
  const raw = new TextEncoder().encode(JSON.stringify(body));
  if (raw.length > RAW_MAX) throw Error('opus35_song_size');
  const packed = await shareTransform(raw, true);
  if (packed.length > PACK_MAX) throw Error('opus35_song_size');
  const result = 'v=2&d=' + shareB64(packed);
  if (result.length > TEXT_MAX) throw Error('opus35_song_size');
  return result;
}
/** No fetch/storage/side effects: a recipient sees only sender-approved song data. */
export async function decodeOpus35Song(
  fragment: string,
): Promise<Opus35SongIdentity> {
  const f = fragment.replace(/^#/, '');
  if (f.length > TEXT_MAX || !/^v=2&d=[A-Za-z0-9_-]+$/.test(f))
    throw Error('opus35_song_syntax');
  const packed = shareUnb64(f.slice(6));
  if (packed.length > PACK_MAX) throw Error('opus35_song_size');
  const raw = await shareTransform(packed, false);
  if (raw.length > RAW_MAX) throw Error('opus35_song_size');
  const o = parseOpus35Canonical(
    new TextDecoder('utf-8', { fatal: true }).decode(raw),
  );
  if (
    !o ||
    o.kind !== 'opus35-song' ||
    Object.keys(o).length !== 6 ||
    ![
      'kind',
      'sourceRecord',
      'sourceRecordSha256',
      'descriptor',
      'title',
      'author',
    ].every((k) => Object.hasOwn(o, k)) ||
    typeof o.sourceRecord !== 'string' ||
    (await sha256(new TextEncoder().encode(o.sourceRecord))) !==
      o.sourceRecordSha256
  )
    throw Error('opus35_song_envelope');
  return verify(
    parseOpus35Canonical(o.sourceRecord),
    shareUnb64(o.descriptor),
    o.title,
    o.author,
  );
}
