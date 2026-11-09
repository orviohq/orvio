// Record-bound existing metadata only. No remote title claims or admission.
import { verifyOpusRecord, type OpusRecord } from './opus-record';
import { readOpus35Metadata } from './opus35-store';
export async function readOpus468SourceMetadata(
  record: OpusRecord,
  { signal }: { signal?: AbortSignal } = {},
) {
  signal?.throwIfAborted();
  const base = structuredClone(record);
  if (
    base.version !== 2 ||
    base.audioFormat !== 'orvio-opus-v1' ||
    !(await verifyOpusRecord(base))
  )
    throw Error('extension_metadata_source');
  const saved = await readOpus35Metadata(base);
  signal?.throwIfAborted();
  return {
    title: saved?.title?.trim().slice(0, 300) || base.videoId,
    ...(saved?.author?.trim()
      ? { author: saved.author.trim().slice(0, 100) }
      : {}),
  };
}
