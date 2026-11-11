// NEW public composition CANDIDATE factory. Not activated; no main install.
// New public-scope decision is explicit, existing private binding untouched.
// readArtifact/exchangeProjection are reviewed BUILD CODE, never imported inputs.
import {
  PUBLIC_CANDIDATE_BINDING as RELEASE_BINDING,
  PUBLIC_CANDIDATE_POLICY as PRIVATE_POLICY,
  PUBLIC_CANDIDATE_LOADED_IDENTITY as PRIVATE_LOADED_IDENTITY,
} from './release-binding.generated.mjs';
import { createProduction468SplitProjectionReader } from './split-projection-reader.mjs';
import { createProductionLegacySplitProjectionReader } from './legacy-split-projection-reader.mjs';
import {
  findLegacySourceRoots,
  resolveVerifiedLegacySource,
} from './legacy-source-registry.mjs';
import {
  DEFAULT_LEGACY_MANIFEST_ID,
  recognizedLegacyManifestId,
} from '../legacy-source-inventory.mjs';
import { createLegacyCurrentnessExchange } from '../opus35-legacy-currentness-exchange.mjs';
import { createBuildOwnedLegacySidecarAdder } from '../opus35-legacy-sidecar-add.mjs';
import { createBuildOwnedLegacyFrozenRecordRestorer } from '../opus35-legacy-frozen-restore.mjs';
import { restoreOpus35Record } from '../opus35-api';
import { verifyUnifiedInWorker } from './derived-verifier.mjs';
import { generateUnifiedExtensionOwned } from './owned-loader.mjs';
import { createOpus468AdaptiveDerivedVerifier } from '../opus468-adaptive-derived-adapter.mjs';
import { resolveOpus468LocalArtifacts } from '../opus468-local-artifacts.mjs';
import { createAcquiredOpusV2Preparer } from '../opus-acquired-v2-prepare';
import {
  captureAcquiredOpusV2,
  waitAcquired,
} from '../opus-acquired-v2-artifacts.mjs';
import { createOpus468FreshStoreSingleRestore as createOpus468FreshStore } from './fresh-store.mjs';
import { createOpus468FrontendSharing1935 as createOpus468Frontend } from './frontend';
import { createTransient468View } from './transient-view';
import {
  encodeV7SharedReplay,
  parseV7Bootstrap,
  validateRecoveredV7,
} from './v7';
import { readOpus468CacheAudio } from '../opus468-cache-audio.mjs';
import { createOpus468LocalReplayCodec } from '../opus468-local-replay-codec';
import { createOpus468ReplayShareImporter } from '../opus468-replay-share-adapter.mjs';
import { createOpus468ReplayInstaller } from '../opus468-replay-install.mjs';
import { CURRENT_FEVER } from '../../fever';
import { JUDGMENTS } from '../../engine';
import {
  validateRuntimeReplay,
  replayEngine,
  applyReplayOp,
} from '../../replay';
export function createUnified468Candidate({
  readArtifact,
  exchangeProjection,
  legacyConfig,
}: any) {
  if (
    typeof readArtifact !== 'function' ||
    typeof exchangeProjection !== 'function'
  )
    throw Error('general_build_capabilities');
  if (
    legacyConfig !== undefined &&
    (!legacyConfig ||
      typeof legacyConfig !== 'object' ||
      Array.isArray(legacyConfig) ||
      typeof legacyConfig.endpoint !== 'string' ||
      !legacyConfig.endpoint ||
      Object.keys(legacyConfig).some(
        (k) => k !== 'endpoint' && k !== 'fetchImpl',
      ) ||
      (legacyConfig.fetchImpl !== undefined &&
        typeof legacyConfig.fetchImpl !== 'function'))
  )
    throw Error('general_legacy_config');
  const legacyExchange = legacyConfig
    ? createLegacyCurrentnessExchange({
        endpoint: legacyConfig.endpoint,
        ...(legacyConfig.fetchImpl
          ? { fetchImpl: legacyConfig.fetchImpl }
          : {}),
      })
    : null;
  const lifetime = new AbortController();
  const operationSignals = new WeakMap<AbortSignal, AbortSignal>();
  const operationSignal = (signal?: AbortSignal) => {
    if (!signal) return AbortSignal.any([lifetime.signal]);
    const prior = operationSignals.get(signal);
    if (prior) return prior;
    const merged = AbortSignal.any([signal, lifetime.signal]);
    operationSignals.set(signal, merged);
    operationSignals.set(merged, merged);
    return merged;
  };
  let revoked = false,
    generation = 0,
    pending: AbortController | undefined;
  const check = (s?: AbortSignal) => {
    s?.throwIfAborted();
    if (revoked) throw Error('general_revoked');
  };
  const verifyDerivedRecord = createOpus468AdaptiveDerivedVerifier({
    resolveArtifacts: resolveOpus468LocalArtifacts,
    verifyInWorker: verifyUnifiedInWorker,
    operationWorkerReuse: true,
  });
  const consumerOptions = Object.freeze({
    policyRows: Object.freeze([PRIVATE_POLICY]),
    loadedProducerIdentity: PRIVATE_LOADED_IDENTITY,
    verifyDerivedRecord,
  });
  const native = createProduction468SplitProjectionReader({
    consumerOptions,
    exchangeProjection: async (q: any, { signal }: any) => {
      check(signal);
      const result = await waitAcquired(
        exchangeProjection(structuredClone(q), { signal }),
        signal,
      );
      check(signal);
      return structuredClone(result);
    },
  });
  const legacyReader = legacyExchange
    ? createProductionLegacySplitProjectionReader({
        consumerOptions,
        exchangeCurrentness: async (q: any, { signal }: any) => {
          check(signal);
          const result = await waitAcquired(
            legacyExchange.exchange(structuredClone(q), { signal }),
            signal,
          );
          check(signal);
          return structuredClone(result);
        },
      })
    : null;
  const reader = Object.freeze({
    readChart: async (r: any, d: any, c: any, { signal }: any = {}) => {
      check(signal);
      const merged = operationSignal(signal);
      const registered = await resolveVerifiedLegacySource({
        descriptorBytes: d,
        baseRecord: JSON.parse(r?.baseSourceRecordJson),
        signal: merged,
      });
      check(merged);
      if (registered && !legacyReader)
        throw Error('general_legacy_unavailable');
      const active = registered ? legacyReader! : native;
      const result = await waitAcquired(
        active.readChart(r, d, c, { signal: merged }),
        merged,
      );
      check(merged);
      return result;
    },
  });
  const makeReader = () => reader,
    freshStore = createOpus468FreshStore({
      makeReader,
      databaseName: 'orvio.autochart468.c3unified.extensions.v1',
    });
  const frontend = createOpus468Frontend({
    freshStore,
    readAudio: readOpus468CacheAudio,
    newPlayFever: { ...CURRENT_FEVER, auto: true },
    databaseName: 'orvio.autochart468.c3unified.frontend.v1',
  });
  const makeCodec = () => createOpus468LocalReplayCodec({ makeReader });
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
  const cancel = () => {
    generation++;
    pending?.abort(Error('general_superseded'));
    pending = undefined;
  };
  let legacyAdderPromise: Promise<any> | undefined,
    legacyRestorerPromise: Promise<any> | undefined;
  const getLegacyAdder = () => {
    if (!legacyConfig) return null;
    if (!legacyAdderPromise)
      legacyAdderPromise = createBuildOwnedLegacySidecarAdder({
        currentnessEndpoint: legacyConfig.endpoint,
        ...(legacyConfig.fetchImpl
          ? { fetchImpl: legacyConfig.fetchImpl }
          : {}),
      }).catch((error: any) => {
        legacyAdderPromise = undefined;
        throw error;
      });
    return legacyAdderPromise;
  };
  const getLegacyRestorer = () => {
    if (!legacyConfig) return null;
    if (!legacyRestorerPromise)
      legacyRestorerPromise = createBuildOwnedLegacyFrozenRecordRestorer({
        currentnessEndpoint: legacyConfig.endpoint,
        ...(legacyConfig.fetchImpl
          ? { fetchImpl: legacyConfig.fetchImpl }
          : {}),
      }).catch((error: any) => {
        legacyRestorerPromise = undefined;
        throw error;
      });
    return legacyRestorerPromise;
  };
  const prepare = createAcquiredOpusV2Preparer({ readArtifact });
  const pinPrepared = async (
    prepared: any,
    selection: any,
    metadata: any,
    signal: AbortSignal,
  ) => {
    check(signal);
    const record = structuredClone(prepared.record),
      raw = JSON.stringify(record),
      a = await resolveOpus468LocalArtifacts(record, { signal });
    check(signal);
    const made = await generateUnifiedExtensionOwned({
      audioBytes: a.audioBytes.slice().buffer,
      descriptorBytes: a.descriptorBytes.slice().buffer,
      decoderWasmBytes: a.decoderWasmBytes.slice().buffer,
      baseRecordRaw: raw,
      signal,
    });
    check(signal);
    if (
      made?.kind !== 'orvio-autochart468-c3unified-candidate-v1' ||
      made.qualified !== false ||
      made.admission !== 'PENDING_RELEASE' ||
      made.loadedBuild?.workerSha256 !== RELEASE_BINDING.producerSha256 ||
      made.loadedBuild?.buildRootSha256 !== RELEASE_BINDING.manifestSha256 ||
      made.proof?.recipeSha256 !== RELEASE_BINDING.recipeSha256 ||
      made.proof.sourceCount !== RELEASE_BINDING.sourceCount
    )
      throw Error('general_producer_binding');
    const request = {
      version: 1 as const,
      videoId: record.videoId,
      encodedAudioSha256: record.encodedAudioSha256,
      baseSourceRecordJson: raw,
      extension: made.extension,
    };
    // Actual frontend pin traverses all THREE gates before install, and repeats
    // fresh reads for catalog. Producer's PENDING_RELEASE label is not the grant.
    const installed = await frontend.pin(
      request,
      a.descriptorBytes,
      selection,
      metadata,
      { signal },
    );
    check(signal);
    if (installed.localPinCommitted !== true)
      throw Error('general_pin_not_committed');
    return {
      status: 'public-candidate-locally-admitted',
      producerQualified: false,
      releaseScope: RELEASE_BINDING.scope,
      ...installed,
    };
  };
  return Object.freeze({
    releaseBinding: RELEASE_BINDING,
    frontend,
    makeCodec,
    importSharedReplay,
    installSharedReplay,
    cancel,
    parseSharedV7: parseV7Bootstrap,
    async exportSharedV7(sessionKey: string, { signal }: any = {}) {
      check(signal);
      const merged = operationSignal(signal);
      const source = await frontend.exportShare(sessionKey, { signal: merged });
      check(merged);
      return encodeV7SharedReplay(source, makeCodec(), { signal: merged });
    },
    async makeTransientSharedView(candidate: any, { signal }: any = {}) {
      check(signal);
      const captured = structuredClone(candidate),
        merged = operationSignal(signal);
      await validateRecoveredV7(captured, makeCodec(), { signal: merged });
      check(merged);
      return createTransient468View(captured, {
        reader,
        readAudio: readOpus468CacheAudio,
      });
    },
    revoke() {
      revoked = true;
      cancel();
      lifetime.abort(Error('general_revoked'));
    },
    async restoreSourceRecord(input: any, { signal: callerSignal }: any = {}) {
      const record = structuredClone(input);
      check(callerSignal);
      const signal = operationSignal(callerSignal);
      const registered = findLegacySourceRoots({
        videoId: record.videoId,
        encodedAudioSha256: record.encodedAudioSha256,
        audioDescriptorSha256: record.audioDescriptorSha256,
        audioSha256: record.audioSha256,
        decoderWasmSha256: record.decoderWasmSha256,
        frames: record.frames,
        sampleRate: record.sampleRate,
        channels: 2,
      });
      if (!registered) return restoreOpus35Record(record, signal);
      if (!legacyConfig || !legacyReader)
        throw Error('general_legacy_unavailable');
      const restorer = await waitAcquired(getLegacyRestorer(), signal);
      check(signal);
      return restorer({ record, manifestId: registered.manifestId, signal });
    },
    async consumeFixedLegacySidecar(
      input: any,
      { signal: callerSignal }: any = {},
    ) {
      const captured = structuredClone(input);
      check(callerSignal);
      const manifestId =
        captured.manifestId === undefined
          ? DEFAULT_LEGACY_MANIFEST_ID
          : captured.manifestId;
      if (!recognizedLegacyManifestId(manifestId))
        throw Error('general_legacy_manifest');
      if (!legacyReader || !legacyConfig)
        throw Error('general_legacy_unavailable');
      if (
        ![4, 6, 8].includes(captured.selection?.lanes) ||
        !['low', 'mid', 'high', 'sc'].includes(captured.selection?.difficulty)
      )
        throw Error('general_selection');
      cancel();
      const token = generation,
        c = new AbortController();
      pending = c;
      const signal = AbortSignal.any([
        lifetime.signal,
        c.signal,
        ...(callerSignal ? [callerSignal] : []),
      ]);
      try {
        const adder = await waitAcquired(getLegacyAdder(), signal);
        check(signal);
        if (token !== generation) throw Error('general_superseded');
        const added = await waitAcquired(adder({ manifestId, signal }), signal);
        check(signal);
        if (token !== generation) throw Error('general_superseded');
        if (
          !added ||
          added.kind !== 'orvio-opus-v1' ||
          added.restored !== false ||
          !added.record
        )
          throw Error('general_legacy_sidecar');
        return await pinPrepared(
          { record: added.record },
          captured.selection,
          {
            title: String(
              captured.metadata?.title ?? 'YouTube automatic chart',
            ).slice(0, 300),
            ...(captured.metadata?.author
              ? { author: String(captured.metadata.author).slice(0, 100) }
              : {}),
          },
          signal,
        );
      } finally {
        if (pending === c) pending = undefined;
      }
    },
    async extendCachedBase(input: any, { signal: callerSignal }: any = {}) {
      const captured = structuredClone(input);
      check(callerSignal);
      if (
        ![4, 6, 8].includes(captured.selection?.lanes) ||
        !['low', 'mid', 'high', 'sc'].includes(captured.selection?.difficulty)
      )
        throw Error('general_selection');
      cancel();
      const token = generation,
        c = new AbortController();
      pending = c;
      const signal = AbortSignal.any([
        lifetime.signal,
        c.signal,
        ...(callerSignal ? [callerSignal] : []),
      ]);
      try {
        const result = await pinPrepared(
          { record: captured.baseRecord },
          captured.selection,
          {
            title: String(
              captured.metadata?.title ?? 'YouTube automatic chart',
            ).slice(0, 300),
            ...(captured.metadata?.author
              ? { author: String(captured.metadata.author).slice(0, 100) }
              : {}),
          },
          signal,
        );
        check(signal);
        if (token !== generation) throw Error('general_superseded');
        return result;
      } finally {
        if (pending === c) pending = undefined;
      }
    },
    async consumeAcquiredJob(input: any, { signal: callerSignal }: any = {}) {
      const captured = structuredClone(input);
      check(callerSignal);
      const job = captureAcquiredOpusV2(captured.job);
      if (job.status !== 'verified' || job.videoId !== captured.videoId)
        throw Error('general_acquired_job');
      if (
        ![4, 6, 8].includes(captured.selection?.lanes) ||
        !['low', 'mid', 'high', 'sc'].includes(captured.selection?.difficulty)
      )
        throw Error('general_selection');
      cancel();
      const token = generation,
        c = new AbortController();
      pending = c;
      const signal = AbortSignal.any([
        lifetime.signal,
        c.signal,
        ...(callerSignal ? [callerSignal] : []),
      ]);
      try {
        const prepared = await prepare(job, signal);
        check(signal);
        if (token !== generation) throw Error('general_superseded');
        return await pinPrepared(
          prepared,
          captured.selection,
          {
            title: String(
              captured.metadata?.title ?? 'YouTube automatic chart',
            ).slice(0, 300),
            ...(captured.metadata?.author
              ? { author: String(captured.metadata.author).slice(0, 100) }
              : {}),
          },
          signal,
        );
      } finally {
        if (pending === c) pending = undefined;
      }
    },
  });
}
