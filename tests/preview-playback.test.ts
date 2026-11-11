import { expect, test } from 'vitest';
import {
  guardPreviewEnd,
  PREVIEW_LOOP_END,
  PREVIEW_START,
  startPreview,
  type PreviewSourceLike,
} from '../src/preview-playback';

class FakeSource implements PreviewSourceLike {
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  starts: Array<[number | undefined, number | undefined]> = [];
  stops = 0;
  onended: AudioBufferSourceNode['onended'] = null;

  start(when?: number, offset?: number) {
    this.starts.push([when, offset]);
  }

  stop() {
    this.stops++;
    this.end();
  }

  end() {
    const handler = this.onended as
      ((this: unknown, event: Event) => void) | null;
    handler?.call(this, new Event('ended'));
  }
}

test('external YouTube preview starts at 8s, does not loop, and has no short cutoff', () => {
  for (const duration of [3, 9, 60]) {
    const source = new FakeSource();
    startPreview(source, 'external', duration);
    expect(source.loop).toBe(false);
    expect(source.loopStart).toBe(0);
    expect(source.loopEnd).toBe(0);
    expect(source.starts).toEqual([[0, PREVIEW_START]]);
  }
});

test('native ORV-468 preview keeps offset 0 and plays the full prepared buffer', () => {
  const source = new FakeSource();
  startPreview(source, 'native468', 42);
  expect(source.loop).toBe(false);
  expect(source.loopStart).toBe(0);
  expect(source.loopEnd).toBe(0);
  expect(source.starts).toEqual([[0, 0]]);
});

test('built-in preview keeps the existing 8 to 24 loop and start offset', () => {
  const source = new FakeSource();
  startPreview(source, 'builtin', 60);
  expect(source.loop).toBe(true);
  expect(source.loopStart).toBe(PREVIEW_START);
  expect(source.loopEnd).toBe(PREVIEW_LOOP_END);
  expect(source.starts).toEqual([[0, PREVIEW_START]]);

  const nearEnd = new FakeSource();
  startPreview(nearEnd, 'builtin', 10);
  expect(nearEnd.loop).toBe(true);
  expect(nearEnd.loopStart).toBe(PREVIEW_START);
  expect(nearEnd.loopEnd).toBe(10);
  expect(nearEnd.starts).toEqual([[0, PREVIEW_START]]);
});

test('natural completion clears only the preview node that ended', () => {
  let current: FakeSource | undefined = new FakeSource();
  let clears = 0;
  const source = current;
  guardPreviewEnd(
    source,
    () => current,
    () => {
      clears++;
      if (current === source) current = undefined;
    },
  );

  source.end();
  expect(clears).toBe(1);
  expect(current).toBeUndefined();

  source.end();
  expect(clears).toBe(1);
});

test('an old source ending after a new source starts never clears or stops the new one', () => {
  const old = new FakeSource();
  const next = new FakeSource();
  let current: FakeSource | undefined = old;
  let oldClears = 0;
  guardPreviewEnd(
    old,
    () => current,
    () => {
      oldClears++;
      current = undefined;
    },
  );
  guardPreviewEnd(
    next,
    () => current,
    () => {
      current = undefined;
    },
  );

  current = next;
  old.end();
  expect(oldClears).toBe(0);
  expect(current).toBe(next);
  expect(next.stops).toBe(0);
});

test('stop() firing onended after preview state is cleared is a no-op', () => {
  const source = new FakeSource();
  let current: FakeSource | undefined = source;
  let clears = 0;
  guardPreviewEnd(
    source,
    () => current,
    () => {
      clears++;
      current = undefined;
    },
  );

  current = undefined;
  source.stop();
  expect(clears).toBe(0);

  const next = new FakeSource();
  current = next;
  source.end();
  expect(current).toBe(next);
  expect(next.stops).toBe(0);
});
