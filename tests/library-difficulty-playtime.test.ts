import { it, expect } from 'vitest';
import fs from 'node:fs';

const main = fs.readFileSync('src/main.ts', 'utf8');
const css = fs.readFileSync('src/style.css', 'utf8');
const bootstrap = fs.readFileSync('src/library-first-paint-bootstrap.js', 'utf8');
const cache = fs.readFileSync('src/library-first-paint.ts', 'utf8');
const cards = main.slice(main.indexOf('function songCards()'), main.indexOf('for (const row of canonicalPending.values())', main.indexOf('function songCards()')));
const sync = main.slice(main.indexOf('function syncSettings('));
const controls = ':is(#difficulty, #cached-difficulty)';
const rows = ':is(#songs > .song-card[data-song], #cached-songs > .song-card)';

function rules(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'g'))].map((match) => match[1]);
}

it('uses the DJMAX family palette for live and cached difficulty controls', () => {
  for (const [family, color] of Object.entries({ low: '#69c5ff', mid: '#f5d85b', high: '#ff737d', sc: '#c79aff' })) {
    expect(rules(`${controls} [data-diff='${family}']`).join('')).toContain(`--family-color: ${color};`);
  }
  expect(rules(`${controls} button`).join('')).toContain('color: var(--family-color);');
  expect(rules(`${controls} button.selected`).join('')).toContain('box-shadow: inset 0 0 0 1px var(--family-color);');
  expect(bootstrap).toContain('button.dataset.diff = families[index]');
});

it('keeps NM HD MX SC in order below the song list and before lane controls', () => {
  const selection = main.match(/<div id="songs"><\/div><div class="selection">([\s\S]*?)<div class="segmented compact" id="lanes"/);
  expect(selection).not.toBeNull();
  expect(selection?.[1]).toContain('id="difficulty"');
  expect([...selection![1].matchAll(/<button data-diff="([^"]+)">([^<]+)<\/button>/g)].map((match) => [match[1], match[2]])).toEqual([
    ['low', 'NM'], ['mid', 'HD'], ['high', 'MX'], ['sc', 'SC'],
  ]);
  expect(sync).toContain("b.textContent = { low: 'NM', mid: 'HD', high: 'MX', sc: 'SC' }[diff]");
  expect(bootstrap).toContain("const familyLabels = ['NM', 'HD', 'MX', 'SC']");
  expect(bootstrap).toContain('button.textContent = familyLabels[index]');
});

it('reserves the rightmost column for a bare difficulty number with an accessible label', () => {
  expect(cards).toMatch(/<\/span><em class="song-level" aria-label="\$\{chartLevel\(s, settings.difficulty, settings.lanes\)\}">\$\{display.count \? \(display.metadata\?\.rating\?\.level \?\? '--'\) : '--'\}<\/em><\/button>/);
  expect(sync).toMatch(/level.textContent = String\(\s*display.count \? \(display.metadata\?\.rating\?\.level \?\? '--'\) : '--'/);
  expect(sync).toContain("level.setAttribute('aria-label', chartLevel(");
  const level = rules(`${rows} > .song-level`).join('');
  for (const declaration of ['grid-column: 3;', 'grid-row: 1;', 'justify-self: end;']) expect(level).toContain(declaration);
  const grids = rules(rows).join('');
  for (const columns of ['144px minmax(0, 1fr) 2.5rem', '120px minmax(0, 1fr) 2.5rem', '80px minmax(0, 1fr) 2rem']) expect(grids).toContain(`grid-template-columns: ${columns};`);
  expect(bootstrap).toContain('row.append(cover, copy, level)');
  expect(bootstrap).toContain(".match(/(?:^|\\s)(\\d+|--)$/)?.[1] || '--'");
});

it('moves mm:ss playtime beside genre and BPM in live and cached song metadata', () => {
  expect(cards).toMatch(/<span class="song-copy"><small><span class="song-meta">\$\{s.genre\} <i>·<\/i> \$\{s.bpm\} BPM<\/span> <i>·<\/i> <span class="song-duration">/);
  expect(cards).toContain('Math.floor(duration(s) / 60)');
  expect(cards).toContain('duration(s) % 60');
  expect(cards).toContain(".padStart(2, '0')}</span></small><strong>");
  expect(cards).not.toContain('song-time');
  expect(cards).not.toContain('<b>↗</b>');
  expect(cache).toContain("meta: element.querySelector('.song-meta')?.textContent ?? ''");
  expect(cache).toContain("time: element.querySelector('.song-duration')?.textContent ?? ''");
  expect(bootstrap).toContain("duration.className = 'song-duration'");
  expect(bootstrap).toContain("text(song.time, 100).trim() || embeddedTime?.[1] || ''");
  expect(bootstrap).toContain("metadata.append(' ', separator, ' ', duration)");
  expect(bootstrap).toContain('copy.append(metadata)');
  expect(bootstrap).not.toContain("time.className = 'song-time'");
  expect(rules('.song-duration').join('')).toContain('white-space: nowrap;');
});
