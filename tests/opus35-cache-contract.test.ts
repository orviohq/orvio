import { it, expect } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createAcquiredOpusV2Artifacts } from '../src/opus/opus-acquired-v2-artifacts.mjs';
const root = new URL('../test-support/opus35-frost/', import.meta.url),
  desc = fs.readFileSync(new URL('descriptor.json', root)),
  audio = fs.readFileSync(new URL('audio.ogg', root)),
  d = JSON.parse(desc.toString()),
  sha = createHash('sha256').update(desc).digest('hex');
const job = {
  ok: true,
  version: 2,
  kind: 'orvio-opus-acquired-job-v2',
  jobId: '11111111-2222-4333-8444-555555555555',
  videoId: d.videoId,
  status: 'verified',
  audio: {
    audioFormat: 'orvio-opus-v1',
    contentType: 'audio/ogg',
    sha256: d.pcm16Sha256,
    encodedAudioSha256: d.oggSha256,
    audioDescriptorSha256: sha,
    decoderWasmSha256: d.decoderWasmSha256,
    bytes: d.oggBytes,
    frames: d.frames,
    sampleRate: 48000,
    channels: 2,
  },
};
function seam(cc: string) {
  return createAcquiredOpusV2Artifacts({
    readArtifact: async ({ kind }: any) => {
      const b = kind === 'audio' ? audio : desc;
      return new Response(b, {
        headers: {
          'Content-Type': kind === 'audio' ? 'audio/ogg' : 'application/json',
          'Content-Length': String(b.length),
          'Cache-Control': cc,
          'X-Content-Type-Options': 'nosniff',
          'X-Audio-Contract': 'orvio-opus-v1',
          'X-PCM16-SHA256': d.pcm16Sha256,
          'X-Content-SHA256': kind === 'audio' ? d.oggSha256 : sha,
          'X-Descriptor-SHA256': sha,
          'X-Source-Video-Id': d.videoId,
        },
      });
    },
  });
}
it('only legacy and strengthened exact cache directives pass full artifact verification', async () => {
  for (const cc of [
    'no-store',
    'no-store, no-transform',
    'no-store,no-transform',
  ])
    expect((await seam(cc).load(job)).bytes.length).toBe(audio.length);
  for (const cc of ['public', 'no-store, public', 'no-cache', ''])
    await expect(seam(cc).load(job)).rejects.toThrow('headers');
});
