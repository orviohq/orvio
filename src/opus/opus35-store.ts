import DecoderUrl from '../opus-codec/opus-decoder.wasm?url';
import ChartWorkerUrl from './opus-chart.worker.mjs?worker&url';
import { readVerifiedOpusByRoots } from './opus-cache.mjs';
import { prepareOpusOwned } from './opus-chart-worker-client.mjs';
import { verifyOpusRecord, type OpusRecord } from './opus-record';
import { sha256, DECODER } from './opus-descriptor.mjs';
import { opus35SourceId } from './opus35-identity';
const DB = 'orvio.opus35-library.v1';
export async function opus35Operation(
  store: 'metadata' | 'sessions',
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest<any>,
) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => {
      for (const s of ['metadata', 'sessions'])
        q.result.createObjectStore(s, { keyPath: 'key' });
    };
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
  try {
    return await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(store, mode),
        q = work(tx.objectStore(store));
      let result: any;
      q.onsuccess = () => {
        result = q.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function saveOpus35Metadata(
  record: OpusRecord,
  title: string,
  jobId?: string,
  author?: string,
) {
  if (!(await verifyOpusRecord(record))) throw Error('opus35_record');
  const key = opus35SourceId(record),
    old = await opus35Operation('metadata', 'readonly', (s) => s.get(key));
  if (old && JSON.stringify(old.record) !== JSON.stringify(record))
    throw Error('opus35_frozen_record_changed');
  await opus35Operation('metadata', 'readwrite', (s) =>
    s.put({
      ...old,
      key,
      kind: 'opus35-source',
      record,
      title: title.slice(0, 300),
      author: author?.slice(0, 100),
      jobId,
    }),
  );
}
export async function listOpus35Metadata() {
  const rows = await opus35Operation('metadata', 'readonly', (s) => s.getAll());
  const out = [];
  for (const row of rows) {
    if (
      row?.kind !== 'opus35-source' ||
      typeof row.title !== 'string' ||
      row.key !== opus35SourceId(row.record) ||
      !(await verifyOpusRecord(row.record))
    )
      throw Error('opus35_catalog_corrupt');
    out.push(row);
  }
  return out;
}
export async function readOpus35Metadata(record: OpusRecord) {
  const row = await opus35Operation('metadata', 'readonly', (s) =>
    s.get(opus35SourceId(record)),
  );
  if (
    row &&
    (JSON.stringify(row.record) !== JSON.stringify(record) ||
      !(await verifyOpusRecord(row.record)))
  )
    throw Error('opus35_metadata_changed');
  return row ?? null;
}
export async function readOpus35Pcm(record: OpusRecord, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const cached = await readVerifiedOpusByRoots(record, { signal });
  if (!cached) return null;
  if (JSON.stringify(cached.record) !== JSON.stringify(record))
    throw Error('opus35_cached_chart_changed');
  const r = await fetch(DecoderUrl, { signal });
  if (!r.ok) throw Error('opus35_decoder_unavailable');
  const wasm = await r.arrayBuffer();
  if ((await sha256(new Uint8Array(wasm))) !== DECODER)
    throw Error('opus35_decoder_identity');
  const decoded = await prepareOpusOwned({
    workerUrl: ChartWorkerUrl,
    bytes: cached.bytes.slice().buffer,
    wasmBytes: wasm,
    descriptorBytes: cached.descriptorBytes.slice().buffer,
    descriptorSha256: record.audioDescriptorSha256,
    signal,
    frozenRecord: record,
  });
  if (
    JSON.stringify(decoded.record) !== JSON.stringify(record) ||
    !(await verifyOpusRecord(
      decoded.record,
      decoded.descriptor,
      record.audioDescriptorSha256,
    ))
  )
    throw Error('opus35_frozen_decode');
  return decoded.pcm16 as ArrayBuffer;
}
