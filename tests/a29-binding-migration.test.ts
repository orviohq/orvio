import { describe, it, expect } from 'vitest';
import {
  KEY_MODES,
  readBindingProfile,
  resolvedModeBindings,
  migrateBindings,
} from '../src/key-mode-registry';
describe('A29 binding compatibility', () => {
  it('pristine legacy defaults migrate to contiguous noSpace maps', () => {
    const p = migrateBindings({
      5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
      7: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'],
    });
    expect(p.overrides).toEqual({});
    expect(KEY_MODES.map((m) => resolvedModeBindings(p, m))).toEqual([
      ['KeyD', 'KeyF', 'KeyG', 'KeyH'],
      ['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH'],
      ['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ'],
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ'],
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'],
    ]);
  });
  it('preserves custom old 5/7 and persisted overrides without remapping', () => {
    const old = {
      5: ['KeyQ', 'KeyW', 'Space', 'KeyE', 'KeyR'],
      7: ['KeyZ', 'KeyX', 'KeyC', 'Space', 'KeyV', 'KeyB', 'KeyN'],
    };
    const p = migrateBindings(old);
    expect(resolvedModeBindings(p, 5)).toEqual(old[5]);
    expect(resolvedModeBindings(p, 7)).toEqual(old[7]);
    expect(readBindingProfile(JSON.parse(JSON.stringify(p)), {})).toEqual(p);
  });
  it('rejects markup and nonphysical key strings from saved profiles', () => {
    const p = readBindingProfile(
      {
        version: 2,
        master: [
          '<img>',
          'KeyS',
          'KeyD',
          'KeyF',
          'KeyG',
          'KeyH',
          'KeyJ',
          'KeyK',
        ],
        overrides: {},
      },
      {},
    );
    expect(resolvedModeBindings(p, 8)[0]).toBe('KeyA');
  });
  it.each([
    null,
    {},
    [],
    { version: 2, master: ['KeyA'], overrides: {} },
    { version: 2, master: Array(8).fill('KeyA'), overrides: {} },
    {
      version: 2,
      master: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'],
      overrides: { 5: ['KeyQ'] },
    },
  ])('malformed profile safely migrates without runtime failure: %j', (raw) => {
    const p = readBindingProfile(raw, {});
    for (const m of KEY_MODES)
      expect(resolvedModeBindings(p, m)).toHaveLength(m);
  });
});
