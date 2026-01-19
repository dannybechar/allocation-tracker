/**
 * Export Utilities
 *
 * Functions to export database data to Excel files
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../db/database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Export employees to employees.xlsx
 */
async function exportEmployees(db: any): Promise<void> {
  const employees = db.prepare('SELECT id, name, fte_percent, vacation_days, billable FROM employees ORDER BY id').all();

  if (employees.length === 0) {
    console.log('  No employees found.');
    return;
  }

  const excelData = employees.map((emp: any) => ({
    ID: emp.id,
    Name: emp.name,
    FTE: emp.fte_percent,
    VacationDays: emp.vacation_days,
    Billable: emp.billable === 1 ? 1 : 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 30 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
  ];

  const excelFilePath = path.join(process.cwd(), 'data', 'employees.xlsx');
  XLSX.writeFile(workbook, excelFilePath);
  console.log(`  ✓ Employees: ${employees.length} records exported`);
}

/**
 * Export clients to clients.xlsx
 */
async function exportClients(db: any): Promise<void> {
  const clients = db.prepare('SELECT id, name FROM clients ORDER BY id').all();

  if (clients.length === 0) {
    console.log('  No clients found.');
    return;
  }

  const excelData = clients.map((client: any) => ({
    ID: client.id,
    Name: client.name,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 40 },
  ];

  const excelFilePath = path.join(process.cwd(), 'data', 'clients.xlsx');
  XLSX.writeFile(workbook, excelFilePath);
  console.log(`  ✓ Clients: ${clients.length} records exported`);
}

/**
 * Export projects to projects.xlsx
 */
async function exportProjects(db: any): Promise<void> {
  const projects = db.prepare(`
    SELECT
      p.id,
      p.name,
      c.name as client_name
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    ORDER BY p.id
  `).all();

  if (projects.length === 0) {
    console.log('  No projects found.');
    return;
  }

  const excelData = projects.map((project: any) => ({
    ID: project.id,
    Name: project.name,
    Client: project.client_name || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 40 },
    { wch: 40 },
  ];

  const excelFilePath = path.join(process.cwd(), 'data', 'projects.xlsx');
  XLSX.writeFile(workbook, excelFilePath);
  console.log(`  ✓ Projects: ${projects.length} records exported`);
}

/**
 * Export allocations to allocations.xlsx
 */
async function exportAllocations(db: any): Promise<void> {
  const allocations = db.prepare(`
    SELECT
      a.id,
      e.name as employee_name,
      a.target_type,
      a.target_id,
      a.allocation_percent,
      a.start_date,
      a.end_date
    FROM allocations a
    JOIN employees e ON a.employee_id = e.id
    ORDER BY e.name, a.id
  `).all();

  if (allocations.length === 0) {
    console.log('  No allocations found.');
    return;
  }

  const clients = db.prepare('SELECT id, name FROM clients').all();
  const projects = db.prepare('SELECT id, name FROM projects').all();

  const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));
  const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

  const excelData = allocations.map((allocation: any) => {
    let targetName: string;
    if (allocation.target_type === 'CLIENT') {
      targetName = (clientMap.get(allocation.target_id) as string) || `Unknown Client (ID ${allocation.target_id})`;
    } else {
      targetName = (projectMap.get(allocation.target_id) as string) || `Unknown Project (ID ${allocation.target_id})`;
    }

    return {
      ID: allocation.id,
      EmployeeName: allocation.employee_name,
      TargetType: allocation.target_type,
      TargetName: targetName,
      AllocationPercent: allocation.allocation_percent,
      StartDate: allocation.start_date || '',
      EndDate: allocation.end_date || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 30 },
    { wch: 12 },
    { wch: 40 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
  ];

  const excelFilePath = path.join(process.cwd(), 'data', 'allocations.xlsx');
  XLSX.writeFile(workbook, excelFilePath);
  console.log(`  ✓ Allocations: ${allocations.length} records exported`);
}

/**
 * Main export function - exports all data
 */
export async function exportAll(): Promise<void> {
  console.log('\n📦 Exporting database to Excel files...');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  try {
    await exportEmployees(db);
    await exportClients(db);
    await exportProjects(db);
    await exportAllocations(db);
    console.log('✓ All data exported successfully!\n');
  } catch (error: any) {
    console.error('✗ Export failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}
