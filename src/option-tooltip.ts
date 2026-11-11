/** Keep the tooltip inside the dialog's top layer and clear it on dismissal. */
export function installOptionTooltip(dialog: HTMLDialogElement) {
  const tooltip = document.createElement('div');
  tooltip.id = 'game-option-tooltip';
  tooltip.className = 'game-option-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  dialog.append(tooltip);
  let owner: HTMLElement | null = null;

  const hide = () => {
    owner?.removeAttribute('aria-describedby');
    owner = null;
    tooltip.hidden = true;
  };
  const show = (target: EventTarget | null, x: number, y: number) => {
    const radio =
      target instanceof Element
        ? target.closest<HTMLElement>('.icon-options [data-value]')
        : null;
    let option: HTMLElement;
    let text: string;
    if (radio && dialog.contains(radio)) {
      const group = radio.closest<HTMLElement>('.icon-options');
      let map: Record<string, string> | null = null;
      try {
        map = JSON.parse(group?.dataset.optionDescriptions ?? 'null');
      } catch {
        // Invalid descriptions are treated as no match.
      }
      const description = map?.[radio.dataset.value ?? ''];
      if (!description) return hide();
      option = radio;
      text = description;
    } else {
      const legacyOption =
        target instanceof Element
          ? target.closest<HTMLElement>('[data-option-description]')
          : null;
      if (!legacyOption || !dialog.contains(legacyOption)) return hide();
      option = legacyOption;
      text = option.dataset.optionDescription ?? '';
    }
    if (owner !== option) hide();
    owner = option;
    tooltip.textContent = text;
    option.setAttribute('aria-describedby', tooltip.id);
    tooltip.hidden = false;
    const { width, height } = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(x + 16, innerWidth - width - 8))}px`;
    tooltip.style.top = `${Math.max(8, y + 20 + height > innerHeight - 8 ? y - height - 12 : y + 20)}px`;
  };
  dialog.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch')
      show(event.target, event.clientX, event.clientY);
  });
  dialog.addEventListener('pointerleave', hide);
  dialog.addEventListener('focusin', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    const rect = event.target.getBoundingClientRect();
    show(event.target, rect.left, rect.bottom);
  });
  dialog.addEventListener('focusout', hide);
  dialog.addEventListener('close', hide);
  dialog.addEventListener('cancel', hide);
  dialog.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
