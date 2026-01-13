# Allocation Tracker

A Node.js/TypeScript web application for tracking engineer allocation to projects or clients, identifying under-allocation and over-allocation exceptions.

## Features

- Track employee allocations to clients and projects
- Automatically detect under-allocation and over-allocation exceptions
- RESTful API for managing employees, clients, projects, and allocations
- Simple web UI for viewing allocation exceptions
- Local SQLite database (single-user)
- Comprehensive test coverage (>80%)
- CI/CD with GitHub Actions

## Architecture

The system follows SOLID principles with a 4-layer architecture:

- **Domain Layer**: Pure business logic (AllocationAnalyzer, models)
- **Persistence Layer**: SQLite repositories (CRUD only)
- **Application Layer**: Service layer coordinating domain + persistence
- **Presentation Layer**: Express API + minimal web UI

## Technology Stack

- Runtime: Node.js
- Language: TypeScript
- Backend: Express
- Frontend: Vanilla HTML/TypeScript
- Database: SQLite (better-sqlite3)
- Testing: Jest
- Linting: ESLint + Prettier
- CI: GitHub Actions

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd allocation_tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the client TypeScript:
   ```bash
   cd client && npx tsc && cd ..
   ```

4. Build the server:
   ```bash
   npm run build
   ```

### Running the Application

#### Development Mode

Run the server in development mode with auto-restart:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

#### Production Mode

Build and start the server:

```bash
npm run build
npm start
```

### Running Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Importing Data from Excel

The application supports importing employees, clients, and projects from Excel files located in the `data/` directory.

#### Importing Employees

1. **Edit or create** `data/employees.xlsx` with these columns:
   - Column A: ID (employee ID number)
   - Column B: Name (full name)
   - Column C: FTE (FTE percentage, 0-100)

   Example:
   ```
   | ID  | Name       | FTE |
   |-----|------------|-----|
   | 101 | John Doe   | 100 |
   | 102 | Jane Smith | 80  |
   ```

2. **Run the import script**:
   ```bash
   npm run import-employees
   ```

**Features:**
- Employees are imported with their specified FTE percentage
- If an employee ID already exists, it will be updated (not duplicated)
- The script provides a summary of inserted, updated, and any errors

#### Importing Clients

1. **Edit or create** `data/clients.xlsx` with these columns:
   - Column A: ID (client ID number)
   - Column B: Name

   Example:
   ```
   | ID  | Name           |
   |-----|----------------|
   | 1   | Acme Corp      |
   | 2   | Tech Solutions |
   ```

2. **Run the import script**:
   ```bash
   npm run import-clients
   ```

#### Importing Projects

1. **Edit or create** `data/projects.xlsx` with these columns:
   - Column A: ID (project ID number)
   - Column B: Name
   - Column C: Client ID (optional - leave blank if project is not associated with a client)

   Example:
   ```
   | ID  | Name              | Client ID |
   |-----|-------------------|-----------|
   | 1   | Website Redesign  | 1         |
   | 2   | Mobile App        | 1         |
   | 3   | Internal Tools    |           |
   ```

2. **Run the import script**:
   ```bash
   npm run import-projects
   ```

**Note:** Sample Excel files are included in the `data/` directory to help you get started.

### Linting and Formatting

Lint the code:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

Format code with Prettier:

```bash
npm run format
```

## API Endpoints

### Exceptions

- `GET /api/exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD` - Get allocation exceptions
  - Query params are optional (default: today to today + 3 months)

### Employees

- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create a new employee
  - Body: `{ "name": "string", "fte_percent": number (0-100) }`

### Clients

- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create a new client
  - Body: `{ "name": "string" }`

### Projects

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project
  - Body: `{ "name": "string", "client_id": number | null }`

### Allocations

- `GET /api/allocations` - Get all allocations
- `POST /api/allocations` - Create a new allocation
  - Body:
    ```json
    {
      "employee_id": number,
      "target_type": "CLIENT" | "PROJECT",
      "target_id": number,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD" | null,
      "allocation_percent": number (0-100)
    }
    ```

## Database

The application uses SQLite for local data storage. The database file is created automatically at `allocation_tracker.db` on first run.

### Schema

- **employees**: id, name, fte_percent (0-100)
- **clients**: id, name
- **projects**: id, client_id (nullable), name
- **allocations**: id, employee_id, target_type, target_id, start_date, end_date (nullable), allocation_percent (0-100)

## Business Logic

### Allocation Analysis Algorithm

The core algorithm uses **change-point detection** to efficiently identify allocation exceptions:

1. Collect all change points (dates where allocation state changes)
   - Allocation start dates
   - Allocation end dates + 1 day (end dates are inclusive)
   - Analysis window boundaries

2. For each interval between consecutive change points:
   - Calculate total allocation by summing all active allocations
   - Compare with employee FTE percentage
   - Record exception if under or over allocated

3. Merge contiguous intervals with the same exception type and percentage

### Key Rules

- **Inclusive end dates**: An allocation with end_date=2026-01-15 is active through the entire day of 2026-01-15
- **Null end dates**: Treated as ongoing (continues indefinitely)
- **Overlapping allocations**: Summed correctly (e.g., 50% + 30% = 80%)
- **Under-allocation**: Total allocation < FTE percent
- **Over-allocation**: Total allocation > FTE percent

## Testing

The project includes comprehensive tests:

- **Unit tests**: DateUtils, AllocationAnalyzer (39 tests)
- **Integration tests**: AllocationService with database (8 tests)
- **Coverage threshold**: 80% for branches, functions, lines, and statements

Test files:
- `server/src/domain/DateUtils.test.ts`
- `server/src/tests/AllocationAnalyzer.test.ts`
- `server/src/tests/AllocationService.test.ts`

## Project Structure

```
allocation_tracker/
├── server/src/
│   ├── domain/           # Pure business logic
│   │   ├── AllocationAnalyzer.ts
│   │   ├── DateUtils.ts
│   │   └── models.ts
│   ├── repositories/     # Data access layer
│   │   ├── IRepository.ts
│   │   ├── EmployeeRepository.ts
│   │   ├── AllocationRepository.ts
│   │   ├── ClientRepository.ts
│   │   └── ProjectRepository.ts
│   ├── services/         # Application layer
│   │   └── AllocationService.ts
│   ├── api/              # HTTP endpoints
│   │   └── allocationRoutes.ts
│   ├── db/               # Database setup
│   │   ├── schema.sql
│   │   └── database.ts
│   ├── tests/            # Integration tests
│   │   ├── AllocationAnalyzer.test.ts
│   │   └── AllocationService.test.ts
│   └── index.ts          # Server entry point
├── client/               # Frontend
│   ├── index.html
│   ├── app.ts
│   └── app.js (compiled)
├── .github/workflows/    # CI/CD
│   └── ci.yml
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## CI/CD

The project uses GitHub Actions for continuous integration:

- Runs on push to main and on pull requests
- Installs dependencies
- Runs linting
- Runs all tests with coverage
- Builds the project

See `.github/workflows/ci.yml` for the full configuration.

## Design Principles

- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Clean Architecture**: Clear separation of concerns across layers
- **TDD**: Test-Driven Development with comprehensive test coverage
- **Simplicity**: Prefer clarity over cleverness
- **Extensibility**: Easy to add new features (e.g., import/export, advanced reporting)

## License

ISC

## Author

Generated with Claude Code
