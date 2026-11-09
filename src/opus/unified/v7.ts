// NEW public wire candidate, no upload/routes/admission enabled here.
// Stage1 returns UNTRUSTED bootstrap inputs, not a playable/admission verdict.
import { validateOpusExtensionLocalBinding } from './local-binding-v2.mjs';
import { parseVerifiedDescriptor } from '../opus-descriptor.mjs';
import { validateRuntimeReplay } from '../../replay';
import { waitAcquired } from '../opus-acquired-v2-artifacts.mjs';
export const V7_COMPRESSED_MAX = 524288,
  V7_INFLATED_MAX = 4194304,
  V7_FRAGMENT_MAX = 699058;
const TE = new TextEncoder(),
  TD = new TextDecoder('utf-8', { fatal: true });
const KIND = 'orvio-autochart468-shared-replay-v7',
  GENERATOR = 'orvio-autochart468-c3unified-v1';
const fail = (s: string): never => {
  throw Error('share468_' + s);
};
const exact = (o: any, k: string[]) =>
  o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === k.length &&
  k.every((x) => Object.hasOwn(o, x));
const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) fail('base64');
  let out;
  try {
    out = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    fail('base64');
  }
  if (b64(out!) !== s) fail('base64_noncanonical');
  return out!;
};
async function transform(
  bytes: Uint8Array,
  compress: boolean,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(
        compress
          ? new CompressionStream('deflate')
          : new DecompressionStream('deflate'),
      ),
    r = stream.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const q = await waitAcquired(r.read(), signal);
      signal?.throwIfAborted();
      if (q.done) break;
      size += q.value.length;
      if (size > (compress ? V7_COMPRESSED_MAX : V7_INFLATED_MAX)) fail('size');
      chunks.push(q.value);
    }
  } finally {
    try {
      void r.cancel().catch(() => {});
    } catch {}
    try {
      r.releaseLock();
    } catch {}
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
export interface Share468Package {
  baseSourceRecordJson: string;
  extension: any;
  descriptorBytes: Uint8Array;
  replay: any;
  title: string;
  author: string | null;
}
async function structural(
  input: any,
  signal?: AbortSignal,
): Promise<Share468Package> {
  signal?.throwIfAborted();
  if (
    !exact(input, [
      'version',
      'kind',
      'baseSourceRecordJson',
      'extension',
      'descriptor',
      'replay',
      'title',
      'author',
    ]) ||
    input.version !== 7 ||
    input.kind !== KIND ||
    typeof input.baseSourceRecordJson !== 'string' ||
    typeof input.descriptor !== 'string' ||
    input.descriptor.length > 43691 ||
    typeof input.title !== 'string' ||
    TE.encode(input.title).length > 1200 ||
    input.title.length > 300 ||
    !/^[^\u0000-\u001f\u007f-\u009f]{1,300}$/u.test(input.title) ||
    !(
      input.author === null ||
      (typeof input.author === 'string' &&
        input.author.length <= 100 &&
        TE.encode(input.author).length <= 400 &&
        /^[^\u0000-\u001f\u007f-\u009f]{1,100}$/u.test(input.author))
    )
  )
    fail('shape');
  const descriptorBytes = unb64(input.descriptor);
  if (!descriptorBytes.length || descriptorBytes.length > 32768)
    fail('descriptor_size');
  const e = input.extension;
  if (e?.generatorVersion !== GENERATOR) fail('generator');
  const descriptor = await parseVerifiedDescriptor(
    descriptorBytes,
    e.audioDescriptorSha256,
  );
  signal?.throwIfAborted();
  const verdict = await validateOpusExtensionLocalBinding({
    extension: e,
    baseSourceRecordJson: input.baseSourceRecordJson,
    descriptor,
    qualifiedGeneratorVersions: [GENERATOR],
  });
  signal?.throwIfAborted();
  if (verdict?.ok !== true)
    fail('local_binding_' + (verdict?.error ?? 'missing'));
  const song = `yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`;
  if (
    !exact(input.replay, [
      'version',
      'song',
      'lanes',
      'difficulty',
      'options',
      'ops',
      'end',
    ])
  ) {
    // Optional replay fields are a fixed closed set, never arbitrary metadata.
    const keys = Object.keys(input.replay ?? {});
    if (
      ![
        'version',
        'song',
        'lanes',
        'difficulty',
        'options',
        'ops',
        'end',
      ].every((k) => Object.hasOwn(input.replay ?? {}, k)) ||
      keys.some(
        (k) =>
          ![
            'version',
            'song',
            'lanes',
            'difficulty',
            'options',
            'ops',
            'end',
            'audioLeadIn',
            'fever',
          ].includes(k),
      )
    )
      fail('replay_shape');
  }
  if (
    !exact(input.replay?.options, ['speed', 'fader', 'shuffle', 'seed']) ||
    (input.replay?.fever !== undefined &&
      !exact(input.replay.fever, ['version', 'rulesId', 'auto']))
  )
    fail('replay_shape');
  const replay = validateRuntimeReplay(
    input.replay,
    (id: string) => id === song,
  );
  if (
    !replay ||
    ![4, 6, 8].includes(replay.lanes) ||
    !verdict.playableKeys.includes(`${replay.lanes}:${replay.difficulty}`)
  )
    fail('replay');
  return structuredClone({
    baseSourceRecordJson: input.baseSourceRecordJson,
    extension: e,
    descriptorBytes,
    replay,
    title: input.title,
    author: input.author,
  });
}
export async function parseV7Bootstrap(
  fragment: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  if (
    typeof fragment !== 'string' ||
    fragment.length > V7_FRAGMENT_MAX ||
    !/^v=7&d=[A-Za-z0-9_-]+$/.test(fragment)
  )
    fail('fragment');
  const compressed = unb64(fragment.slice(6));
  if (compressed.length > V7_COMPRESSED_MAX) fail('size');
  const bytes = await transform(compressed, false, signal);
  let envelope;
  try {
    const raw = TD.decode(bytes);
    envelope = JSON.parse(raw);
    if (JSON.stringify(envelope) !== raw) fail('json_noncanonical');
  } catch {
    fail('json');
  }
  const candidate = await structural(envelope, signal);
  return {
    kind: 'untrusted-share468-bootstrap-candidate' as const,
    candidate,
    admitted: false as const,
  };
}
export async function encodeV7SharedReplay(
  input: Share468Package,
  localCodec: any,
  { signal }: { signal?: AbortSignal } = {},
) {
  const captured = structuredClone(input);
  signal?.throwIfAborted();
  // Existing codec performs all3gates with actual artifacts/currentness. Its wire
  // is discarded, not uploaded. This new envelope contains no result/audio.
  if (typeof localCodec?.encode !== 'function') fail('codec');
  await waitAcquired(
    localCodec.encode(
      {
        baseSourceRecordJson: captured.baseSourceRecordJson,
        extension: captured.extension,
        descriptorBytes: captured.descriptorBytes,
        replay: captured.replay,
      },
      { signal },
    ),
    signal,
  );
  signal?.throwIfAborted();
  const envelope = {
    version: 7,
    kind: KIND,
    baseSourceRecordJson: captured.baseSourceRecordJson,
    extension: captured.extension,
    descriptor: b64(captured.descriptorBytes),
    replay: captured.replay,
    title: captured.title,
    author: captured.author,
  };
  await structural(envelope, signal);
  const raw = TE.encode(JSON.stringify(envelope));
  if (raw.length > V7_INFLATED_MAX) fail('size');
  const compressed = await transform(raw, true, signal),
    fragment = 'v=7&d=' + b64(compressed);
  if (fragment.length > V7_FRAGMENT_MAX) fail('size');
  return fragment;
}
export async function validateRecoveredV7(
  candidate: Share468Package,
  localCodec: any,
  { signal }: { signal?: AbortSignal } = {},
) {
  // Only AFTER genuine nonce + stable encoded recovery. Original codec rechecks
  // all3gates. Returned binary feeds original installer; never skip its checks.
  const c = structuredClone(candidate);
  signal?.throwIfAborted();
  if (typeof localCodec?.encode !== 'function') fail('codec');
  return waitAcquired(
    localCodec.encode(
      {
        baseSourceRecordJson: c.baseSourceRecordJson,
        extension: c.extension,
        descriptorBytes: c.descriptorBytes,
        replay: c.replay,
      },
      { signal },
    ),
    signal,
  );
}
