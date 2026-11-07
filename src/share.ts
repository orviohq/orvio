export const SHARED_SONGS = {
  'first-light': 'First Light',
  afterimage: 'Afterimage',
  'violet-drive': 'Violet Drive',
} as const;
export interface SharedResult {
  song: keyof typeof SHARED_SONGS;
  lanes: 5 | 7;
  difficulty: 'low' | 'mid' | 'high';
  score: number;
  accuracy: number;
  combo: number;
}
export function readResult(params: URLSearchParams): SharedResult | null {
  if (!['1', '2'].includes(params.get('v') || '')) return null;
  const song = params.get('song') as SharedResult['song'];
  const lanes = Number(params.get('keys'));
  const difficulty = params.get('diff') as SharedResult['difficulty'];
  const score = Number(params.get('score'));
  const accuracy = Number(params.get('acc'));
  const combo = Number(params.get('combo'));
  if (
    !Object.hasOwn(SHARED_SONGS, song) ||
    ![5, 7].includes(lanes) ||
    !['low', 'mid', 'high'].includes(difficulty) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 1000000 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 100 ||
    !Number.isInteger(combo) ||
    combo < 0 ||
    combo > 10000 ||
    ['score', 'acc', 'combo'].some((k) => !params.has(k))
  )
    return null;
  return {
    song,
    lanes: lanes as 5 | 7,
    difficulty,
    score,
    accuracy: Math.round(accuracy * 100) / 100,
    combo,
  };
}
export function resultParams(result: SharedResult) {
  return new URLSearchParams({
    v: '2',
    song: result.song,
    keys: String(result.lanes),
    diff: result.difficulty,
    score: String(result.score),
    acc: result.accuracy.toFixed(2),
    combo: String(result.combo),
  });
}
