import { V5_MAX_FRAGMENT_CHARS } from './external-share';
function fragmentLimit(fragment: string) {
  return fragment.startsWith('v=5&d=') ? V5_MAX_FRAGMENT_CHARS : 160000;
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
}
export async function loadSharedReplay(id: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(id)) throw new ShareError(400);
  const response = await fetch(
    SHARE_API + '/v1/replays/' + encodeURIComponent(id),
    { signal: AbortSignal.timeout(12000), cache: 'no-store' },
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
