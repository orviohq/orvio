import { generateUnifiedExtensionOwned } from './owned-loader.mjs';
import { UNIFIED_BUILD } from './build.generated.mjs';
import { UNIFIED468_GENERATOR } from '../opus468-version-dispatch.mjs';
export async function verifyUnifiedInWorker({ record, signal, ...input }) {
  const expected = structuredClone(record);
  signal?.throwIfAborted();
  if (expected?.generatorVersion !== UNIFIED468_GENERATOR) return { ok: false };
  const made = await generateUnifiedExtensionOwned({ ...input, signal });
  signal?.throwIfAborted();
  const ok =
    made?.kind === 'orvio-autochart468-c3unified-candidate-v1' &&
    made.qualified === false &&
    made.admission === 'PENDING_RELEASE' &&
    made.releaseCandidate === true &&
    made.loadedBuild?.workerSha256 === UNIFIED_BUILD.producerSha256 &&
    made.loadedBuild?.buildRootSha256 === UNIFIED_BUILD.manifestSha256 &&
    made.proof?.ok === true &&
    made.proof.recipeSha256 === UNIFIED_BUILD.recipeSha256 &&
    made.proof.sourceCount === UNIFIED_BUILD.sourceCount &&
    made.proof.regenerationLevel === 2 &&
    made.proof.canonicalRecordMatch === true &&
    made.proof.extensionSha256Match === true &&
    JSON.stringify(made.extension) === JSON.stringify(expected);
  return {
    ok,
    steps: {
      regeneration: {
        level: 2,
        extensionSha256Match: ok,
        canonicalRecordMatch: ok,
      },
    },
  };
}
