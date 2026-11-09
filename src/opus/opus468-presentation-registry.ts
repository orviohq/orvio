// Build-owned display metadata. This is not chart admission or playback authority.
import { verifyOpusRecord, type OpusRecord } from './opus-record';
export function createVerifiedOpusPresentationRegistry() {
  const rows = new Map<string, { videoId: string; recordJson: string }>();
  return Object.freeze({
    videoId: (song: string) => rows.get(song)?.videoId,
    async attach(
      song: string,
      record: OpusRecord,
      { signal }: { signal?: AbortSignal } = {},
    ) {
      signal?.throwIfAborted();
      const frozen = structuredClone(record),
        json = JSON.stringify(frozen);
      if (
        !song ||
        frozen.version !== 2 ||
        frozen.audioFormat !== 'orvio-opus-v1' ||
        !(await verifyOpusRecord(frozen))
      )
        throw Error('extension_presentation_source');
      signal?.throwIfAborted();
      const old = rows.get(song);
      if (old && old.recordJson !== json)
        throw Error('extension_presentation_changed');
      rows.set(
        song,
        Object.freeze({ videoId: frozen.videoId, recordJson: json }),
      );
      return frozen.videoId;
    },
  });
}
