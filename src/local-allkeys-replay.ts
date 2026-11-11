import {
  validateLocalAllKeysRecord,
  selectLocalAllKeysChart,
  localAllKeysIdentity,
  type LocalAllKeysEnvelope,
} from "./local-allkeys-record";
import {
  validateRuntimeReplay,
  replayEngine,
  applyReplayOp,
  type RuntimeReplay,
} from "./replay";
import type { Note } from "./chart";

export async function verifyLocalAllKeysReplay(
  raw: unknown,
  replayRaw: unknown,
  options?: { signal?: AbortSignal },
): Promise<{
  identity: string;
  record: LocalAllKeysEnvelope;
  replay: RuntimeReplay;
  frozenNotes: Note[];
  result: {
    song: string;
    lanes: RuntimeReplay["lanes"];
    difficulty: RuntimeReplay["difficulty"];
    score: number;
    accuracy: number;
    combo: number;
    judgments: number[];
    options: RuntimeReplay["options"];
  };
}> {
  options?.signal?.throwIfAborted();
  const replayCopy: unknown = structuredClone(replayRaw);
  const record = await validateLocalAllKeysRecord(raw, options);
  const identity = localAllKeysIdentity(record);
  const replay = validateRuntimeReplay(replayCopy, (song) => song === identity);
  if (!replay) throw new TypeError("Invalid local all-keys replay");
  const { frozenNotes } = await selectLocalAllKeysChart(
    record,
    replay.lanes,
    replay.difficulty,
    options,
  );
  options?.signal?.throwIfAborted();
  const engine = replayEngine(replay, frozenNotes);
  const finalOptions = { ...replay.options };
  for (let index = 0; index < replay.ops.length; index++) {
    if (index % 128 === 0) options?.signal?.throwIfAborted();
    const op = replay.ops[index];
    applyReplayOp(engine, op, index);
    if (op[0] === 3) {
      finalOptions.speed = op[3];
      finalOptions.fader = op[4];
    }
  }
  options?.signal?.throwIfAborted();
  engine.update(9999);
  const judgments = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    (value) => engine.events.filter((event) => event.value === value).length,
  );
  const result = {
    song: identity,
    lanes: replay.lanes,
    difficulty: replay.difficulty,
    score: engine.score,
    accuracy: engine.total ? engine.sum / engine.total : 0,
    combo: engine.maxCombo,
    judgments,
    options: finalOptions,
  };
  options?.signal?.throwIfAborted();
  return { identity, record, replay, frozenNotes, result };
}
