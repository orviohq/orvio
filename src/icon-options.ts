import { optionIcon } from './option-icons';
// Keep the select as the validated value model, never as a visible dropdown.
export function iconOptions(select: HTMLSelectElement) {
  select.hidden = true;
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  const group = document.createElement('div');
  group.className = 'icon-options icon-options-' + select.id;
  group.setAttribute('role', 'radiogroup');
  const label = document.querySelector<HTMLLabelElement>(
    `label[for="${select.id}"]`,
  );
  if (label) {
    label.id = select.id + '-label';
    group.setAttribute('aria-labelledby', label.id);
    label.removeAttribute('for');
  }
  select.after(group);
  let signature = '';
  const render = () => {
    const options = Array.from(select.options),
      next = options.map((o) => o.value + ':' + o.text).join('|');
    if (signature !== next) {
      signature = next;
      group.replaceChildren();
      options.forEach((o, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.dataset.value = o.value;
        b.innerHTML =
          optionIcon(select.id as 'speed' | 'shuffle' | 'fader', o.value) +
          '<span></span>';
        b.querySelector('span')!.textContent = o.text;
        b.onclick = () => choose(i, false);
        b.onkeydown = (e) => {
          if (
            ![
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              'Home',
              'End',
            ].includes(e.key)
          )
            return;
          e.preventDefault();
          e.stopPropagation();
          choose(
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? options.length - 1
                : (i +
                    (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1) +
                    options.length) %
                  options.length,
            true,
          );
        };
        group.append(b);
      });
    }
    group.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      const yes = b.dataset.value === select.value;
      b.setAttribute('aria-checked', String(yes));
      b.tabIndex = yes ? 0 : -1;
      b.disabled = select.disabled;
    });
  };
  function choose(i: number, focus: boolean) {
    const value = select.options[i]?.value;
    if (value === undefined) return;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    render();
    if (focus)
      group
        .querySelector<HTMLButtonElement>(`[data-value="${value}"]`)!
        .focus();
  }
  select.addEventListener('change', render);
  document.addEventListener('orvio:select-sync', render);
  new MutationObserver(render).observe(select, {
    childList: true,
    subtree: true,
  });
  render();
}
