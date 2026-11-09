import { enumerateCursorPages } from './idb-cursor-enumeration';
// PRIVATE FE integration. Dependencies are reviewed BUILD-owned services, never
// fields accepted from a chart, share, storage row or remote response.
import { Engine } from '../engine';
import { transformChart } from '../game-options';
import {
  validateRuntimeReplay,
  replayEngine,
  replayMatches,
  type RuntimeReplay,
} from '../replay';
import type { Song, Note, Difficulty } from '../chart';
import type { OpusRecord } from './opus-record';
import { verifyOpusRecord } from './opus-record';
import { opusPcmToAudioBuffer } from './opus-chart-worker-client.mjs';
import { sha256 } from '@noble/hashes/sha2.js';
const copy = <T>(x: T): T => structuredClone(x);
const digest = (b: Uint8Array) =>
  Array.from(sha256(b), (b) => b.toString(16).padStart(2, '0')).join('');
const hashText = (s: string) => digest(new TextEncoder().encode(s));
function fail(s: string): never {
  throw Error(s);
}
interface Selection {
  lanes: 4 | 6 | 8;
  difficulty: Difficulty;
}
interface Request {
  version: 1;
  videoId: string;
  encodedAudioSha256: string;
  baseSourceRecordJson: string;
  extension: any;
}
interface FreshChart {
  song: string;
  extensionSha256: string;
  baseSourceRecordSha256: string;
  lanes: number;
  difficulty: string;
  frozenNotes: Note[];
}
interface FreshStore {
  pin(
    r: Request,
    d: Uint8Array,
    c: Selection,
    o?: { signal?: AbortSignal },
  ): Promise<{ song: string; localPinCommitted: boolean }>;
  restore(
    song: string,
    o?: { signal?: AbortSignal },
  ): Promise<{ song: string; localPinCommitted: boolean } | null>;
  readChart(
    song: string,
    c: Selection,
    o?: { signal?: AbortSignal },
  ): Promise<FreshChart>;
}
interface PinRow {
  version: 1;
  key: string;
  request: Request;
  descriptorBytes: Uint8Array;
  selection: Selection;
  title: string;
  author?: string;
}
interface SessionRow {
  version: 1;
  key: string;
  song: string;
  baseSourceRecordSha256: string;
  extensionSha256: string;
  replay: RuntimeReplay;
  result: any;
  playedAt: number;
}
const songIdentity = (r: Request) =>
  `yt-opus-${r.extension.videoId}-${r.extension.audioSha256}-c${r.extension.baseChartSetSha256}-x${r.extension.extensionSha256}`;
/** Separate database. A local write never claims owner authority or atomicity
 * with fresh-store's database. No mutation of old source/session/5/7 records. */
function database(name: string) {
  async function transaction(
    store: string,
    mode: IDBTransactionMode,
    work: (s: IDBObjectStore, done: (v: any) => void) => void,
    signal?: AbortSignal,
  ): Promise<any> {
    signal?.throwIfAborted();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => {
        for (const s of ['catalog', 'sessions'])
          r.result.createObjectStore(s, { keyPath: 'key' });
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => r.result.close();
        resolve(r.result);
      };
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(Error('extension_library_blocked'));
    });
    try {
      return await new Promise((resolve, reject) => {
        signal?.throwIfAborted();
        const tx = db.transaction(store, mode);
        let value: any;
        const abort = () => {
          try {
            tx.abort();
          } catch {}
        };
        const clean = () => signal?.removeEventListener('abort', abort);
        tx.oncomplete = () => {
          clean();
          resolve(value);
        };
        tx.onabort = () => {
          clean();
          reject(
            signal?.aborted
              ? signal.reason
              : (tx.error ?? Error('extension_library_aborted')),
          );
        };
        tx.onerror = () => {};
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) {
          abort();
          return;
        }
        try {
          work(tx.objectStore(store), (v) => {
            value = v;
          });
        } catch (e) {
          clean();
          abort();
          reject(e);
        }
      });
    } finally {
      db.close();
    }
  }
  return {
    get: (s: string, k: string, signal?: AbortSignal) =>
      transaction(
        s,
        'readonly',
        (store, done) => {
          const r = store.get(k);
          r.onsuccess = () => done(r.result ?? null);
        },
        signal,
      ),
    scan: (s: string, signal?: AbortSignal) =>
      transaction(
        s,
        'readonly',
        (store, done) => {
          enumerateCursorPages(store, done, signal);
        },
        signal,
      ),
    add: (s: string, row: any, signal?: AbortSignal) =>
      transaction(
        s,
        'readwrite',
        (store, done) => {
          store.add(row);
          done(true);
        },
        signal,
      ),
  };
}
export function createOpus468Frontend({
  freshStore,
  readAudio,
  databaseName = 'orvio.opus468.frontend.v1',
}: {
  freshStore: FreshStore;
  readAudio: (
    base: OpusRecord,
    signal?: AbortSignal,
    descriptorBytes?: Uint8Array,
  ) => Promise<ArrayBuffer>;
  databaseName?: string;
}) {
  const db = database(databaseName),
    catalog = new Map<string, PinRow>();
  function bind(row: PinRow, chart: FreshChart) {
    if (
      !(row?.descriptorBytes instanceof Uint8Array) ||
      digest(row.descriptorBytes) !==
        row.request.extension.audioDescriptorSha256
    )
      fail('extension_catalog_descriptor');
    if (
      !row ||
      row.version !== 1 ||
      songIdentity(row.request) !== row.key ||
      chart.song !== row.key ||
      chart.extensionSha256 !== row.request.extension.extensionSha256 ||
      chart.baseSourceRecordSha256 !==
        hashText(row.request.baseSourceRecordJson)
    )
      fail('extension_source_changed');
    if (
      ![4, 6, 8].includes(chart.lanes) ||
      !['low', 'mid', 'high', 'sc'].includes(chart.difficulty) ||
      !Array.isArray(chart.frozenNotes) ||
      chart.frozenNotes.length === 0
    )
      fail('extension_chart_binding');
    const expected =
      row.request.extension.charts[`${chart.lanes}:${chart.difficulty}`]?.notes;
    if (JSON.stringify(expected) !== JSON.stringify(chart.frozenNotes))
      fail('extension_frozen_chart_changed');
  }
  async function current(
    song: string,
    choice: Selection,
    signal?: AbortSignal,
  ) {
    if (!catalog.has(song)) fail('extension_not_restored');
    const row = (await db.get('catalog', song, signal)) as PinRow | null;
    if (!row || JSON.stringify(row) !== JSON.stringify(catalog.get(song)))
      fail('extension_catalog_changed');
    const chart = await freshStore.readChart(song, copy(choice), { signal });
    if (chart.lanes !== choice.lanes || chart.difficulty !== choice.difficulty)
      fail('extension_selection_changed');
    bind(row, chart);
    signal?.throwIfAborted();
    return { row, chart };
  }
  function display(row: PinRow): Song {
    const base = JSON.parse(row.request.baseSourceRecordJson);
    return {
      id: row.key,
      title: row.title,
      subtitle: row.author ?? 'YouTube',
      bpm: base.estimatedBpm,
      root: 57,
      scale: [0, 2, 4, 7, 9],
      color: '#29d8ff',
      genre: 'YOUTUBE',
      bars: 0,
    };
  }
  async function audio(row: PinRow, signal?: AbortSignal) {
    const base = JSON.parse(row.request.baseSourceRecordJson) as OpusRecord;
    if (
      !(await verifyOpusRecord(base)) ||
      base.audioSha256 !== row.request.extension.audioSha256 ||
      base.chartSetSha256 !== row.request.extension.baseChartSetSha256 ||
      base.audioDescriptorSha256 !==
        row.request.extension.audioDescriptorSha256 ||
      base.encodedAudioSha256 !== row.request.encodedAudioSha256
    )
      fail('extension_audio_base');
    const supplied = await readAudio(
      copy(base),
      signal,
      copy(row.descriptorBytes),
    );
    // Acquire exclusive ownership immediately after the async supplier boundary,
    // before hashing or awaiting current owner validation. No supplier alias may
    // later change samples accepted by this play attempt.
    if (!(supplied instanceof ArrayBuffer)) fail('extension_audio_pcm');
    const pcm = supplied.slice(0);
    signal?.throwIfAborted();
    // Independently require exact complete PCM. No geometry-only success or
    // Promise/envelope truthiness may cross into AudioBuffer or Engine use.
    if (
      !(pcm instanceof ArrayBuffer) ||
      pcm.byteLength !== base.frames * 4 ||
      digest(new Uint8Array(pcm)) !== base.audioSha256
    )
      fail('extension_audio_pcm');
    return { pcm, frames: base.frames };
  }
  return Object.freeze({
    async pin(
      request: Request,
      descriptorBytes: Uint8Array,
      selection: Selection,
      metadata: { title: string; author?: string },
      { signal }: { signal?: AbortSignal } = {},
    ) {
      const row: PinRow = {
        version: 1,
        key: songIdentity(request),
        request: copy(request),
        descriptorBytes: copy(descriptorBytes),
        selection: copy(selection),
        title: metadata.title.slice(0, 300),
        ...(metadata.author ? { author: metadata.author.slice(0, 100) } : {}),
      };
      const pin = await freshStore.pin(
        copy(row.request),
        copy(row.descriptorBytes),
        copy(row.selection),
        { signal },
      );
      if (pin.localPinCommitted !== true || pin.song !== row.key)
        fail('extension_pin_not_committed');
      const chart = await freshStore.readChart(row.key, row.selection, {
        signal,
      });
      bind(row, chart);
      const existing = await db.get('catalog', row.key, signal);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(row))
          fail('extension_catalog_conflict');
      } else await db.add('catalog', row, signal);
      signal?.throwIfAborted();
      catalog.set(row.key, copy(row));
      return { song: display(row), localPinCommitted: true };
    },
    async restore(song: string, { signal }: { signal?: AbortSignal } = {}) {
      const row = (await db.get('catalog', song, signal)) as PinRow | null;
      if (!row) return null;
      const restored = await freshStore.restore(song, { signal });
      if (restored?.song !== song || restored.localPinCommitted !== true)
        fail('extension_pin_missing');
      const chart = await freshStore.readChart(song, row.selection, { signal });
      bind(row, chart);
      signal?.throwIfAborted();
      catalog.set(song, copy(row));
      return display(row);
    },
    async catalogView(song: string, { signal }: { signal?: AbortSignal } = {}) {
      const row = catalog.get(song);
      if (!row) fail('extension_not_restored');
      const fresh = await current(song, row.selection, signal);
      const base = JSON.parse(fresh.row.request.baseSourceRecordJson);
      return {
        song: display(fresh.row),
        baseRecord: copy(base) as OpusRecord,
        seconds: base.frames / base.sampleRate,
        charts: copy(fresh.row.request.extension.charts),
      };
    },
    async restoreCatalog({ signal }: { signal?: AbortSignal } = {}) {
      const rows = (await db.scan('catalog', signal)) as PinRow[];
      const restored = [];
      for (const row of rows) {
        signal?.throwIfAborted();
        const item = await this.restore(row.key, { signal });
        if (!item) fail('extension_not_restored');
        restored.push(item);
      }
      return restored;
    },
    async restoreSession(
      key: string,
      { signal }: { signal?: AbortSignal } = {},
    ) {
      const row = (await db.get('sessions', key, signal)) as SessionRow | null;
      if (!row || row.key !== key || typeof row.song !== 'string')
        fail('extension_session_missing');
      const restored = await this.restore(row.song, { signal });
      if (!restored) fail('extension_not_restored');
      return this.readSession(key, { signal });
    },
    async listSessions({ signal }: { signal?: AbortSignal } = {}) {
      const rows = (await db.scan('sessions', signal)) as SessionRow[];
      const result = [];
      for (const row of rows) {
        signal?.throwIfAborted();
        const restored = await this.restore(row.song, { signal });
        if (!restored) fail('extension_not_restored');
        const loaded = await this.readSession(row.key, { signal });
        if (!loaded) fail('extension_session_missing');
        const view = await this.catalogView(row.song, { signal });
        result.push({
          ...loaded.session,
          title: view.song.title,
          kind: 'extension' as const,
          durationSec: view.seconds,
        });
      }
      return result;
    },
    list() {
      return [...catalog.values()].map(display);
    },
    async play(
      song: string,
      selection: Selection,
      options: { shuffle: any; seed: number },
      context: BaseAudioContext,
      { signal }: { signal?: AbortSignal } = {},
    ) {
      if (
        !['off', 'mirror', 'random'].includes(options.shuffle) ||
        !Number.isInteger(options.seed) ||
        options.seed < 0 ||
        options.seed > 0xffffffff
      )
        fail('extension_play_options');
      const choice = copy(selection),
        settings = copy(options),
        { row, chart } = await current(song, choice, signal),
        decoded = await audio(row, signal);
      // Revalidate after asynchronous decode; a cached catalog/audio buffer is
      // never an owner verdict. The actual Engine uses only these fresh notes.
      const fresh = await current(song, choice, signal);
      if (JSON.stringify(fresh.chart) !== JSON.stringify(chart))
        fail('extension_chart_changed_during_audio');
      return {
        song: display(row),
        engine: new Engine(
          transformChart(
            copy(chart.frozenNotes),
            choice.lanes,
            settings.shuffle,
            settings.seed,
          ),
        ),
        audio: opusPcmToAudioBuffer(context, decoded.pcm, decoded.frames),
        identity: {
          song,
          extensionSha256: chart.extensionSha256,
          baseSourceRecordSha256: chart.baseSourceRecordSha256,
        },
        frozenNotes: copy(chart.frozenNotes),
      };
    },
    async saveSession(
      replayInput: RuntimeReplay,
      resultInput: any,
      { signal }: { signal?: AbortSignal } = {},
    ) {
      const replay = copy(replayInput),
        result = copy(resultInput),
        validated = validateRuntimeReplay(replay, (id) => id === replay.song);
      if (!validated || ![4, 6, 8].includes(replay.lanes))
        fail('extension_replay_shape');
      const { chart } = await current(
        replay.song,
        { lanes: replay.lanes as 4 | 6 | 8, difficulty: replay.difficulty },
        signal,
      );
      if (!replayMatches(validated, result, chart.frozenNotes))
        fail('extension_replay_result');
      const session: SessionRow = {
        version: 1,
        key: replay.song + ':' + crypto.randomUUID(),
        song: replay.song,
        extensionSha256: chart.extensionSha256,
        baseSourceRecordSha256: chart.baseSourceRecordSha256,
        replay: validated,
        result,
        playedAt: Date.now(),
      };
      await db.add('sessions', session, signal);
      return session.key;
    },
    async readSession(key: string, { signal }: { signal?: AbortSignal } = {}) {
      const session = (await db.get(
        'sessions',
        key,
        signal,
      )) as SessionRow | null;
      if (!session) return null;
      const replay = validateRuntimeReplay(
        session.replay,
        (id) => id === session.song,
      );
      if (
        session.version !== 1 ||
        session.key !== key ||
        !replay ||
        ![4, 6, 8].includes(replay.lanes)
      )
        fail('extension_session_shape');
      const { chart } = await current(
        session.song,
        { lanes: replay.lanes as 4 | 6 | 8, difficulty: replay.difficulty },
        signal,
      );
      if (
        session.extensionSha256 !== chart.extensionSha256 ||
        session.baseSourceRecordSha256 !== chart.baseSourceRecordSha256 ||
        !replayMatches(replay, session.result, chart.frozenNotes)
      )
        fail('extension_session_changed');
      return {
        session: copy(session),
        engine: replayEngine(replay, copy(chart.frozenNotes)),
        frozenNotes: copy(chart.frozenNotes),
      };
    },
    exportShare(): never {
      return fail('extension_share_contract_unavailable');
    },
  });
}
