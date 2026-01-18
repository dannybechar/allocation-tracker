# Allocation Tracker

A Node.js/TypeScript web application for tracking engineer allocation to projects or clients, with automatic detection of under-allocation and over-allocation exceptions.

## Features

- **Employee Management**: Track billable/non-billable employees with FTE percentages
- **Allocation Management**: Assign employees to clients or projects with date ranges and percentages
- **Exception Detection**: Automatically identify under-allocated and over-allocated employees
- **Web GUI**: Manage employees and allocations through a simple web interface
- **Excel Import/Export**: Bulk import/export data from Excel files
- **RESTful API**: Complete API for all operations
- **Local SQLite Database**: Single-user, file-based database

## Technology Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Backend**: Express.js
- **Frontend**: Vanilla HTML/TypeScript/JavaScript
- **Database**: SQLite (better-sqlite3)
- **Excel Processing**: xlsx library
- **Testing**: Jest
- **Linting**: ESLint + Prettier

## Architecture

The system follows SOLID principles with a 4-layer architecture:

- **Domain Layer**: Pure business logic (AllocationAnalyzer, DateUtils, models)
- **Persistence Layer**: SQLite repositories (CRUD operations)
- **Application Layer**: Service layer coordinating domain + persistence
- **Presentation Layer**: Express API + web UI

## Complete Setup Instructions (From Fresh Clone)

### Prerequisites

- Node.js v20 or higher
- npm (comes with Node.js)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/dannybechar/allocation-tracker.git
cd allocation-tracker
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Initialize Database with Existing Data

The repository includes Excel files in the `data/` directory with current production data. Import them in this order:

```bash
# Import employees (92 employees: 42 billable, 50 non-billable)
npm run import-employees

# Import clients (248 clients)
npm run import-clients

# Import projects (93 projects)
npm run import-projects
```

**Note**: Allocations are managed through the GUI, not imported from Excel.

### Step 4: Build the Application

```bash
# Build server TypeScript
npm run build

# Build client TypeScript
cd client && npx tsc && cd ..
```

### Step 5: Start the Application

```bash
# For development (with auto-restart)
npm run dev

# For production
npm start
```

The application will be available at: **http://localhost:3000**

## Using the Application

### Web Interface

Navigate to `http://localhost:3000` in your browser.

#### Tabs:

1. **Exceptions Tab** (Default)
   - Shows employees who will become available for new work
   - Displays current allocation period (not future free time)
   - Date range defaults to today + 3 months
   - Shows source projects/clients for fully allocated employees

2. **Employees Tab**
   - View all employees
   - Edit FTE %, vacation days, and billable status inline
   - Add new employees

3. **Allocations Tab**
   - Shows all billable employees (even without allocations)
   - Employees without allocations shown with gray background
   - Add allocations with "Add Allocation" button
   - Edit or delete existing allocations
   - Auto-fills allocation % with employee's FTE %

4. **Clients Tab**
   - View and add clients

5. **Projects Tab**
   - View and add projects

### Excel Data Management

#### Import Scripts

Import data from Excel files in the `data/` directory:

```bash
npm run import-employees    # Import from data/employees.xlsx
npm run import-clients      # Import from data/clients.xlsx
npm run import-projects     # Import from data/projects.xlsx
```

**Employee Excel Format** (`data/employees.xlsx`):
- Column A: ID (employee ID number)
- Column D: Name (full employee name)
- Column G: FTE (percentage 0-100)
- Column H: VacationDays (decimal allowed, e.g., 2.5)
- Column I: Billable (1 for billable, 0 for non-billable)

**Client Excel Format** (`data/clients.xlsx`):
- Column A: ID (client ID number)
- Column B: Name

**Project Excel Format** (`data/projects.xlsx`):
- Column A: ID (project ID number)
- Column B: Name
- Column C: ClientID (optional - can be blank)

#### Export Scripts

Export current database to Excel files:

```bash
npm run export-employees     # Export to data/employees.xlsx
npm run export-clients       # Export to data/clients.xlsx
npm run export-projects      # Export to data/projects.xlsx
npm run export-allocations   # Export to data/allocations.xlsx
npm run export-exceptions    # Export to data/exceptions.xlsx
```

**Note**: The exported Excel files reflect the current state of the database.

## Database Schema

SQLite database file: `allocation_tracker.db` (created automatically)

### Tables

**employees**
```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  fte_percent INTEGER NOT NULL CHECK(fte_percent >= 0 AND fte_percent <= 100),
  vacation_days REAL NOT NULL DEFAULT 0,
  billable INTEGER NOT NULL DEFAULT 1 CHECK(billable IN (0, 1))
);
```

**clients**
```sql
CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
```

**projects**
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  client_id INTEGER,
  name TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

**allocations**
```sql
CREATE TABLE allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('CLIENT', 'PROJECT')),
  target_id INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  allocation_percent INTEGER NOT NULL CHECK(allocation_percent >= 0 AND allocation_percent <= 100),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

### Database Migrations

Migrations are located in `server/src/db/migrations/`:
- `001_initial_schema.sql` - Initial database setup
- `002_add_vacation_days.sql` - Add vacation_days field
- `003_add_role_type_to_employees.sql` - Add role_type (replaced by billable)
- `004_replace_role_type_with_billable.sql` - Replace role_type with billable boolean

## API Endpoints

### Exceptions

- `GET /api/exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Get allocation exceptions (defaults to today + 3 months)
  - Returns employees who are currently allocated and will become free within the date range
  - **Important**: Shows current allocation period, not future free period
  - Example response:
    ```json
    [
      {
        "employee_name": "Levin Yanir",
        "exception_type": "UNDER",
        "exception_start_date": "2026-01-18",
        "exception_end_date": "2026-02-28",
        "free_or_excess_percent": 100,
        "source_projects_or_clients": ["Speedata Ltd"]
      }
    ]
    ```

### Employees

- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create employee
  - Body: `{ "name": string, "fte_percent": number, "billable": boolean }`
- `PUT /api/employees/:id` - Update employee
  - Body: `{ "name"?: string, "fte_percent"?: number, "vacation_days"?: number, "billable"?: boolean }`

### Clients

- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create client
  - Body: `{ "name": string }`

### Projects

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
  - Body: `{ "name": string, "client_id": number | null }`

### Allocations

- `GET /api/allocations` - Get all allocations
- `POST /api/allocations` - Create allocation
  - Body:
    ```json
    {
      "employee_id": number,
      "target_type": "CLIENT" | "PROJECT",
      "target_id": number,
      "start_date": "YYYY-MM-DD" | null,
      "end_date": "YYYY-MM-DD" | null,
      "allocation_percent": number
    }
    ```
- `PUT /api/allocations/:id` - Update allocation (same body as POST)
- `DELETE /api/allocations/:id` - Delete allocation

## Business Logic: Exception Detection

### How Exceptions Work

The system identifies when employees will become available for new work by analyzing their allocation periods.

**UNDER Exception Logic:**
- Shows when an employee is currently allocated and will become free
- Example: If Levin is allocated 100% to a project until 2026-02-28:
  - Exception shows: 2026-01-18 to 2026-02-28 (current allocation period)
  - Source: ["Speedata Ltd"] (the project he's currently on)
  - Interpretation: "Levin is busy until 2026-02-28, then will be free"

**Rules:**
- Only billable employees generate exceptions (non-billable excluded)
- Only fully allocated employees show source projects/clients
- Partial allocations (e.g., 50% when FTE is 100%) show empty sources
- Exceptions are merged if contiguous with same type and percentage

**OVER Exception Logic:**
- Shows when employee is allocated more than their FTE %
- Example: Employee with 100% FTE allocated 60% + 50% = 110%
- Lists all projects/clients causing over-allocation

### Change-Point Detection Algorithm

1. **Collect change points** (dates where allocation state changes):
   - Analysis window boundaries
   - Allocation start dates
   - Allocation end dates + 1 day (end dates are inclusive)

2. **Analyze each interval** between consecutive change points:
   - Calculate total allocation by summing all active allocations
   - Compare with employee FTE percentage
   - Record exception if under or over allocated

3. **Transform UNDER exceptions** to show current allocation period instead of future free period

4. **Merge contiguous intervals** with same exception type and percentage

5. **Resolve source names** from allocation IDs to project/client names

### Date Handling

- **Dates are inclusive**: An allocation ending on 2026-02-28 is active through the entire day
- **Null start_date**: Allocation started indefinitely in the past
- **Null end_date**: Allocation continues indefinitely into the future
- **Format**: All dates are YYYY-MM-DD in local timezone

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Test coverage threshold: 80% for branches, functions, lines, and statements.

### Linting and Formatting

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Available NPM Scripts

```json
{
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "ts-node-dev --respawn server/src/index.ts",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "lint": "eslint . --ext .ts",
  "lint:fix": "eslint . --ext .ts --fix",
  "format": "prettier --write \"**/*.{ts,js,json,md}\"",
  "import-employees": "ts-node scripts/import-employees.ts",
  "export-employees": "ts-node scripts/export-employees.ts",
  "import-clients": "ts-node scripts/import-clients.ts",
  "export-clients": "ts-node scripts/export-clients.ts",
  "import-projects": "ts-node scripts/import-projects.ts",
  "export-projects": "ts-node scripts/export-projects.ts",
  "export-allocations": "ts-node scripts/export-allocations.ts",
  "export-exceptions": "ts-node scripts/export-exceptions.ts",
  "cleanup-test-data": "ts-node scripts/cleanup-test-data.ts"
}
```

## Project Structure

```
allocation_tracker/
├── server/src/
│   ├── domain/                    # Pure business logic
│   │   ├── AllocationAnalyzer.ts  # Exception detection algorithm
│   │   ├── DateUtils.ts           # Date utilities
│   │   └── models.ts              # TypeScript interfaces
│   ├── repositories/              # Data access layer
│   │   ├── IRepository.ts         # Repository interfaces
│   │   ├── EmployeeRepository.ts
│   │   ├── AllocationRepository.ts
│   │   ├── ClientRepository.ts
│   │   └── ProjectRepository.ts
│   ├── services/                  # Application layer
│   │   └── AllocationService.ts   # Business orchestration
│   ├── api/                       # HTTP endpoints
│   │   └── allocationRoutes.ts    # Express routes
│   ├── db/                        # Database setup
│   │   ├── schema.sql             # Base schema
│   │   ├── migrations/            # Schema migrations
│   │   └── database.ts            # Database initialization
│   ├── tests/                     # Integration tests
│   │   ├── AllocationAnalyzer.test.ts
│   │   └── AllocationService.test.ts
│   └── index.ts                   # Server entry point
├── client/                        # Frontend
│   ├── index.html                 # Web UI
│   ├── app.ts                     # TypeScript source
│   ├── app.js                     # Compiled JavaScript
│   └── tsconfig.json              # Client TypeScript config
├── scripts/                       # Data management scripts
│   ├── import-employees.ts
│   ├── export-employees.ts
│   ├── import-clients.ts
│   ├── export-clients.ts
│   ├── import-projects.ts
│   ├── export-projects.ts
│   ├── export-allocations.ts
│   └── export-exceptions.ts
├── data/                          # Excel files for import/export
│   ├── employees.xlsx             # 92 employees (42 billable)
│   ├── clients.xlsx               # 248 clients
│   ├── projects.xlsx              # 93 projects
│   ├── allocations.xlsx           # Current allocations
│   └── exceptions.xlsx            # Current exceptions
├── .github/workflows/             # CI/CD
│   └── ci.yml                     # GitHub Actions workflow
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # Server TypeScript config
├── jest.config.js                 # Jest configuration
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .gitignore
└── README.md                      # This file
```

## Troubleshooting

### Database Not Found Error

If you get "database not found" error:
1. Make sure you ran the import scripts (they create the database)
2. Check that `allocation_tracker.db` exists in the root directory

### Client TypeScript Not Compiling

If the web UI doesn't work:
```bash
cd client
npx tsc
cd ..
```

### Server Won't Start

Make sure dependencies are installed:
```bash
npm install
npm run build
```

### Data Import Fails

Check that Excel files are in the `data/` directory and have the correct format (see "Excel Data Management" section).

## Design Principles

- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Clean Architecture**: Clear separation between domain, persistence, application, and presentation layers
- **Type Safety**: Comprehensive TypeScript coverage
- **Testability**: All business logic is pure and testable
- **Simplicity**: Prefer clarity over cleverness

## License

ISC

## Author

Developed with Claude Code
