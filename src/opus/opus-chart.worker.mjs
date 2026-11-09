import { decodeVerifiedOpus } from '../opus-codec/verified-opus-client.mjs';
import {
  parseVerifiedDescriptor,
  verifyEncodedParts,
} from './opus-descriptor.mjs';
import { parsePinnedPcmAnalysis } from './opus-pcm-analysis.mjs';
import { bindNewOpusRecord, verifyOpusRecord } from './opus-record.ts';
import { generateRecordFromAnalysis } from '../current35-budget-v1.mjs';
self.onmessage = async ({ data }) => {
  const { bytes, wasmBytes, descriptorBytes, descriptorSha256, frozenRecord } =
    data;
  try {
    const d = await parseVerifiedDescriptor(
      new Uint8Array(descriptorBytes),
      descriptorSha256,
    );
    await verifyEncodedParts(new Uint8Array(bytes), d);
    const decoded = await decodeVerifiedOpus({
      bytes: new Uint8Array(bytes),
      wasmBytes: new Uint8Array(wasmBytes),
      expected: d,
    });
    let record = frozenRecord;
    if (!record) {
      const parsed = parsePinnedPcmAnalysis(decoded.pcm16, decoded.frames),
        generated = await generateRecordFromAnalysis(
          parsed,
          d.videoId,
          d.pcm16Sha256,
        );
      record = bindNewOpusRecord(generated, d, descriptorSha256);
    }
    if (!(await verifyOpusRecord(record, d, descriptorSha256)))
      throw Error('opus_chart_integrity');
    self.postMessage(
      { ok: true, record, pcm16: decoded.pcm16.buffer, descriptor: d },
      [decoded.pcm16.buffer],
    );
  } catch (e) {
    self.postMessage({ ok: false, error: String(e) });
  }
};
