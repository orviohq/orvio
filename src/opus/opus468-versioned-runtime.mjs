// Build composition only. Producer implementations are reviewed immutable
// capabilities, never properties accepted from storage or remote messages.
import { createVersioned468Frontend } from './opus468-versioned-frontend.mjs';
import {
  createVersioned468Codec,
  exact468Branch,
} from './opus468-version-dispatch.mjs';
export function createVersioned468Runtime({ legacy, unified, parseSharedV7 }) {
  if (typeof parseSharedV7 !== 'function')
    throw Error('versioned_runtime_parser');
  const branches = { legacy, unified };
  const frontend = createVersioned468Frontend({
    legacy: legacy.frontend,
    unified: unified.frontend,
  });
  const makeCodec = () =>
    createVersioned468Codec({
      legacy: legacy.makeCodec(),
      unified: unified.makeCodec(),
    });
  return Object.freeze({
    frontend,
    makeCodec,
    parseSharedV7,
    releaseBinding: unified.releaseBinding,
    extendCachedBase: (...args) => unified.extendCachedBase(...args),
    consumeAcquiredJob: (...args) => unified.consumeAcquiredJob(...args),
    cancel() {
      legacy.cancel();
      unified.cancel();
    },
    revoke() {
      legacy.revoke();
      unified.revoke();
    },
    async exportSharedV7(key, { signal } = {}) {
      const loaded = await frontend.restoreSession(key, { signal });
      if (!loaded?.session?.song) throw Error('extension_session_missing');
      const generation = frontend.generationForSong(loaded.session.song);
      if (generation !== 'legacy' && generation !== 'unified')
        throw Error('versioned_session_owner');
      return branches[generation].exportSharedV7(key, { signal });
    },
    makeTransientSharedView(candidate, options) {
      const input = structuredClone(candidate);
      return exact468Branch(
        input?.extension?.generatorVersion,
        branches,
      ).makeTransientSharedView(input, options);
    },
    // Imported binary envelopes run version dispatch + fullcodec twice as before:
    // once decode/capture, then the selected original install transaction.
    async installSharedReplay(wire, options) {
      const captured = wire.slice();
      const decoded = await makeCodec().decode(captured, options);
      return exact468Branch(
        decoded?.extension?.generatorVersion,
        branches,
      ).installSharedReplay(captured, options);
    },
  });
}
