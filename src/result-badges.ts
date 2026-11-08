import { optionIconElements } from './option-icons';
import type { OptionIconElement } from './option-icons';
import type { SharedResult } from './share';

/** One SVG element inside a badge icon. Typed and persistable: the first
 * paint projection rebuilds the icon with createElementNS, never innerHTML. */
export interface ResultBadgeIcon {
  viewBox: number;
  strokeWidth: number;
  elements: OptionIconElement[];
}

export interface ResultBadgeDatum {
  kind: 'keys' | 'difficulty' | 'speed' | 'shuffle' | 'fader';
  value: string;
  label: string;
  icon: ResultBadgeIcon;
}

const badge32 = (elements: OptionIconElement[]): ResultBadgeIcon => ({
  viewBox: 32,
  strokeWidth: 1.7,
  elements,
});

/** The typed badge list behind resultBadges: same inputs, same content,
 * structured data instead of markup. */
export function resultBadgeData(
  r: Omit<SharedResult, 'song'> & { song: string },
  labels: {
    keys: string;
    difficulty: string;
    speed: string;
    shuffle: string;
    fader: string;
  },
): ResultBadgeDatum[] {
  const n = r.lanes;
  const bars: OptionIconElement[] = Array.from({ length: n }, (_, i) => ({
    type: 'path',
    d: `M${4 + (i * 24) / (n - 1)} 8v16`,
  }));
  const level = r.difficulty === 'low' ? 1 : r.difficulty === 'mid' ? 2 : 3;
  const diamond: OptionIconElement[] = Array.from({ length: 3 }, (_, i) => ({
    type: 'path',
    d: `m${6 + i * 10} 10 4 6-4 6-4-6Z`,
    fill: true,
    opacity: i < level ? 1 : 0.18,
  }));
  const out: ResultBadgeDatum[] = [
    {
      kind: 'keys',
      value: n + 'K',
      label: labels.keys + ' ' + n,
      icon: badge32(bars),
    },
    {
      kind: 'difficulty',
      value: labels.difficulty,
      label: labels.difficulty,
      icon: badge32(diamond),
    },
  ];
  if (!r.options) return out;
  const o = r.options;
  out.push({
    kind: 'speed',
    value: o.speed.toFixed(1) + '×',
    label: labels.speed + ' ' + o.speed.toFixed(1),
    icon: badge32([
      { type: 'path', d: 'M6 23a12 12 0 1 1 20 0M16 16l7-7' },
      { type: 'circle', cx: 16, cy: 16, r: 2 },
    ]),
  });
  const shuffle: OptionIconElement[] =
    o.shuffle === 'random'
      ? [
          {
            type: 'path',
            d: 'M4 7h4c6 0 10 18 16 18h4m-5-4 5 4-5 3M4 25h4c3 0 6-5 8-9m4-6 4-3h4m-5-4 5 4-5 4',
          },
        ]
      : o.shuffle === 'mirror'
        ? [
            { type: 'path', d: 'M16 4v24', dash: '2 3' },
            { type: 'path', d: 'm11 9-7 7 7 7m10-14 7 7-7 7' },
          ]
        : [
            { type: 'path', d: 'M7 6v20' },
            { type: 'path', d: 'M16 6v20' },
            { type: 'path', d: 'M25 6v20' },
          ];
  out.push({
    kind: 'shuffle',
    value: o.shuffle === 'off' ? 'OFF' : '',
    label: labels.shuffle + ' ' + o.shuffle.toUpperCase(),
    icon: badge32(shuffle),
  });
  const special = ['blink', 'blink2', 'fog', 'pixel', 'pixel2', 'blind'].includes(
    o.fader,
  );
  const fade: OptionIconElement[] = Array.from({ length: 4 }, (_, i) => ({
    type: 'path',
    d: `M10 ${5 + i * 7}h12`,
    strokeWidth: 3,
    opacity:
      o.fader === 'off' ? 1 : o.fader.startsWith('in') ? (i + 1) / 4 : (4 - i) / 4,
  }));
  out.push({
    kind: 'fader',
    value: special
      ? o.fader.toUpperCase().replace('2', ' II')
      : o.fader === 'off'
        ? 'OFF'
        : o.fader.endsWith('2')
          ? 'II'
          : 'I',
    label: labels.fader + ' ' + o.fader.toUpperCase(),
    icon: special
      ? { viewBox: 24, strokeWidth: 1.7, elements: optionIconElements('fader', o.fader) }
      : badge32([
          { type: 'path', d: 'M5 3v26M27 3v26', opacity: 0.2 },
          ...fade,
        ]),
  });
  return out;
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

const renderElements = (icon: ResultBadgeIcon) =>
  icon.elements
    .map((el) => {
      const attrs = [
        el.fill ? ' fill="currentColor"' : '',
        el.opacity !== undefined ? ` opacity="${el.opacity}"` : '',
        el.dash ? ` stroke-dasharray="${el.dash}"` : '',
        el.strokeWidth !== undefined ? ` stroke-width="${el.strokeWidth}"` : '',
      ].join('');
      return el.type === 'circle'
        ? `<circle cx="${el.cx ?? 0}" cy="${el.cy ?? 0}" r="${el.r ?? 0}"${attrs}/>`
        : `<path d="${el.d ?? ''}"${attrs}/>`;
    })
    .join('');

const svg = (icon: ResultBadgeIcon) =>
  `<svg viewBox="0 0 ${icon.viewBox} ${icon.viewBox}" fill="none" stroke="currentColor" stroke-width="${icon.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${renderElements(icon)}</svg>`;

export function resultBadges(
  r: Omit<SharedResult, 'song'> & { song: string },
  labels: {
    keys: string;
    difficulty: string;
    speed: string;
    shuffle: string;
    fader: string;
  },
) {
  const badge = (d: ResultBadgeDatum) =>
    `<span class="result-option result-option-${d.kind}" role="img" aria-label="${escape(d.label)}" title="${escape(d.label)}">${svg(d.icon)}<b aria-hidden="true">${escape(d.value)}</b></span>`;
  return resultBadgeData(r, labels).map(badge).join('');
}
