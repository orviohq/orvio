import type { NoteState } from './engine';
export function noteLayout(
  s: NoteState,
  target: number,
  time: number,
  px: number,
  height: number,
) {
  const y = target - (s.note.time - time) * px;
  const endY = target - ((s.note.end ?? s.note.time) - time) * px;
  const failed = !!s.note.end && (s.head === 0 || s.tail === 0);
  // Failed holds keep a muted remaining body until the tail passes the line.
  // This is visual lifetime only; resolved score/input state stays unchanged.
  const remainingFailed = failed && time < s.note.end!;
  const headY = s.held || remainingFailed ? target : y;
  // A held note's original head can be below the viewport. Its remaining body
  // still spans the tail to the judgment line and must not be culled with it.
  const visible =
    (!s.done || remainingFailed) && headY > -30 && endY < height + 30;
  return {
    visible,
    failed,
    headY,
    endY,
    showHead: visible && (s.head === undefined || s.held),
    bodyHeight: Math.max(2, headY - endY),
  };
}
