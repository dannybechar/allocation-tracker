-- Employee table
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fte_percent INTEGER NOT NULL CHECK(fte_percent >= 0 AND fte_percent <= 100),
  vacation_days REAL DEFAULT 0
);

-- Client table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- Project table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  name TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- Allocation table
CREATE TABLE IF NOT EXISTS allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('CLIENT', 'PROJECT')),
  target_id INTEGER NOT NULL,
  start_date TEXT,          -- ISO format: YYYY-MM-DD, NULL means started indefinitely in the past
  end_date TEXT,            -- ISO format: YYYY-MM-DD, NULL means ongoing into future
  allocation_percent INTEGER NOT NULL CHECK(allocation_percent >= 0 AND allocation_percent <= 100),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_allocations_employee_id ON allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_allocations_dates ON allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
