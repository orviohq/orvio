import { it, expect } from 'vitest';
import { visibleLibrarySelection } from '../src/library-visible-selection';
it('selection between streamed callbacks resolves older hidden pin to final preferred peer', () => {
  const videos = [undefined, 'same-video', 'same-video', 'other-video'];
  let selected = visibleLibrarySelection(1, [0, 1, 3], (i) => videos[i]);
  expect(selected).toBe(1);
  selected = visibleLibrarySelection(selected, [0, 2, 3], (i) => videos[i]);
  expect(selected).toBe(2);
  expect(visibleLibrarySelection(3, [0, 2, 3], (i) => videos[i])).toBe(3);
});
it('old route hidden source normalizes and no peer uses safe visible fallback', () => {
  const videos = [undefined, 'old-video', 'new-video'];
  expect(visibleLibrarySelection(1, [0, 2], (i) => videos[i])).toBe(0);
  expect(visibleLibrarySelection(1, [2], () => 'same')).toBe(2);
});
