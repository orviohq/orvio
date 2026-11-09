// Codec-discriminated local source. Legacy validation remains unchanged.
import {
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';
import {
  validOpusRecord,
  verifyOpusRecord,
  type OpusRecord,
} from './opus/opus-record';
export type PlayableSourceRecord = SourceRecord | OpusRecord;
export function isOpusRecord(r: PlayableSourceRecord): r is OpusRecord {
  return r.version === 2;
}
export function validPlayableSource(r: unknown): r is PlayableSourceRecord {
  return validSourceRecord(r) || validOpusRecord(r);
}
export async function verifyPlayableSource(r: PlayableSourceRecord) {
  return isOpusRecord(r) ? verifyOpusRecord(r) : verifyChartHashes(r);
}
