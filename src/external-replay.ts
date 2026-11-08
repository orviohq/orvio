import { Engine } from './engine';
import {
  validSourceRecord,
  type SourceRecord,
  type ChartKey,
} from './external-source';
export type ExternalReplayOp =
  | [0, number, number, number, 0 | 1]
  | [1, number, number]
  | [2, number, number, 0 | 1];
export interface ExternalReplay {
  version: 1;
  source: SourceRecord;
  chart: ChartKey;
  ops: ExternalReplayOp[];
  endMs: number;
  score: number;
  judgments: number[];
}
/** Source and exact note arrays travel with the local replay; future generators are irrelevant. */
export function checkExternalReplay(raw: unknown): raw is ExternalReplay {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as ExternalReplay;
  if (
    r.version !== 1 ||
    !validSourceRecord(r.source) ||
    !Object.hasOwn(r.source.charts, r.chart) ||
    !Array.isArray(r.ops) ||
    r.ops.length > 100000 ||
    !Number.isFinite(r.endMs) ||
    r.endMs < 0 ||
    r.endMs > 1200000 ||
    !Number.isInteger(r.score) ||
    r.score < 0 ||
    r.score > 1000000 ||
    !Array.isArray(r.judgments) ||
    r.judgments.length !== 12 ||
    r.judgments.some((v) => !Number.isInteger(v) || v < 0 || v > 10000)
  )
    return false;
  const engine = new Engine(structuredClone(r.source.charts[r.chart]!.notes));
  let wall = -Infinity;
  try {
    r.ops.forEach((op, sequence) => {
      if (
        !Array.isArray(op) ||
        ![0, 1, 2].includes(op[0]) ||
        !Number.isFinite(op[1]) ||
        op[1] < wall ||
        op[1] < 0 ||
        op[1] > r.endMs ||
        !Number.isFinite(op[2])
      )
        throw Error();
      wall = op[1];
      if (op[0] === 0) {
        if (
          op.length !== 5 ||
          !Number.isInteger(op[3]) ||
          op[3] < 0 ||
          op[3] >= Number(r.chart[0]) ||
          ![0, 1].includes(op[4])
        )
          throw Error();
        engine.input({ lane: op[3], time: op[2], down: op[4] === 1, sequence });
      } else if (op[0] === 1) {
        if (op.length !== 3) throw Error();
        engine.update(op[2]);
      } else {
        if (op.length !== 4 || ![0, 1].includes(op[3])) throw Error();
      }
    });
    engine.update(9999);
  } catch {
    return false;
  }
  const counts = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    (v) => engine.events.filter((e) => e.value === v).length,
  );
  return (
    engine.score === r.score && counts.every((v, i) => v === r.judgments[i])
  );
}
