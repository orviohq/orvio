import { optionIcon } from './option-icons';
import type { SharedResult } from './share';
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const svg = (paths: string) =>
  `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export function resultBadges(
  r: SharedResult,
  labels: {
    keys: string;
    difficulty: string;
    speed: string;
    shuffle: string;
    fader: string;
  },
) {
  const badge = (kind: string, icon: string, value: string, label: string) =>
    `<span class="result-option result-option-${kind}" role="img" aria-label="${escape(label)}" title="${escape(label)}">${icon}<b aria-hidden="true">${escape(value)}</b></span>`;
  const n = r.lanes,
    bars = Array.from(
      { length: n },
      (_, i) => `<path d="M${4 + (i * 24) / (n - 1)} 8v16"/>`,
    ).join('');
  const level = r.difficulty === 'low' ? 1 : r.difficulty === 'mid' ? 2 : 3;
  const diamond = Array.from(
    { length: 3 },
    (_, i) =>
      `<path d="m${6 + i * 10} 10 4 6-4 6-4-6Z" fill="currentColor" opacity="${i < level ? 1 : 0.18}"/>`,
  ).join('');
  let out =
    badge('keys', svg(bars), n + 'K', labels.keys + ' ' + n) +
    badge('difficulty', svg(diamond), '', labels.difficulty);
  if (!r.options) return out;
  const o = r.options;
  out += badge(
    'speed',
    svg(
      '<path d="M6 23a12 12 0 1 1 20 0M16 16l7-7"/><circle cx="16" cy="16" r="2"/>',
    ),
    o.speed.toFixed(1) + '×',
    labels.speed + ' ' + o.speed.toFixed(1),
  );
  const shuffle =
    o.shuffle === 'random'
      ? '<path d="M4 7h4c6 0 10 18 16 18h4m-5-4 5 4-5 3M4 25h4c3 0 6-5 8-9m4-6 4-3h4m-5-4 5 4-5 4"/>'
      : o.shuffle === 'mirror'
        ? '<path d="M16 4v24" stroke-dasharray="2 3"/><path d="m11 9-7 7 7 7m10-14 7 7-7 7"/>'
        : '<path d="M7 6v20M16 6v20M25 6v20"/>';
  out += badge(
    'shuffle',
    svg(shuffle),
    o.shuffle === 'off' ? 'OFF' : '',
    labels.shuffle + ' ' + o.shuffle.toUpperCase(),
  );
  const fade = Array.from(
    { length: 4 },
    (_, i) =>
      `<path d="M10 ${5 + i * 7}h12" stroke-width="3" opacity="${o.fader === 'off' ? 1 : o.fader.startsWith('in') ? (i + 1) / 4 : (4 - i) / 4}"/>`,
  ).join('');
  out += badge(
    'fader',
    ['blink', 'blink2', 'fog', 'pixel', 'pixel2', 'blind'].includes(o.fader)
      ? optionIcon('fader', o.fader)
      : svg('<path d="M5 3v26M27 3v26" opacity=".2"/>' + fade),
    o.fader === 'off'
      ? 'OFF'
      : ['blink', 'blink2', 'fog', 'pixel', 'pixel2', 'blind'].includes(o.fader)
        ? o.fader.toUpperCase().replace('2', ' II')
        : o.fader.endsWith('2')
          ? 'II'
          : 'I',
    labels.fader + ' ' + o.fader.toUpperCase(),
  );
  return out;
}
