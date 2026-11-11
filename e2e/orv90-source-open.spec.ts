import { test, expect } from '@playwright/test';

test('source action opens the exact YouTube original in a new tab and keeps other menu actions', async ({
  page,
}) => {
  await page.goto('/select/');
  const result = await page.evaluate(async () => {
    const { libraryContextMenu } = await import(
      /* @vite-ignore */ String('/src/library-context-menu.ts')
    );
    const host = document.createElement('div');
    const row = document.createElement('button');
    row.className = 'song-card';
    host.append(row);
    document.body.append(host);
    const calls: unknown[][] = [];
    const originalOpen = window.open;
    window.open = ((...args: unknown[]) => {
      calls.push(args);
      return null;
    }) as typeof window.open;
    libraryContextMenu(host, (target: HTMLElement) =>
      target === row
        ? {
            label: '목록에서 삭제',
            remove: () => calls.push(['remove']),
            share: { label: '곡 공유', run: () => calls.push(['share']) },
            source: {
              label: '원곡 열기',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
          }
        : null,
    );
    row.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 20,
        clientY: 20,
      }),
    );
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    const source = menu.querySelector<HTMLElement>('[data-action="source"]')!;
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .filter((item) => !item.hidden)
      .map((item) => item.dataset.action);
    const focused =
      document.activeElement === menu.querySelector('[data-action="share"]');
    source.click();
    const closed = !menu.matches(':popover-open');
    window.open = originalOpen;
    return { calls, items, focused, closed };
  });
  expect(result.items).toEqual(['source', 'share', 'remove']);
  expect(result.focused).toBe(true);
  expect(result.calls).toEqual([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '_blank',
      'noopener,noreferrer',
    ],
  ]);
  expect(result.closed).toBe(true);
});

test('fixture rows keep the context row, share-first focus, keyboard navigation and callbacks', async ({
  page,
}) => {
  const attempted: string[] = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (
      /^http:\/\/(127\.0\.0\.1|localhost):4190\//.test(url) ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    )
      return route.continue();
    attempted.push(url);
    return route.abort();
  });
  await page.goto('/select/');
  await page.evaluate(async () => {
    const { libraryContextMenu } = await import(
      /* @vite-ignore */ String('/src/library-context-menu.ts')
    );
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:60px;top:140px;z-index:5';
    const makeRow = (text: string) => {
      const row = document.createElement('button');
      row.className = 'song-card';
      row.textContent = text;
      row.style.cssText =
        'display:block;width:240px;height:48px;margin:0 0 8px';
      host.append(row);
      return row;
    };
    const selected = makeRow('selected independent row');
    const rowA = makeRow('context row A');
    const rowB = makeRow('context row B');
    const local = makeRow('local no source');
    selected.classList.add('selected');
    document.body.append(host);
    const calls: unknown[][] = [];
    const originalOpen = window.open;
    window.open = ((...args: unknown[]) => {
      calls.push(args);
      return null;
    }) as typeof window.open;
    const target = (row: HTMLElement, url?: string) => ({
      label: '목록에서 삭제',
      remove: () => calls.push(['remove', row.textContent]),
      share: {
        label: '곡 공유',
        run: () => calls.push(['share', row.textContent]),
      },
      ...(url ? { source: { label: '원곡 열기', url } } : {}),
    });
    libraryContextMenu(host, (row: HTMLElement) => {
      if (row === rowA)
        return target(
          row,
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        );
      if (row === rowB)
        return target(
          row,
          'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        );
      if (row === local) return target(row);
      return null;
    });
    (window as any).__orv90 = {
      host,
      selected,
      rowA,
      rowB,
      local,
      calls,
      originalOpen,
    };
  });
  await page.evaluate(() => {
    const { rowB } = (window as any).__orv90;
    const rect = rowB.getBoundingClientRect();
    rowB.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 20,
        clientY: rect.top + 20,
      }),
    );
  });
  const initial = await page.evaluate(() => {
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    const source = menu.querySelector<HTMLElement>('[data-action="source"]')!;
    const share = menu.querySelector<HTMLElement>('[data-action="share"]')!;
    const rect = menu.getBoundingClientRect();
    return {
      open: menu.matches(':popover-open'),
      items: [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
        .filter((item) => !item.hidden)
        .map((item) => item.dataset.action),
      focusedShare: document.activeElement === share,
      sourceColor: getComputedStyle(source).color,
      shareColor: getComputedStyle(share).color,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
    };
  });
  expect(initial.open).toBe(true);
  expect(initial.items).toEqual(['source', 'share', 'remove']);
  expect(initial.focusedShare).toBe(true);
  expect(initial.sourceColor).toBe(initial.shareColor);
  const shotDir = process.env.ORV90_SCREENSHOTS_DIR;
  if (shotDir) {
    const alias = test.info().project.name.startsWith('mobile')
      ? 'mobile'
      : test.info().project.name.startsWith('short')
        ? 'short'
        : 'desktop';
    await page.screenshot({ path: `${shotDir}/orv90-${alias}-final.png` });
  }

  const navigation = await page.evaluate(() => {
    const { rowB } = (window as any).__orv90;
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    const key = (value: string) => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: value,
          bubbles: true,
          cancelable: true,
        }),
      );
      return (document.activeElement as HTMLElement)?.dataset.action;
    };
    const down = key('ArrowDown');
    const up = key('ArrowUp');
    const home = key('Home');
    const end = key('End');
    key('Escape');
    return {
      down,
      up,
      home,
      end,
      closed: !menu.matches(':popover-open'),
      anchor: document.activeElement === rowB,
    };
  });
  expect(navigation).toEqual({
    down: 'remove',
    up: 'share',
    home: 'source',
    end: 'remove',
    closed: true,
    anchor: true,
  });

  const shiftTab = await page.evaluate(() => {
    const { rowB } = (window as any).__orv90;
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    rowB.focus();
    rowB.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'F10',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    const opened = {
      open: menu.matches(':popover-open'),
      focus: (document.activeElement as HTMLElement)?.dataset.action,
    };
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      }),
    );
    return {
      opened,
      closed: !menu.matches(':popover-open'),
      anchor: document.activeElement === rowB,
    };
  });
  expect(shiftTab).toEqual({
    opened: { open: true, focus: 'share' },
    closed: true,
    anchor: true,
  });

  const contextSource = await page.evaluate(() => {
    const { rowB, calls } = (window as any).__orv90;
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    rowB.focus();
    rowB.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ContextMenu',
        bubbles: true,
        cancelable: true,
      }),
    );
    const opened = {
      open: menu.matches(':popover-open'),
      focus: (document.activeElement as HTMLElement)?.dataset.action,
    };
    menu.querySelector<HTMLElement>('[data-action="source"]')!.click();
    return {
      opened,
      closed: !menu.matches(':popover-open'),
      last: calls.at(-1),
    };
  });
  expect(contextSource.opened).toEqual({ open: true, focus: 'share' });
  expect(contextSource.closed).toBe(true);
  expect(contextSource.last).toEqual([
    'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    '_blank',
    'noopener,noreferrer',
  ]);

  const local = await page.evaluate(() => {
    const { local, rowB, selected } = (window as any).__orv90;
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    const rect = local.getBoundingClientRect();
    local.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 20,
        clientY: rect.top + 20,
      }),
    );
    const source = menu.querySelector<HTMLElement>('[data-action="source"]')!;
    const share = menu.querySelector<HTMLElement>('[data-action="share"]')!;
    return {
      open: menu.matches(':popover-open'),
      sourceHidden: source.hidden,
      items: [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
        .filter((item) => !item.hidden)
        .map((item) => item.dataset.action),
      focusedShare: document.activeElement === share,
      selected: selected.classList.contains('selected'),
      bStill: !!rowB,
    };
  });
  expect(local).toEqual({
    open: true,
    sourceHidden: true,
    items: ['share', 'remove'],
    focusedShare: true,
    selected: true,
    bStill: true,
  });

  const callbacks = await page.evaluate(() => {
    const { rowA, rowB, calls } = (window as any).__orv90;
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    const open = (row: HTMLElement) => {
      const rect = row.getBoundingClientRect();
      row.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 20,
          clientY: rect.top + 20,
        }),
      );
    };
    open(rowB);
    menu.querySelector<HTMLElement>('[data-action="share"]')!.click();
    const shareB = calls.at(-1);
    open(rowB);
    menu.querySelector<HTMLElement>('[data-action="remove"]')!.click();
    const removeB = calls.at(-1);
    open(rowA);
    menu.querySelector<HTMLElement>('[data-action="source"]')!.click();
    const sourceA = calls.at(-1);
    return { shareB, removeB, sourceA };
  });
  expect(callbacks).toEqual({
    shareB: ['share', 'context row B'],
    removeB: ['remove', 'context row B'],
    sourceA: [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '_blank',
      'noopener,noreferrer',
    ],
  });

  const clamp = await page.evaluate(() => {
    const { rowB } = (window as any).__orv90;
    rowB.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: innerWidth - 1,
        clientY: innerHeight - 1,
      }),
    );
    const menu = [...document.querySelectorAll<HTMLElement>(
      '.library-context-menu',
    )].at(-1)!;
    const rect = menu.getBoundingClientRect();
    return {
      open: menu.matches(':popover-open'),
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(clamp.open).toBe(true);
  expect(clamp.left).toBeGreaterThanOrEqual(8);
  expect(clamp.top).toBeGreaterThanOrEqual(8);
  expect(clamp.right).toBeLessThanOrEqual(clamp.width - 8 + 1);
  expect(clamp.bottom).toBeLessThanOrEqual(clamp.height - 8 + 1);
  expect(attempted).toEqual([]);

  await page.evaluate(() => {
    const { host, originalOpen } = (window as any).__orv90;
    host.remove();
    window.open = originalOpen;
  });
});
