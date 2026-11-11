-- Isolated candidate. Logical bytes are not D1 physical database size.
CREATE TABLE share_budget (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  bytes INTEGER NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  day INTEGER NOT NULL DEFAULT -1,
  row_units INTEGER NOT NULL DEFAULT 0,
  -- Publisher-owned operational settings, intentionally no product-policy defaults.
  logical_limit INTEGER CHECK(logical_limit > 0 AND logical_limit < 500000000),
  daily_row_budget INTEGER CHECK(daily_row_budget > 0 AND daily_row_budget <= 100000)
);
INSERT INTO share_budget(singleton) VALUES (1);
CREATE TABLE shares (
  id TEXT PRIMARY KEY CHECK(length(id) = 22),
  fragment TEXT NOT NULL,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL CHECK(expires = created + 31536000000),
  -- 874241 = SHARE_MAX_FRAGMENT_CHARS (873985, from server/share-d1/admission.ts) + 256 bytes stored-row overhead.
  bytes INTEGER NOT NULL CHECK(bytes >= 257 AND bytes <= 874241)
);
CREATE INDEX shares_created ON shares(created, id);
CREATE INDEX shares_expires ON shares(expires, id);
CREATE TRIGGER share_removed AFTER DELETE ON shares BEGIN
  UPDATE share_budget SET bytes = bytes - OLD.bytes, row_units = row_units + 5 WHERE singleton = 1;
END;
CREATE TRIGGER share_admit BEFORE INSERT ON shares BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM share_budget WHERE singleton = 1
    AND logical_limit IS NOT NULL AND daily_row_budget IS NOT NULL)
    THEN RAISE(ABORT, 'share_unconfigured') END;
  -- Five units: table row + primary-key index + two secondary indexes + ledger.
  -- Conservative operation estimate, not measured D1 billed rows.
  -- Reserve headroom for one day-reset UPDATE, four expiry deletes, derived-prefix
  -- capacity deletes, and an insert; rollback preserves quota and old records.
  SELECT CASE WHEN (SELECT CASE WHEN day = NEW.created / 86400000 THEN row_units ELSE 0 END
    + 1 + 5 * ((NEW.bytes + 256) / 257 + 5) > daily_row_budget FROM share_budget WHERE singleton = 1)
    THEN RAISE(ABORT, 'share_row_budget') END;
  UPDATE share_budget SET row_units = CASE WHEN day = NEW.created / 86400000 THEN row_units + 1 ELSE 1 END,
    day = NEW.created / 86400000 WHERE singleton = 1;
  -- At most four expired rows, using the expiry index; no GET-side writes.
  DELETE FROM shares WHERE id IN
    (SELECT id FROM shares WHERE expires <= NEW.created ORDER BY expires, id LIMIT 4);
  -- With ledger <= limit, deficit <= NEW.bytes; each old row >=257.
  -- ceil(NEW.bytes/257) bounds the necessary oldest prefix without an arbitrary cap.
  DELETE FROM shares WHERE id IN (
    SELECT id FROM (
      SELECT id, COALESCE(SUM(bytes) OVER (ORDER BY created, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS prior
      FROM (SELECT id, created, bytes FROM shares ORDER BY created, id LIMIT ((NEW.bytes + 256) / 257))
    ) WHERE prior < (SELECT bytes + NEW.bytes - logical_limit FROM share_budget WHERE singleton = 1)
  );
  SELECT CASE WHEN (SELECT bytes + NEW.bytes > logical_limit FROM share_budget WHERE singleton = 1)
    THEN RAISE(ABORT, 'share_capacity') END;
END;
CREATE TRIGGER share_added AFTER INSERT ON shares BEGIN
  UPDATE share_budget SET bytes = bytes + NEW.bytes,
    row_units = row_units + 5 WHERE singleton = 1;
END;
