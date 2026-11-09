// Pure deterministic extension reassembly. No caller policy/producer override.
import { assembleOpus468Extension } from './record.mjs';
import { UNIFIED468_GENERATOR } from '../opus468-version-dispatch.mjs';
// generateCharts is bound by the worker build, never accepted in input data.
export function makeUnifiedDerivationVerifier(generateCharts) {
  return function verifyUnifiedDerivation({
    parsed,
    record,
    baseRecordRaw,
    baseRecord,
    descriptor,
    descriptorSha256,
  }) {
    if (record?.generatorVersion !== UNIFIED468_GENERATOR)
      return { ok: false, error: 'generator_version' };
    const generated = generateCharts(parsed);
    const reassembled = assembleOpus468Extension({
      baseRecordRaw,
      baseRecord,
      descriptor,
      descriptorSha256,
      generatedCharts: generated.charts,
      generatorVersion: UNIFIED468_GENERATOR,
    });
    const extensionSha256Match =
      reassembled.extensionSha256 === record.extensionSha256;
    const canonicalRecordMatch =
      JSON.stringify(reassembled) === JSON.stringify(record);
    return {
      ok: extensionSha256Match && canonicalRecordMatch,
      level: 2,
      extensionSha256Match,
      canonicalRecordMatch,
    };
  };
}
