// Private composition only. This module is not imported by any public entry.
// The transport argument belongs to reviewed build code, never imported data.
import { createOpus468AdaptiveDerivedVerifier } from './opus468-adaptive-derived-adapter.mjs';
import { verifyPrivateNmGuardInOwnedWorker } from './opus468-private-nmguard-verify.mjs';
import { resolveOpus468LocalArtifacts } from './opus468-local-artifacts.mjs';
import { createOpus468CanonicalV2ProjectionChartReader } from './opus468-canonical-v2-projection-reader.mjs';
import { waitAcquired } from './opus-acquired-v2-artifacts.mjs';
import type { AcquiredArtifactCapability } from './opus-acquired-v2-prepare';
import { createOpus468FreshStore } from './opus468-fresh-store.mjs';
import { createOpus468Frontend } from './opus468-frontend';
import { readOpus468CacheAudio } from './opus468-cache-audio.mjs';
import { createOpus468LocalReplayCodec } from './opus468-local-replay-codec';
import { createOpus468ReplayShareImporter } from './opus468-replay-share-adapter.mjs';
import { createOpus468ReplayInstaller } from './opus468-replay-install.mjs';
import { validateRuntimeReplay, replayEngine, applyReplayOp } from '../replay';
import { JUDGMENTS } from '../engine';
import { createPrivateNmGuardAcquiredV2Intake } from './opus468-private-nmguard-acquired-intake';

export const PRIVATE_NMGUARD_ARTIFACT_ROOTS = Object.freeze({
  workerSha256:
    'a647d0e0910d1889f026fc7e8c39ec950404367b8c74b168e0f303b3ca93cb35',
  manifestSha256:
    'f07b226346becdef2d12eda7b37c0278011f9bd35b3c348acb97412a50a6cddf',
  recipeSha256:
    'd850ee9203824ebe54bda81370a61a636677a18159a79bf89fdb693da948e0b2',
  decoderWasmSha256:
    '8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b',
});

type TrustedExchange = (
  request: unknown,
  options: { signal?: AbortSignal },
) => Promise<unknown>;
// BUILD-only capability binding, never imported jobs, URLs or browser events.
// Owner create/advance deliberately absent: no implicit provider/writes/polling.
export function createPrivateNmGuardAcquiredRuntime({
  readArtifact,
  exchangeProjection,
}: {
  readArtifact: AcquiredArtifactCapability;
  exchangeProjection: TrustedExchange;
}) {
  if (
    typeof readArtifact !== 'function' ||
    typeof exchangeProjection !== 'function'
  )
    throw Error('acquired_v2_capabilities');
  const boundExchange = async (
    request: unknown,
    { signal }: { signal?: AbortSignal } = {},
  ) => {
    signal?.throwIfAborted();
    const projection = await waitAcquired(
      exchangeProjection(structuredClone(request), { signal }),
      signal,
    );
    signal?.throwIfAborted();
    return structuredClone(projection);
  };
  const exchangeOptions = { exchangeProjection: boundExchange };
  const makeReader = createOpus468CanonicalV2ProjectionChartReader;
  const verifyDerivedRecord = createOpus468AdaptiveDerivedVerifier({
    resolveArtifacts: resolveOpus468LocalArtifacts,
    verifyInWorker: verifyPrivateNmGuardInOwnedWorker,
  });
  // Artifact provenance does not qualify a producer. No caller override exists.
  const readerOptions = Object.freeze({
    consumerOptions: Object.freeze({
      policyRows: Object.freeze([]),
      loadedProducerIdentity: undefined,
      verifyDerivedRecord,
    }),
    ...exchangeOptions,
  });
  const freshStore = createOpus468FreshStore({ readerOptions, makeReader });
  const frontend = createOpus468Frontend({
    freshStore,
    readAudio: readOpus468CacheAudio,
  });
  const makeCodec = () =>
    createOpus468LocalReplayCodec({ readerOptions, makeReader });
  const importSharedReplay = createOpus468ReplayShareImporter({
    makeCodec,
    saveSession: frontend.saveSession,
    validateRuntimeReplay,
    replayEngine,
    applyReplayOp,
    judgments: JUDGMENTS,
  });
  const installSharedReplay = createOpus468ReplayInstaller({
    makeCodec,
    frontend,
    importSharedReplay,
  });
  return Object.freeze({
    frontend,
    intake: createPrivateNmGuardAcquiredV2Intake({ frontend, readArtifact }),
    makeCodec,
    importSharedReplay,
    installSharedReplay,
    async installMain({ signal }: { signal?: AbortSignal } = {}) {
      const { installPrivateOpus468Frontend } = await import('../main');
      await installPrivateOpus468Frontend(frontend, { signal });
    },
  });
}
