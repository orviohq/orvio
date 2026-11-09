// PRIVATE fresh trusted-transport interface. No old journal API adaptation.
import { createOpus468Consumer } from './opus468-consumer.mjs';
import { parseVerifiedDescriptor } from './opus-descriptor.mjs';
const copy = (x) => structuredClone(x),
  fail = (code) => {
    throw Error(code);
  };
const exact = (o, keys) =>
  !!o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));
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
const VERDICT = [
  'ok',
  'version',
  'kind',
  'song',
  'extensionSha256',
  ...ROOTS,
  'policy',
  'playableKeys',
  'durable',
];
const POLICY = [
  'generatorVersion',
  'producerSha256',
  'recipeSha256',
  'corpusSha256',
];
const requestKeys = [
  'version',
  'videoId',
  'encodedAudioSha256',
  'baseSourceRecordJson',
  'extension',
];
/** trustedExchange is trusted BUILD CODE, not a URL/response/callback supplied
 * by imported data. It must implement the reviewed owner transport: exact
 * origin/HTTPS/auth/redirect handling and response byte limit. No such public
 * transport is shipped. A local in-process Worker adapter can implement it in
 * tests. A caller cannot pass an old verdict into this API. Each read invokes
 * exchange with a new random nonce and locally verifies roots/policy/descriptor
 * and derived chart data before returning notes. This is NOT replay execution,
 * an IDB durability adapter, a signed capability or an owner journal.
 */
export function createOpus468FreshChartReader({
  consumerOptions = {},
  trustedExchange,
} = {}) {
  const options = {
    ...consumerOptions,
    policyRows: copy(consumerOptions.policyRows ?? []),
    loadedProducerIdentity: copy(consumerOptions.loadedProducerIdentity),
  };
  createOpus468Consumer(options); // same strict policy shape + forbidden labels
  if (
    typeof trustedExchange !== 'function' ||
    typeof options.verifyDerivedRecord !== 'function'
  )
    fail('fresh_reader_dependencies');
  return Object.freeze({
    async readChart(input, descriptorBytes, selection, { signal } = {}) {
      // All caller objects are detached BEFORE async descriptor/exchange operations.
      const request = copy(input),
        rawDescriptor = copy(descriptorBytes),
        choice = copy(selection);
      if (
        !exact(request, requestKeys) ||
        request.version !== 1 ||
        !exact(choice, ['lanes', 'difficulty']) ||
        ![4, 6, 8].includes(choice.lanes) ||
        !['low', 'mid', 'high', 'sc'].includes(choice.difficulty)
      )
        fail('fresh_request');
      const extension = request.extension;
      if (
        !extension ||
        extension.videoId !== request.videoId ||
        extension.encodedAudioSha256 !== request.encodedAudioSha256
      )
        fail('fresh_request_binding');
      const policy = options.policyRows.find(
          (p) => p.generatorVersion === extension.generatorVersion,
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
      const descriptor = await parseVerifiedDescriptor(
        rawDescriptor,
        extension.audioDescriptorSha256,
      );
      const base = JSON.parse(request.baseSourceRecordJson);
      if (
        (await options.verifyDerivedRecord(extension, {
          baseRecordRaw: request.baseSourceRecordJson,
          baseRecord: base,
          descriptor,
          descriptorSha256: extension.audioDescriptorSha256,
          signal,
        })) !== true
      )
        fail('fresh_derived_record');
      signal?.throwIfAborted();
      const requestId = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      const sent = copy({ requestId, admission: request });
      // Snapshot response immediately after await; do not expose a reusable verdict.
      const response = copy(await trustedExchange(sent, { signal }));
      signal?.throwIfAborted();
      if (
        !exact(response, ['requestId', 'verdict']) ||
        response.requestId !== requestId
      )
        fail('fresh_response_binding');
      const verdict = response.verdict,
        song = `yt-opus-${extension.videoId}-${extension.audioSha256}-c${extension.baseChartSetSha256}-x${extension.extensionSha256}`;
      if (
        !exact(verdict, VERDICT) ||
        verdict.ok !== true ||
        verdict.version !== 1 ||
        verdict.kind !== 'orvio-opus468-admission-verdict-v1' ||
        verdict.durable !== false ||
        verdict.song !== song ||
        verdict.extensionSha256 !== extension.extensionSha256 ||
        ROOTS.some((k) => verdict[k] !== extension[k])
      )
        fail('fresh_verdict_binding');
      if (
        !exact(verdict.policy, POLICY) ||
        POLICY.some((k) => verdict.policy[k] !== policy[k])
      )
        fail('fresh_policy_binding');
      const playable = [4, 6, 8]
        .flatMap((n) => ['low', 'mid', 'high', 'sc'].map((t) => `${n}:${t}`))
        .filter((k) => !!extension.charts[k]?.notes);
      if (
        !Array.isArray(verdict.playableKeys) ||
        JSON.stringify(verdict.playableKeys) !== JSON.stringify(playable)
      )
        fail('fresh_slots_binding');
      const key = `${choice.lanes}:${choice.difficulty}`;
      if (!playable.includes(key)) fail('fresh_chart_unavailable');
      return copy({
        song,
        extensionSha256: extension.extensionSha256,
        baseSourceRecordSha256: extension.baseSourceRecordSha256,
        lanes: choice.lanes,
        difficulty: choice.difficulty,
        frozenNotes: extension.charts[key].notes,
      });
    },
  });
}
