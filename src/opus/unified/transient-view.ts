// NEW ephemeral shared-result/replay service. No catalog/session/pin/write API.
import {
  validateRuntimeReplay,
  replayEngine,
  applyReplayOp,
} from '../../replay';
import { JUDGMENTS } from '../../engine';
import { opusPcmToAudioBuffer } from '../opus-chart-worker-client.mjs';
import { sha256Hex } from '../opus468-record.mjs';
import { waitAcquired } from '../opus-acquired-v2-artifacts.mjs';
export function createTransient468View(input: any, { reader, readAudio }: any) {
  if (
    typeof reader?.readChart !== 'function' ||
    typeof readAudio !== 'function'
  )
    throw Error('transient_build_capabilities');
  const c = structuredClone(input),
    base = JSON.parse(c.baseSourceRecordJson),
    e = c.extension;
  const song = `yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`;
  const replay = validateRuntimeReplay(c.replay, (id: string) => id === song);
  if (!replay || ![4, 6, 8].includes(replay.lanes))
    throw Error('transient_replay');
  const request = {
    version: 1,
    videoId: e.videoId,
    encodedAudioSha256: e.encodedAudioSha256,
    baseSourceRecordJson: c.baseSourceRecordJson,
    extension: e,
  };
  const selection = { lanes: replay.lanes, difficulty: replay.difficulty },
    lifetime = new AbortController();
  let revoked = false;
  const signalFor = (signal?: AbortSignal) => {
    if (revoked) throw Error('transient_revoked');
    signal?.throwIfAborted();
    return signal
      ? AbortSignal.any([signal, lifetime.signal])
      : lifetime.signal;
  };
  const fresh = async (signal: AbortSignal) => {
    const chart = await waitAcquired(
      reader.readChart(
        structuredClone(request),
        c.descriptorBytes.slice(),
        structuredClone(selection),
        { signal },
      ),
      signal,
    );
    signal.throwIfAborted();
    if (
      chart.lanes !== selection.lanes ||
      chart.difficulty !== selection.difficulty ||
      chart.song !== song ||
      chart.extensionSha256 !== e.extensionSha256 ||
      chart.baseSourceRecordSha256 !== e.baseSourceRecordSha256 ||
      JSON.stringify(chart.frozenNotes) !==
        JSON.stringify(
          e.charts[`${selection.lanes}:${selection.difficulty}`].notes,
        )
    )
      throw Error('transient_chart_binding');
    return structuredClone(chart);
  };
  const display = () => ({
    id: song,
    title: String(c.title).slice(0, 300),
    subtitle: c.author === null ? 'YouTube' : String(c.author).slice(0, 100),
    bpm: base.estimatedBpm,
    root: 57,
    scale: [0, 2, 4, 7, 9],
    color: '#29d8ff',
    genre: 'YOUTUBE',
    bars: 0,
  });
  return Object.freeze({
    revoke() {
      revoked = true;
      lifetime.abort(Error('transient_revoked'));
    },
    async verifiedResult({ signal: callerSignal }: any = {}) {
      const signal = signalFor(callerSignal),
        chart = await fresh(signal),
        engine = replayEngine(replay, structuredClone(chart.frozenNotes));
      replay.ops.forEach((op: any, i: number) => applyReplayOp(engine, op, i));
      engine.update(9999);
      signal.throwIfAborted();
      const finalOptions = structuredClone(replay.options);
      for (const op of replay.ops)
        if (op[0] === 3) {
          finalOptions.speed = op[3];
          finalOptions.fader = op[4];
        }
      const result = {
        song,
        lanes: replay.lanes,
        difficulty: replay.difficulty,
        score: engine.score,
        accuracy: engine.sum / engine.total,
        combo: engine.maxCombo,
        judgments: JUDGMENTS.map(
          (v) => engine.events.filter((ev) => ev.value === v).length,
        ),
        options: finalOptions,
      };
      return structuredClone({
        song: display(),
        baseRecord: base,
        extension: e,
        replay,
        result,
        frozenNotes: chart.frozenNotes,
        kind: 'verified-transient-shared-result',
        persistentLibraryAdded: false,
        persistentSessionSaved: false,
      });
    },
    async prepareReplay(
      context: BaseAudioContext,
      { signal: callerSignal }: any = {},
    ) {
      const signal = signalFor(callerSignal),
        chart = await fresh(signal);
      const supplied = await waitAcquired(
        readAudio(structuredClone(base), signal, c.descriptorBytes.slice()),
        signal,
      );
      signal.throwIfAborted();
      if (!(supplied instanceof ArrayBuffer)) throw Error('transient_pcm');
      const pcm = supplied.slice(0);
      if (
        pcm.byteLength !== base.frames * 4 ||
        sha256Hex(new Uint8Array(pcm)) !== base.audioSha256
      )
        throw Error('transient_pcm');
      const finalChart = await fresh(signal);
      if (JSON.stringify(finalChart) !== JSON.stringify(chart))
        throw Error('transient_changed');
      return {
        song: display(),
        engine: replayEngine(replay, structuredClone(chart.frozenNotes)),
        audio: opusPcmToAudioBuffer(context, pcm, base.frames),
        identity: {
          song,
          extensionSha256: e.extensionSha256,
          baseSourceRecordSha256: e.baseSourceRecordSha256,
        },
        frozenNotes: structuredClone(chart.frozenNotes),
        replay: structuredClone(replay),
        persistentLibraryAdded: false,
        persistentSessionSaved: false,
      };
    },
  });
}
