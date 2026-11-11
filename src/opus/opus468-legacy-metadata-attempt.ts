export function createLegacyMetadataAttemptGate() {
  const attempts = new Map<string, string>();
  return Object.freeze({
    shouldAttempt(key: string, navigation: number, href: string) {
      const token = `${navigation}:${href}`;
      if (attempts.get(key) === token) return false;
      attempts.set(key, token);
      return true;
    },
    clear(key: string) {
      attempts.delete(key);
    },
  });
}
