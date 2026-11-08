import { pinSource, readPinnedSource } from './external-source-store';
import {
  verifyChartHashes,
  validSourceRecord,
  type SourceRecord,
} from './external-source';
const KEY = 'orvio.local-generated-library.v1';
interface LocalReference {
  videoId: string;
  audioSha256: string;
  chartSetSha256: string;
  recordSha256: string;
  provenance: 'local-worker/current35-budget-v1';
}
export async function recordDigest(record: SourceRecord) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(record)),
      ),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
function references(): LocalReference[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(rows)
      ? rows.filter(
          (r) =>
            r?.provenance === 'local-worker/current35-budget-v1' &&
            /^[A-Za-z0-9_-]{11}$/.test(r.videoId) &&
            ['audioSha256', 'chartSetSha256', 'recordSha256'].every((k) =>
              /^[a-f0-9]{64}$/.test(r[k]),
            ),
        )
      : [];
  } catch {
    return [];
  }
}
/** Local provenance is never inserted into the server-verified canonical registry. */
export async function rememberLocalGenerated(
  record: SourceRecord,
  expectedDigest: string,
) {
  if (
    !validSourceRecord(record) ||
    !record.chartSetSha256 ||
    !(await verifyChartHashes(record)) ||
    (await recordDigest(record)) !== expectedDigest
  )
    throw Error('Invalid generated source');
  const ref: LocalReference = {
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    chartSetSha256: record.chartSetSha256,
    recordSha256: expectedDigest,
    provenance: 'local-worker/current35-budget-v1',
  };
  const before = references().find((r) => r.videoId === record.videoId);
  if (before && JSON.stringify(before) !== JSON.stringify(ref))
    throw Error('Local source identity changed');
  await pinSource(record);
  const all = references(),
    current = all.find((r) => r.videoId === record.videoId);
  if (current && JSON.stringify(current) !== JSON.stringify(ref))
    throw Error('Local source identity changed');
  const value = JSON.stringify([
    ...all.filter((r) => r.videoId !== record.videoId),
    ref,
  ]);
  localStorage.setItem(KEY, value);
  if (localStorage.getItem(KEY) !== value)
    throw Error('Local source save failed');
}
export async function savedLocalGenerated(videoId: string) {
  const ref = references().find((r) => r.videoId === videoId);
  if (!ref) return null;
  const record = await readPinnedSource(
    videoId,
    ref.audioSha256,
    ref.chartSetSha256,
  );
  if (!record) return null;
  if ((await recordDigest(record)) !== ref.recordSha256)
    throw Error('Local source integrity failed');
  return record;
}
