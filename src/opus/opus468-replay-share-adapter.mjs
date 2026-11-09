// NEW (test-only): local replay-share IMPORT binding adapter for the 4/6/8
// extension. The wire codec is Raw's createOpus468LocalReplayCodec (separate
// module, NOT duplicated or modified here). This adapter binds a DECODED
// payload into the actual local seams: a FRESH codec/reader (fresh owner per
// use), independent identity rebinding, strict replay revalidation, result
// DERIVATION through the actual Engine, then the actual frontend session
// seam. No public share/route/policy enable/main entry; no result/token/
// journal/verdict/PCM export; current test-only candidate stays DENY
// upstream (codec readerOptions default []). Trust labels inside codec/FE
// sources are content claims; all trust enters only via injected build-owned
// readerOptions and the injected session/Engine seams.
const copy = (x) => structuredClone(x);
const fail = (s) => {
  throw Error('replay_share_import_' + s);
};
const hex = (b) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join(
    '',
  );
const sha256Hex = async (bytes) =>
  hex(await crypto.subtle.digest('SHA-256', bytes));
const hashText = async (t) => sha256Hex(new TextEncoder().encode(t));

export function createOpus468ReplayShareImporter({
  makeCodec, // () => Raw codec instance; invoked PER IMPORT (fresh reader/owner per use)
  saveSession, // actual createOpus468Frontend seam: (replay, result, {signal}) => sessionKey
  validateRuntimeReplay, // actual ../replay.ts
  replayEngine, // actual ../replay.ts
  applyReplayOp, // actual ../replay.ts
  judgments, // actual ../engine.ts JUDGMENTS
} = {}) {
  if (typeof makeCodec !== 'function')
    throw Error('replay_share_codec_factory_missing');
  if (typeof saveSession !== 'function')
    throw Error('replay_share_session_seam_missing');
  if (
    typeof validateRuntimeReplay !== 'function' ||
    typeof replayEngine !== 'function' ||
    typeof applyReplayOp !== 'function' ||
    !Array.isArray(judgments) ||
    judgments.length !== 12
  )
    throw Error('replay_share_engine_seam_missing');
  return async function importSharedReplay(input, { signal } = {}) {
    if (
      !(input instanceof Uint8Array) ||
      !(input.buffer instanceof ArrayBuffer)
    )
      fail('bytes');
    // Snapshot wire bytes BEFORE the first await; decode through a FRESH codec
    // (fresh reader/policy/owner per use; current candidate denied inside).
    const wire = input.slice();
    const codec = makeCodec();
    if (typeof codec?.decode !== 'function') fail('codec_factory');
    const decoded = await codec.decode(wire, { signal });
    signal?.throwIfAborted?.();
    // Snapshot every decoded field before further awaits.
    if (!decoded || typeof decoded !== 'object') fail('decode');
    const song =
      typeof decoded.song === 'string' && decoded.song
        ? decoded.song.slice()
        : fail('song');
    const selectedChartSha256 =
      typeof decoded.selectedChartSha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(decoded.selectedChartSha256)
        ? decoded.selectedChartSha256.slice()
        : fail('selected_sha');
    const frozenNotes = copy(decoded.frozenNotes);
    const extension = copy(decoded.extension);
    const baseSourceRecordJson =
      typeof decoded.baseSourceRecordJson === 'string'
        ? decoded.baseSourceRecordJson.slice()
        : fail('base_json');
    const replay = copy(decoded.replay);
    // Independent identity rebinding (adapter-side, defense in depth; codec
    // already enforced these through the fresh reader).
    const e = extension;
    const recomputed = `yt-opus-${e?.videoId}-${e?.audioSha256}-c${e?.baseChartSetSha256}-x${e?.extensionSha256}`;
    if (song !== recomputed) fail('song_binding');
    if ((await hashText(baseSourceRecordJson)) !== e?.baseSourceRecordSha256)
      fail('base_binding');
    const slotKey = `${replay?.lanes}:${replay?.difficulty}`;
    const slot = e?.charts?.[slotKey];
    if (!Array.isArray(slot?.notes) || slot.sha256 !== selectedChartSha256)
      fail('selected_chart');
    if ((await hashText(JSON.stringify(frozenNotes))) !== selectedChartSha256)
      fail('frozen_chart');
    // Strict replay revalidation against the bound song identity.
    const validated = validateRuntimeReplay(replay, (id) => id === song);
    if (
      !validated ||
      ![4, 6, 8].includes(validated.lanes) ||
      validated.song !== song
    )
      fail('replay_shape');
    // Derive events + result through the ACTUAL Engine on the committed
    // frozen chart. The wire carries NO claimed result; the result is
    // computed here, never trusted from the package.
    const engine = replayEngine(validated, copy(frozenNotes));
    validated.ops.forEach((op, i) => applyReplayOp(engine, op, i));
    engine.update(9999);
    const counts = judgments.map(
      (v) => engine.events.filter((ev) => ev.value === v).length,
    );
    const result = {
      song,
      lanes: validated.lanes,
      difficulty: validated.difficulty,
      score: engine.score,
      accuracy: engine.sum / engine.total,
      combo: engine.maxCombo,
      judgments: counts,
      options: copy(validated.options),
    };
    // Actual frontend session seam (its own fresh owner read + replayMatches
    // gate applies again inside createOpus468Frontend.saveSession).
    const sessionKey = await saveSession(validated, copy(result), { signal });
    if (typeof sessionKey !== 'string' || !sessionKey.startsWith(song + ':'))
      fail('session_binding');
    return copy({ song, sessionKey, result });
  };
}
