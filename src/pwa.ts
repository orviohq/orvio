export function registerApp() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Browser install/offline is optional; gameplay remains local. */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
}
