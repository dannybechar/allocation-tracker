-- Migration: Add role_type column to employees table
-- Adds role type field with values: Developer, Team Leader, Group Leader, G&A

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- Create new table with role_type
CREATE TABLE employees_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fte_percent INTEGER NOT NULL CHECK(fte_percent >= 0 AND fte_percent <= 100),
  vacation_days REAL DEFAULT 0,
  role_type TEXT NOT NULL DEFAULT 'Developer' CHECK(role_type IN ('Developer', 'Team Leader', 'Group Leader', 'G&A'))
);

-- Copy existing data (role_type will use default 'Developer')
INSERT INTO employees_new (id, name, fte_percent, vacation_days)
SELECT id, name, fte_percent, vacation_days
FROM employees;

-- Drop old table
DROP TABLE employees;

-- Rename new table to original name
ALTER TABLE employees_new RENAME TO employees;

COMMIT;

PRAGMA foreign_keys=ON;
