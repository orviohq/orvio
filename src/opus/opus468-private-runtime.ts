// Private composition only. This module is not imported by any public entry.
// The transport argument belongs to reviewed build code, never imported data.
import { createOpus468AdaptiveDerivedVerifier } from './opus468-adaptive-derived-adapter.mjs';
import { verifyPrivateAdaptiveBuildInOwnedWorker } from './opus468-adaptive-build-verifier.mjs';
import { resolveOpus468LocalArtifacts } from './opus468-local-artifacts.mjs';
import { createOpus468ProjectionChartReader } from './opus468-projection-reader.mjs';
import { createPrivateOpusProjectionTransport } from './opus-projection-transport-private.mjs';
import { createOpus468FreshStore } from './opus468-fresh-store.mjs';
import { createOpus468Frontend } from './opus468-frontend';
import { readOpus468CacheAudio } from './opus468-cache-audio.mjs';
import { createOpus468LocalReplayCodec } from './opus468-local-replay-codec';
import { createOpus468ReplayShareImporter } from './opus468-replay-share-adapter.mjs';
import { createOpus468ReplayInstaller } from './opus468-replay-install.mjs';
import { validateRuntimeReplay, replayEngine, applyReplayOp } from '../replay';
import { JUDGMENTS } from '../engine';
import { createPrivateOpus468Intake } from './opus468-private-intake';

export const PRIVATE_OPUS468_ARTIFACT_ROOTS = Object.freeze({
  workerSha256:
    'e7185abfbe6a35aad7223796eae3c24f2f51e4a245b6bc82c32e26553411afa8',
  manifestSha256:
    'add7dcf6482092a41a7d193e98e891547498f42ca26a87144500b5c78cb615a2',
  recipeSha256:
    '3956182ec2796ef6393100b914caccf8145f75cde63fa2465000821cf24ee193',
  decoderWasmSha256:
    '8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b',
});

type TrustedExchange = (
  request: unknown,
  options: { signal?: AbortSignal },
) => Promise<unknown>;
export function createPrivateOpus468ProjectionRuntime() {
  const transport = createPrivateOpusProjectionTransport();
  return composePrivateRuntime(
    { exchangeProjection: transport.exchange },
    createOpus468ProjectionChartReader,
  );
}

export function createPrivateOpus468Runtime({
  trustedExchange,
}: {
  trustedExchange: TrustedExchange;
}) {
  if (typeof trustedExchange !== 'function')
    throw Error('fresh_reader_dependencies');
  return composePrivateRuntime({ trustedExchange });
}
function composePrivateRuntime(exchangeOptions: any, makeReader?: any) {
  const verifyDerivedRecord = createOpus468AdaptiveDerivedVerifier({
    resolveArtifacts: resolveOpus468LocalArtifacts,
    verifyInWorker: verifyPrivateAdaptiveBuildInOwnedWorker,
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
    intake: createPrivateOpus468Intake({ frontend }),
    makeCodec,
    importSharedReplay,
    installSharedReplay,
    async installMain({ signal }: { signal?: AbortSignal } = {}) {
      const { installPrivateOpus468Frontend } = await import('../main');
      await installPrivateOpus468Frontend(frontend, { signal });
    },
  });
}
