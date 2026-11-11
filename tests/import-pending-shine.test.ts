import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const main = readFileSync('src/main.ts', 'utf8');
const css = readFileSync('src/style.css', 'utf8');

function extract(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  expect(from, `missing start: ${start}`).toBeGreaterThanOrEqual(0);
  const to = source.indexOf(end, from + start.length);
  expect(to, `missing end: ${end}`).toBeGreaterThan(from);
  return source.slice(from, to);
}

const builders = [
  {
    name: 'canonical',
    start: 'for (const row of canonicalPending.values()) {',
    end: 'for (const pending of backgroundImports.rows.values()) {',
    element: 'element',
    state: 'row',
  },
  {
    name: 'background import',
    start: 'for (const pending of backgroundImports.rows.values()) {',
    end: '// Order DOM rows together',
    element: 'row',
    state: 'pending',
  },
];

test.each(builders)('$name loading rows carry the border-shine class', (b) => {
  const builder = extract(main, b.start, b.end);
  expect(builder).toMatch(
    new RegExp(
      `${b.element}\\.className = 'song-card import-pending(?: [^']+)?';`,
    ),
  );
  expect(builder).toContain(`${b.element}.dataset.state = ${b.state}.state;`);
  const loading = extract(
    builder,
    `if (${b.state}.state === 'loading') {`,
    '} else {',
  );
  expect(loading).toContain(`${b.element}.setAttribute('aria-busy', 'true');`);
  expect(loading).toContain(`${b.element}.classList.add('import-shine');`);
});

test.each(builders)('$name pending rows create no YouTube spinner', (b) => {
  const builder = extract(main, b.start, b.end);
  expect(builder).toContain("document.createElement('div')");
  expect(builder).not.toContain('youtube-spinner');
});

test('shine sweeps the entire masked border through a full turn', () => {
  const angle = extract(css, '@property --import-shine-angle {', '\n}');
  expect(angle).toContain("syntax: '<angle>';");
  expect(angle).toContain('initial-value: 0deg;');

  const shine = extract(
    css,
    ".import-pending.import-shine[data-state='loading']::before {",
    '\n}',
  );
  expect(shine).toContain("content: '';");
  expect(shine).toContain('position: absolute;');
  expect(shine).toContain('inset: -1px;');
  expect(shine).toContain('border-radius: inherit;');
  expect(shine).toContain('padding: 2px;');
  expect(shine).toMatch(
    /background:\s*conic-gradient\(\s*from var\(--import-shine-angle\),[\s\S]*transparent 1turn\s*\);/,
  );
  expect(shine).toMatch(
    /mask:\s*linear-gradient\(#fff 0 0\) content-box,\s*linear-gradient\(#fff 0 0\);/,
  );
  expect(shine).toContain('mask-composite: exclude;');
  expect(shine).toContain(
    'animation: import-border-shine 3.6s linear infinite;',
  );

  // The committed implementation uses angular travel, equivalent to 0%..100%
  // around the border: the registered 0deg start interpolates to a full 360deg.
  const frames = extract(css, '@keyframes import-border-shine {', '\n}');
  expect(frames).toMatch(/to\s*\{\s*--import-shine-angle:\s*360deg;\s*\}/);
});

test('the import dialog retains its separate spinner code path', () => {
  const dialog = extract(main, '<dialog id="youtube-import">', '</dialog>');
  expect(dialog).toContain(
    '<div id="youtube-progress" hidden role="status" aria-live="polite"><span class="youtube-spinner" aria-hidden="true"></span>',
  );
  expect(dialog).not.toContain('import-shine');
  expect(extract(css, '.youtube-spinner {', '\n}')).toContain(
    'animation: youtube-spin 0.85s linear infinite;',
  );
  expect(extract(css, '@keyframes youtube-spin {', '\n}')).toMatch(
    /to\s*\{\s*transform: rotate\(360deg\);\s*\}/,
  );
});
