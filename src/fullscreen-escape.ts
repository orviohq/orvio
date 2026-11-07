// Capture before dialog cancel and the game's bubble-phase shortcuts. A held
// Escape cannot both leave fullscreen and dismiss the result below it.
export function guardFullscreenEscape() {
  let wasFullscreen = !!document.fullscreenElement;
  let held = false,
    suppressCancel = false;
  document.addEventListener('fullscreenchange', () => {
    const full = !!document.fullscreenElement;
    if (wasFullscreen && !full) suppressCancel = true;
    wasFullscreen = full;
  });
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Escape') return;
      if (document.fullscreenElement || held || e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        held = true;
        suppressCancel = true;
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
      } else suppressCancel = false;
    },
    true,
  );
  window.addEventListener(
    'keyup',
    (e) => {
      if (e.code === 'Escape') held = false;
    },
    true,
  );
  document.addEventListener(
    'cancel',
    (e) => {
      if (document.fullscreenElement || held || suppressCancel) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
}
