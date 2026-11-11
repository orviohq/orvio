import { it, expect, vi } from "vitest";
import worker, { shareId, readShareBody } from "../server/share-d1/worker";
import { spawnSync } from "node:child_process";

it("executes SQLite triggers: exact logical ledger, oldest eviction, daily cap and rollback", () => {
  const result = spawnSync(
    "python3",
    [
      "-c",
      `
import sqlite3
c=sqlite3.connect(':memory:')
c.executescript(open('server/share-d1/schema.sql').read())
c.execute('UPDATE share_budget SET logical_limit=67108864,daily_row_budget=100000')
def put(n, size=699328, created=0):
 c.execute('INSERT INTO shares VALUES(?,?,?,?,?)',(str(n).zfill(22),'routing fixture only',created,created+31536000000,size))
for n in range(95): put(n)
put(95)
assert c.execute('SELECT id FROM shares ORDER BY created,id LIMIT 1').fetchone()[0]==str(1).zfill(22)
assert c.execute('SELECT bytes FROM share_budget').fetchone()[0]==c.execute('SELECT sum(bytes) FROM shares').fetchone()[0]
for n in range(96,100): put(n)
before=list(c.execute('SELECT * FROM shares ORDER BY id'))
c.execute('UPDATE share_budget SET daily_row_budget=row_units')
try: put(100)
except sqlite3.IntegrityError: pass
else: raise AssertionError('row work budget missing')
assert list(c.execute('SELECT * FROM shares ORDER BY id'))==before
# Expired cleanup remains bounded even with many expired rows; no GET writes.
c.execute('UPDATE share_budget SET daily_row_budget=100000')
old=c.execute('SELECT count(*) FROM shares').fetchone()[0]
put(101,257,31536000000)
assert c.execute('SELECT count(*) FROM shares').fetchone()[0]==old-4+1
assert c.execute('SELECT bytes FROM share_budget').fetchone()[0]==c.execute('SELECT sum(bytes) FROM shares').fetchone()[0]
plan=str(list(c.execute('EXPLAIN QUERY PLAN SELECT fragment,expires FROM shares WHERE id=? AND expires>?',('x',0))))
assert 'INDEX' in plan and 'SCAN shares' not in plan
c=sqlite3.connect(':memory:')
c.executescript(open('server/share-d1/schema.sql').read())
try: put(0,256)
except sqlite3.IntegrityError: pass
else: raise AssertionError('unconfigured insert allowed')
c.execute('UPDATE share_budget SET logical_limit=263168,daily_row_budget=100000')
for n in range(1024): put(n,257)
put(1024,200000)
assert c.execute('SELECT min(id) FROM shares').fetchone()[0]==str(779).zfill(22)
assert c.execute('SELECT count(*) FROM shares').fetchone()[0]==246
assert c.execute('SELECT bytes FROM share_budget').fetchone()[0]==245*257+200000
before=list(c.execute('SELECT * FROM shares ORDER BY id'))
c.execute('UPDATE share_budget SET daily_row_budget=row_units')
limited=list(c.execute('SELECT * FROM share_budget'))
try: put(1025,200000)
except sqlite3.IntegrityError: pass
else: raise AssertionError('account budget missing')
assert list(c.execute('SELECT * FROM shares ORDER BY id'))==before
assert list(c.execute('SELECT * FROM share_budget'))==limited
print('SQLite accounting, eviction, cap, rollback, expiry cleanup and indexed read PASS')
`,
    ],
    { encoding: "utf8" },
  );
  expect(result.stderr).toBe("");
  expect(result.status, result.stdout).toBe(0);
});

it("fails closed before any DB call until explicitly configured", async () => {
  const prepare = vi.fn();
  const response = await worker.fetch(
    new Request("https://example.test/v1/replays"),
    { DB: { prepare } },
  );
  expect(response.status).toBe(503);
  expect(prepare).not.toHaveBeenCalled();
});
it("uses 128 random bits encoded as a 22-character URL-safe ID", () => {
  const id = shareId();
  expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(atob(id.replace(/-/g, "+").replace(/_/g, "/")).length).toBe(16);
});
it("does one indexed read, returns no expired payload, and never writes on GET", async () => {
  const first = async <T>() => ({ fragment: "must-not-leak", expires: 0 }) as T;
  const run = vi.fn(async () => ({ success: true }));
  const bind = vi.fn(() => ({ bind, first, run }));
  const prepare = vi.fn(() => ({ bind, first, run }));
  const response = await worker.fetch(
    new Request("https://example.test/v1/replays/abcdefghijklmnopqrstuv"),
    {
      DB: { prepare },
      SHARE_ENABLED: "1",
      SHARE_ORIGIN: "https://orvio-play.pages.dev",
    },
  );
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain("must-not-leak");
  expect(prepare).toHaveBeenCalledExactlyOnceWith(
    "SELECT fragment, expires FROM shares WHERE id = ? AND expires > ?",
  );
  expect(run).not.toHaveBeenCalled();
});
it("rejects oversized streamed bodies without trusting Content-Length", async () => {
  let pulls = 0;
  const body = new ReadableStream({
    pull(c) {
      pulls++;
      c.enqueue(new Uint8Array(400000));
    },
  });
  const request = new Request("https://example.test/v1/replays", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
  await expect(
    readShareBody(request, new AbortController().signal),
  ).rejects.toThrow("size");
  expect(pulls).toBeLessThanOrEqual(3);
});
it("rejects hidden fields and unsupported versions before DB writes", async () => {
  const prepare = vi.fn();
  for (const body of [
    { fragment: "v=4", email: "private" },
    { fragment: "v=4" },
    { fragment: "v=local-allkeys-v1&d=AA" },
  ]) {
    const response = await worker.fetch(
      new Request("https://example.test/v1/replays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      {
        DB: { prepare },
        SHARE_ENABLED: "1",
        SHARE_ORIGIN: "https://orvio-play.pages.dev",
      },
    );
    expect(response.status).toBe(400);
  }
  expect(prepare).not.toHaveBeenCalled();
});
