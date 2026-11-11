import { it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';

vi.mock('../src/opus/opus-record', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, verifyOpusRecord: vi.fn(async () => true) };
});

import { createOpus468FrontendSharing1935 } from '../src/opus/unified/frontend';

class Store {
  rows = new Map<string, any>();
  add(row: any) {
    this.rows.set(row.key, structuredClone(row));
  }
  get(key: string) {
    const req: any = { result: structuredClone(this.rows.get(key)) };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  }
}
class DB {
  stores = new Map<string, Store>([[ 'catalog', new Store() ], [ 'sessions', new Store() ]]);
  createObjectStore(name: string) { if (!this.stores.has(name)) this.stores.set(name, new Store()); }
  close() {}
  transaction(name: string) {
    const tx: any = {
      objectStore: () => this.stores.get(name),
      oncomplete: null,
      onabort: null,
      onerror: null,
      abort() { tx.onabort?.(); },
    };
    queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.()));
    return tx;
  }
}
const dbs = new Map<string, DB>();
(globalThis as any).indexedDB = {
  open(name: string) {
    const req: any = {};
    queueMicrotask(() => {
      const db = dbs.get(name) ?? new DB();
      dbs.set(name, db);
      req.result = db;
      req.onupgradeneeded?.();
      req.onsuccess?.();
    });
    return req;
  },
};

const digest = (b: Uint8Array | ArrayBuffer) => createHash('sha256').update(Buffer.from(b as any)).digest('hex');
const hashText = (s: string) => digest(new TextEncoder().encode(s)) as any;
const audio = (frames = 4) => { const b = new ArrayBuffer(frames * 4); const v = new DataView(b); for (let i=0;i<frames;i++){v.setInt16(i*4, 1000, true);v.setInt16(i*4+2,-1000,true);} return b; };

function fixture(id = 'mock') {
  const frames = 4, pcm = audio(frames), audioSha = digest(pcm), descriptor = new TextEncoder().encode('descriptor-'+id), descriptorSha = digest(descriptor);
  const notes = (lane: number) => [{ id: 0, time: 0.1, lane }];
  const base: any = {
    version: 2, videoId: 'MOCKVIDEO01', audioSha256: audioSha, audioDescriptorSha256: descriptorSha,
    encodedAudioSha256: digest(new TextEncoder().encode('encoded-'+id)), sampleRate: 48000, estimatedBpm: 120,
    frames, pipelineVersion: 'mock', analyzerVersion: 'mock', config: '{}', sourceProvenance: 'local-opus35-v1',
    chartSetSha256: digest(new TextEncoder().encode('charts-'+id)), charts: {},
  };
  const request: any = {
    version: 1, videoId: 'MOCKVIDEO01', encodedAudioSha256: base.encodedAudioSha256,
    baseSourceRecordJson: JSON.stringify(base),
    extension: {
      videoId: 'MOCKVIDEO01', audioSha256: audioSha, baseChartSetSha256: base.chartSetSha256,
      extensionSha256: digest(new TextEncoder().encode('ext-'+id)), baseSourceRecordSha256: hashText(JSON.stringify(base)),
      audioDescriptorSha256: descriptorSha,
      charts: { '4:low': { notes: notes(0) }, '6:low': { notes: notes(1) }, '8:low': { notes: notes(2) } },
    },
  };
  const key = `yt-opus-${request.extension.videoId}-${audioSha}-c${base.chartSetSha256}-x${request.extension.extensionSha256}`;
  const chart = (lanes: number) => ({
    song: key, extensionSha256: request.extension.extensionSha256, baseSourceRecordSha256: request.extension.baseSourceRecordSha256,
    lanes, difficulty: 'low', frozenNotes: notes(lanes === 4 ? 0 : lanes === 6 ? 1 : 2),
  });
  return { pcm, descriptor, base, request, key, chart };
}

function context() {
  let creates = 0;
  return {
    get creates() { return creates; },
    createBuffer(channels: number, frames: number, sampleRate: number) {
      creates++;
      const data = Array.from({ length: channels }, () => new Float32Array(frames));
      return { numberOfChannels: channels, length: frames, sampleRate, duration: frames / sampleRate, getChannelData: (i: number) => data[i] };
    },
  } as any;
}

it('actual unified play reuses one verified AudioBuffer across 4/6/8 while current gates stay fresh', async () => {
  const f = fixture();
  const readAudio = vi.fn(async () => f.pcm);
  const readChart = vi.fn(async (_song: string, choice: any) => f.chart(choice.lanes));
  const freshStore = { restore: vi.fn(async () => null), pin: vi.fn(async () => ({ song: f.key, localPinCommitted: true })), readChart };
  const frontend: any = createOpus468FrontendSharing1935({ freshStore, readAudio, databaseName: 'mock-'+Math.random() });
  await frontend.pin(f.request, f.descriptor, { lanes: 4, difficulty: 'low' }, { title: 'mock' });
  readChart.mockClear();
  const ctx = context();
  const out = [];
  for (const lanes of [4, 6, 8]) out.push(await frontend.play(f.key, { lanes, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx));
  expect(readAudio).toHaveBeenCalledTimes(1);
  expect(ctx.creates).toBe(1);
  expect(out[0].audio).toBe(out[1].audio);
  expect(out[1].audio).toBe(out[2].audio);
  expect(readChart).toHaveBeenCalledTimes(6);
});

it('post-gate denial on a cache hit rejects without replacing the verified buffer', async () => {
  const f = fixture('deny');
  const readAudio = vi.fn(async () => f.pcm);
  const readChart = vi.fn(async (_song: string, choice: any) => f.chart(choice.lanes));
  const freshStore = { restore: vi.fn(async () => null), pin: vi.fn(async () => ({ song: f.key, localPinCommitted: true })), readChart };
  const frontend: any = createOpus468FrontendSharing1935({ freshStore, readAudio, databaseName: 'deny-'+Math.random() });
  await frontend.pin(f.request, f.descriptor, { lanes: 4, difficulty: 'low' }, { title: 'mock' });
  readChart.mockClear();
  const ctx = context();
  const first = await frontend.play(f.key, { lanes: 4, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx);
  let calls = 0;
  readChart.mockImplementation(async (_song: string, choice: any) => {
    if (++calls === 2) throw Error('denied_post_hit');
    return f.chart(choice.lanes);
  });
  await expect(frontend.play(f.key, { lanes: 6, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx)).rejects.toThrow('denied_post_hit');
  readChart.mockImplementation(async (_song: string, choice: any) => f.chart(choice.lanes));
  const again = await frontend.play(f.key, { lanes: 8, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx);
  expect(again.audio).toBe(first.audio);
  expect(readAudio).toHaveBeenCalledTimes(1);
});

it('aborted/failed audio supplier does not populate the cache', async () => {
  const f = fixture('abort');
  const readAudio: any = vi.fn(async () => { throw new DOMException('Aborted', 'AbortError'); });
  const readChart = vi.fn(async (_song: string, choice: any) => f.chart(choice.lanes));
  const freshStore = { restore: vi.fn(async () => null), pin: vi.fn(async () => ({ song: f.key, localPinCommitted: true })), readChart };
  const frontend: any = createOpus468FrontendSharing1935({ freshStore, readAudio, databaseName: 'abort-'+Math.random() });
  await frontend.pin(f.request, f.descriptor, { lanes: 4, difficulty: 'low' }, { title: 'mock' });
  const ctx = context();
  await expect(frontend.play(f.key, { lanes: 4, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx)).rejects.toThrow('Aborted');
  readAudio.mockImplementationOnce(async () => f.pcm);
  const out = await frontend.play(f.key, { lanes: 4, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx);
  expect(out.audio).toBeTruthy();
  expect(readAudio).toHaveBeenCalledTimes(2);
  expect(ctx.creates).toBe(1);
});

it('changed source identity misses and bounded eviction rehydrates through the verified supplier', async () => {
  const fs = [fixture('one'), fixture('two'), fixture('three')];
  const byAudio = new Map(fs.map((f) => [f.base.audioSha256, f]));
  const readAudio = vi.fn(async (base: any) => byAudio.get(base.audioSha256)!.pcm);
  const readChart = vi.fn(async (song: string, choice: any) => fs.find((f) => f.key === song)!.chart(choice.lanes));
  const pin = vi.fn(async (req: any) => ({
    song: `yt-opus-${req.extension.videoId}-${req.extension.audioSha256}-c${req.extension.baseChartSetSha256}-x${req.extension.extensionSha256}`,
    localPinCommitted: true,
  }));
  const frontend: any = createOpus468FrontendSharing1935({ freshStore: { restore: vi.fn(async () => null), pin, readChart }, readAudio, databaseName: 'evict-'+Math.random() });
  for (const f of fs) await frontend.pin(f.request, f.descriptor, { lanes: 4, difficulty: 'low' }, { title: 'mock' });
  const ctx = context();
  const first = [];
  for (const f of fs) first.push(await frontend.play(f.key, { lanes: 4, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx));
  expect(readAudio).toHaveBeenCalledTimes(3);
  expect(new Set(first.map((x) => x.audio)).size).toBe(3);
  const rehydrated = await frontend.play(fs[0].key, { lanes: 4, difficulty: 'low' }, { shuffle: 'off', seed: 1 }, ctx);
  expect(readAudio).toHaveBeenCalledTimes(4);
  expect(rehydrated.audio).not.toBe(first[0].audio);
  expect(ctx.creates).toBe(4);
});
