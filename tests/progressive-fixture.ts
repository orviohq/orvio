import raw from './fixtures/a16-server-response.json';
import { makeSegments } from '../src/progressive/segments';
import { manifestSha256 } from '../src/progressive/manifest-trust';
import type { SourceRecord } from '../src/external-source';
export async function progressiveFixture(seconds = 8) {
  const record = JSON.parse(raw.recordBody) as SourceRecord;
  const rate = 48000,
    buffer = new ArrayBuffer(44 + rate * seconds * 4),
    v = new DataView(buffer);
  for (const [offset, text] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
    [12, 'fmt '],
    [36, 'data'],
  ] as const)
    for (let i = 0; i < 4; i++) v.setUint8(offset + i, text.charCodeAt(i));
  v.setUint32(4, buffer.byteLength - 8, true);
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  v.setUint32(40, buffer.byteLength - 44, true);
  for (let f = 0; f < rate * seconds; f++) {
    const x = Math.round(Math.sin((f / rate) * 2 * Math.PI * 440) * 14000);
    v.setInt16(44 + f * 4, x, true);
    v.setInt16(46 + f * 4, x, true);
  }
  const manifest = await makeSegments(buffer, record.videoId);
  for (const p of manifest.parts) delete p.bytes;
  record.audioSha256 = manifest.audioSha256;
  record.frames = manifest.frames;
  record.manifestSha256 = await manifestSha256(manifest);
  const recordBody = JSON.stringify(record),
    digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(recordBody),
    ),
    recordSha256 = Array.from(new Uint8Array(digest), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('');
  const recordHeaders = {
    'Content-Type': 'application/json',
    'X-SourceRecord-SHA256': recordSha256,
    'X-ChartSet-SHA256': record.chartSetSha256!,
    'X-Canonical-Audio-SHA256': record.audioSha256,
  };
  const manifestBody = {
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    chartSetSha256: record.chartSetSha256,
    manifestSha256: record.manifestSha256,
    manifest,
  };
  const audioHeaders = {
    'Content-Type': 'audio/wav',
    'Content-Length': String(buffer.byteLength),
    'X-Content-SHA256': record.audioSha256,
    'X-Canonical-Audio-SHA256': record.audioSha256,
    'X-Source-Video-Id': record.videoId,
    'X-Audio-Contract': 'audio/1',
  };
  return {
    record,
    recordBody,
    recordHeaders,
    manifest,
    manifestBody,
    buffer,
    audioHeaders,
  };
}
