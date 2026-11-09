// Compatibility entry: the same actual all-key core serves 5/7 and 4/6/8.
// Existing 5/7 record serialization and hashes are retained exactly.
import { parseWavAnalysis } from './fused-resampler.mjs';
import { generateRecordFromAnalysis } from './chart-core/index.mjs';
export { generateRecordFromAnalysis };
export async function generateSourceRecord(bytes, videoId, audioSha256) {
  const actual = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== audioSha256) throw Error('Source audio integrity failed');
  return generateVerifiedSourceRecord(bytes, videoId, audioSha256);
}
export async function generateVerifiedSourceRecord(
  bytes,
  videoId,
  audioSha256,
) {
  if (!/^[a-f0-9]{64}$/.test(audioSha256))
    throw Error('Invalid verified audio hash');
  return generateRecordFromAnalysis(
    parseWavAnalysis(bytes),
    videoId,
    audioSha256,
  );
}
