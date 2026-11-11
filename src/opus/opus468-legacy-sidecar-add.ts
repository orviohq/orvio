// Build-owned explicit Add orchestration. No UI, URL, provider or share input.
import { verifyOpusRecord, type OpusRecord } from './opus-record';
import { saveOpus35Metadata } from './opus35-store';

type Selection = { lanes: 4 | 6 | 8; difficulty: string };
type Metadata = { title?: string; author?: string };
type Pin = { song: { id: string }; localPinCommitted: boolean };
type Runtime = {
  consumeFixedLegacySidecar(
    input: { selection: Selection; metadata: Metadata; manifestId?: string },
    options: { signal: AbortSignal },
  ): Promise<Pin>;
  frontend: {
    catalogView(
      song: string,
      options: { signal: AbortSignal },
    ): Promise<{ song: { id: string; title?: string }; baseRecord: OpusRecord }>;
  };
};

export function createBuildOwnedLegacySidecarAdd({
  runtime,
  saveMetadata = saveOpus35Metadata,
  install,
  isCurrent,
}: {
  runtime: Runtime;
  saveMetadata?: (
    record: OpusRecord,
    title: string,
    jobId?: string,
    author?: string,
  ) => Promise<unknown>;
  install: (
    frontend: Runtime['frontend'],
    options: { song: string; signal: AbortSignal },
  ) => Promise<unknown>;
  isCurrent?: () => boolean | Promise<boolean>;
}) {
  if (
    !runtime ||
    typeof runtime.consumeFixedLegacySidecar !== 'function' ||
    !runtime.frontend ||
    typeof runtime.frontend.catalogView !== 'function'
  )
    throw Error('legacy_sidecar_add_runtime');
  if (
    typeof saveMetadata !== 'function' ||
    typeof install !== 'function' ||
    (isCurrent !== undefined && typeof isCurrent !== 'function')
  )
    throw Error('legacy_sidecar_add_dependencies');
  return async function consumeFixedLegacySidecar({
    selection,
    metadata,
    manifestId,
    signal,
  }: {
    selection: Selection;
    metadata: Metadata;
    manifestId?: string;
    signal: AbortSignal;
  }) {
    if (!(signal instanceof AbortSignal)) throw Error('legacy_sidecar_add_signal');
    signal.throwIfAborted();
    const choice = structuredClone(selection),
      meta = structuredClone(metadata);
    const current = async () => {
      if (isCurrent && (await isCurrent()) !== true)
        throw Error('legacy_sidecar_add_stale');
      signal.throwIfAborted();
    };
    await current();
    const pin = await runtime.consumeFixedLegacySidecar(
      {
        selection: choice,
        metadata: meta,
        ...(manifestId === undefined ? {} : { manifestId }),
      },
      { signal },
    );
    if (pin?.localPinCommitted !== true || typeof pin.song?.id !== 'string')
      throw Error('legacy_sidecar_add_pin');
    let metadataSaved = false,
      installed = false;
    const partial = (error: any) =>
      Object.freeze({
        song: pin.song,
        localPinCommitted: true,
        metadataSaved,
        installed,
        partial: true,
        error: String(error?.message ?? error),
      });
    try {
      await current();
      const view = await runtime.frontend.catalogView(pin.song.id, { signal });
      signal.throwIfAborted();
      if (
        !view ||
        view.song?.id !== pin.song.id ||
        !view.baseRecord ||
        !(await verifyOpusRecord(view.baseRecord))
      )
        throw Error('legacy_sidecar_add_catalog');
      const base = structuredClone(view.baseRecord);
      await current();
      const title = String(
        meta?.title ?? view.song.title ?? base.videoId,
      ).slice(0, 300);
      const author = meta?.author
        ? String(meta.author).slice(0, 100)
        : undefined;
      await saveMetadata(base, title, undefined, author);
      metadataSaved = true;
      await current();
      const outcome = await install(runtime.frontend, {
        song: pin.song.id,
        signal,
      });
      if (outcome !== true) throw Error('legacy_sidecar_add_install');
      installed = true;
      return Object.freeze({
        song: pin.song,
        localPinCommitted: true,
        metadataSaved: true,
        installed: true,
        partial: false,
      });
    } catch (error: any) {
      return partial(error);
    }
  };
}
