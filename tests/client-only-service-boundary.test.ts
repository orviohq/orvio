import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClientOnlyNetworkError } from '../src/client-only-runtime';
import { createAudioJob, readAudioJob } from '../src/external-audio-api';
import { readCanonicalSource } from '../src/canonical-source-api';
import { readCanonicalMetadata } from '../src/canonical-metadata-api';
import { loadCanonicalAudio } from '../src/canonical-audio-api';
import { saveSharedReplay, loadSharedReplay } from '../src/share-api';
import { readOpus35Artifact } from '../src/opus/opus35-api';
import { earlyYoutubeMetadata } from '../src/early-youtube-metadata';
import { chartSetHash, type SourceRecord } from '../src/external-source';

const enc = new TextEncoder();
const KEYS = ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'] as const;
const SHA = 'a'.repeat(64);

async function sha256(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest('SHA-256', owned);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

let record: SourceRecord;

beforeAll(async () => {
  const audioBytes = enc.encode('remote-boundary-audio');
  const value = {
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
    value.charts[key] = {
      notes,
      sha256: await sha256(enc.encode(JSON.stringify(notes))),
    };
  }
  value.chartSetSha256 = await chartSetHash(value);
  record = value;
});

afterEach(() => vi.unstubAllGlobals());

describe('client-only service boundary', () => {
  it('rejects every runtime API branch before fetch starts', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('fetch must not be reached');
    });
    vi.stubGlobal('fetch', fetchSpy);
    const opusInput = {
      videoId: record.videoId,
      encodedAudioSha256: SHA,
      audioDescriptorSha256: SHA,
      audioSha256: SHA,
      kind: 'descriptor' as const,
    };
    const branches: [string, () => Promise<unknown>][] = [
      [
        'create-audio-job',
        () =>
          createAudioJob(`https://www.youtube.com/watch?v=${record.videoId}`),
      ],
      ['read-audio-job', () => readAudioJob('job-boundary')],
      ['read-canonical-source', () => readCanonicalSource(record.videoId)],
      ['read-canonical-metadata', () => readCanonicalMetadata(record)],
      ['load-canonical-audio', () => loadCanonicalAudio(record)],
      ['share-save', () => saveSharedReplay('v=5&d=abc')],
      ['share-load', () => loadSharedReplay('a'.repeat(20))],
      ['opus-artifact', () => readOpus35Artifact(opusInput, { method: 'GET' })],
    ];
    for (const [name, run] of branches) {
      const failure = run();
      await expect(failure, name).rejects.toBeInstanceOf(
        ClientOnlyNetworkError,
      );
      await expect(failure, name).rejects.toMatchObject({
        code: 'CLIENT_ONLY_NETWORK',
      });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps optional early metadata local with no fetch', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('fetch must not be reached');
    });
    vi.stubGlobal('fetch', fetchSpy);
    await expect(earlyYoutubeMetadata(record.videoId)).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
