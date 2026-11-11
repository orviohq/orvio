import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

it('ORV-80 key-count selection stays a view change while readiness stays at source boundaries', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  const sync = main.slice(
    main.indexOf('function syncSettings('),
    main.indexOf('function endPreview('),
  );
  expect(sync).not.toContain('prepareGeneralReadiness');
  expect(sync).not.toContain('extendGeneralSource');
  expect(sync).not.toContain('refreshGeneralSelection');

  const lane = main.slice(
    main.indexOf(
      "document.querySelectorAll<HTMLButtonElement>('[data-lanes]')",
    ),
    main.indexOf("document.querySelectorAll<HTMLButtonElement>('[data-pos]')"),
  );
  expect(lane).toContain('settings.lanes =');
  expect(lane).toContain('syncSettings();');
  expect(lane).not.toContain('prepareGeneralReadiness');
  expect(lane).not.toContain('extendGeneralSource');

  const digitStart = main.indexOf('if (/^Digit[4-8]$/.test(e.code))');
  expect(digitStart).toBeGreaterThan(0);
  const digit = main.slice(
    digitStart,
    main.indexOf("if (e.code === 'F2')", digitStart),
  );
  expect(digit).toContain('syncSettings();');
  expect(digit).not.toContain('prepareGeneralReadiness');
  expect(digit).not.toContain('extendGeneralSource');

  expect(main).toContain('queueMicrotask(prepareGeneralReadiness);');
  expect(main).toContain('EXTENSION_READINESS_SELECTION');
});
