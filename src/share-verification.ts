const SITEKEY = '0x4AAAAAAF3UwTadOieSPgZO';
type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
let loading: Promise<void> | undefined;
function load() {
  return (loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const timeout = setTimeout(() => {
      loading = undefined;
      script.remove();
      reject(Error('Verification timeout'));
    }, 15000);
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      loading = undefined;
      reject(Error('Verification unavailable'));
    };
    document.head.append(script);
  }));
}
/** Loaded only after the user clicks Share. Never during gameplay or result entry. */
export async function verifyShare(
  title: string,
  cancelText: string,
): Promise<string> {
  await load();
  const api = (window as Window & { turnstile?: Turnstile }).turnstile;
  if (!api) throw Error('Verification unavailable');
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'share-verification';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const host = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'quiet';
    cancel.textContent = cancelText;
    dialog.append(heading, host, cancel);
    document.body.append(dialog);
    dialog.showModal();
    let widget: string | undefined,
      finished = false;
    function finish(token?: string) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (widget) api!.remove(widget);
      dialog.close();
      dialog.remove();
      if (token) resolve(token);
      else reject(Error('Verification cancelled'));
    }
    const timeout = setTimeout(() => finish(), 90000);
    dialog.onclose = () => finish();
    dialog.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
      }
    });
    cancel.onclick = () => finish();
    dialog.oncancel = (e) => {
      e.preventDefault();
      finish();
    };
    try {
      widget = api.render(host, {
        sitekey: SITEKEY,
        action: 'share',
        callback: (token: string) => finish(token),
        'error-callback': () => finish(),
        'expired-callback': () => finish(),
        'timeout-callback': () => finish(),
        theme: 'dark',
      });
    } catch {
      finish();
    }
  });
}
