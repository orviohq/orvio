// Exact build-owned parser selection. Both original branches retain their full
// structural and codec checks. No failure fallback or caller-provided policy.
import { exact468Branch } from './opus468-version-dispatch.mjs';
import { validateRecoveredV7 as legacy } from './public468-v7.mjs';
import { validateRecoveredV7 as unified } from './unified/v7';
export function validateRecoveredV7(candidate, codec, options) {
  const input = structuredClone(candidate);
  return exact468Branch(input?.extension?.generatorVersion, {
    legacy,
    unified,
  })(input, codec, options);
}
