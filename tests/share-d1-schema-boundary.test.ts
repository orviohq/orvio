import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { SHARE_MAX_FRAGMENT_CHARS } from '../server/share-d1/admission';

const schemaPath = new URL('../server/share-d1/schema.sql', import.meta.url);
const schemaSql = readFileSync(schemaPath, 'utf8');
const YEAR_MS = 31_536_000_000;

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(schemaSql);
  db.prepare(
    'UPDATE share_budget SET logical_limit = ?, daily_row_budget = ? WHERE singleton = 1',
  ).run(10_000_000, 100_000);
  return db;
}

function insertShare(db: DatabaseSync, id: string, bytes: number, created = 1_000_000): void {
  db.prepare(
    'INSERT INTO shares(id, fragment, created, expires, bytes) VALUES (?, ?, ?, ?, ?)',
  ).run(id, 'x', created, created + YEAR_MS, bytes);
}

function budget(db: DatabaseSync): { bytes: number; row_units: number } {
  return db.prepare('SELECT bytes, row_units FROM share_budget WHERE singleton = 1').get() as {
    bytes: number;
    row_units: number;
  };
}

describe('share D1 schema byte boundary', () => {
  it('stores a CHECK upper bound equal to SHARE_MAX_FRAGMENT_CHARS + 256', () => {
    const match = schemaSql.match(/bytes INTEGER NOT NULL CHECK\(bytes >= 257 AND bytes <= (\d+)\)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(SHARE_MAX_FRAGMENT_CHARS + 256);
  });

  it('accepts bytes at the upper bound and fires admit/added triggers', () => {
    const db = freshDb();
    insertShare(db, 'aaaaaaaaaaaaaaaaaaaaaa', SHARE_MAX_FRAGMENT_CHARS + 256);
    expect(budget(db)).toEqual({ bytes: SHARE_MAX_FRAGMENT_CHARS + 256, row_units: 6 });
  });

  it('rejects bytes above the upper bound and rolls back trigger effects', () => {
    const db = freshDb();
    const upper = SHARE_MAX_FRAGMENT_CHARS + 256;
    insertShare(db, 'aaaaaaaaaaaaaaaaaaaaaa', upper);
    expect(() => insertShare(db, 'bbbbbbbbbbbbbbbbbbbbbb', upper + 1)).toThrow(/CHECK constraint failed/);
    expect(budget(db)).toEqual({ bytes: upper, row_units: 6 });
    const row = db.prepare('SELECT id FROM shares WHERE id = ?').get('bbbbbbbbbbbbbbbbbbbbbb');
    expect(row).toBeUndefined();
  });

  it('keeps the lower bound unchanged', () => {
    const db = freshDb();
    expect(() => insertShare(db, 'cccccccccccccccccccccc', 256)).toThrow(/CHECK constraint failed/);
    expect(budget(db)).toEqual({ bytes: 0, row_units: 0 });

    insertShare(db, 'dddddddddddddddddddddd', 257);
    expect(budget(db)).toEqual({ bytes: 257, row_units: 6 });
  });
});
