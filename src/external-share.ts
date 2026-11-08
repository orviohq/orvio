import {
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';
import { sourceId } from './external-catalog';
import { Engine } from './engine';
import { transformChart } from './game-options';
import {
  validateRuntimeReplay,
  applyReplayOp,
  type RuntimeReplay,
  type ReplayData,
} from './replay';
import { packReplay, unpackReplay } from './replay-binary';
import { readResult, resultParams, type SharedResult } from './share';
export const V5_MAX_FRAGMENT_CHARS = 699058;
export const V5_MAX_COMPRESSED_BYTES = 524288;
export const V5_MAX_INFLATED_BYTES = 4 * 1024 * 1024;
export type ExternalResult = Omit<SharedResult, 'song'> & { song: string };
export interface ExternalSharedReplay {
  record: SourceRecord;
  replay: RuntimeReplay;
  result: ExternalResult;
  title: string;
  jobId?: string;
}
const utf8 = new TextEncoder();
function b64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function unb64(text: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw Error('Invalid replay encoding');
  return Uint8Array.from(
    atob(text.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
}
async function sha(text: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', utf8.encode(text))),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
async function transform(bytes: Uint8Array, compress: boolean) {
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(
      compress
        ? new CompressionStream('deflate')
        : new DecompressionStream('deflate'),
    )
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > (compress ? V5_MAX_COMPRESSED_BYTES : V5_MAX_INFLATED_BYTES)) {
      await reader.cancel();
      throw Error('Share too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
export function externalReplayEngine(
  replay: RuntimeReplay,
  record: SourceRecord,
) {
  const chart = record.charts[`${replay.lanes}:${replay.difficulty}`];
  if (!chart) throw Error('Missing original chart');
  return new Engine(
    transformChart(
      chart.notes,
      replay.lanes,
      replay.options.shuffle,
      replay.options.seed,
    ),
    replay.fever,
  );
}
export function matchesExternalReplay(
  replay: RuntimeReplay,
  result: ExternalResult,
  record: SourceRecord,
) {
  if (
    replay.song !== sourceId(record) ||
    replay.song !== result.song ||
    replay.lanes !== result.lanes ||
    replay.difficulty !== result.difficulty
  )
    return false;
  const finalOptions = { ...replay.options };
  for (const op of replay.ops)
    if (op[0] === 3) {
      finalOptions.speed = op[3];
      finalOptions.fader = op[4];
    }
  if (
    result.options &&
    Object.keys(finalOptions).some(
      (k) =>
        finalOptions[k as keyof typeof finalOptions] !==
        result.options![k as keyof typeof finalOptions],
    )
  )
    return false;
  const engine = externalReplayEngine(replay, record);
  replay.ops.forEach((op, i) => applyReplayOp(engine, op, i));
  engine.update(9999);
  return (
    engine.score === result.score &&
    Math.abs(engine.sum / engine.total - result.accuracy) < 0.011 &&
    engine.maxCombo === result.combo &&
    !!result.judgments &&
    [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].every(
      (v, i) =>
        engine.events.filter((e) => e.value === v).length ===
        result.judgments![i],
    )
  );
}
function checkedResult(raw: unknown): ExternalResult {
  if (!raw || typeof raw !== 'object') throw Error('Invalid shared result');
  const r = raw as ExternalResult;
  if (typeof r.song !== 'string' || !Array.isArray(r.judgments))
    throw Error('Invalid shared result');
  const safe = readResult(resultParams({ ...r, song: 'first-light' }));
  if (!safe) throw Error('Invalid shared result');
  return { ...safe, song: r.song };
}
async function verify(data: ExternalSharedReplay) {
  if (
    !validSourceRecord(data.record) ||
    !(await verifyChartHashes(data.record))
  )
    throw Error('Invalid shared chart');
  if (
    !/^[^\u0000-\u001F\u007F-\u009F]{1,300}$/u.test(data.title) ||
    (data.jobId !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(data.jobId))
  )
    throw Error('Invalid shared source');
  const replay = validateRuntimeReplay(
    data.replay,
    (id) => id === sourceId(data.record),
  );
  const result = checkedResult(data.result);
  if (!replay || !matchesExternalReplay(replay, result, data.record))
    throw Error('Shared replay does not match');
  return { ...data, replay, result };
}
/** No fetch, audio, account identity or upload. Call only from the explicit share click. */
export async function encodeExternalShare(data: ExternalSharedReplay) {
  const safe = await verify(data);
  const sourceRecord = JSON.stringify(safe.record);
  const envelope = {
    kind: 'external-replay',
    sourceRecord,
    sourceRecordSha256: await sha(sourceRecord),
    replayR2: b64(packReplay(safe.replay as ReplayData)),
    title: safe.title,
    ...(safe.jobId ? { jobId: safe.jobId } : {}),
    result: safe.result,
  };
  const bytes = utf8.encode(JSON.stringify(envelope));
  if (bytes.length > V5_MAX_INFLATED_BYTES) throw Error('Share too large');
  const fragment = 'v=5&d=' + b64(await transform(bytes, true));
  if (fragment.length > V5_MAX_FRAGMENT_CHARS) throw Error('Share too large');
  return fragment;
}
/** Verifies a frozen chart and real replay without installing it or fetching audio. */
export async function decodeExternalShare(
  fragment: string,
): Promise<ExternalSharedReplay> {
  if (
    fragment.length > V5_MAX_FRAGMENT_CHARS ||
    !/^v=5&d=[A-Za-z0-9_-]+$/.test(fragment)
  )
    throw Error('Invalid shared replay');
  const packed = unb64(fragment.slice(6));
  if (packed.length > V5_MAX_COMPRESSED_BYTES) throw Error('Share too large');
  const obj = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(
      await transform(packed, false),
    ),
  );
  if (
    !obj ||
    obj.kind !== 'external-replay' ||
    Object.keys(obj).some(
      (k) =>
        ![
          'kind',
          'sourceRecord',
          'sourceRecordSha256',
          'replayR2',
          'title',
          'jobId',
          'result',
        ].includes(k),
    ) ||
    typeof obj.sourceRecord !== 'string' ||
    (await sha(obj.sourceRecord)) !== obj.sourceRecordSha256 ||
    typeof obj.replayR2 !== 'string'
  )
    throw Error('Invalid shared replay');
  const raw = unb64(obj.replayR2);
  if (raw[0] !== 82 || raw[1] !== 50) throw Error('Invalid replay format');
  return verify({
    record: JSON.parse(obj.sourceRecord),
    replay: unpackReplay(raw),
    result: obj.result,
    title: obj.title,
    ...(obj.jobId !== undefined ? { jobId: obj.jobId } : {}),
  });
}
