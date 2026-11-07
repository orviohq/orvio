import { externalNotes, externalDuration } from './external-catalog';
export type Difficulty = 'low' | 'mid' | 'high';
export type Lanes = 5 | 7;
export interface Song {
  id: string;
  title: string;
  subtitle: string;
  bpm: number;
  root: number;
  scale: number[];
  color: string;
  genre: string;
  bars: number;
}
export const SONGS: Song[] = [
  {
    id: 'first-light',
    title: 'First Light',
    subtitle: '깨어나는 도시의 첫 박자',
    bpm: 110,
    root: 57,
    scale: [0, 2, 4, 7, 9],
    color: '#29d8ff',
    genre: 'DREAM HOUSE',
    bars: 16,
  },
  {
    id: 'afterimage',
    title: 'Afterimage',
    subtitle: '빛이 사라진 자리에 남은 잔상',
    bpm: 128,
    root: 50,
    scale: [0, 3, 5, 7, 10],
    color: '#61efb3',
    genre: 'UK GARAGE',
    bars: 20,
  },
  {
    id: 'violet-drive',
    title: 'Violet Drive',
    subtitle: '밤의 끝을 향해, 한 번 더',
    bpm: 150,
    root: 45,
    scale: [0, 2, 3, 7, 10],
    color: '#ffb82e',
    genre: 'NEON BREAKS',
    bars: 24,
  },
];
export interface Note {
  id: number;
  lane: number;
  time: number;
  end?: number;
}
export function melodyIndex(step: number, song: Song): number {
  const motif = [0, 2, 4, 2, 1, 3, 2, 0, 4, 3, 1, 2, 0, 1, 3, 4];
  return motif[
    (step +
      Math.max(
        0,
        SONGS.findIndex((s) => s.id === song.id),
      ) *
        3) %
      16
  ];
}
export function makeChart(
  song: Song,
  difficulty: Difficulty,
  lanes: Lanes,
): Note[] {
  const saved = externalNotes(song.id, difficulty, lanes);
  if (saved) return saved;
  const beat = 60 / song.bpm;
  const notes: Note[] = [];
  const divisions = difficulty === 'low' ? 1 : difficulty === 'mid' ? 2 : 4;
  const totalBeats = song.bars * 4;
  for (let b = 4; b < totalBeats; b += 1 / divisions) {
    const step = Math.round(b * divisions);
    const inBar = Math.floor(b) % 4;
    if (difficulty === 'low' && inBar === 3 && Math.floor(b / 4) % 2 === 0)
      continue;
    if (
      difficulty === 'high' &&
      step % 4 !== 0 &&
      (step * 7 + Math.floor(b / 4)) % 5 === 0
    )
      continue;
    const lane =
      (melodyIndex(Math.floor(b * 2), song) +
        Math.floor(b / 8) * 2 +
        (step % 2)) %
      lanes;
    // Holds replace sparse downbeats, never overlap a subsequent event in the same lane.
    notes.push({ id: notes.length, lane, time: b * beat });
    if (difficulty !== 'low' && step % (divisions * 8) === 0) {
      const other = (lane + Math.ceil(lanes / 2)) % lanes;
      notes.push({ id: notes.length, lane: other, time: b * beat });
    }
  }
  // Convert a few isolated hits into holds, preserving all lane head/tail clearance.
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (i % 17 !== 3) continue;
    const next = notes.slice(i + 1).find((x) => x.lane === n.lane);
    const length = beat * (difficulty === 'low' ? 1.5 : 0.75);
    if (!next || next.time - n.time > length + 0.3) n.end = n.time + length;
  }
  return notes
    .sort((a, b) => a.time - b.time || a.lane - b.lane)
    .map((n, id) => ({ ...n, id }));
}
export function duration(song: Song) {
  return externalDuration(song.id) ?? (song.bars * 4 * 60) / song.bpm + 2;
}
