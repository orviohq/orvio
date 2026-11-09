import { SONGS, makeChart, duration, type Note } from './chart';
import {
  validateRuntimeReplay,
  replayMatches,
  type RuntimeReplay,
} from './replay';
import type { SharedResult } from './share';
type Result = Omit<SharedResult, 'song'> & { song: string };
export interface BuiltinSession {
  key: string;
  kind: 'builtin';
  version: 1;
  chart: Note[];
  chartSha256: string;
  replay: RuntimeReplay;
  result: Result;
  title: string;
  playedAt?: number;
  durationSec?: number;
}
async function hash(chart: Note[]) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(chart)),
      ),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('orvio.builtin-replays.v1', 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore('sessions', { keyPath: 'key' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error('Local replay storage unavailable'));
  });
}
async function readAll() {
  const db = await open();
  try {
    return await new Promise<any[]>((resolve, reject) => {
      const r = db
        .transaction('sessions', 'readonly')
        .objectStore('sessions')
        .getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
async function validate(raw: any): Promise<BuiltinSession> {
  if (
    raw?.kind !== 'builtin' ||
    raw.version !== 1 ||
    typeof raw.key !== 'string' ||
    !raw.key.startsWith('builtin:') ||
    !SONGS.some((s) => s.id === raw.replay?.song && !s.id.startsWith('yt-')) ||
    typeof raw.title !== 'string' ||
    raw.title.length > 300 ||
    !Array.isArray(raw.chart) ||
    raw.chart.length < 1 ||
    raw.chart.length > 10000 ||
    !raw.chart.every(
      (n: any, i: number) =>
        Number.isInteger(n.id) &&
        n.id === i &&
        Number.isInteger(n.lane) &&
        n.lane >= 0 &&
        n.lane < raw.replay.lanes &&
        Number.isFinite(n.time) &&
        n.time >= 0 &&
        (i === 0 || n.time >= raw.chart[i - 1].time) &&
        (n.end === undefined || (Number.isFinite(n.end) && n.end > n.time)),
    )
  )
    throw Error('Invalid builtin session');
  if ((await hash(raw.chart)) !== raw.chartSha256)
    throw Error('Builtin chart integrity failed');
  const replay = validateRuntimeReplay(
    raw.replay,
    (id) => id === raw.replay.song,
  );
  if (!replay || !replayMatches(replay, raw.result, raw.chart))
    throw Error('Builtin replay verification failed');
  return { ...raw, replay };
}
export async function saveBuiltinSession(
  replay: RuntimeReplay,
  result: Result,
) {
  const song = SONGS.find(
    (s) => s.id === replay.song && !s.id.startsWith('yt-'),
  );
  if (!song) throw Error('Not builtin');
  const chart = makeChart(song, replay.difficulty, replay.lanes);
  const raw = await validate({
    key: 'builtin:' + crypto.randomUUID(),
    kind: 'builtin',
    version: 1,
    chart,
    chartSha256: await hash(chart),
    replay,
    result,
    title: song.title,
    playedAt: Date.now(),
    durationSec: duration(song),
  });
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').add(raw);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return raw.key;
}
export async function readBuiltinSession(key: string) {
  const db = await open();
  let raw: any;
  try {
    raw = await new Promise((resolve, reject) => {
      const q = db
        .transaction('sessions', 'readonly')
        .objectStore('sessions')
        .get(key);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
  } finally {
    db.close();
  }
  return raw ? validate(raw) : null;
}
export async function listBuiltinSessions() {
  const out: BuiltinSession[] = [];
  for (const raw of await readAll()) {
    try {
      out.push(await validate(raw));
    } catch {
      /* Leave corrupt archive untouched. */
    }
  }
  return out;
}
