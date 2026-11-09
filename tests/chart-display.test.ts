import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { chartDisplay } from '../src/chart-display';
import { SONGS, makeChart } from '../src/chart';
import { installExternalSource } from '../src/external-catalog';
it('display shares pinned metadata and counts without cloning notes or changing playback copies', () => {
  const record = JSON.parse(
    fs.readFileSync('test-support/opus35-frost/record.json', 'utf8'),
  );
  const { song } = installExternalSource(record, 'fixture');
  const clone = vi.spyOn(globalThis, 'structuredClone');
  const value = chartDisplay(song, 'low', 5);
  expect(value.count).toBe(record.charts['5:low'].notes.length);
  expect(value.metadata).toBe(record.chartMetadata['5:low']);
  expect(chartDisplay(song, 'low', 5)).toBe(value);
  expect(clone).not.toHaveBeenCalled();
  clone.mockRestore();
  const playable = makeChart(song, 'low', 5);
  expect(playable).not.toBe(record.charts['5:low'].notes);
  playable[0].time += 1;
  expect(makeChart(song, 'low', 5)[0].time).not.toBe(playable[0].time);
  expect(chartDisplay(song, 'low', 4).count).toBe(0);
});
it('builtin display memo matches generated chart and keeps mode keys separate', () => {
  const song = SONGS[0];
  expect(chartDisplay(song, 'low', 5).count).toBe(
    makeChart(song, 'low', 5).length,
  );
  expect(chartDisplay(song, 'low', 5)).toBe(chartDisplay(song, 'low', 5));
  expect(chartDisplay(song, 'high', 7)).not.toBe(chartDisplay(song, 'low', 5));
});
