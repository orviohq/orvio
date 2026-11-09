// CE1/CE2 re-expressed as CURRENT SAFE semantics. Vulnerable source must stay RED.
// Run: FACADE=<path to opus468-versioned-frontend.mjs> node --test tests-extra/ce-safe-semantics.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { createVersioned468Frontend } = await import(
  pathToFileURL(
    resolve(process.env.FACADE ?? 'src/opus/opus468-versioned-frontend.mjs'),
  ).href
);
function stubBranch(id, o = {}) {
  return {
    restore: async (s) => (s === id ? { id } : null),
    catalogView: async (s) => ({ song: { id: s } }),
    play: async (s) => ({ song: s }),
    restoreSession: async (k) => ({ key: k }),
    readSession: async (k) => ({ key: k }),
    saveSession: async () => `${id}:saved`,
    exportShare: async () => id,
    restoreSourceView: async () => null,
    readSavedSourceCandidate: async () => null,
    restoreCatalogViews: async () => [{ song: { id } }],
    listSessions: async () => [{ song: id }],
    list: () => [{ id }],
    pin: async () => ({ song: { id }, localPinCommitted: true }),
    ...o,
  };
}
// CE1 safe: closed deny OR the identity-checked FIRST view; never the imposter / unchecked second restore.
test('CE1-safe: restore never returns an unchecked second (imposter) view', async () => {
  let n = 0;
  const unified = stubBranch('songX', {
    restore: async (s) => (++n === 1 ? { id: s } : { id: 'imposter-video' }),
  });
  const api = createVersioned468Frontend({
    legacy: stubBranch('old'),
    unified,
  });
  let out, err;
  try {
    out = await api.restore('songX');
  } catch (e) {
    err = e;
  }
  if (err) assert.match(String(err.message ?? err), /versioned_/);
  else assert.equal(out?.id, 'songX');
  assert.notEqual(out?.id, 'imposter-video');
});
// CE1b stays strict: exactly one restore call on the selected branch.
test('CE1b: selected branch restore invoked exactly once', async () => {
  let calls = 0;
  const unified = stubBranch('songX', {
    restore: async (s) => (calls++, s === 'songX' ? { id: s } : null),
  });
  await createVersioned468Frontend({
    legacy: stubBranch('old'),
    unified,
  }).restore('songX');
  assert.equal(calls, 1);
});
// CE2 safe: exact old ownership preserved OR fatal collision; never flip legacy->unified.
test('CE2-safe: unified view claiming an old id never flips ownership', async () => {
  const unified = stubBranch('new', {
    restoreSourceView: async () => ({ song: { id: 'old' } }),
  });
  const api = createVersioned468Frontend({
    legacy: stubBranch('old'),
    unified,
  });
  let err;
  try {
    await api.restoreSourceView({});
  } catch (e) {
    err = e;
  }
  if (err)
    assert.match(String(err.message ?? err), /versioned_identity_collision/);
  // Fatal-collision path leaves 'old' unbound (undefined); a successful path must keep it legacy. Never unified.
  const g = api.generationForSong('old');
  assert.notEqual(g, 'unified');
  if (!err) assert.equal(g, 'legacy');
});
