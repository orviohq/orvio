// Queue-owned orchestration over reviewed build capabilities. No public caller.
import type { OpusRecord } from './opus-record';
import type { Difficulty } from '../chart';
import { verifyOpusRecord } from './opus-record';
import { readVerifiedOpusByRoots } from './opus-cache.mjs';
import { restoreOpus35Record } from './opus35-api';
import { readOpus468SourceMetadata } from './opus468-source-metadata';
type Choice = { lanes: 4 | 6 | 8; difficulty: Difficulty };
interface Runtime {
  extendCachedBase(
    input: {
      baseRecord: OpusRecord;
      selection: Choice;
      metadata: { title: string; author?: string };
    },
    options: { signal: AbortSignal },
  ): Promise<{ song: { id: string }; localPinCommitted: boolean }>;
}
export function createOpus468AppCoordinator(runtime: Runtime) {
  let tail: Promise<unknown> = Promise.resolve();
  return Object.freeze({
    extend(
      input: OpusRecord,
      selection: Choice,
      { signal: callerSignal }: { signal?: AbortSignal } = {},
    ) {
      // Snapshot before this work can wait behind an earlier queue item.
      const base = structuredClone(input),
        choice = structuredClone(selection);
      const run = async () => {
        callerSignal?.throwIfAborted();
        const c = new AbortController(),
          timer = setTimeout(
            () => c.abort(Error('extension_operation_timeout')),
            95000,
          );
        const signal = callerSignal
          ? AbortSignal.any([callerSignal, c.signal])
          : c.signal;
        try {
          if (
            base.version !== 2 ||
            base.audioFormat !== 'orvio-opus-v1' ||
            !(await verifyOpusRecord(base))
          )
            throw Error('extension_source_unavailable');
          signal.throwIfAborted();
          // Stable exact-root source GET only when encoded cache is missing. Never
          // create/advance a provider job or silently reinterpret a legacy WAV source.
          if (!(await readVerifiedOpusByRoots(base, { signal })))
            await restoreOpus35Record(base, signal);
          signal.throwIfAborted();
          const metadata = await readOpus468SourceMetadata(base, { signal });
          const result = await runtime.extendCachedBase(
            { baseRecord: base, selection: choice, metadata },
            { signal },
          );
          signal.throwIfAborted();
          if (
            result.localPinCommitted !== true ||
            typeof result.song?.id !== 'string'
          )
            throw Error('extension_pin_not_committed');
          return result;
        } finally {
          clearTimeout(timer);
        }
      };
      const result = tail.then(run, run);
      tail = result.catch(() => undefined);
      return result;
    },
  });
}
