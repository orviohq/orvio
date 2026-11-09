import { V5_MAX_FRAGMENT_CHARS } from './external-share';
import { queryClient, queryKeys, runMutation } from './query-client';
function fragmentLimit(fragment: string) {
  return fragment.startsWith('v=5&d=') || fragment.startsWith('v=6&d=')
    ? V5_MAX_FRAGMENT_CHARS
    : 160000;
}
export const SHARE_API = 'https://orvio-share.pn-26f.workers.dev';
export class ShareError extends Error {
  constructor(readonly status: number) {
    super('Share request failed: ' + status);
  }
}
export async function saveSharedReplay(fragment: string) {
  if (new TextEncoder().encode(fragment).length > fragmentLimit(fragment))
    throw new ShareError(413);
  return runMutation(['save-shared-replay'], async () => {
    const response = await fetch(SHARE_API + '/v1/replays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fragment }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new ShareError(response.status);
    const data = await response.json();
    if (
      !/^[A-Za-z0-9_-]{20,100}$/.test(data.id) ||
      !Number.isFinite(Date.parse(data.expiresAt))
    )
      throw new ShareError(502);
    return data as { id: string; expiresAt: string };
  });
}
async function fetchSharedReplay(
  id: string,
  signal: AbortSignal,
): Promise<{ fragment: string; expiresAt: string }> {
  const response = await fetch(
    SHARE_API + '/v1/replays/' + encodeURIComponent(id),
    { signal, cache: 'no-store' },
  );
  if (!response.ok) throw new ShareError(response.status);
  const data = await response.json();
  if (
    typeof data.fragment !== 'string' ||
    new TextEncoder().encode(data.fragment).length >
      fragmentLimit(data.fragment) ||
    !Number.isFinite(Date.parse(data.expiresAt))
  )
    throw new ShareError(502);
  if (Date.parse(data.expiresAt) <= Date.now()) throw new ShareError(404);
  return data as { fragment: string; expiresAt: string };
}
/**
 * Query-backed load: the replay record is immutable until its own
 * expiresAt, so a cached entry stays fresh indefinitely and persists in
 * IndexedDB for instant reloads. Callers must still enforce expiresAt on
 * cached hits (see readInitialRoute) because a warm entry never refetches.
 */
export async function loadSharedReplay(id: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(id)) throw new ShareError(400);
  return queryClient.fetchQuery({
    queryKey: queryKeys.sharedReplay(id),
    queryFn: ({ signal }) =>
      fetchSharedReplay(
        id,
        AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      ),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
