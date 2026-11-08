import { audioAtStage } from './audio-error-stage';
import { readCanonicalSource } from './canonical-source-api';
import { pinSource, readPinnedSource } from './external-source-store';
import { recordKey, type SourceRecord } from './external-source';
const KEY = 'orvio.canonical-library.v1';
export interface CanonicalReference {
  videoId: string;
  audioSha256: string;
  chartSetSha256: string;
  recordSha256: string;
  localRecordSha256: string;
}
async function localRecordHash(record: SourceRecord) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(record)),
      ),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
/** Server-verified immutable identities only; old local pins remain archive data. */
export async function rememberCanonical(
  record: SourceRecord,
  recordSha256: string,
) {
  if (!record.chartSetSha256 || !/^[a-f0-9]{64}$/.test(recordSha256))
    throw Error('Invalid canonical reference');
  const all = references();
  const previous = all.find((x) => x.videoId === record.videoId);
  if (
    previous &&
    (previous.audioSha256 !== record.audioSha256 ||
      previous.chartSetSha256 !== record.chartSetSha256 ||
      previous.recordSha256 !== recordSha256)
  )
    throw Error('Canonical identity changed');
  const localRecordSha256 = await localRecordHash(record);
  await pinSource(record);
  const next = all.filter((x) => x.videoId !== record.videoId);
  next.push({
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    chartSetSha256: record.chartSetSha256,
    recordSha256,
    localRecordSha256,
  });
  const text = JSON.stringify(next);
  localStorage.setItem(KEY, text);
  if (localStorage.getItem(KEY) !== text)
    throw Error('Canonical reference save failed');
}
function references(): CanonicalReference[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter(
      (x) =>
        x &&
        /^[A-Za-z0-9_-]{11}$/.test(x.videoId) &&
        [
          'audioSha256',
          'chartSetSha256',
          'recordSha256',
          'localRecordSha256',
        ].every((k) => /^[a-f0-9]{64}$/.test(x[k])),
    );
  } catch {
    return [];
  }
}
export async function savedCanonical(videoId: string) {
  const ref = references().find((x) => x.videoId === videoId);
  if (!ref) return null;
  const record = await readPinnedSource(
    videoId,
    ref.audioSha256,
    ref.chartSetSha256,
  );
  if (!record) return null;
  if ((await localRecordHash(record)) !== ref.localRecordSha256)
    throw Error('Canonical record integrity failed');
  return record;
}
export const canonicalKey = (record: SourceRecord) => recordKey(record);
export async function refreshCanonical(videoId: string, signal?: AbortSignal) {
  const lookup = await readCanonicalSource(videoId, signal);
  if (lookup.state !== 'ready') return lookup;
  await audioAtStage('storage', () =>
    rememberCanonical(lookup.record, lookup.recordSha256),
  );
  return lookup;
}
