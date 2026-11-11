import type { Fader, Shuffle } from './game-options';
import type { Word } from './i18n';

export const faderDescriptions = {
  off: 'faderOffTooltip',
  in: 'faderInTooltip',
  in2: 'faderIn2Tooltip',
  out: 'faderOutTooltip',
  out2: 'faderOut2Tooltip',
  blink: 'faderBlinkTooltip',
  blink2: 'faderBlink2Tooltip',
  fog: 'faderFogTooltip',
  pixel: 'faderPixelTooltip',
  pixel2: 'faderPixel2Tooltip',
  blind: 'faderBlindTooltip',
} as const satisfies Record<Fader, Word>;

export const shuffleDescriptions = {
  off: 'shuffleOffTooltip',
  mirror: 'shuffleMirrorTooltip',
  random: 'shuffleRandomTooltip',
} as const satisfies Record<Shuffle, Word>;

export function syncOptionDescriptions(
  dialog: HTMLDialogElement,
  translate: (word: Word) => string,
) {
  for (const [id, descriptions] of [
    ['fader', faderDescriptions],
    ['shuffle', shuffleDescriptions],
  ] as const) {
    const select = dialog.querySelector<HTMLSelectElement>(`#${id}`);
    if (!select) continue;
    const key = (descriptions as Record<string, Word>)[select.value];
    if (key) select.dataset.optionDescription = translate(key);
    const group = dialog.querySelector<HTMLElement>('.icon-options-' + id);
    if (group) {
      group.dataset.optionDescriptions = JSON.stringify(
        Object.fromEntries(
          Object.entries(descriptions).map(([value, key]) => [
            value,
            translate(key),
          ]),
        ),
      );
    }
  }
  dialog.dispatchEvent(new Event('option-descriptions-change'));
}
