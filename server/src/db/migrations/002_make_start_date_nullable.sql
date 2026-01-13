-- Migration: Make start_date nullable in allocations table
-- Allows allocations without specific start dates (ongoing from indefinite past)

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- Create new table with nullable start_date
CREATE TABLE allocations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('CLIENT', 'PROJECT')),
  target_id INTEGER NOT NULL,
  start_date TEXT,            -- ISO format: YYYY-MM-DD, NULL means started indefinitely in the past
  end_date TEXT,              -- ISO format: YYYY-MM-DD, NULL means ongoing into future
  allocation_percent INTEGER NOT NULL CHECK(allocation_percent >= 0 AND allocation_percent <= 100),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO allocations_new (id, employee_id, target_type, target_id, start_date, end_date, allocation_percent)
SELECT id, employee_id, target_type, target_id, start_date, end_date, allocation_percent
FROM allocations;

-- Drop old table
DROP TABLE allocations;

-- Rename new table to original name
ALTER TABLE allocations_new RENAME TO allocations;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_allocations_employee_id ON allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_allocations_dates ON allocations(start_date, end_date);

COMMIT;

PRAGMA foreign_keys=ON;
