// NEW public composition CANDIDATE factory. Not activated; no main install.
// New public-scope decision is explicit, existing private binding untouched.
// readArtifact/exchangeProjection are reviewed BUILD CODE, never imported inputs.
import {
  PUBLIC_CANDIDATE_BINDING as RELEASE_BINDING,
  PUBLIC_CANDIDATE_POLICY as PRIVATE_POLICY,
  PUBLIC_CANDIDATE_LOADED_IDENTITY as PRIVATE_LOADED_IDENTITY,
} from './release-binding.generated.mjs';
import { createProduction468SplitProjectionReader } from './split-projection-reader.mjs';
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
}: any) {
  if (
    typeof readArtifact !== 'function' ||
    typeof exchangeProjection !== 'function'
  )
    throw Error('general_build_capabilities');
  const lifetime = new AbortController();
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
  });
  const native = createProduction468SplitProjectionReader({
    consumerOptions: Object.freeze({
      policyRows: Object.freeze([PRIVATE_POLICY]),
      loadedProducerIdentity: PRIVATE_LOADED_IDENTITY,
      verifyDerivedRecord,
    }),
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
  const reader = Object.freeze({
    readChart: async (r: any, d: any, c: any, { signal }: any = {}) => {
      check(signal);
      const merged = signal
        ? AbortSignal.any([signal, lifetime.signal])
        : lifetime.signal;
      const result = await waitAcquired(
        native.readChart(r, d, c, { signal: merged }),
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
      const merged = signal
        ? AbortSignal.any([signal, lifetime.signal])
        : lifetime.signal;
      const source = await frontend.exportShare(sessionKey, { signal: merged });
      check(merged);
      return encodeV7SharedReplay(source, makeCodec(), { signal: merged });
    },
    async makeTransientSharedView(candidate: any, { signal }: any = {}) {
      check(signal);
      const captured = structuredClone(candidate),
        merged = signal
          ? AbortSignal.any([signal, lifetime.signal])
          : lifetime.signal;
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
