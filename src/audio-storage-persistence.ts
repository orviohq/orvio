interface PersistenceStorage {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}
/** Best effort only. A refusal never blocks playback or deletes saved data. */
export function audioPersistenceRequest(storage?: PersistenceStorage) {
  let attempted: Promise<boolean> | undefined;
  return () => {
    attempted ??= (async () => {
      try {
        if (!storage) return false;
        if (await storage.persisted?.()) return true;
        return (await storage.persist?.()) === true;
      } catch {
        return false;
      }
    })();
    return attempted;
  };
}
export const retainAudioStorage = audioPersistenceRequest(
  typeof navigator === 'undefined' ? undefined : navigator.storage,
);
