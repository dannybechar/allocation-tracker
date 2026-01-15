-- Migration: Replace role_type with billable field
-- Changes role_type (Developer, Team Leader, Group Leader, G&A) to billable (1=billable, 0=non-billable)
-- G&A employees become non-billable (0), all others become billable (1)

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- Create new table with billable field
CREATE TABLE employees_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fte_percent INTEGER NOT NULL CHECK(fte_percent >= 0 AND fte_percent <= 100),
  vacation_days REAL DEFAULT 0,
  billable INTEGER NOT NULL DEFAULT 1 CHECK(billable IN (0, 1))
);

-- Copy existing data, converting G&A to non-billable (0), others to billable (1)
INSERT INTO employees_new (id, name, fte_percent, vacation_days, billable)
SELECT id, name, fte_percent, vacation_days,
  CASE WHEN role_type = 'G&A' THEN 0 ELSE 1 END as billable
FROM employees;

-- Drop old table
DROP TABLE employees;

-- Rename new table to original name
ALTER TABLE employees_new RENAME TO employees;

COMMIT;

PRAGMA foreign_keys=ON;
