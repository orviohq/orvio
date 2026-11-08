import { generateSourceRecord } from './external-source-provider';
import { verifyChartHashes, type SourceRecord } from './external-source';
import { pinSource, readPinnedSource } from './external-source-store';
import { localAudio, saveLocalAudio } from './external-local';

/** Explicit local regeneration. Never replaces a pin, result or replay. */
export async function regenerateSource(record: SourceRecord) {
  if (!(await verifyChartHashes(record))) throw Error('Invalid saved source');
  const audio = await localAudio(record);
  if (!audio) throw Error('Saved audio unavailable');
  const generated = await generateSourceRecord(
    audio.bytes,
    record.videoId,
    record.audioSha256,
  );
  await pinSource(generated);
  const pinned = await readPinnedSource(
    generated.videoId,
    generated.audioSha256,
    generated.chartSetSha256,
  );
  if (!pinned) throw Error('New chart save could not be confirmed');
  await saveLocalAudio(
    pinned,
    audio.title,
    audio.jobId,
    audio.bytes,
    audio.author,
  );
  return { record: pinned, audio };
}
