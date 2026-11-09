// Presentation/selection routing only. Does not admit charts or rewrite identities.
export function createOpus468LibraryPairs() {
  const byBase = new Map<string, string>(),
    byExtension = new Map<string, string>();
  return Object.freeze({
    attach(base: string, extension: string) {
      if (!base || !extension || base === extension)
        throw Error('extension_pair_identity');
      if (
        (byBase.has(base) && byBase.get(base) !== extension) ||
        (byExtension.has(extension) && byExtension.get(extension) !== base)
      )
        throw Error('extension_pair_conflict');
      byBase.set(base, extension);
      byExtension.set(extension, base);
    },
    base: (id: string) => byExtension.get(id) ?? id,
    extension: (id: string) => byBase.get(byExtension.get(id) ?? id),
    resolve(id: string, lanes: number) {
      const base = byExtension.get(id) ?? id;
      return [4, 6, 8].includes(lanes) ? (byBase.get(base) ?? id) : base;
    },
  });
}
