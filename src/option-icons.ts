export function optionIcon(kind: 'speed' | 'shuffle' | 'fader', state = 'off') {
  const paths =
    kind === 'speed'
      ? '<path d="m7 11 5-5 5 5M7 18l5-5 5 5"/><path d="M5 21h14" opacity=".35"/>'
      : kind === 'shuffle'
        ? state === 'mirror'
          ? '<path d="M12 3v18" stroke-dasharray="2 3"/><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>'
          : state === 'random'
            ? '<path d="M3 6h3c5 0 7 12 12 12h3M17 14l4 4-4 3M3 18h3c2 0 3-2 4-4M14 8c1-1 2-2 4-2h3M17 3l4 3-4 4"/>'
            : '<path d="M6 4v16M12 4v16M18 4v16"/>'
        : state.startsWith('blink')
          ? '<path d="M3 12h18M12 3v18M5 5l14 14M5 19 19 5"/><circle cx="12" cy="12" r="4"/>'
          : state.startsWith('pixel')
            ? '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>'
            : state === 'fog'
              ? '<path d="M3 8h18M6 12h13M3 16h18M8 20h10"/>'
              : state === 'blind'
                ? '<path d="M3 3l18 18M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/>'
                : state === 'off'
                  ? '<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/>'
                  : state.startsWith('in')
                    ? '<path d="M5 3v18M19 3v18" opacity=".3"/><path d="M8 7h8" opacity=".25"/><path d="M8 12h8" opacity=".55"/><path d="M8 17h8M8 21h8"/>'
                    : '<path d="M5 3v18M19 3v18" opacity=".3"/><path d="M8 3h8M8 7h8"/><path d="M8 12h8" opacity=".55"/><path d="M8 17h8" opacity=".25"/>';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
