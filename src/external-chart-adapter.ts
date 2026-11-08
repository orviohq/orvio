import type { Lanes, Note } from './chart';

/** DSP candidate wire format. This adapter changes representation, never timing or lanes. */
export interface DecoratedNote {
  id: number;
  time: number;
  lane: number;
  type: 'tap' | 'hold';
  duration?: number;
}
export function adaptDecoratedChart(
  raw: unknown,
  lanes: Lanes,
  duration: number,
): Note[] {
  if (
    ![5, 7].includes(lanes) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Array.isArray(raw) ||
    !raw.length ||
    raw.length > 10000
  )
    throw new Error('Invalid candidate chart');
  const ids = new Set<number>();
  const laneUntil = new Map<number, number>();
  let previous = -Infinity;
  return raw.map((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object')
      throw new Error('Invalid candidate note');
    const n = candidate as DecoratedNote;
    if (
      !Number.isInteger(n.id) ||
      ids.has(n.id) ||
      !Number.isInteger(n.lane) ||
      n.lane < 0 ||
      n.lane >= lanes ||
      !Number.isFinite(n.time) ||
      n.time < 0 ||
      n.time < previous ||
      n.time >= duration ||
      !['tap', 'hold'].includes(n.type) ||
      (laneUntil.get(n.lane) ?? -Infinity) >= n.time
    )
      throw new Error('Invalid candidate note');
    ids.add(n.id);
    previous = n.time;
    const note: Note = { id: n.id, time: n.time, lane: n.lane };
    if (n.type === 'hold') {
      if (
        !Number.isFinite(n.duration) ||
        n.duration! <= 0 ||
        n.time + n.duration! > duration
      )
        throw new Error('Invalid candidate hold');
      note.end = n.time + n.duration!;
    } else if (n.duration !== undefined)
      throw new Error('Tap cannot carry a hold duration');
    laneUntil.set(n.lane, note.end ?? note.time);
    return note;
  });
}
