import {
  pinSource,
  readPinnedSource,
  listPinnedSources,
} from './external-source-store';
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
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  // One origin-wide publication lock also prevents different-video updates
  // from losing each other in the shared localStorage projection.
  // Without cross-tab exclusion, never claim an immutable pin was published.
  if (typeof navigator === 'undefined' || !navigator.locks?.request)
    throw Error('Local chart storage unavailable');
  const snapshot = structuredClone(record);
  return navigator.locks.request(
    'orvio.local-generated-library.publication.v1',
    { mode: 'exclusive', signal },
    () => publishLocalGenerated(snapshot, expectedDigest, signal),
  );
}
async function publishLocalGenerated(
  record: SourceRecord,
  expectedDigest: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (
    !validSourceRecord(record) ||
    !record.chartSetSha256 ||
    !(await verifyChartHashes(record)) ||
    (await recordDigest(record)) !== expectedDigest
  )
    throw Error('Invalid generated source');
  signal?.throwIfAborted();
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
  // IDB may have committed before a storage/quota failure or a tab crash.
  // Such a pin is still an immutable identity, even without its projection.
  const durable = await durableLocalGenerated(record.videoId);
  if (durable && (await recordDigest(durable)) !== expectedDigest)
    throw Error('Local source identity changed');
  signal?.throwIfAborted();
  await pinSource(record, signal);
  signal?.throwIfAborted();
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
async function durableLocalGenerated(videoId: string) {
  const records = (await listPinnedSources(videoId)).filter(
    (r) => r.sourceProvenance === 'local-current35-v1',
  );
  if (records.length > 1) throw Error('Local source identity changed');
  return records[0] ?? null;
}
export async function savedLocalGenerated(videoId: string) {
  const durable = await durableLocalGenerated(videoId);
  const ref = references().find((r) => r.videoId === videoId);
  if (!ref) return durable;
  const record = await readPinnedSource(
    videoId,
    ref.audioSha256,
    ref.chartSetSha256,
  );
  if (!record) return null;
  if (
    !durable ||
    (await recordDigest(durable)) !== ref.recordSha256 ||
    (await recordDigest(record)) !== ref.recordSha256
  )
    throw Error('Local source integrity failed');
  return record;
}
