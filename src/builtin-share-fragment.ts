import { SONGS, makeChart, type Note } from './chart';
import {
  encodeReplay,
  replayMatches,
  type RuntimeReplay,
  type ReplayData,
} from './replay';
import { resultParams, type SharedResult } from './share';
/** Public builtin payloads use current builtin identity only. Local snapshots never silently become new charts. */
export async function builtinShareFragment(
  replay: RuntimeReplay,
  result: SharedResult,
  frozen?: Note[],
) {
  const song = SONGS.find(
    (s) => s.id === replay.song && !s.id.startsWith('yt-'),
  );
  if (
    !song ||
    (frozen &&
      JSON.stringify(frozen) !==
        JSON.stringify(makeChart(song, replay.difficulty, replay.lanes))) ||
    !replayMatches(replay, result)
  )
    throw Error('Saved replay cannot be shared with this chart version');
  const params = resultParams(result);
  const encoded = await encodeReplay(replay as ReplayData);
  params.set('rp', '1');
  params.set('rn', String(encoded.length));
  params.set('r', encoded);
  return params.toString();
}
