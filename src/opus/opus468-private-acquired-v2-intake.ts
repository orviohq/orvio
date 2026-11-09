// Private acquired-job v2 coordinator. No acquisition route, public activation,
// injected generator, admission override or automatic visible registration.
import {
  createAcquiredOpusV2Preparer,
  type AcquiredArtifactCapability,
} from './opus-acquired-v2-prepare';
import { captureAcquiredOpusV2 } from './opus-acquired-v2-artifacts.mjs';
import { resolveOpus468LocalArtifacts } from './opus468-local-artifacts.mjs';
import { generatePrivateOpus468Extension } from './opus468-private-generate.mjs';
import { parseVerifiedDescriptor } from './opus-descriptor.mjs';
import { verifyOpusRecord } from './opus-record';
import { selfVerifyOpus468Extension, sha256Hex } from './opus468-record.mjs';
import type { createOpus468Frontend } from './opus468-frontend';
const PRODUCER_WORKER =
  '5cdfdd5e0080596947249e0c501f677d8df33fa385af5be9e6c2e3c7bc1cded2';
const PRODUCER_MANIFEST =
  '06b2e11582e4ec93784d733275bcef1c71d039def60efe218897c27f1323f6f5';
const RECIPE =
  '3956182ec2796ef6393100b914caccf8145f75cde63fa2465000821cf24ee193';
const GENERATOR =
  'opus468-testonly-c2nested-gap010-burst8-decor17c-adaptivebands-v2-unqualified';
const ROOTS = [
  'videoId',
  'baseSourceRecordSha256',
  'baseChartSetSha256',
  'audioSha256',
  'audioDescriptorSha256',
  'encodedAudioSha256',
  'decoderWasmSha256',
  'pipelineVersion',
  'frames',
  'sampleRate',
  'channels',
];
export function createPrivateOpus468AcquiredV2Intake({
  frontend,
  readArtifact,
}: {
  frontend: ReturnType<typeof createOpus468Frontend>;
  readArtifact: AcquiredArtifactCapability;
}) {
  const prepare = createAcquiredOpusV2Preparer({ readArtifact });
  let generation = 0,
    pending: AbortController | undefined;
  const cancel = () => {
    generation++;
    pending?.abort();
    pending = undefined;
  };
  return Object.freeze({
    cancel,
    async consumeAcquiredJob(
      input: {
        videoId: string;
        job: any;
        selection: {
          lanes: 4 | 6 | 8;
          difficulty: 'low' | 'mid' | 'high' | 'sc';
        };
      },
      { signal: callerSignal }: { signal?: AbortSignal } = {},
    ) {
      const captured = structuredClone(input),
        { videoId, job, selection } = captured;
      if (
        !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
        ![4, 6, 8].includes(selection?.lanes) ||
        !['low', 'mid', 'high', 'sc'].includes(selection?.difficulty)
      )
        throw Error('intake_selection');
      const acquired = captureAcquiredOpusV2(job);
      if (acquired.videoId !== videoId) throw Error('acquired_v2_video');
      if (acquired.status !== 'verified')
        throw Error('acquired_v2_not_verified');
      callerSignal?.throwIfAborted();
      cancel();
      const token = generation,
        controller = new AbortController();
      pending = controller;
      const signal = callerSignal
        ? AbortSignal.any([controller.signal, callerSignal])
        : controller.signal;
      const check = () => {
        signal.throwIfAborted();
        if (generation !== token) throw Error('intake_stale');
      };
      try {
        const prepared = await prepare(acquired, signal);
        check();
        const record = structuredClone(prepared.record),
          baseRecordRaw = JSON.stringify(record);
        if (
          prepared.kind !== 'orvio-opus-v1' ||
          record.videoId !== videoId ||
          record.audioSha256 !== acquired.audio.sha256 ||
          record.encodedAudioSha256 !== acquired.audio.encodedAudioSha256 ||
          prepared.descriptorSha256 !== acquired.audio.audioDescriptorSha256 ||
          record.audioDescriptorSha256 !==
            acquired.audio.audioDescriptorSha256 ||
          !(await verifyOpusRecord(
            record,
            prepared.descriptor,
            prepared.descriptorSha256,
          ))
        )
          throw Error('intake_prepared_binding');
        const artifacts = await resolveOpus468LocalArtifacts(record, {
          signal,
        });
        check();
        const descriptorBytes = artifacts.descriptorBytes.slice(),
          descriptor = await parseVerifiedDescriptor(
            descriptorBytes,
            record.audioDescriptorSha256,
          );
        const produced = await generatePrivateOpus468Extension({
          audioBytes: artifacts.audioBytes.slice().buffer,
          descriptorBytes: descriptorBytes.slice().buffer,
          decoderWasmBytes: artifacts.decoderWasmBytes.slice().buffer,
          baseRecordRaw,
          signal,
        });
        check();
        const e = produced?.extension,
          proof = produced?.proof;
        if (
          produced?.kind !== 'orvio-private-adaptive-v2-generated-extension' ||
          produced.loadedBuild?.workerSha256 !== PRODUCER_WORKER ||
          produced.loadedBuild?.buildRootSha256 !== PRODUCER_MANIFEST ||
          produced.qualified !== false ||
          produced.admission !== 'DENY' ||
          e?.generatorVersion !== GENERATOR ||
          proof?.ok !== true ||
          proof.recipeSha256 !== RECIPE ||
          proof.sourceCount !== 13 ||
          proof.regenerationLevel !== 2 ||
          proof.canonicalRecordMatch !== true ||
          proof.extensionSha256Match !== true ||
          ROOTS.some((k) => produced.roots?.[k] !== e?.[k]) ||
          e.baseSourceRecordSha256 !==
            sha256Hex(new TextEncoder().encode(baseRecordRaw))
        )
          throw Error('intake_producer_binding');
        selfVerifyOpus468Extension(e, {
          baseRecordRaw,
          baseRecord: record,
          descriptor,
          descriptorSha256: record.audioDescriptorSha256,
        });
        check();
        const request = {
          version: 1 as const,
          videoId,
          encodedAudioSha256: record.encodedAudioSha256,
          baseSourceRecordJson: baseRecordRaw,
          extension: e,
        };
        // Current fixed candidate is deliberately denied by the real policy-first
        // pin path. Generated extension is never saved as a workaround.
        try {
          await frontend.pin(
            request,
            descriptorBytes,
            selection,
            {
              title: 'YouTube',
            },
            { signal },
          );
        } catch (error) {
          check();
          if (
            error instanceof Error &&
            error.message === 'fresh_generator_unqualified'
          )
            return Object.freeze({
              status: 'unqualified' as const,
              baseCached: true,
              extensionInstalled: false,
              catalogInstalled: false,
              baseSourceRecordSha256: e.baseSourceRecordSha256,
              extensionSha256: e.extensionSha256,
            });
          throw error;
        }
        // A fixed unqualified candidate cannot legitimately succeed under this
        // composition. Never promote an unexpected truthy return into UI install.
        throw Error('intake_unexpected_admission');
      } finally {
        if (pending === controller) pending = undefined;
      }
    },
  });
}
