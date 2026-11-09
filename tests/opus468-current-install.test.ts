import { it, expect } from 'vitest';
import { prepareCurrentOpusInstall } from '../src/opus/opus468-current-install';
it('route changes during artwork await never reach catalog commit', async () => {
  let current = true,
    release!: () => void;
  const commits: any[] = [];
  const p = prepareCurrentOpusInstall(
    [1, 2],
    async (n) => {
      await new Promise<void>((r) => (release = r));
      return n;
    },
    () => current,
  ).then((rows) => commits.push(...rows));
  current = false;
  release();
  await expect(p).rejects.toThrow('extension_entry_stale');
  expect(commits).toEqual([]);
});
it('abort while preparing prevents partial commit, success preserves order', async () => {
  const c = new AbortController(),
    commits: any[] = [];
  await expect(
    prepareCurrentOpusInstall(
      [1, 2],
      async (n) => {
        if (n === 2) c.abort(Error('stop'));
        return n;
      },
      () => true,
      c.signal,
    ).then((rows) => commits.push(...rows)),
  ).rejects.toThrow('stop');
  expect(commits).toEqual([]);
  expect(
    await prepareCurrentOpusInstall(
      [1, 2],
      async (n) => n,
      () => true,
    ),
  ).toEqual([1, 2]);
});
