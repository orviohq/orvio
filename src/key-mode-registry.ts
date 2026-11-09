/** Shared eight-key layout with explicit legacy custom overrides. */
export const KEY_MODES = [4, 5, 6, 7, 8] as const;
export type KeyMode = (typeof KEY_MODES)[number];
export const DEFAULT_MASTER_BINDINGS = [
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK',
] as const;
export function isKeyMode(value: unknown): value is KeyMode {
  return typeof value === 'number' && KEY_MODES.includes(value as KeyMode);
}
/** Odd subsets consistently leave the extra unused slot at the right. */
export function modePositions(mode: KeyMode): number[] {
  const start = Math.floor((8 - mode) / 2);
  return Array.from({ length: mode }, (_, index) => start + index);
}
export function modeBindings(
  master: readonly string[],
  mode: KeyMode,
): string[] {
  if (!validBindings(master, 8)) throw Error('Invalid eight-key bindings');
  return modePositions(mode).map((position) => master[position]);
}
export function validBindings(keys: unknown, count: number): keys is string[] {
  return (
    Array.isArray(keys) &&
    keys.length === count &&
    keys.every(
      (key) =>
        typeof key === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(key),
    ) &&
    new Set(keys).size === count
  );
}
export interface BindingProfile {
  version: 2;
  master: string[];
  overrides: Partial<Record<KeyMode, string[]>>;
}
const OLD_DEFAULTS = {
  5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
  7: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'],
};
/** Preserve old custom layouts, but a pristine old default is not a custom override. */
export function migrateBindings(raw: unknown): BindingProfile {
  const old =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const profile: BindingProfile = {
    version: 2,
    master: [...DEFAULT_MASTER_BINDINGS],
    overrides: {},
  };
  for (const mode of [5, 7] as const) {
    const keys = old[String(mode)];
    if (
      validBindings(keys, mode) &&
      JSON.stringify(keys) !== JSON.stringify(OLD_DEFAULTS[mode])
    )
      profile.overrides[mode] = [...keys];
  }
  return profile;
}
export function resolvedModeBindings(profile: BindingProfile, mode: KeyMode) {
  const override = profile.overrides[mode];
  return validBindings(override, mode)
    ? [...override]
    : modeBindings(profile.master, mode);
}

export function readBindingProfile(
  raw: unknown,
  legacy: unknown,
): BindingProfile {
  if (!raw || typeof raw !== 'object') return migrateBindings(legacy);
  const p = raw as Partial<BindingProfile>;
  if (
    p.version !== 2 ||
    !validBindings(p.master, 8) ||
    !p.overrides ||
    typeof p.overrides !== 'object'
  )
    return migrateBindings(legacy);
  const overrides: BindingProfile['overrides'] = {};
  for (const mode of KEY_MODES) {
    if (p.overrides[mode] !== undefined) {
      if (!validBindings(p.overrides[mode], mode))
        return migrateBindings(legacy);
      overrides[mode] = [...p.overrides[mode]!];
    }
  }
  return { version: 2, master: [...p.master], overrides };
}
