/**
 * Import Utilities
 *
 * Functions to import database data from Excel files
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../db/database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Truncate all tables in reverse order to respect foreign key constraints
 */
function truncateTables(db: any): void {
  console.log('  Truncating all tables...');

  // Disable foreign key constraints temporarily
  db.prepare('PRAGMA foreign_keys = OFF').run();

  try {
    // Delete in reverse order of dependencies
    db.prepare('DELETE FROM allocations').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM clients').run();
    db.prepare('DELETE FROM employees').run();

    // Reset autoincrement sequences
    db.prepare('DELETE FROM sqlite_sequence').run();

    console.log('  ✓ All tables truncated');
  } finally {
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
  }
}

/**
 * Import employees from employees.xlsx
 */
async function importEmployees(db: any): Promise<void> {
  const excelFilePath = path.join(process.cwd(), 'data', 'employees.xlsx');

  if (!fs.existsSync(excelFilePath)) {
    console.log('  ⚠ employees.xlsx not found, skipping');
    return;
  }

  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const employees = data.map((row: any) => ({
    id: Number(row.ID),
    name: String(row.Name || '').trim(),
    fte_percent: Number(row.FTE),
    vacation_days: row.VacationDays !== undefined ? Number(row.VacationDays) : 0,
    billable: row.Billable !== undefined ? Number(row.Billable) : 1,
  }));

  if (employees.length === 0) {
    console.log('  No employees found in Excel');
    return;
  }

  const stmt = db.prepare('INSERT INTO employees (id, name, fte_percent, vacation_days, billable) VALUES (?, ?, ?, ?, ?)');

  for (const emp of employees) {
    stmt.run(emp.id, emp.name, emp.fte_percent, emp.vacation_days, emp.billable);
  }

  console.log(`  ✓ Employees: ${employees.length} records imported`);
}

/**
 * Import clients from clients.xlsx
 */
async function importClients(db: any): Promise<void> {
  const excelFilePath = path.join(process.cwd(), 'data', 'clients.xlsx');

  if (!fs.existsSync(excelFilePath)) {
    console.log('  ⚠ clients.xlsx not found, skipping');
    return;
  }

  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const clients = data.map((row: any) => ({
    id: Number(row.ID),
    name: String(row.Name || '').trim(),
  }));

  if (clients.length === 0) {
    console.log('  No clients found in Excel');
    return;
  }

  const stmt = db.prepare('INSERT INTO clients (id, name) VALUES (?, ?)');

  for (const client of clients) {
    stmt.run(client.id, client.name);
  }

  console.log(`  ✓ Clients: ${clients.length} records imported`);
}

/**
 * Import projects from projects.xlsx
 */
async function importProjects(db: any): Promise<void> {
  const excelFilePath = path.join(process.cwd(), 'data', 'projects.xlsx');

  if (!fs.existsSync(excelFilePath)) {
    console.log('  ⚠ projects.xlsx not found, skipping');
    return;
  }

  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Build client name -> id map for lookup
  const clients = db.prepare('SELECT id, name FROM clients').all();
  const clientMap = new Map(clients.map((c: any) => [c.name, c.id]));

  const projects = data.map((row: any) => {
    const clientName = String(row.Client || '').trim();
    const clientId = clientName ? clientMap.get(clientName) : null;

    return {
      id: Number(row.ID),
      name: String(row.Name || '').trim(),
      client_id: clientId || null,
    };
  });

  if (projects.length === 0) {
    console.log('  No projects found in Excel');
    return;
  }

  const stmt = db.prepare('INSERT INTO projects (id, name, client_id) VALUES (?, ?, ?)');

  for (const project of projects) {
    stmt.run(project.id, project.name, project.client_id);
  }

  console.log(`  ✓ Projects: ${projects.length} records imported`);
}

/**
 * Import allocations from allocations.xlsx
 */
async function importAllocations(db: any): Promise<void> {
  const excelFilePath = path.join(process.cwd(), 'data', 'allocations.xlsx');

  if (!fs.existsSync(excelFilePath)) {
    console.log('  ⚠ allocations.xlsx not found, skipping');
    return;
  }

  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Build lookup maps
  const employees = db.prepare('SELECT id, name FROM employees').all();
  const clients = db.prepare('SELECT id, name FROM clients').all();
  const projects = db.prepare('SELECT id, name FROM projects').all();

  const employeeMap = new Map(employees.map((e: any) => [e.name, e.id]));
  const clientMap = new Map(clients.map((c: any) => [c.name, c.id]));
  const projectMap = new Map(projects.map((p: any) => [p.name, p.id]));

  const allocations = data.map((row: any) => {
    const employeeName = String(row.EmployeeName || '').trim();
    const targetType = String(row.TargetType || 'CLIENT').trim();
    const targetName = String(row.TargetName || '').trim();

    const employeeId = employeeMap.get(employeeName) as number | undefined;
    let targetId: number | undefined;

    if (targetType === 'CLIENT') {
      targetId = clientMap.get(targetName) as number | undefined;
    } else if (targetType === 'PROJECT') {
      targetId = projectMap.get(targetName) as number | undefined;
    }

    return {
      id: Number(row.ID),
      employee_id: employeeId,
      target_type: targetType,
      target_id: targetId,
      allocation_percent: Number(row.AllocationPercent),
      start_date: row.StartDate ? String(row.StartDate).trim() : null,
      end_date: row.EndDate ? String(row.EndDate).trim() : null,
    };
  }).filter(alloc => alloc.employee_id && alloc.target_id); // Only include valid allocations

  if (allocations.length === 0) {
    console.log('  No allocations found in Excel');
    return;
  }

  const stmt = db.prepare('INSERT INTO allocations (id, employee_id, target_type, target_id, allocation_percent, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)');

  for (const alloc of allocations) {
    stmt.run(
      alloc.id,
      alloc.employee_id,
      alloc.target_type,
      alloc.target_id,
      alloc.allocation_percent,
      alloc.start_date,
      alloc.end_date
    );
  }

  console.log(`  ✓ Allocations: ${allocations.length} records imported`);
}

/**
 * Main import function - imports all data from Excel files
 */
export async function importAll(): Promise<void> {
  console.log('\n📥 Importing database from Excel files...');

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  try {
    // Truncate all tables first
    truncateTables(db);

    // Import in order respecting foreign key dependencies
    await importEmployees(db);
    await importClients(db);
    await importProjects(db);
    await importAllocations(db);

    console.log('✓ All data imported successfully!\n');
  } catch (error: any) {
    console.error('✗ Import failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}
