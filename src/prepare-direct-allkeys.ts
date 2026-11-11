import { acquireYoutubeAudio } from "./youtube-direct-api";
import { readDirectYoutubeMetadata } from "./youtube-direct-metadata";
import { prepareLocalAllKeysOwned } from "./local-allkeys-worker-client";
import {
  validateLocalAllKeysRecord,
  localAllKeysIdentity,
  type LocalAllKeysEnvelope,
} from "./local-allkeys-record";
import {
  saveLocalAllKeys,
  readLocalAllKeys,
  listLocalAllKeys,
} from "./local-allkeys-store";
import { AudioJobError } from "./external-audio-api";
import type { ImportStage } from "./import-progress";

export interface DirectAllKeysOptions {
  publicKey: string;
  /** Ownership passes to the worker only when a verified local row is absent. */
  audio?: { bytes: ArrayBuffer; audioSha256: string };
  title?: string;
  author?: string;
  onStage?: (stage: ImportStage) => void;
  onMetadata?: (metadata: { title: string; author?: string }) => void;
  onAudioVerified?: () => void;
}

export interface PreparedDirectAllKeys {
  identity: ReturnType<typeof localAllKeysIdentity>;
  envelope: LocalAllKeysEnvelope;
  bytes: ArrayBuffer;
  title?: string;
  author?: string;
  restored: boolean;
}

/** Observe late failures as well as preserving the caller's exact abort cause. */
function interruptible<T>(
  pending: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    pending.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) reject(signal.reason);
        else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(signal.aborted ? signal.reason : error);
      },
    );
    if (signal.aborted) abort();
  });
}

/** Direct canonical WAV -> owned all-keys worker -> immutable local storage. */
export async function prepareDirectAllKeys(
  videoId: string,
  signal: AbortSignal,
  options: DirectAllKeysOptions,
): Promise<PreparedDirectAllKeys> {
  const check = () => signal.throwIfAborted();
  const stage = (value: ImportStage) => {
    check();
    options.onStage?.(value);
    check();
  };
  const run = async <T>(work: () => Promise<T>): Promise<T> => {
    check();
    const result = await interruptible(
      Promise.resolve().then(() => {
        check();
        return work();
      }),
      signal,
    );
    check();
    return result;
  };
  const pinsForVideo = async () => {
    const rows = await run(() => listLocalAllKeys({ signal }));
    const pins = rows.filter((row) => row.videoId === videoId);
    const first = pins[0];
    if (
      first &&
      pins.some(
        (pin) =>
          pin.audioSha256 !== first.audioSha256 ||
          pin.chartSetSha256 !== first.chartSetSha256,
      )
    )
      throw new AudioJobError("source_changed");
    return pins;
  };

  try {
    check();
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId))
      throw new AudioJobError("invalid_url");
    stage("checking");
    const pins = await pinsForVideo();
    const existing = pins[0];
    const supplied = options.audio;
    if (existing && supplied) {
      if (supplied.audioSha256 !== existing.audioSha256)
        throw new AudioJobError("source_changed");
      // A cache hit must not transfer the caller's buffer, but its declared
      // digest alone cannot establish that it is the same audio.
      const digest = await run(() =>
        crypto.subtle.digest("SHA-256", supplied.bytes),
      );
      const actual = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (actual !== existing.audioSha256)
        throw new AudioJobError("source_changed");
    }
    for (const pin of pins) {
      // The store's read verifies the persisted audio as well as its envelope.
      const row = await run(() => readLocalAllKeys(pin.identity, { signal }));
      if (!row) continue;
      const envelope = await run(() =>
        validateLocalAllKeysRecord(row.envelope, { signal }),
      );
      const identity = localAllKeysIdentity(envelope);
      if (
        envelope.record.videoId !== videoId ||
        envelope.record.audioSha256 !== pin.audioSha256 ||
        envelope.record.chartSetSha256 !== pin.chartSetSha256 ||
        identity !== pin.identity ||
        row.identity !== identity
      )
        throw new AudioJobError("integrity_failed");
      check();
      return {
        identity,
        envelope,
        bytes: row.bytes,
        title: row.title,
        author: row.author,
        restored: true,
      };
    }

    const metadataController = new AbortController();
    const abortMetadata = () => metadataController.abort(signal.reason);
    signal.addEventListener("abort", abortMetadata, { once: true });
    try {
      check();
      // Attach the rejection handler immediately, including if audio fails first.
      const metadata =
        !supplied && options.title === undefined && options.author === undefined
          ? Promise.resolve()
              .then(() => {
                check();
                return readDirectYoutubeMetadata(videoId, {
                  publicKey: options.publicKey,
                  signal: metadataController.signal,
                });
              })
              .then((display) => {
                if (display && !signal.aborted) {
                  try { options.onMetadata?.(display); } catch { /* Display hints never fail the import. */ }
                }
                return display;
              })
              .catch(() => null)
          : Promise.resolve(null);
      const audio =
        supplied ??
        (await run(() =>
          acquireYoutubeAudio(videoId, {
            publicKey: options.publicKey,
            signal,
            onStage: ({ stage: value }) =>
              stage(
                value === "request"
                  ? "checking"
                  : value === "waiting"
                    ? "extracting"
                    : "downloading",
              ),
          }),
        ));
      check();
      if (existing && existing.audioSha256 !== audio.audioSha256)
        throw new AudioJobError("source_changed");
      // Capture the declared digest before transferring the original owned WAV.
      const expectedAudioSha256 = audio.audioSha256;
      if (!supplied) options.onAudioVerified?.();
      stage("charting");
      const generated = await run(() =>
        prepareLocalAllKeysOwned({
          bytes: audio.bytes,
          videoId,
          signal,
        }),
      );
      // The worker client hashes the returned bytes against this envelope.
      const envelope = await run(() =>
        validateLocalAllKeysRecord(generated.envelope, { signal }),
      );
      if (
        envelope.record.videoId !== videoId ||
        envelope.record.audioSha256 !== expectedAudioSha256
      )
        throw new AudioJobError("integrity_failed");
      const identity = localAllKeysIdentity(envelope);
      const display = await run(() => metadata);
      const title = options.title ?? display?.title;
      const author = options.author ?? display?.author;

      stage("saving");
      // Recheck after generation; even missing audio does not release a pin.
      const latest = await pinsForVideo();
      if (
        [...pins, ...latest].some(
          (pin) =>
            pin.audioSha256 !== envelope.record.audioSha256 ||
            pin.chartSetSha256 !== envelope.record.chartSetSha256,
        )
      )
        throw new AudioJobError("source_changed");
      const saved = await run(() =>
        saveLocalAllKeys(
          {
            envelope,
            bytes: generated.bytes,
            title,
            author,
          },
          { signal },
        ),
      );
      if (saved.identity !== identity)
        throw new AudioJobError("integrity_failed");
      check();
      return {
        identity,
        envelope,
        bytes: generated.bytes,
        title: saved.title,
        author: saved.author,
        restored: false,
      };
    } finally {
      signal.removeEventListener("abort", abortMetadata);
      metadataController.abort();
    }
  } catch (error) {
    check();
    throw error;
  }
}
