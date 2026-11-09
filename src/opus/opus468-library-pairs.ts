// Presentation-only links. Generation labels come from reviewed runtime dispatch,
// never imported records. Old extension ids stay addressable for exact replays.
type Generation = 'legacy' | 'unified';
const priority: Record<Generation, number> = { legacy: 0, unified: 1 };
export function createOpus468LibraryPairs() {
  const byGeneration = new Map<string, Map<Generation, string>>();
  const byBase = new Map<string, { id: string; generation: Generation }>(),
    byExtension = new Map<string, { base: string; generation: Generation }>();
  return Object.freeze({
    attach(base: string, extension: string, generation: Generation = 'legacy') {
      if (!base || !extension || base === extension)
        throw Error('extension_pair_identity');
      if (!Object.hasOwn(priority, generation))
        throw Error('extension_pair_generation');
      const existing = byExtension.get(extension),
        preferred = byBase.get(base);
      const seen = byGeneration.get(base)?.get(generation);
      if (
        (existing &&
          (existing.base !== base || existing.generation !== generation)) ||
        (seen !== undefined && seen !== extension)
      )
        throw Error('extension_pair_conflict');
      const generations =
        byGeneration.get(base) ?? new Map<Generation, string>();
      generations.set(generation, extension);
      byGeneration.set(base, generations);
      byExtension.set(extension, { base, generation });
      if (!preferred || priority[generation] > priority[preferred.generation])
        byBase.set(base, { id: extension, generation });
    },
    generation: (id: string) =>
      byExtension.get(id)?.generation ?? byBase.get(id)?.generation,
    base: (id: string) => byExtension.get(id)?.base ?? id,
    extension: (id: string) => byBase.get(byExtension.get(id)?.base ?? id)?.id,
    resolve(id: string, lanes: number) {
      const bound = byExtension.get(id),
        base = bound?.base ?? id;
      // An explicit immutable extension identity is not silently upgraded.
      return [4, 6, 8].includes(lanes)
        ? bound
          ? id
          : (byBase.get(base)?.id ?? id)
        : base;
    },
  });
}
