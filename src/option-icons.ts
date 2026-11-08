/** Typed, markup-free description of one SVG element inside an option icon.
 * Renderers turn this into markup or DOM; it is also safe to persist because
 * every field is validated before use. */
export interface OptionIconElement {
  type: 'path' | 'circle';
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  opacity?: number;
  dash?: string;
  fill?: boolean;
  strokeWidth?: number;
}

export function optionIconElements(
  kind: 'speed' | 'shuffle' | 'fader',
  state = 'off',
): OptionIconElement[] {
  const p = (
    d: string,
    extra?: Partial<OptionIconElement>,
  ): OptionIconElement => ({
    type: 'path',
    d,
    ...extra,
  });
  if (kind === 'speed')
    return [p('m7 11 5-5 5 5M7 18l5-5 5 5'), p('M5 21h14', { opacity: 0.35 })];
  if (kind === 'shuffle')
    return state === 'mirror'
      ? [p('M12 3v18', { dash: '2 3' }), p('m8 7-5 5 5 5M16 7l5 5-5 5')]
      : state === 'random'
        ? [
            p(
              'M3 6h3c5 0 7 12 12 12h3M17 14l4 4-4 3M3 18h3c2 0 3-2 4-4M14 8c1-1 2-2 4-2h3M17 3l4 3-4 4',
            ),
          ]
        : [p('M6 4v16'), p('M12 4v16'), p('M18 4v16')];
  if (state.startsWith('blink'))
    return [
      p('M3 12h18M12 3v18M5 5l14 14M5 19 19 5'),
      { type: 'circle', cx: 12, cy: 12, r: 4 },
    ];
  if (state.startsWith('pixel'))
    return [p('M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z')];
  if (state === 'fog') return [p('M3 8h18M6 12h13M3 16h18M8 20h10')];
  if (state === 'blind')
    return [p('M3 3l18 18M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z')];
  if (state === 'off')
    return [
      p('M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z'),
      { type: 'circle', cx: 12, cy: 12, r: 2.5 },
    ];
  if (state.startsWith('in'))
    return [
      p('M5 3v18M19 3v18', { opacity: 0.3 }),
      p('M8 7h8', { opacity: 0.25 }),
      p('M8 12h8', { opacity: 0.55 }),
      p('M8 17h8M8 21h8'),
    ];
  return [
    p('M5 3v18M19 3v18', { opacity: 0.3 }),
    p('M8 3h8'),
    p('M8 7h8'),
    p('M8 12h8', { opacity: 0.55 }),
    p('M8 17h8', { opacity: 0.25 }),
  ];
}

function renderElements(elements: OptionIconElement[]): string {
  const num = (v: number | undefined, fallback: number) =>
    Number.isFinite(v) ? v : fallback;
  return elements
    .map((el) => {
      const opacity =
        el.opacity !== undefined && el.opacity < 1
          ? ` opacity="${String(el.opacity).replace('0.', '.')}"`
          : '';
      const dash = el.dash ? ` stroke-dasharray="${el.dash}"` : '';
      if (el.type === 'circle')
        return `<circle cx="${num(el.cx, 0)}" cy="${num(el.cy, 0)}" r="${num(el.r, 0)}"${opacity}${dash}/>`;
      return `<path d="${el.d ?? ''}"${opacity}${dash}/>`;
    })
    .join('');
}

export function optionIcon(kind: 'speed' | 'shuffle' | 'fader', state = 'off') {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${renderElements(optionIconElements(kind, state))}</svg>`;
}
