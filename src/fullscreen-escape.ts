type KeyboardCapture = {
  lock?: (keys: string[]) => Promise<void>;
  unlock?: () => void;
};
let escapeCapture: 'unavailable' | 'pending' | 'locked' | 'denied' =
  'unavailable';
export function fullscreenEscapeStatus() {
  return escapeCapture;
}
export async function requestGameFullscreen() {
  try {
    await document.documentElement.requestFullscreen({
      keyboardLock: 'browser',
    } as FullscreenOptions);
    const keyboard = (navigator as Navigator & { keyboard?: KeyboardCapture })
      .keyboard;
    if (keyboard?.lock) {
      escapeCapture = 'pending';
      try {
        await keyboard.lock(['Escape']);
        escapeCapture = 'locked';
      } catch {
        escapeCapture = 'denied';
      }
    }
  } catch {
    escapeCapture = 'denied';
  }
  document.dispatchEvent(new Event('orvio:fullscreen-capture'));
}
export function guardFullscreenEscape() {
  let held = false;
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Escape') return;
      if (held || e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      held = true;
      // Keyboard Lock grants the app the short press; never call exitFullscreen.
      // Browsers retain their long-press/system exit and may deny this capture.
      if (document.fullscreenElement) e.preventDefault();
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
      if (held) {
        e.preventDefault();
      }
    },
    true,
  );
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      escapeCapture = 'unavailable';
      (
        navigator as Navigator & { keyboard?: KeyboardCapture }
      ).keyboard?.unlock?.();
    }
  });
}
