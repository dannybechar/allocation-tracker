Allocation Tracker – Implementation Specification (V1)

Purpose  
Implement a local web application (localhost) for tracking engineer allocation to projects or clients, identifying only allocation exceptions: Under-allocation and Over-allocation.  
The system is single-user, manual data entry only, optimized for clarity, correctness, and future extensibility.

Technology Stack  
Runtime: Node.js  
Language: TypeScript  
Backend: Express (or equivalent minimal HTTP framework)  
Frontend: Minimal web UI (plain HTML \+ JS or very lightweight framework)  
Database: SQLite (local file)  
Repository: Single GitHub repository  
Architecture principles: SOLID  
Testing: Unit tests and integration tests executed in CI

High-Level Architecture  
The system is divided into four logical layers.

Domain  
Pure business logic.  
No database access.  
No HTTP or UI dependencies.

Persistence  
SQLite repositories.  
CRUD only.  
No business logic.

Application  
Use cases.  
Coordinates repositories and domain logic.

Presentation  
HTTP API.  
Web UI (read-only views and manual input forms).

Repository Structure

server  
src  
domain  
AllocationAnalyzer.ts  
models.ts  
repositories  
EmployeeRepository.ts  
AllocationRepository.ts  
ClientRepository.ts  
ProjectRepository.ts  
services  
AllocationService.ts  
api  
allocationRoutes.ts  
db  
schema.sql  
database.ts  
tests  
AllocationAnalyzer.test.ts  
AllocationService.test.ts  
index.ts

client  
index.html  
app.ts

package.json  
tsconfig.json

Data Model (SQLite)

Employee  
id (primary key)  
name (string)  
fte\_percent (integer, 0–100)

Client  
id (primary key)  
name (string)

Project  
id (primary key)  
client\_id (foreign key, nullable)  
name (string)

Allocation  
id (primary key)  
employee\_id (foreign key)  
target\_type (enum: CLIENT or PROJECT)  
target\_id (foreign key)  
start\_date (date, required)  
end\_date (date, nullable, inclusive)  
allocation\_percent (integer, 0–100)

Notes  
allocation\_percent is always out of 100 FTE.  
An employee may have multiple overlapping allocations.  
Gaps between allocations are allowed.

Time Rules  
Allocations are valid including the end\_date (until end of day).  
Calculations are performed only on change points: allocation start dates and allocation end dates plus one day.  
Default analysis window is from today to today plus three months.  
The time window is configurable via API query parameters.

Business Logic – AllocationAnalyzer

Input  
Employees  
Allocations  
Time window (from\_date, to\_date)

Output  
A list of exceptions only. Each exception includes:  
employee\_name  
exception\_type (UNDER or OVER)  
exception\_start\_date  
exception\_end\_date  
free\_or\_excess\_percent  
source\_projects\_or\_clients (if applicable)

Under-allocation Rules  
Occurs when total allocation is less than the employee’s FTE percent.  
If under-allocation already exists today without a triggering allocation end, the exception starts today.  
If under-allocation is caused by an allocation ending, the exception starts at end\_date plus one day.  
Multiple allocation endings on the same date are aggregated.  
One row per employee per contiguous under-allocation period.

Over-allocation Rules  
Occurs when total allocation exceeds the employee’s FTE percent.  
The exception exists for as long as the sum exceeds the FTE.  
One row per employee per contiguous over-allocation period.

Algorithm (Pseudo-code)

For each employee:  
Collect all allocation start dates and allocation end dates plus one day.  
Add the analysis window start and end boundaries.  
Sort all unique change points.  
For each interval between consecutive change points:  
Calculate total allocation percent active in that interval.  
Compare total allocation to employee FTE.  
If under or over allocation exists, record an exception interval.  
After processing all intervals, merge contiguous intervals of the same exception type.

API Endpoints

GET /exceptions  
Query parameters:  
from (date, optional)  
to (date, optional)  
Returns a list of exception rows sorted by exception\_start\_date.

POST /employees  
Manual creation of employees.

POST /allocations  
Manual creation of allocations.

No authentication is required.

UI Requirements (Minimal)

Single page application.  
Displays only allocation exceptions.  
Table sorted by exception start date.  
Columns:  
Employee name  
Exception type  
Start date  
End date  
Free or excess percent  
Source project or client (if applicable)

No charts and no dashboards.

Testing Requirements

Unit Tests  
AllocationAnalyzer must be covered for:  
Simple under-allocation.  
Simple over-allocation.  
Overlapping allocations.  
Gaps between allocations.  
Inclusive end\_date behavior.

Integration Tests  
API returns correct exception lists for seeded database data.

All tests must run automatically as part of CI.

Non-Goals (Explicitly Excluded)

Authentication.  
User management.  
Import or export functionality.  
Automatic data synchronization.  
Historical auditing.  
Multi-user support.

Design Constraints

Keep the implementation simple and readable.  
Prefer clarity over cleverness.  
Avoid premature optimization.  
Code must be easy to extend later with features such as import/export or advanced reporting.

End of specification.