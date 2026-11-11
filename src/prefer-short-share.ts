/** Isolated policy adapter; production retains its current share flow until integration review. */
export async function preferShortShare(input: {
  fragment: string;
  arrivalOrigin: string;
  signal: AbortSignal;
  create: (fragment: string, signal: AbortSignal) => Promise<{ id: string; expiresAt: string }>;
  now: () => number;
  timeoutMs?: number;
  isCurrent: () => boolean;
}): Promise<{ href: string; kind: 'short' | 'long' }> {
  input.signal.throwIfAborted();
  const origin = new URL(input.arrivalOrigin).origin;
  const long = new URL('/result/#' + input.fragment, origin).href;
  const timeoutMs=input.timeoutMs??1500;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw Error('invalid_short_deadline');
  const deadline=new AbortController();
  const requestSignal=AbortSignal.any([input.signal,deadline.signal]);
  let timer:ReturnType<typeof setTimeout>|undefined;
  let remove=()=>{};
  const interrupted=new Promise<never>((_,reject)=>{
    const abort=()=>reject(requestSignal.reason);requestSignal.addEventListener('abort',abort,{once:true});
    remove=()=>requestSignal.removeEventListener('abort',abort);
    timer=setTimeout(()=>deadline.abort(Error('short_share_timeout')),timeoutMs);
  });
  let value: { id: string; expiresAt: string };
  try {
    value = await Promise.race([input.create(input.fragment, requestSignal),interrupted]);
  } catch (error) {
    input.signal.throwIfAborted();
    if (!input.isCurrent()) throw Error('stale_share');
    return { href: long, kind: 'long' };
  } finally {clearTimeout(timer);remove();}
  input.signal.throwIfAborted();
  if (!input.isCurrent()) throw Error('stale_share');
  if (!/^[A-Za-z0-9_-]{22}$/.test(value.id) || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= input.now())
    return { href: long, kind: 'long' };
  const url = new URL('/result/', origin);
  url.searchParams.set('s', value.id);
  return { href: url.href, kind: 'short' };
}
