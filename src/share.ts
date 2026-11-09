import { FADERS, type Fader } from './game-options';
export const SHARED_SONGS = {
  'first-light': 'First Light',
  afterimage: 'Afterimage',
  'violet-drive': 'Violet Drive',
} as const;
export interface SharedResult {
  song: keyof typeof SHARED_SONGS;
  lanes: import('./chart').Lanes;
  difficulty: 'low' | 'mid' | 'high' | 'sc';
  score: number;
  accuracy: number;
  combo: number;
  judgments?: number[];
  options?: {
    speed: number;
    fader: Fader;
    shuffle: 'off' | 'mirror' | 'random';
    seed: number;
  };
}
export function readResult(params: URLSearchParams): SharedResult | null {
  if (!['1', '2', '3', '4'].includes(params.get('v') || '')) return null;
  const song = params.get('song') as SharedResult['song'];
  const lanes = Number(params.get('keys'));
  const difficulty = params.get('diff') as SharedResult['difficulty'];
  const score = Number(params.get('score'));
  const accuracy = Number(params.get('acc'));
  const combo = Number(params.get('combo'));
  if (
    !Object.hasOwn(SHARED_SONGS, song) ||
    ![4, 5, 6, 7, 8].includes(lanes) ||
    !['low', 'mid', 'high', 'sc'].includes(difficulty) ||
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
  let judgments: number[] | undefined;
  if (['3', '4'].includes(params.get('v') || '')) {
    const raw = params.get('j') || '';
    if (!/^\d+(,\d+){11}$/.test(raw)) return null;
    judgments = raw.split(',').map(Number);
    const total = judgments.reduce((a, b) => a + b, 0);
    if (
      total <= 0 ||
      total > 10000 ||
      judgments.some((v) => v < 0 || v > 10000) ||
      combo > total
    )
      return null;
    const weighted = judgments.reduce(
      (sum, count, i) =>
        sum + count * [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0][i],
      0,
    );
    if (
      Math.abs(Math.round((weighted / total) * 100) / 100 - accuracy) > 0.011 ||
      Math.floor((1000000 * weighted) / (100 * total)) !== score
    )
      return null;
  }
  let options: SharedResult['options'];
  if (params.get('v') === '4') {
    const speed = Number(params.get('speed')),
      fader = params.get('fade'),
      shuffle = params.get('shuffle'),
      seed = Number(params.get('seed'));
    if (
      !params.has('speed') ||
      !params.has('seed') ||
      !Number.isFinite(speed) ||
      speed < 1 ||
      speed > 9 ||
      !(FADERS as readonly string[]).includes(fader || '') ||
      !['off', 'mirror', 'random'].includes(shuffle || '') ||
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > 4294967295
    )
      return null;
    options = {
      speed,
      fader: fader as NonNullable<SharedResult['options']>['fader'],
      shuffle: shuffle as NonNullable<SharedResult['options']>['shuffle'],
      seed,
    };
  }
  return {
    ...(options ? { options } : {}),
    ...(judgments ? { judgments } : {}),
    song,
    lanes: lanes as import('./chart').Lanes,
    difficulty,
    score,
    accuracy: Math.round(accuracy * 100) / 100,
    combo,
  };
}
export function resultParams(result: SharedResult) {
  return new URLSearchParams({
    v: result.options && result.judgments ? '4' : result.judgments ? '3' : '2',
    song: result.song,
    keys: String(result.lanes),
    diff: result.difficulty,
    score: String(result.score),
    acc: result.accuracy.toFixed(2),
    combo: String(result.combo),
    ...(result.judgments ? { j: result.judgments.join(',') } : {}),
    ...(result.options
      ? {
          speed: String(result.options.speed),
          fade: result.options.fader,
          shuffle: result.options.shuffle,
          seed: String(result.options.seed),
        }
      : {}),
  });
}
