// Bounded decoded-audio ownership for playback.
//
// Two stores back the external-song memory fix:
//
// 1. createBoundedTrackCache: an LRU for decoded Soundtrack entries (the main
//    playback cache). Eviction is least-recently-used under both an entry
//    count and a byte budget. Evicted tracks are rehydrated later through the
//    existing verified read path (IndexedDB encoded cache + full SHA
//    verification), never by new provider extraction.
//
// 2. createDecodedBufferCache: a per-source decoded AudioBuffer store for
//    external songs. externalAudio() previously allocated a fresh Float32
//    AudioBuffer on every call (~2x the PCM16 working array), so simultaneous
//    preview/start and repeated plays duplicated buffers. Now the first
//    decode is shared by every later caller; callers release the verified
//    PCM16 working array once the buffer exists. Legacy v1 WAV sources do not
//    use this store and keep their exact prior behavior.
//
// Keys must be the full source id (audio + chart-set hashes) so a buffer is
// never reused across a changed chart or descriptor.

export interface BufferedTrack {
  buffer: AudioBuffer;
}

function bufferBytes(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * 4;
}

export interface BoundedTrackCache<T extends BufferedTrack> {
  get(id: string): T | undefined;
  has(id: string): boolean;
  set(id: string, track: T): void;
  delete(id: string): void;
}

export function createBoundedTrackCache<T extends BufferedTrack>({
  maxEntries = 2,
  maxBytes = 256 * 1024 * 1024,
  retain = (_id: string) => true,
}: {
  maxEntries?: number;
  maxBytes?: number;
  retain?: (id: string) => boolean;
} = {}): BoundedTrackCache<T> {
  const entries = new Map<string, T>();
  const sizes = new Map<string, number>();
  let total = 0;
  const evict = () => {
    for (const [id] of entries) {
      if (entries.size <= maxEntries && total <= maxBytes) break;
      total -= sizes.get(id) ?? 0;
      entries.delete(id);
      sizes.delete(id);
    }
  };
  return {
    get(id) {
      const track = entries.get(id);
      if (track !== undefined) {
        entries.delete(id);
        entries.set(id, track);
      }
      return track;
    },
    has(id) {
      return entries.has(id);
    },
    set(id, track) {
      if (!retain(id)) {
        const size = sizes.get(id);
        if (size !== undefined) total -= size;
        entries.delete(id);
        sizes.delete(id);
        return;
      }
      const previous = sizes.get(id);
      if (previous !== undefined) total -= previous;
      entries.delete(id);
      entries.set(id, track);
      const size = bufferBytes(track.buffer);
      sizes.set(id, size);
      total += size;
      evict();
    },
    delete(id) {
      const size = sizes.get(id);
      if (size !== undefined) total -= size;
      entries.delete(id);
      sizes.delete(id);
    },
  };
}

export interface DecodedBufferCache {
  /** Returns the shared buffer for key, creating (and caching) it on miss. */
  acquire(
    key: string,
    create: () => AudioBuffer,
  ): {
    buffer: AudioBuffer;
    reused: boolean;
  };
  has(key: string): boolean;
  release(key: string): void;
}

export function createDecodedBufferCache({
  maxEntries = 2,
  maxBytes = 256 * 1024 * 1024,
}: { maxEntries?: number; maxBytes?: number } = {}): DecodedBufferCache {
  const buffers = new Map<string, AudioBuffer>();
  let total = 0;
  const evict = () => {
    for (const [key, buffer] of buffers) {
      if (buffers.size <= maxEntries && total <= maxBytes) break;
      total -= bufferBytes(buffer);
      buffers.delete(key);
    }
  };
  return {
    acquire(key, create) {
      const hit = buffers.get(key);
      if (hit) {
        buffers.delete(key);
        buffers.set(key, hit);
        return { buffer: hit, reused: true };
      }
      const buffer = create();
      buffers.set(key, buffer);
      total += bufferBytes(buffer);
      evict();
      return { buffer, reused: false };
    },
    has(key) {
      return buffers.has(key);
    },
    release(key) {
      const buffer = buffers.get(key);
      if (buffer) {
        total -= bufferBytes(buffer);
        buffers.delete(key);
      }
    },
  };
}
