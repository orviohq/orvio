import { inspectOpus35RawR2 } from './opus35-r2';
import { parseOpus35Canonical } from './opus35-canonical.mjs';
import {
  strictOpus35Record,
  strictOpus35Result,
  strictOpus35Replay,
} from './opus35-schema';
// New codec envelope only. Never accepted as a legacy v5 source projection.
import { packReplay, unpackReplay } from '../replay-binary';
import { validateRuntimeReplay, type ReplayData } from '../replay';
import {
  matchesExternalReplay,
  checkedResult,
  shareB64,
  shareUnb64,
  shareTransform,
  type ExternalSharedReplay,
} from '../external-share';
import { verifyOpusRecord, type OpusRecord } from './opus-record';
import { parseVerifiedDescriptor, sha256 } from './opus-descriptor.mjs';
import { sourceId } from '../external-catalog';
const MAX_TEXT = 699058,
  MAX_PACKED = 524288,
  MAX_RAW = 4194304;

export interface Opus35SharedReplay extends ExternalSharedReplay<OpusRecord> {
  record: OpusRecord;
  descriptorBytes: Uint8Array;
}
function exact(o: any, keys: string[]) {
  return (
    o &&
    typeof o === 'object' &&
    !Array.isArray(o) &&
    Object.keys(o).length === keys.length &&
    keys.every((k) => Object.hasOwn(o, k))
  );
}
export async function verifyOpus35Share(input: Opus35SharedReplay) {
  const record = structuredClone(input.record);
  if (!strictOpus35Record(record) || !(await verifyOpusRecord(record)))
    throw Error('opus35_share_record');
  const d = await parseVerifiedDescriptor(
    input.descriptorBytes,
    record.audioDescriptorSha256,
  );
  if (
    !(await verifyOpusRecord(record, d, record.audioDescriptorSha256)) ||
    record.sampleRate !== d.sampleRate
  )
    throw Error('opus35_share_descriptor');
  if (
    typeof input.title !== 'string' ||
    !/^[^\u0000-\u001F\u007F-\u009F]{1,300}$/u.test(input.title)
  )
    throw Error('opus35_share_title');
  if (!strictOpus35Replay(input.replay) || !strictOpus35Result(input.result))
    throw Error('opus35_share_nested_schema');
  const replay = validateRuntimeReplay(
      input.replay,
      (id) => id === sourceId(record),
    ),
    result = checkedResult(input.result);
  if (!replay || !matchesExternalReplay(replay, result, record))
    throw Error('opus35_share_replay');
  return {
    record,
    descriptorBytes: input.descriptorBytes.slice(),
    replay,
    result,
    title: input.title,
  };
}
export async function encodeOpus35Share(input: Opus35SharedReplay) {
  const safe = await verifyOpus35Share(input),
    sourceRecord = JSON.stringify(safe.record);
  const envelope = {
    kind: 'opus35-replay',
    sourceRecord,
    sourceRecordSha256: await sha256(new TextEncoder().encode(sourceRecord)),
    descriptor: shareB64(safe.descriptorBytes),
    replayR2: shareB64(packReplay(safe.replay as ReplayData)),
    title: safe.title,
    result: safe.result,
  };
  const raw = new TextEncoder().encode(JSON.stringify(envelope));
  if (raw.length > MAX_RAW) throw Error('opus35_share_size');
  const packed = await shareTransform(raw, true);
  if (packed.length > MAX_PACKED) throw Error('opus35_share_size');
  const fragment = 'v=6&d=' + shareB64(packed);
  if (fragment.length > MAX_TEXT) throw Error('opus35_share_size');
  return fragment;
}
/** Memory only. No fetch, storage, UUID, account, audio bytes or arbitrary URL. */
export async function decodeOpus35Share(
  fragment: string,
): Promise<Opus35SharedReplay> {
  if (fragment.length > MAX_TEXT || !/^v=6&d=[A-Za-z0-9_-]+$/.test(fragment))
    throw Error('opus35_share_syntax');
  const packed = shareUnb64(fragment.slice(6));
  if (packed.length > MAX_PACKED) throw Error('opus35_share_size');
  const raw = await shareTransform(packed, false);
  if (raw.length > MAX_RAW) throw Error('opus35_share_size');
  const envelope = parseOpus35Canonical(
    new TextDecoder('utf-8', { fatal: true }).decode(raw),
  );
  if (
    !exact(envelope, [
      'kind',
      'sourceRecord',
      'sourceRecordSha256',
      'descriptor',
      'replayR2',
      'title',
      'result',
    ]) ||
    envelope.kind !== 'opus35-replay' ||
    typeof envelope.sourceRecord !== 'string' ||
    (await sha256(new TextEncoder().encode(envelope.sourceRecord))) !==
      envelope.sourceRecordSha256 ||
    typeof envelope.descriptor !== 'string' ||
    typeof envelope.replayR2 !== 'string'
  )
    throw Error('opus35_share_envelope');
  const replayBytes = shareUnb64(envelope.replayR2);
  if (replayBytes[0] !== 82 || replayBytes[1] !== 50)
    throw Error('opus35_share_replay_format');
  inspectOpus35RawR2(replayBytes);
  const replay = unpackReplay(replayBytes);
  const canonicalReplay = packReplay(replay);
  if (
    canonicalReplay.length !== replayBytes.length ||
    canonicalReplay.some((b, i) => b !== replayBytes[i])
  )
    throw Error('opus35_canonical_r2');
  return verifyOpus35Share({
    record: parseOpus35Canonical(envelope.sourceRecord),
    descriptorBytes: shareUnb64(envelope.descriptor),
    replay,
    result: envelope.result,
    title: envelope.title,
  });
}
