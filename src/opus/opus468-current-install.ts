// Build-owned operation helper. No verification verdict is retained between calls.
export async function prepareCurrentOpusInstall<T, R>(
  items: readonly T[],
  prepare: (item: T) => Promise<R>,
  isCurrent: () => boolean,
  signal?: AbortSignal,
) {
  const staged: R[] = [];
  const check = () => {
    signal?.throwIfAborted();
    if (!isCurrent()) throw Error('extension_entry_stale');
  };
  check();
  for (const item of items) {
    const result = await prepare(item);
    check();
    staged.push(result);
  }
  check();
  return staged;
}
