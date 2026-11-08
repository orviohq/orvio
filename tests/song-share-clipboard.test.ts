import { it, expect, vi, afterEach } from 'vitest';
import { copySongLink } from '../src/song-share-clipboard';
afterEach(() => vi.unstubAllGlobals());
it('begins promised clipboard write synchronously before asynchronous link completion', async () => {
  let resolve!: (url: string) => void;
  const link = new Promise<string>((r) => (resolve = r));
  let item: any;
  const write = vi.fn(async (items: any[]) => {
    item = items[0];
    await item.data['text/plain'];
  });
  vi.stubGlobal('navigator', { clipboard: { write } });
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(public data: any) {}
    },
  );
  const copied = copySongLink(link);
  expect(write).toHaveBeenCalledOnce();
  resolve('https://example.test/song/#source');
  await copied;
  expect(await (await item.data['text/plain']).text()).toBe(
    'https://example.test/song/#source',
  );
});
it('writeText fallback copies the same exact link', async () => {
  const writeText = vi.fn(async () => {});
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  vi.stubGlobal('ClipboardItem', undefined);
  await copySongLink(Promise.resolve('https://example.test/song/#source'));
  expect(writeText).toHaveBeenCalledWith('https://example.test/song/#source');
});
it('permission failure rejects instead of creating a popup or false success', async () => {
  vi.stubGlobal('navigator', {
    clipboard: { write: vi.fn().mockRejectedValue(new Error('denied')) },
  });
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(public data: any) {}
    },
  );
  await expect(
    copySongLink(Promise.resolve('https://example.test/song/#source')),
  ).rejects.toThrow('denied');
});
