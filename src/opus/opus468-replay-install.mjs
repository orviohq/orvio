// NEW (test-only): local replay-share INSTALLATION orchestrator for a NEW
// recipient. Closes the extension_not_restored gap: a received 1110 wire is
// decoded (fresh codec/owner), the raw base + descriptor are independently
// revalidated, the EXISTING verified local audio cache is consulted (LOCAL
// ONLY - no network, no fabrication), the base pin / fresh policy path runs
// through the actual frontend pin/catalog register, and only then the 1111
// importer derives + saves the replay session. Private composition only:
// no main.ts/route/action/visible-entry edits, no public catalog/source
// mutation, no allowlist enable, no fabricated transport. Current test-only
// candidate stays DENY inside the codec reader (default [] policy).
import { parseVerifiedDescriptor } from './opus-descriptor.mjs';
import { readVerifiedOpus } from './opus-cache.mjs';

const copy = (x) => structuredClone(x);
const hex = (b) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
const sha256Hex = async (b) => hex(await crypto.subtle.digest('SHA-256', b));
const hashText = async (t) => sha256Hex(new TextEncoder().encode(t));
const fail = (s) => {
  const e = Error('replay_install_' + s);
  e.code = 'replay_install_' + s;
  throw e;
};

export function createOpus468ReplayInstaller({
  makeCodec, // () => fresh Raw 1110 codec per install
  frontend, // actual createOpus468Frontend product: {pin, restore, saveSession, ...}
  importSharedReplay, // actual 1111 adapter product
  hashTextImpl = hashText,
} = {}) {
  if (typeof makeCodec !== 'function') throw Error('replay_install_codec_factory_missing');
  if (typeof frontend?.pin !== 'function' || typeof frontend?.restore !== 'function')
    throw Error('replay_install_frontend_seam_missing');
  if (typeof importSharedReplay !== 'function') throw Error('replay_install_importer_missing');
  return async function installSharedReplay(input, { signal } = {}) {
    if (!(input instanceof Uint8Array) || !(input.buffer instanceof ArrayBuffer))
      fail('bytes');
    const wire = input.slice(); // snapshot before first await
    // 1. decode (fresh codec: strict wire + fresh policy/owner inside)
    const codec = makeCodec();
    if (typeof codec?.decode !== 'function') fail('codec_factory');
    const decoded = await codec.decode(wire, { signal });
    signal?.throwIfAborted?.();
    if (!decoded || typeof decoded !== 'object') fail('decode');
    const song = typeof decoded.song === 'string' ? decoded.song.slice() : fail('song');
    const extension = copy(decoded.extension);
    const baseSourceRecordJson =
      typeof decoded.baseSourceRecordJson === 'string'
        ? decoded.baseSourceRecordJson.slice()
        : fail('base_json');
    const descriptorBytes =
      decoded.descriptorBytes instanceof Uint8Array
        ? decoded.descriptorBytes.slice()
        : fail('descriptor');
    const replay = copy(decoded.replay);
    // 2. independent raw base revalidation + base<->extension root binding
    let base;
    try {
      base = JSON.parse(baseSourceRecordJson);
    } catch {
      fail('base_json');
    }
    if (
      base?.videoId !== extension?.videoId ||
      base?.audioSha256 !== extension?.audioSha256 ||
      base?.encodedAudioSha256 !== extension?.encodedAudioSha256 ||
      base?.audioDescriptorSha256 !== extension?.audioDescriptorSha256 ||
      base?.decoderWasmSha256 !== extension?.decoderWasmSha256
    )
      fail('base_binding');
    if ((await hashTextImpl(baseSourceRecordJson)) !== extension.baseSourceRecordSha256)
      fail('base_sha');
    signal?.throwIfAborted?.();
    // 3. EXISTING verified encoded cache ONLY (opus-cache readVerifiedOpus,
    // which itself re-parses the descriptor, re-checks the cache key identity,
    // re-verifies the encoded parts and the cached record). Missing audio is
    // an explicit gate failure; nothing is pinned without local audio. No
    // network, no fabrication.
    let descriptor, cached;
    try {
      descriptor = await parseVerifiedDescriptor(descriptorBytes, extension.audioDescriptorSha256);
    } catch (e) {
      const err = Error('replay_install_descriptor');
      err.code = 'replay_install_descriptor';
      err.cause = e;
      throw err;
    }
    try {
      cached = await readVerifiedOpus(descriptor, extension.audioDescriptorSha256, signal);
    } catch (e) {
      const err = Error('replay_install_audio_unavailable');
      err.code = 'replay_install_audio_unavailable';
      err.cause = e;
      throw err;
    }
    if (!cached) fail('audio_missing');
    if (JSON.stringify(cached.record) !== JSON.stringify(base)) fail('audio_record_binding');
    const cachedBytes =
      cached.bytes instanceof Uint8Array
        ? cached.bytes
        : new Uint8Array(cached.bytes);
    if ((await sha256Hex(cachedBytes)) !== extension.encodedAudioSha256) fail('audio_sha');
    signal?.throwIfAborted?.();
    // 4. base pin / fresh policy / catalog register through the actual
    // frontend seam. A mid-pin failure AFTER the fresh-store commit is a
    // partial state, not an installation: report it structurally so an exact
    // retry can finish catalog registration (the two databases are not one
    // atomic transaction).
    const selection = copy({ lanes: replay?.lanes, difficulty: replay?.difficulty });
    const metadata = {
      title: typeof base.title === 'string' && base.title ? base.title : `yt-${base.videoId}`,
      ...(typeof base.author === 'string' && base.author ? { author: base.author } : {}),
    };
    const request = copy({
      version: 1,
      videoId: extension.videoId,
      encodedAudioSha256: extension.encodedAudioSha256,
      baseSourceRecordJson,
      extension,
    });
    // Observable tri-state through the actual frontend seam (restore):
    //   truthy  -> catalog IDB row observed AND fresh owner validated AND the
    //              in-memory catalog re-registers on restore: both true.
    //   null    -> catalog row observed ABSENT; the fresh-store commit is NOT
    //              observable through this seam (restore is catalog-gated), so
    //              pinCommitted is 'unknown', never a fabricated rollback.
    //   throws  -> observation itself failed: both 'unknown'.
    const observePinState = async () => {
      let truth;
      try { truth = await frontend.restore(song, { signal: undefined }); }
      catch { return { pinCommitted: 'unknown', catalogInstalled: 'unknown' }; }
      if (truth) return { pinCommitted: true, catalogInstalled: true };
      return { pinCommitted: 'unknown', catalogInstalled: false };
    };
    // Idempotency: a fully committed prior attempt validates through restore
    // (catalog row + fresh owner checks) and skips a duplicate pin, so an
    // exact retry after a partial converges instead of failing on re-pin.
    // A first install misses the catalog row cheaply and pins normally.
    const prior = await frontend.restore(song, { signal }).catch(() => null);
    if (!prior) {
      try {
        const pinned = await frontend.pin(request, descriptorBytes, selection, metadata, { signal });
        // Actual FE contract: pin returns { song: Song, localPinCommitted } with
        // Song.id === the song key (display(row)), not a bare string.
        if (pinned?.localPinCommitted !== true || pinned?.song?.id !== song) fail('pin_contract');
      } catch (e) {
        // Any pin-stage failure (including an abort the real pin surfaces
        // itself) reports the observed tri-state; never a fake rollback.
        const partial = await observePinState();
        if (signal?.aborted) {
          const err = Error('replay_install_aborted');
          err.code = 'replay_install_aborted';
          err.cause = e;
          err.partial = partial;
          throw err;
        }
        const err = Error('replay_install_pin_failed');
        err.code = 'replay_install_pin_failed';
        err.cause = e;
        err.partial = partial;
        throw err;
      }
      // Abort landing AFTER a committed pin is a truthful partial, never a fake
      // atomic rollback: report the observed state and stop before any catalog
      // restore / session derivation.
      if (signal?.aborted) {
        const err = Error('replay_install_aborted');
        err.code = 'replay_install_aborted';
        err.partial = await observePinState();
        throw err;
      }
    }
    const restored = await frontend.restore(song, { signal });
    if (!restored) fail('catalog_register');
    signal?.throwIfAborted?.();
    // 5. derive + save through the actual 1111 importer (fresh owner per use)
    const saved = await importSharedReplay(wire, { signal });
    if (saved?.song !== song || typeof saved?.sessionKey !== 'string') fail('session_binding');
    return copy({
      song,
      installed: true,
      pinCommitted: true,
      catalogInstalled: true,
      audioMatchedSha256: extension.encodedAudioSha256,
      sessionKey: saved.sessionKey,
      result: saved.result,
    });
  };
}
