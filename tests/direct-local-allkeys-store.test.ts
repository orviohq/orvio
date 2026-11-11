// Run without installed packages:
// node --experimental-strip-types --test /dev/shm/orv92audit/tests/direct-local-allkeys-store.test.ts
// Unit injection tests: the event-driven IDB double below exercises this store's
// scheduling/error contracts, not browser conformance. The independent record
// validator is injected because its source is not present in this checkout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';

type Handler = ((event: { target: any }) => void) | null;
type Request = { result?: any; error?: unknown; onsuccess?: Handler; onerror?: Handler };
type Row = { identity: string; envelope: any; bytes: ArrayBuffer; title?: string; author?: string };
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const dispatch = (request: Request) => request.onsuccess?.({ target: request });

/** Deliberately narrow IDB injection: unimplemented APIs throw, never succeed. */
class DatabaseHarness {
  rows = new Map<string, Row>();
  indexes = new Map<string, string[]>();
  queue: TransactionHarness[] = [];
  initialized = false;
  opens: [string, number][] = [];
  closes = 0;
  valueReads = 0;
  adds = 0;
  transactions = 0;
  active = false;
  openError: unknown;
  transactionError: unknown;
  addError: unknown;
  requestError: unknown;
  beforeGet?: () => void;
  afterAdd?: () => void;
  beforeComplete?: () => void;
  afterComplete?: () => void;
  beforeOpenSuccess?: () => void;

  factory = {
    open: (name: string, version: number) => {
      if (this.openError) throw this.openError;
      this.opens.push([name, version]);
      const request: any = { result: this.database, transaction: { abort() {} } };
      setImmediate(() => {
        if (!this.initialized) {
          this.initialized = true;
          request.onupgradeneeded?.();
        }
        this.beforeOpenSuccess?.();
        dispatch(request);
      });
      return request;
    },
  };

  database = {
    close: () => { this.closes++; },
    createObjectStore: (name: string, options: { keyPath: string }) => {
      assert.equal(name, 'sources');
      assert.equal(options.keyPath, 'identity');
      return { createIndex: (name: string, paths: string[]) => this.indexes.set(name, paths) };
    },
    transaction: (name: string, mode: string) => {
      assert.equal(name, 'sources');
      assert.ok(mode === 'readonly' || mode === 'readwrite');
      if (this.transactionError) throw this.transactionError;
      this.transactions++;
      const tx = new TransactionHarness(this, mode);
      this.queue.push(tx);
      if (this.queue.length === 1) setImmediate(() => tx.start());
      return tx;
    },
  };

  finished(tx: TransactionHarness) {
    assert.equal(this.queue.shift(), tx);
    this.active = false;
    const next = this.queue[0];
    if (next) setImmediate(() => next.start());
  }
}

class TransactionHarness {
  oncomplete?: Handler;
  onabort?: Handler;
  onerror?: Handler;
  error: unknown = null;
  staged = new Map<string, Row>();
  tasks: (() => void)[] = [];
  started = false;
  aborted = false;
  completed = false;
  db: DatabaseHarness;
  mode: string;
  constructor(db: DatabaseHarness, mode: string) {
    this.db = db;
    this.mode = mode;
  }

  start() {
    this.started = true;
    this.db.active = true;
    this.staged = new Map(this.db.rows);
    this.pump();
  }

  pump() {
    if (this.aborted) {
      this.onabort?.({ target: this });
      this.db.finished(this);
      return;
    }
    const action = this.tasks.shift();
    if (action) {
      action();
      setImmediate(() => this.pump());
      return;
    }
    this.db.beforeComplete?.();
    if (this.aborted) { setImmediate(() => this.pump()); return; }
    if (this.mode === 'readwrite') this.db.rows = this.staged;
    this.completed = true;
    this.oncomplete?.({ target: this });
    this.db.afterComplete?.();
    this.db.finished(this);
  }

  abort() {
    if (this.completed) throw new DOMException('Finished', 'InvalidStateError');
    this.aborted = true;
  }

  request(action: () => any): Request {
    if (this.aborted || this.completed) throw new DOMException('Inactive', 'TransactionInactiveError');
    const request: Request = {};
    this.tasks.push(() => {
      try {
        request.result = action();
      } catch (error) {
        request.error = error;
        this.error = error;
        this.onerror?.({ target: request });
        this.abort();
        return;
      }
      dispatch(request);
    });
    return request;
  }

  objectStore(name: string) {
    assert.equal(name, 'sources');
    return {
      get: (identity: string) => this.request(() => {
        this.db.beforeGet?.();
        if (this.db.requestError) throw this.db.requestError;
        this.db.valueReads++;
        return structuredClone(this.staged.get(identity));
      }),
      add: (row: Row) => {
        assert.equal(this.mode, 'readwrite');
        if (this.db.addError) throw this.db.addError;
        const snapshot = structuredClone(row);
        return this.request(() => {
          if (this.staged.has(snapshot.identity)) throw new DOMException('Duplicate', 'ConstraintError');
          this.staged.set(snapshot.identity, snapshot);
          this.db.adds++;
          this.db.afterAdd?.();
          return snapshot.identity;
        });
      },
      index: (name: string) => ({
        openKeyCursor: () => {
          const paths = this.db.indexes.get(name);
          assert.ok(paths, `Unknown index ${name}`);
          let entries: { key: any[]; primaryKey: string }[] | undefined;
          let offset = 0;
          const request: Request = {};
          const next = () => {
            if (!entries) entries = [...this.staged.values()].flatMap((row) => {
              const key = paths.map((path) => path.split('.').reduce<any>((value, part) => value?.[part], row));
              return key.some((part) => part === undefined) ? [] : [{ key, primaryKey: row.identity }];
            }).sort((a, b) => a.primaryKey.localeCompare(b.primaryKey));
            const entry = entries[offset++];
            request.result = entry ? { ...entry, continue: () => this.tasks.push(next) } : null;
            dispatch(request);
          };
          this.tasks.push(next);
          return request;
        },
      }),
    };
  }
}

const source = readFileSync(new URL('../src/local-allkeys-store.ts', import.meta.url), 'utf8');
assert.match(source, /from '\.\/local-allkeys-record'/);
const executable = stripTypeScriptTypes(source.replace(/import\s*\{[^}]+\}\s*from '\.\/local-allkeys-record';/, ''), { mode: 'strip' })
  .replace(/^export /gm, '');

function identity(record: any) {
  return `yt-local-allkeys-${record.videoId}-${record.audioSha256}-c${record.chartSetSha256}`;
}

function setup() {
  const db = new DatabaseHarness();
  const calls = { validation: 0, digest: 0 };
  const hooks: {
    validate?: (envelope: any, options: any) => Promise<any>;
    digest?: (algorithm: string, bytes: ArrayBuffer) => Promise<ArrayBuffer>;
    identity?: (envelope: any) => string;
  } = {};
  const validate = async (envelope: any, options: any) => {
    calls.validation++;
    assert.equal(db.active, false, 'validator must run outside IDB transactions');
    if (hooks.validate) return hooks.validate(envelope, options);
    return envelope;
  };
  const crypto = { subtle: { digest: async (algorithm: string, bytes: ArrayBuffer) => {
    calls.digest++;
    assert.equal(db.active, false, 'crypto must run outside IDB transactions');
    if (hooks.digest) return hooks.digest(algorithm, bytes);
    return webcrypto.subtle.digest(algorithm, bytes);
  } } };
  const api = new Function('validateLocalAllKeysRecord', 'localAllKeysIdentity', 'indexedDB', 'crypto',
    `${executable}\nreturn { saveLocalAllKeys, readLocalAllKeys, listLocalAllKeys };`)(
    validate, (envelope: any) => hooks.identity?.(envelope) ?? identity(envelope.record), db.factory, crypto,
  );
  return { db, calls, hooks, ...api };
}

async function fixture() {
  // A real, minimal mono PCM16 WAV; chart content is an opaque validator fixture.
  const bytes = new ArrayBuffer(48);
  const view = new DataView(bytes);
  const ascii = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 40, true); ascii(8, 'WAVE'); ascii(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, 4, true);
  const audioSha256 = Buffer.from(await webcrypto.subtle.digest('SHA-256', bytes)).toString('hex');
  const envelope = {
    version: 1, kind: 'orvio-local-allkeys', sourceProvenance: 'local-allkeys-v1',
    record: { videoId: 'abcdefghijk', audioSha256, chartSetSha256: 'c'.repeat(64), sampleRate: 8000, frames: 2,
      fixturePayload: { engine: 'core3', profile: 'all5lanes20charts' } },
  };
  return { envelope, bytes, title: 'Example', author: 'Composer' };
}

test('roundtrip uses isolated DB, validates off-transaction, and clones caller/returned audio', async () => {
  const api = setup();
  const input = await fixture();
  const original = input.bytes.slice(0);
  const pending = api.saveLocalAllKeys(input);
  new Uint8Array(input.bytes)[47] = 99;
  input.envelope.record.fixturePayload.engine = 'mutated after call';
  const saved = await pending;
  assert.equal(saved.identity, identity(saved.envelope.record));
  assert.deepEqual(saved.bytes, original);
  assert.equal(input.bytes.byteLength, 48);
  assert.equal(new Uint8Array(input.bytes)[47], 99);
  new Uint8Array(saved.bytes)[47] = 88;
  const read = await api.readLocalAllKeys(saved.identity);
  assert.deepEqual(read.bytes, original);
  assert.equal(read.envelope.record.fixturePayload.engine, 'core3');
  assert.deepEqual(api.db.opens, [['orvio-local-allkeys-v1', 1], ['orvio-local-allkeys-v1', 1]]);
  assert.deepEqual(api.calls, { validation: 2, digest: 2 });
  assert.equal(api.db.closes, 2);
});

test('same record with reordered keys is idempotent; first metadata stays immutable', async () => {
  const api = setup();
  const input = await fixture();
  const first = await api.saveLocalAllKeys(input);
  const reordered = Object.fromEntries(Object.entries(input.envelope.record).reverse());
  const second = await api.saveLocalAllKeys({ ...input, title: 'Replacement', envelope: { ...input.envelope, record: reordered } });
  assert.deepEqual(second, first);
  assert.equal(api.db.adds, 1);
});

test('concurrent identical writes serialize get/add and publish exactly one row', async () => {
  const api = setup();
  const input = await fixture();
  const rows = await Promise.all(Array.from({ length: 6 }, () => api.saveLocalAllKeys(input)));
  assert.ok(rows.every((row) => row.identity === rows[0].identity));
  assert.equal(api.db.adds, 1);
  assert.equal(api.db.rows.size, 1);
});

test('concurrent conflicting records have one winner; rejection preserves its complete row', async () => {
  const api = setup();
  const a = await fixture();
  const b = structuredClone(a);
  b.envelope.record.fixturePayload.engine = 'other validator-approved payload';
  const results = await Promise.allSettled([api.saveLocalAllKeys(a), api.saveLocalAllKeys(b)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
  assert.match(failure.reason.message, /Conflicting/);
  const winner = results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<Row>;
  assert.deepEqual(await api.readLocalAllKeys(winner.value.identity), winner.value);
  assert.equal(api.db.adds, 1);
});

test('byte conflict is rejected without overwriting even if a digest collision is injected', async () => {
  const api = setup();
  const input = await fixture();
  const first = await api.saveLocalAllKeys(input);
  const changed = structuredClone(input);
  new Uint8Array(changed.bytes)[47] = 4;
  api.hooks.digest = async () => Uint8Array.from(Buffer.from(input.envelope.record.audioSha256, 'hex')).buffer;
  await assert.rejects(api.saveLocalAllKeys(changed), /Conflicting/);
  assert.deepEqual(api.db.rows.get(first.identity), first);
});

test('invalid envelope, wrong WAV SHA, wrong helper identity and malformed input never open IDB', async () => {
  const input = await fixture();
  const api = setup();
  const invalid = new Error('independent validator rejected profile/hash');
  api.hooks.validate = async () => { throw invalid; };
  await assert.rejects(api.saveLocalAllKeys(input), (error) => error === invalid);
  delete api.hooks.validate;
  const wrong = structuredClone(input);
  new Uint8Array(wrong.bytes)[47] = 1;
  await assert.rejects(api.saveLocalAllKeys(wrong), /SHA-256 mismatch/);
  api.hooks.identity = () => 'wrong';
  await assert.rejects(api.saveLocalAllKeys(input), /identity/);
  delete api.hooks.identity;
  await assert.rejects(api.saveLocalAllKeys({ ...input, bytes: new Uint8Array(4) }), /ArrayBuffer/);
  await assert.rejects(api.readLocalAllKeys('old-pin'), /identity/);
  assert.equal(api.db.opens.length, 0);
});

test('read returns null for missing key and rejects tampered identity, bytes and envelope', async () => {
  const api = setup();
  const input = await fixture();
  const key = identity(input.envelope.record);
  assert.equal(await api.readLocalAllKeys(key), null);
  const row = await api.saveLocalAllKeys(input);
  const tampered = structuredClone(row);
  tampered.identity = `${key}broken`;
  api.db.rows.set(key, tampered);
  await assert.rejects(api.readLocalAllKeys(key), /identity mismatch/);
  tampered.identity = key;
  new Uint8Array(tampered.bytes)[47] = 9;
  await assert.rejects(api.readLocalAllKeys(key), /SHA-256 mismatch/);
  api.db.rows.set(key, structuredClone(row));
  const reason = new Error('tampered chart rejected');
  api.hooks.validate = async () => { throw reason; };
  await assert.rejects(api.readLocalAllKeys(key), (error) => error === reason);
});

test('list is key-only metadata, bounds plain text, and supports absent optional fields', async () => {
  const api = setup();
  const input = await fixture();
  await api.saveLocalAllKeys({ ...input, title: '<b>\u0000\u202e' + 'x'.repeat(300), author: '\u2066' + 'a'.repeat(200) });
  const second = structuredClone(input);
  second.envelope.record.chartSetSha256 = 'd'.repeat(64);
  await api.saveLocalAllKeys({ envelope: second.envelope, bytes: second.bytes });
  const reads = api.db.valueReads;
  const validations = api.calls.validation;
  const rows = await api.listLocalAllKeys();
  assert.equal(api.db.valueReads, reads, 'list must not read row values');
  assert.equal(api.calls.validation, validations, 'list must not load envelopes for validation');
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['identity', 'videoId', 'audioSha256', 'chartSetSha256', 'sampleRate', 'frames', 'provenance', 'title', 'author'].sort());
  assert.equal(rows[0].title.length, 200);
  assert.equal(rows[0].author.length, 120);
  assert.doesNotMatch(rows[0].title, /[<>\u0000\u202e]/);
  assert.equal(rows[0].provenance, 'local-allkeys-v1');
  assert.equal('title' in rows[1], false);
  assert.equal('author' in rows[1], false);
  await assert.rejects(api.saveLocalAllKeys({ ...input, title: { toString() { throw Error('must not coerce'); } } }), /plain text/);
});

test('pre-abort preserves arbitrary exact reason for all APIs without validation or IO', async () => {
  const api = setup();
  const input = await fixture();
  const controller = new AbortController();
  const reason = { cancelled: true };
  controller.abort(reason);
  for (const pending of [
    api.saveLocalAllKeys(input, { signal: controller.signal }),
    api.readLocalAllKeys(identity(input.envelope.record), { signal: controller.signal }),
    api.listLocalAllKeys({ signal: controller.signal }),
  ]) await assert.rejects(pending, (error) => error === reason);
  assert.equal(api.calls.validation, 0);
  assert.equal(api.db.opens.length, 0);
});

test('abort while independent validation is pending rejects immediately and never persists later', async () => {
  const api = setup();
  const input = await fixture();
  const controller = new AbortController();
  const reason = Symbol('validation cancelled');
  let release!: (value: any) => void;
  api.hooks.validate = () => new Promise((resolve) => { release = resolve; });
  const pending = api.saveLocalAllKeys(input, { signal: controller.signal });
  controller.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  release(input.envelope);
  await tick();
  assert.equal(api.db.opens.length, 0);
});

test('abort during crypto and database open preserves reason and closes eventual connection', async () => {
  const input = await fixture();
  for (const phase of ['digest', 'open']) {
    const api = setup();
    const controller = new AbortController();
    const reason = { phase };
    if (phase === 'digest') api.hooks.digest = async () => {
      controller.abort(reason);
      return webcrypto.subtle.digest('SHA-256', input.bytes);
    };
    else api.db.beforeOpenSuccess = () => controller.abort(reason);
    await assert.rejects(api.saveLocalAllKeys(input, { signal: controller.signal }), (error) => error === reason);
    await tick();
    assert.equal(api.db.rows.size, 0);
    assert.equal(api.db.transactions, 0);
    if (phase === 'open') assert.equal(api.db.closes, 1);
  }
});

test('abort after get/add or immediately before commit rolls back the whole row', async () => {
  for (const phase of ['beforeGet', 'afterAdd', 'beforeComplete'] as const) {
    const api = setup();
    const input = await fixture();
    const controller = new AbortController();
    const reason = { phase };
    api.db[phase] = () => controller.abort(reason);
    await assert.rejects(api.saveLocalAllKeys(input, { signal: controller.signal }), (error) => error === reason);
    await tick(); await tick();
    assert.equal(api.db.rows.size, 0);
    assert.equal(api.db.closes, 1);
  }
});

test('late abort after commit rejects exact reason; an already committed row remains whole', async () => {
  const api = setup();
  const input = await fixture();
  const controller = new AbortController();
  const reason = new Error('late abort');
  api.db.afterComplete = () => controller.abort(reason);
  await assert.rejects(api.saveLocalAllKeys(input, { signal: controller.signal }), (error) => error === reason);
  assert.equal(api.db.rows.size, 1);
  delete api.db.afterComplete;
  const row = await api.readLocalAllKeys(identity(input.envelope.record));
  assert.deepEqual(row.bytes, input.bytes);
});

test('read/list active transaction cancellation rejects exact reason', async () => {
  for (const operation of ['read', 'list']) {
    const api = setup();
    const row = await api.saveLocalAllKeys(await fixture());
    const controller = new AbortController();
    const reason = { operation };
    api.db.beforeComplete = () => controller.abort(reason);
    const options = { signal: controller.signal };
    await assert.rejects(operation === 'read' ? api.readLocalAllKeys(row.identity, options) : api.listLocalAllKeys(options), (error) => error === reason);
    await tick();
    assert.equal(api.db.rows.size, 1);
  }
});

test('synchronous open/transaction/add errors and async quota request failures preserve cause', async () => {
  for (const phase of ['openError', 'transactionError', 'addError', 'requestError'] as const) {
    const api = setup();
    const input = await fixture();
    const error = new DOMException(`injected ${phase}`, 'QuotaExceededError');
    api.db[phase] = error;
    await assert.rejects(api.saveLocalAllKeys(input), (actual) => actual === error);
    assert.equal(api.db.rows.size, 0);
  }
});
