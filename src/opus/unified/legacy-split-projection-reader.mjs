import { validateOpusExtensionLocalBinding } from './local-binding-v2.mjs';
import { sha256Hex } from '../opus468-record.mjs';
import { createOpus468Consumer } from '../opus468-consumer.mjs';
import { parseVerifiedDescriptor } from '../opus-descriptor.mjs';
import {
  LEGACY_CURRENTNESS_PROJECTION_KIND,
  LEGACY_CURRENTNESS_SOURCE_KIND,
} from '../opus35-legacy-currentness-exchange.mjs';
import { resolveVerifiedLegacySource } from './legacy-source-registry.mjs';

const copy = (x) => structuredClone(x),
  fail = (x) => {
    throw Error(x);
  };
const exact = (o, keys) =>
  o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));
const KEYS = [
  'version',
  'kind',
  'requestId',
  'ok',
  'videoId',
  'encodedAudioSha256',
  'audioDescriptorSha256',
  'audioSha256',
  'decoderWasmSha256',
  'frames',
  'sampleRate',
  'channels',
  'sourceKind',
  'artifactRole',
  'chartEngineBinding',
  'publicationEpoch',
  'currentAtConfirmation',
];
const ROOTS = [
  'videoId',
  'encodedAudioSha256',
  'audioDescriptorSha256',
  'audioSha256',
  'decoderWasmSha256',
  'frames',
  'sampleRate',
  'channels',
];
const EXPECTED = [
  'videoId',
  'encodedAudioSha256',
  'audioDescriptorSha256',
  'audioSha256',
  'decoderWasmSha256',
  'frames',
];
const REQUEST = [
  'version',
  'videoId',
  'encodedAudioSha256',
  'baseSourceRecordJson',
  'extension',
];
const HASH = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const EPOCH = (x) =>
  typeof x === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);

export function createProductionLegacySplitProjectionReader({
  consumerOptions = {},
  exchangeCurrentness,
} = {}) {
  const options = {
    ...consumerOptions,
    policyRows: copy(consumerOptions.policyRows ?? []),
    loadedProducerIdentity: copy(consumerOptions.loadedProducerIdentity),
  };
  createOpus468Consumer(options);
  if (
    typeof options.verifyDerivedRecord !== 'function' ||
    typeof exchangeCurrentness !== 'function'
  )
    fail('legacy_projection_reader_dependencies');
  return Object.freeze({
    async readChart(input, descriptorBytes, selection, { signal } = {}) {
      const request = copy(input),
        bytes = copy(descriptorBytes),
        choice = copy(selection);
      if (
        !exact(request, REQUEST) ||
        request.version !== 1 ||
        !exact(choice, ['lanes', 'difficulty']) ||
        ![4, 6, 8].includes(choice.lanes) ||
        !['low', 'mid', 'high', 'sc'].includes(choice.difficulty)
      )
        fail('fresh_request');
      const e = request.extension;
      if (
        !e ||
        e.videoId !== request.videoId ||
        e.encodedAudioSha256 !== request.encodedAudioSha256
      )
        fail('fresh_request_binding');
      const policy = options.policyRows.find(
          (p) => p.generatorVersion === e.generatorVersion,
        ),
        loaded = options.loadedProducerIdentity;
      if (
        !policy ||
        !loaded ||
        loaded.producerSha256 !== policy.producerSha256 ||
        loaded.recipeSha256 !== policy.recipeSha256
      )
        fail('fresh_generator_unqualified');
      signal?.throwIfAborted();
      const d = await parseVerifiedDescriptor(bytes, e.audioDescriptorSha256),
        base = JSON.parse(request.baseSourceRecordJson);
      if (
        e.videoId !== d.videoId ||
        e.encodedAudioSha256 !== d.oggSha256 ||
        e.audioSha256 !== d.pcm16Sha256 ||
        e.decoderWasmSha256 !== d.decoderWasmSha256 ||
        e.frames !== d.frames ||
        e.sampleRate !== d.sampleRate ||
        e.channels !== d.channels
      )
        fail('projection_local_roots');
      const binding = await validateOpusExtensionLocalBinding({
        extension: e,
        baseSourceRecordJson: request.baseSourceRecordJson,
        descriptor: d,
        qualifiedGeneratorVersions: [policy.generatorVersion],
      });
      signal?.throwIfAborted();
      if (binding?.ok !== true)
        fail('production_local_binding_' + (binding?.error ?? 'missing'));
      const canonicalBytes = new TextEncoder().encode(
        JSON.stringify({
          ...binding.canonical,
          extensionSha256: binding.extensionSha256,
        }),
      );
      if (
        !(binding.storedBytes instanceof Uint8Array) ||
        binding.storedBytes.length > 1572864 ||
        sha256Hex(binding.storedBytes) !== binding.storedBytesSha256 ||
        sha256Hex(canonicalBytes) !== binding.storedBytesSha256 ||
        JSON.stringify(
          JSON.parse(new TextDecoder().decode(binding.storedBytes)),
        ) !== JSON.stringify(e)
      )
        fail('production_stored_representation');
      const playable = [4, 6, 8]
        .flatMap((n) => ['low', 'mid', 'high', 'sc'].map((t) => `${n}:${t}`))
        .filter((k) => !!e.charts?.[k]?.notes);
      if (
        JSON.stringify(binding.playableKeys) !== JSON.stringify(playable) ||
        !playable.includes(`${choice.lanes}:${choice.difficulty}`)
      )
        fail('production_playable_keys');
      if (
        (await options.verifyDerivedRecord(e, {
          baseRecordRaw: request.baseSourceRecordJson,
          baseRecord: base,
          descriptor: d,
          descriptorSha256: e.audioDescriptorSha256,
          signal,
        })) !== true
      )
        fail('fresh_derived_record');
      signal?.throwIfAborted();
      const registered = await resolveVerifiedLegacySource({
        descriptorBytes: bytes,
        baseRecord: base,
        signal,
      });
      if (!registered) fail('legacy_source_registry_binding');
      signal?.throwIfAborted();
      const expected = {
        videoId: e.videoId,
        encodedAudioSha256: e.encodedAudioSha256,
        audioDescriptorSha256: e.audioDescriptorSha256,
        audioSha256: e.audioSha256,
        decoderWasmSha256: e.decoderWasmSha256,
        frames: e.frames,
      };
      if (!exact(expected, EXPECTED)) fail('legacy_currentness_binding');
      const projection = copy(
        await exchangeCurrentness(expected, { signal }),
      );
      signal?.throwIfAborted();
      if (
        !exact(projection, KEYS) ||
        projection.version !== 1 ||
        projection.kind !== LEGACY_CURRENTNESS_PROJECTION_KIND ||
        !HASH(projection.requestId) ||
        projection.ok !== true ||
        projection.currentAtConfirmation !== true ||
        projection.sourceKind !== LEGACY_CURRENTNESS_SOURCE_KIND ||
        projection.artifactRole !== 'audio-only' ||
        projection.chartEngineBinding !== null ||
        !EPOCH(projection.publicationEpoch) ||
        projection.sampleRate !== 48000 ||
        projection.channels !== 2 ||
        ROOTS.some((k) => projection[k] !== e[k])
      )
        fail('legacy_projection_current_audio_binding');
      const selected = e.charts?.[`${choice.lanes}:${choice.difficulty}`];
      if (!Array.isArray(selected?.notes) || selected.notes.length === 0)
        fail('fresh_chart_unavailable');
      const song = `yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`;
      return copy({
        song,
        extensionSha256: e.extensionSha256,
        baseSourceRecordSha256: e.baseSourceRecordSha256,
        lanes: choice.lanes,
        difficulty: choice.difficulty,
        frozenNotes: selected.notes,
      });
    },
  });
}
