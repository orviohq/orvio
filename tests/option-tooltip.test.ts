import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { translations, type Word } from '../src/i18n';

function extractSource(file: string) {
  return stripTypeScriptTypes(
    readFileSync(new URL(file, import.meta.url), 'utf8')
      .replace(/^import type .*;\n/gm, '')
      .replace(/^export /gm, ''),
  );
}

const tooltipSource = extractSource('../src/option-tooltip.ts');
const descriptionsSource = extractSource('../src/option-descriptions.ts');

class FakeElement extends EventTarget {
  id = '';
  className = '';
  value = '';
  hidden = false;
  textContent = '';
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;

  append(element: FakeElement) {
    element.parentElement = this;
    this.children.push(element);
  }

  contains(element: FakeElement): boolean {
    return this.children.some(
      (child) => child === element || child.contains(element),
    );
  }

  closest(selector: string): FakeElement | null {
    if (selector === '.icon-options') {
      return this.className.split(' ').includes('icon-options')
        ? this
        : (this.parentElement?.closest(selector) ?? null);
    }
    if (selector === '.icon-options [data-value]') {
      return this.dataset.value !== undefined &&
        this.parentElement?.closest('.icon-options')
        ? this
        : (this.parentElement?.closest(selector) ?? null);
    }
    return selector === '[data-option-description]' &&
      this.dataset.optionDescription !== undefined
      ? this
      : null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return { left: 100, bottom: 120, width: 180, height: 40 };
  }
}

function setupTooltip() {
  const dialog = new FakeElement();
  const select = new FakeElement();
  select.id = 'fader';
  select.dataset.optionDescription = translations.en.faderInTooltip;
  dialog.append(select);
  const install = new Function(
    'document',
    'window',
    'Element',
    'HTMLElement',
    'innerWidth',
    'innerHeight',
    `${tooltipSource}\nreturn installOptionTooltip;`,
  )(
    { createElement: () => new FakeElement() },
    new EventTarget(),
    FakeElement,
    FakeElement,
    1024,
    768,
  ) as (dialog: FakeElement) => void;
  install(dialog);
  const tooltip = dialog.children.find(
    (element) => element.id === 'game-option-tooltip',
  )!;

  // Mouse movement reaches the dialog's delegated pointermove listener.
  const moveMouse = (x: number, y: number, target = select) => {
    const event = Object.assign(new Event('pointermove'), {
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, 'target', { value: target });
    dialog.dispatchEvent(event);
  };
  return { dialog, select, tooltip, moveMouse };
}

describe('option tooltip mouse interaction', () => {
  it('follows successive cursor coordinates over the select', () => {
    const { tooltip, moveMouse } = setupTooltip();
    expect(tooltip.hidden).toBe(true);

    moveMouse(100, 120);
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.style).toMatchObject({ left: '116px', top: '140px' });

    moveMouse(240, 280);
    expect(tooltip.style).toMatchObject({ left: '256px', top: '300px' });
  });

  it('reads current content from the select data-option-description', () => {
    const { select, tooltip, moveMouse } = setupTooltip();
    moveMouse(100, 120);
    expect(tooltip.textContent).toBe(translations.en.faderInTooltip);
    expect(select.attributes.get('aria-describedby')).toBe(tooltip.id);

    select.dataset.optionDescription = translations.ja.faderIn2Tooltip;
    moveMouse(110, 130);
    expect(tooltip.textContent).toBe(translations.ja.faderIn2Tooltip);
  });

  it('hides and clears the description association when the mouse leaves', () => {
    const { dialog, select, tooltip, moveMouse } = setupTooltip();
    moveMouse(100, 120);
    expect(tooltip.hidden).toBe(false);
    // The implementation handles mouseleave through pointerleave.
    dialog.dispatchEvent(
      Object.assign(new Event('pointerleave'), { pointerType: 'mouse' }),
    );
    expect(tooltip.hidden).toBe(true);
    expect(select.attributes.has('aria-describedby')).toBe(false);
  });

  it('keeps the tooltip inside the viewport near the bottom-right corner', () => {
    const { tooltip, moveMouse } = setupTooltip();
    moveMouse(1000, 740);
    expect(tooltip.style).toMatchObject({ left: '836px', top: '688px' });
  });
});

describe('option tooltip radio interaction', () => {
  it.each([
    ['pixel2', translations.en.faderPixel2Tooltip],
    ['off', translations.en.faderOffTooltip],
  ])('shows the %s description on hover and focus', (value, text) => {
    const { dialog, tooltip, moveMouse } = setupTooltip();
    const group = new FakeElement();
    group.className = 'icon-options icon-options-fader';
    group.dataset.optionDescriptions = JSON.stringify({
      pixel2: translations.en.faderPixel2Tooltip,
      off: translations.en.faderOffTooltip,
    });
    const radio = new FakeElement();
    radio.dataset.value = value;
    group.append(radio);
    dialog.append(group);

    moveMouse(100, 120, radio);
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.textContent).toBe(text);
    expect(radio.attributes.get('aria-describedby')).toBe(tooltip.id);

    dialog.dispatchEvent(new Event('pointerleave'));
    expect(tooltip.hidden).toBe(true);
    const event = new Event('focusin');
    Object.defineProperty(event, 'target', { value: radio });
    dialog.dispatchEvent(event);
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.textContent).toBe(text);
    expect(radio.attributes.get('aria-describedby')).toBe(tooltip.id);
  });
});

it('syncs the in2 description and emits option-descriptions-change afterward', () => {
  const select = {
    value: 'in2',
    dataset: { optionDescription: 'old description' },
  };
  const dialog = Object.assign(new EventTarget(), {
    querySelector: vi.fn((selector: string) =>
      selector === '#fader' ? select : null,
    ),
  });
  const descriptionsAtEvent: string[] = [];
  dialog.addEventListener('option-descriptions-change', () => {
    descriptionsAtEvent.push(select.dataset.optionDescription);
  });
  const translate = vi.fn((word: Word) => translations.ja[word]);
  const sync = new Function(
    'Event',
    `${descriptionsSource}\nreturn syncOptionDescriptions;`,
  )(Event) as (target: typeof dialog, translateWord: typeof translate) => void;

  sync(dialog, translate);

  expect(dialog.querySelector).toHaveBeenCalledWith('#fader');
  expect(translate).toHaveBeenCalledExactlyOnceWith('faderIn2Tooltip');
  expect(select.dataset.optionDescription).toBe(translations.ja.faderIn2Tooltip);
  expect(descriptionsAtEvent).toEqual([translations.ja.faderIn2Tooltip]);
});
