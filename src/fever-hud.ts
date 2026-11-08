import type { FeverTracker } from './fever';
/** Original non-flashing HUD. Rules are named explicitly in the option. */
export function renderFeverHud(
  host: HTMLElement,
  state: FeverTracker,
  reducedMotion: boolean,
) {
  host.classList.toggle('hidden', state.status !== 'ready');
  if (state.status !== 'ready') {
    host.replaceChildren();
    return;
  }
  if (!host.firstElementChild)
    host.innerHTML = '<strong></strong><div class="fever-track"><i></i></div>';
  host.querySelector('strong')!.textContent = `FEVER ×${state.stage}`;
  const amount = Math.max(0, Math.min(1, state.progress));
  (host.querySelector('i') as HTMLElement).style.transform =
    `scaleX(${amount})`;
  host.classList.toggle('fever-reduced', reducedMotion);
  host.dataset.stage = String(state.stage);
  if (host.dataset.activations !== String(state.activations)) {
    host.dataset.activations = String(state.activations);
    host.classList.remove('fever-rise');
    if (!reducedMotion && state.activations > 0) {
      void host.offsetWidth;
      host.classList.add('fever-rise');
    }
  }
}
