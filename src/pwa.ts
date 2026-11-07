export function registerApp() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator)
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Browser install/offline is optional; gameplay remains local. */
      });
    });
}
