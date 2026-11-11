import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENT_ONLY_MODE,
  ClientOnlyLocalAudioError,
} from '../src/client-only-runtime';
import { readSharedAudio } from '../src/external-share-audio';
import { chartSetHash, type SourceRecord } from '../src/external-source';

const enc = new TextEncoder();
const KEYS = ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'] as const;

async function sha256(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest('SHA-256', owned);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

async function fixture() {
  const audioBytes = enc.encode('persisted-local-audio');
  const audio = audioBytes.slice().buffer as ArrayBuffer;
  const record = {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: await sha256(audioBytes),
    sampleRate: 48000,
    estimatedBpm: 144,
    frames: 96000,
    pipelineVersion: 'v1',
    analyzerVersion: 'v1',
    config: '{}',
    charts: {},
  } as any as SourceRecord;
  for (const key of KEYS) {
    const notes = [{ id: 0, time: 1, lane: 0 }];
    record.charts[key] = {
      notes,
      sha256: await sha256(enc.encode(JSON.stringify(notes))),
    };
  }
  record.chartSetSha256 = await chartSetHash(record);
  return { record, audio };
}

function item(record: SourceRecord) {
  return {
    record,
    song: { title: 'Cached local song', subtitle: 'local' },
  } as any;
}

afterEach(() => vi.unstubAllGlobals());

describe('client-only readSharedAudio gate', () => {
  it('returns persisted local bytes without any fetch', async () => {
    expect(CLIENT_ONLY_MODE).toBe(true);
    const { record, audio } = await fixture();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network disabled');
      }),
    );
    const subject = item(record);
    const result = await readSharedAudio(
      subject,
      new AbortController().signal,
      {
        localAudio: vi.fn(async () => ({
          key: 'local-key',
          title: 'Cached local song',
          bytes: audio,
          jobId: 'job-1',
        })),
      },
    );
    expect(result).toBe(audio);
    expect(subject.bytes).toBe(audio);
    expect(subject.jobId).toBe('job-1');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails explicitly as missing local audio instead of fetching', async () => {
    const { record } = await fixture();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network disabled');
      }),
    );
    const failure = readSharedAudio(
      item(record),
      new AbortController().signal,
      { localAudio: vi.fn(async () => null) },
    );
    await expect(failure).rejects.toBeInstanceOf(ClientOnlyLocalAudioError);
    await expect(
      readSharedAudio(item(record), new AbortController().signal, {
        localAudio: vi.fn(async () => null),
      }),
    ).rejects.toMatchObject({ reason: 'missing', videoId: record.videoId });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails explicitly as corrupt local audio instead of fetching', async () => {
    const { record } = await fixture();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network disabled');
      }),
    );
    await expect(
      readSharedAudio(item(record), new AbortController().signal, {
        localAudio: vi.fn(async () => {
          throw new Error('Saved audio verification failed');
        }),
      }),
    ).rejects.toMatchObject({
      code: 'CLIENT_ONLY_LOCAL_AUDIO',
      reason: 'corrupt',
      videoId: record.videoId,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps abort as abort rather than reporting corruption', async () => {
    const { record } = await fixture();
    const controller = new AbortController();
    await expect(
      readSharedAudio(item(record), controller.signal, {
        localAudio: vi.fn(async () => {
          controller.abort();
          throw new DOMException('Aborted', 'AbortError');
        }),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
