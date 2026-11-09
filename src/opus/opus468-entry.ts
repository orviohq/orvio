// PRIVATE entry adapter. Not imported by the public main entry.
// Only a trusted composition root supplies the reviewed frontend service.
import type { createOpus468Frontend } from './opus468-frontend';
import type { Difficulty } from '../chart';
type Frontend = ReturnType<typeof createOpus468Frontend>;
type Selection = { lanes: 4 | 6 | 8; difficulty: Difficulty };
type Prepared = Awaited<ReturnType<Frontend['play']>>;
export function createOpus468Entry(frontend: Frontend) {
  let generation = 0;
  let pending: AbortController | undefined;
  function cancel() {
    generation++;
    pending?.abort();
    pending = undefined;
  }
  function selection(lanes: number, difficulty: string): Selection {
    if (
      ![4, 6, 8].includes(lanes) ||
      !['low', 'mid', 'high', 'sc'].includes(difficulty)
    )
      throw Error('extension_selection_unavailable');
    return { lanes: lanes as 4 | 6 | 8, difficulty: difficulty as Difficulty };
  }
  return Object.freeze({
    cancel,
    owns(song: string) {
      return frontend.list().some((item) => item.id === song);
    },
    async restore(song: string) {
      cancel();
      const token = generation;
      const controller = new AbortController();
      pending = controller;
      try {
        const item = await frontend.restore(song, {
          signal: controller.signal,
        });
        controller.signal.throwIfAborted();
        if (token !== generation) throw Error('extension_entry_stale');
        return item;
      } finally {
        if (pending === controller) pending = undefined;
      }
    },
    async start(input: {
      song: string;
      lanes: number;
      difficulty: string;
      shuffle: 'off' | 'mirror' | 'random';
      seed: number;
      context: BaseAudioContext;
      present: (prepared: Prepared) => void;
    }) {
      // Snapshot route/settings before the first async boundary. No procedural
      // makeChart/renderSong/cache fallback is allowed for an extension entry.
      const song = input.song;
      const choice = selection(input.lanes, input.difficulty);
      const options = { shuffle: input.shuffle, seed: input.seed };
      const context = input.context;
      const present = input.present;
      if (!frontend.list().some((item) => item.id === song))
        throw Error('extension_not_restored');
      cancel();
      const token = generation;
      const controller = new AbortController();
      pending = controller;
      try {
        const prepared = await frontend.play(song, choice, options, context, {
          signal: controller.signal,
        });
        controller.signal.throwIfAborted();
        if (
          token !== generation ||
          prepared.song.id !== song ||
          prepared.identity.song !== song
        )
          throw Error('extension_entry_stale');
        // The caller transfers this exact Engine and AudioBuffer into the
        // existing gameplay lifecycle. It must not reconstruct either one.
        present(prepared);
        return prepared;
      } finally {
        if (pending === controller) pending = undefined;
      }
    },
  });
}
