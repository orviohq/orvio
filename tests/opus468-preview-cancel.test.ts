import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
it('preview stop cancels only preview work, while exit retains full entry cancellation', () => {
  const s = readFileSync('src/main.ts', 'utf8'),
    preview = s.slice(
      s.indexOf('function stopPreview() {'),
      s.indexOf('async function ensureExternalBytes'),
    );
  expect(preview).toContain('previewAbort?.abort()');
  expect(preview).toContain('previewRequest++');
  expect(preview).not.toContain('private468Bridge.cancel()');
  expect(
    s.slice(s.indexOf('function exit() {'), s.indexOf('function keyTime')),
  ).toContain('private468Bridge.cancel()');
});
