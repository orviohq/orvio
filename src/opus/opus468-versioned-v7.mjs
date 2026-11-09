// Stage-0 routing only. No chart, replay or admission output is trusted here.
// The chosen exact legacy/new parser repeats its complete bounded validation.
import { exact468Branch } from './opus468-version-dispatch.mjs';
import { waitAcquired } from './opus-acquired-v2-artifacts.mjs';
const COMPRESSED = 524288,
  INFLATED = 4194304,
  FRAGMENT = 699058;
export function createVersionedV7Parser({ legacy, unified }) {
  return async function parseSharedV7(fragment, { signal } = {}) {
    signal?.throwIfAborted();
    if (
      typeof fragment !== 'string' ||
      fragment.length > FRAGMENT ||
      !/^v=7&d=[A-Za-z0-9_-]+$/.test(fragment)
    )
      throw Error('share468_fragment');
    const text = fragment.slice(6);
    if (text.length % 4 === 1) throw Error('share468_base64');
    let bytes;
    try {
      bytes = Uint8Array.from(
        atob(text.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0),
      );
    } catch {
      throw Error('share468_base64');
    }
    if (bytes.length > COMPRESSED) throw Error('share468_size');
    let canonical = '';
    for (let i = 0; i < bytes.length; i += 8192)
      canonical += String.fromCharCode(...bytes.subarray(i, i + 8192));
    if (
      btoa(canonical)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '') !== text
    )
      throw Error('share468_base64_noncanonical');
    const reader = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('deflate'))
        .getReader(),
      chunks = [];
    let size = 0;
    try {
      for (;;) {
        signal?.throwIfAborted();
        const part = await waitAcquired(reader.read(), signal);
        signal?.throwIfAborted();
        if (part.done) break;
        size += part.value.length;
        if (size > INFLATED) throw Error('share468_size');
        chunks.push(part.value);
      }
    } finally {
      try {
        void reader.cancel().catch(() => {});
      } catch {}
      try {
        reader.releaseLock();
      } catch {}
    }
    const data = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      data.set(c, at);
      at += c.length;
    }
    let envelope;
    try {
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(data);
      envelope = JSON.parse(raw);
      if (JSON.stringify(envelope) !== raw) throw Error('noncanonical');
    } catch {
      throw Error('share468_json');
    }
    const parser = exact468Branch(envelope?.extension?.generatorVersion, {
      legacy,
      unified,
    });
    signal?.throwIfAborted();
    return parser(fragment, { signal });
  };
}
