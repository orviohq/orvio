import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  BackgroundImports,
  type YoutubeImportRunner,
} from '../src/background-imports';
import { importYoutube } from '../src/external-import';
import { earlyYoutubeMetadata } from '../src/early-youtube-metadata';
import { AudioJobError } from '../src/external-audio-api';

vi.mock('../src/external-import', () => ({
  importYoutube: vi.fn(() => {
    throw Error('Legacy remote importer reached');
  }),
  youtubeId: (s: string) => (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : null),
}));
vi.mock('../src/early-youtube-metadata', () => ({
  earlyYoutubeMetadata: vi.fn(() => {
    throw Error('Remote metadata reached');
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => setTimeout(fn, 0));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw Error('Unexpected network');
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
function store(rows: unknown[] = []) {
  let value = JSON.stringify(rows);
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

it('Add waits for direct preparation and completion without legacy or metadata requests', async () => {
  let resolve!: (r: Awaited<ReturnType<YoutubeImportRunner>>) => void;
  const runner = vi.fn<YoutubeImportRunner>(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const complete = vi.fn(async () => {});
  const pending = new BackgroundImports(() => {}, complete, store(), runner);
  pending.enqueue('AAAAAAAAAAA');
  pending.enqueue('AAAAAAAAAAA');
  await vi.waitFor(() => expect(runner).toHaveBeenCalledTimes(1));
  expect(complete).not.toHaveBeenCalled();
  expect(pending.rows.get('AAAAAAAAAAA')?.state).toBe('loading');
  const options = runner.mock.calls[0]![2];
  options.onVerified?.();
  options.onStage?.('charting');
  options.onStage?.('saving');
  const result = {
    prepared: {
      record: { videoId: 'AAAAAAAAAAA' },
      bytes: new ArrayBuffer(0),
      restored: false,
    },
  } as Awaited<ReturnType<YoutubeImportRunner>>;
  resolve(result);
  await vi.waitFor(() => expect(pending.rows.size).toBe(0));
  expect(complete).toHaveBeenCalledWith(result);
  expect(importYoutube).not.toHaveBeenCalled();
  expect(earlyYoutubeMetadata).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it.each([undefined, 'old-remote-job'])(
  'reload uses the direct runner with saved handle %s and retains errors',
  async (jobId) => {
    const storage = store([
      { videoId: 'AAAAAAAAAAA', state: 'loading', jobId },
    ]);
    const runner = vi.fn<YoutubeImportRunner>(async () => {
      throw new AudioJobError(
        'network_error',
        undefined,
        undefined,
        undefined,
        'service',
      );
    });
    const complete = vi.fn(async () => {});
    const pending = new BackgroundImports(() => {}, complete, storage, runner);
    pending.resume();
    await vi.waitFor(() =>
      expect(pending.rows.get('AAAAAAAAAAA')?.state).toBe('error'),
    );
    expect(runner).toHaveBeenCalledTimes(1);
    expect(pending.rows.get('AAAAAAAAAAA')?.failure).toMatchObject({
      code: 'network_error',
      stage: 'service',
    });
    expect(JSON.parse(storage.getItem())[0].jobId).toBe(jobId);
    expect(complete).not.toHaveBeenCalled();
    expect(importYoutube).not.toHaveBeenCalled();
    expect(earlyYoutubeMetadata).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);

it('keeps a storage failure visible and never falls back to legacy import', async () => {
  const runner = vi.fn<YoutubeImportRunner>(async () => {
    throw new AudioJobError(
      'storage_full',
      undefined,
      undefined,
      undefined,
      'storage',
    );
  });
  const complete = vi.fn(async () => {});
  const pending = new BackgroundImports(() => {}, complete, store(), runner);
  pending.enqueue('AAAAAAAAAAA');
  await vi.waitFor(() =>
    expect(pending.rows.get('AAAAAAAAAAA')?.failure).toMatchObject({
      code: 'storage_full',
      stage: 'storage',
    }),
  );
  expect(complete).not.toHaveBeenCalled();
  expect(importYoutube).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
