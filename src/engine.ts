import {
  FeverTracker,
  type FeverJudgment,
  type FeverReplayMetadata,
} from './fever';
import type { Note } from './chart';
export const JUDGMENTS = [
  100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0,
] as const;
export type Judgment = (typeof JUDGMENTS)[number];
// Prototype boundaries, NOT claimed to reproduce DJMAX's unpublished full timing table.
export const WINDOWS_MS = [
  41.67, 50, 58.33, 66.67, 75, 83.33, 91.67, 100, 108.33, 116.67, 150,
] as const;
export function judge(deltaMs: number): Judgment {
  const idx = WINDOWS_MS.findIndex((w) => Math.abs(deltaMs) <= w + 1e-6);
  return idx < 0 ? 0 : JUDGMENTS[idx];
}
export interface InputEvent {
  lane: number;
  time: number;
  down: boolean;
  sequence: number;
}
export interface JudgmentEvent {
  noteId: number;
  lane: number;
  value: Judgment;
  delta: number;
  tail: boolean;
  time: number;
}
export interface NoteState {
  note: Note;
  head?: Judgment;
  tail?: Judgment;
  held: boolean;
  done: boolean;
}
export class Engine {
  readonly states: NoteState[];
  readonly total: number;
  readonly events: JudgmentEvent[] = [];
  combo = 0;
  maxCombo = 0;
  sum = 0;
  resolved = 0;
  breaks = 0;
  private lastSequence = -1;
  readonly fever: FeverTracker;
  private feverSequence = 0;
  private pendingFever: Omit<FeverJudgment, 'sequence'>[] | null = null;
  constructor(notes: Note[], fever?: FeverReplayMetadata) {
    this.fever = new FeverTracker(fever);
    this.states = notes.map((note) => ({ note, held: false, done: false }));
    this.total = notes.reduce((n, x) => n + (x.end ? 2 : 1), 0);
  }
  get rate() {
    return this.resolved ? this.sum / this.resolved : 100;
  }
  get score() {
    return Math.min(
      1000000,
      Math.floor((1000000 * this.sum) / (100 * this.total)),
    );
  }
  get rank() {
    const rate = this.total ? this.sum / this.total : 0;
    return rate >= 97 ? 'S' : rate >= 90 ? 'A' : rate >= 80 ? 'B' : 'C';
  }
  private record(
    s: NoteState,
    value: Judgment,
    delta: number,
    time: number,
    tail = false,
    feverTime = time,
  ) {
    if (tail) s.tail = value;
    else s.head = value;
    this.sum += value;
    this.resolved++;
    if (value === 0) {
      this.combo = 0;
      this.breaks++;
    } else {
      this.combo++;
      this.maxCombo = Math.max(this.combo, this.maxCombo);
    }
    if (!s.note.end || tail) s.done = true;
    const feverEvent = {
      noteId: s.note.id,
      time: feverTime,
      value,
      tail,
      holdEnd: s.note.end,
    };
    if (this.pendingFever) this.pendingFever.push(feverEvent);
    else this.recordFever(feverEvent);
    this.events.push({
      noteId: s.note.id,
      lane: s.note.lane,
      value,
      delta,
      tail,
      time,
    });
  }
  private recordFever(event: Omit<FeverJudgment, 'sequence'>) {
    this.fever.advance(event.time);
    this.fever.judgment({ ...event, sequence: this.feverSequence++ });
  }
  input(event: InputEvent) {
    if (event.sequence <= this.lastSequence) return;
    this.lastSequence = event.sequence;
    this.update(event.time);
    if (event.down) {
      const s = this.states.find(
        (s) =>
          s.note.lane === event.lane &&
          s.head === undefined &&
          !s.done &&
          Math.abs(s.note.time - event.time) <= 0.15,
      );
      if (!s) return;
      const value = judge((event.time - s.note.time) * 1000);
      this.record(s, value, (event.time - s.note.time) * 1000, event.time);
      s.held = !!s.note.end && value > 0;
      if (s.note.end && value === 0) this.record(s, 0, 0, event.time, true);
    } else {
      const s = this.states.find(
        (s) => s.note.lane === event.lane && s.held && !s.done,
      );
      if (!s || !s.note.end) return;
      const delta = (event.time - s.note.end) * 1000;
      const value: Judgment =
        delta < -116.67 ? 0 : delta > 116.67 ? 1 : (s.head ?? 0);
      s.held = false;
      this.record(s, value, delta, event.time, true);
    }
  }
  update(time: number) {
    // Preserve legacy raw judgment order, but merge automatic fever deadlines
    // chronologically before advancing hold clocks to this frame's time.
    const pending: Omit<FeverJudgment, 'sequence'>[] = [];
    this.pendingFever = pending;
    for (const s of this.states) {
      if (s.done) continue;
      if (s.head === undefined && time - s.note.time > 0.15) {
        this.record(s, 0, 150, time, false, s.note.time + 0.15);
        if (s.note.end) this.record(s, 0, 150, time, true, s.note.time + 0.15);
      } else if (s.held && s.note.end && time - s.note.end > 0.15) {
        s.held = false;
        this.record(s, 1, 150, time, true, s.note.end + 0.15);
      }
    }
    this.pendingFever = null;
    pending
      .sort((a, b) => a.time - b.time)
      .forEach((event) => this.recordFever(event));
    this.fever.advance(time);
  }
}
