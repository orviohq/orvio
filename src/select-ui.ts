// Shared local, dependency-free select surface. The source select remains the
// value model for forms; all user interaction uses the accessible custom list.
export function enhanceSelects() {
  document
    .querySelectorAll<HTMLSelectElement>('select:not([data-enhanced])')
    .forEach((select) => {
      select.dataset.enhanced = 'true';
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      const wrap = document.createElement('div');
      wrap.className = 'orvio-select';
      select.before(wrap);
      wrap.append(select);
      select.classList.add('select-model');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'select-trigger';
      button.id = select.id + '-trigger';
      button.setAttribute('role', 'combobox');
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');
      const panel = document.createElement('div');
      panel.className = 'select-menu';
      panel.id = select.id + '-menu';
      panel.setAttribute('popover', 'manual');
      panel.setAttribute('role', 'listbox');
      panel.tabIndex = -1;
      button.setAttribute('aria-controls', panel.id);
      wrap.append(button, panel);
      const label = document.querySelector<HTMLLabelElement>(
        `label[for="${select.id}"]`,
      );
      if (label) {
        label.id ||= select.id + '-label';
        button.setAttribute('aria-labelledby', label.id);
        label.htmlFor = button.id;
      } else
        button.setAttribute(
          'aria-label',
          select.getAttribute('aria-label') || select.id,
        );
      let index = 0,
        typed = '',
        timer: ReturnType<typeof setTimeout>;
      let open = false;
      const options = () =>
        Array.from(select.options).filter((o) => !o.disabled && !o.hidden);
      const render = () => {
        const value = select.selectedOptions[0]?.textContent || '';
        button.textContent = value;
        button.disabled = select.disabled;
        panel.replaceChildren();
        options().forEach((option, i) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'select-item';
          row.id = panel.id + '-' + i;
          row.setAttribute('role', 'option');
          row.setAttribute('aria-selected', String(option.selected));
          row.textContent = option.textContent;
          row.tabIndex = -1;
          row.onpointermove = () => {
            index = i;
            highlight();
          };
          row.onclick = () => choose(i);
          panel.append(row);
        });
      };
      function highlight() {
        Array.from(panel.children).forEach((el, i) =>
          el.classList.toggle('active', i === index),
        );
        button.setAttribute(
          'aria-activedescendant',
          panel.children[index]?.id || '',
        );
        panel.children[index]?.scrollIntoView({ block: 'nearest' });
      }
      function close(focus = true) {
        if (!open) return;
        open = false;
        panel.hidePopover();
        button.setAttribute('aria-expanded', 'false');
        button.removeAttribute('aria-activedescendant');
        if (focus) button.focus();
      }
      function choose(i: number) {
        const option = options()[i];
        if (!option) return;
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        render();
        close();
      }
      function show() {
        if (open) {
          close();
          return;
        }
        render();
        index = Math.max(
          0,
          options().findIndex((o) => o.selected),
        );
        const r = button.getBoundingClientRect();
        const below = innerHeight - r.bottom - 10,
          above = r.top - 10;
        const up = below < 150 && above > below;
        panel.style.width = Math.min(r.width, innerWidth - 20) + 'px';
        panel.style.left =
          Math.max(10, Math.min(r.left, innerWidth - r.width - 10)) + 'px';
        panel.style.maxHeight =
          Math.max(64, Math.min(300, up ? above : below)) + 'px';
        panel.style.top = up ? 'auto' : r.bottom + 5 + 'px';
        panel.style.bottom = up ? innerHeight - r.top + 5 + 'px' : 'auto';
        open = true;
        panel.showPopover();
        button.setAttribute('aria-expanded', 'true');
        highlight();
      }
      button.onclick = show;
      const key = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          close(false);
          return;
        }
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          e.stopPropagation();
          close();
          return;
        }
        if (
          ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (!open) {
            show();
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            choose(index);
            return;
          }
          index =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? options().length - 1
                : (index + (e.key === 'ArrowUp' ? -1 : 1) + options().length) %
                  options().length;
          highlight();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          if (!open) show();
          typed += e.key.toLocaleLowerCase();
          clearTimeout(timer);
          timer = setTimeout(() => (typed = ''), 600);
          const match = options().findIndex((o) =>
            o.text.toLocaleLowerCase().startsWith(typed),
          );
          if (match >= 0) {
            index = match;
            highlight();
          }
        }
      };
      button.addEventListener('keydown', key);
      panel.addEventListener('keydown', key);
      document.addEventListener('pointerdown', (e) => {
        if (open && !wrap.contains(e.target as Node)) close(false);
      });
      document.addEventListener('orvio:select-sync', render);
      select.addEventListener('change', render);
      new MutationObserver(render).observe(select, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      window.addEventListener('resize', () => close(false));
      render();
    });
}
