/**
 * Import Employees Script
 *
 * Reads employee data from employees.xlsx and imports into the database.
 * Excel format: ID, Name, FTE
 * Updates existing employees if ID matches.
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import { EmployeeRepository } from '../server/src/repositories/EmployeeRepository';
import * as path from 'path';
import * as fs from 'fs';

interface EmployeeRow {
  id: number;
  name: string;
  fte: number;
}

async function importEmployees() {
  const excelFilePath = path.join(process.cwd(), 'data', 'employees.xlsx');

  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: employees.xlsx not found at ${excelFilePath}`);
    console.error('Please create an employees.xlsx file in the data/ directory.');
    process.exit(1);
  }

  console.log(`Reading employees from: ${excelFilePath}`);

  // Read Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON using first row as headers
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Map to our employee structure
  const employees: EmployeeRow[] = data.map((row: any) => ({
    id: Number(row.ID),
    name: String(row.Name || '').trim(),
    fte: Number(row.FTE),
  }));

  if (employees.length === 0) {
    console.log('No employees found in the Excel file.');
    return;
  }

  console.log(`Found ${employees.length} employees to import.`);

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');
  const employeeRepo = new EmployeeRepository(db);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  for (const emp of employees) {
    try {
      // Validate data
      if (!emp.id || isNaN(emp.id)) {
        console.warn(`Skipping row with invalid ID: ${emp.id}`);
        errors++;
        continue;
      }

      if (!emp.name) {
        console.warn(`Skipping employee ID ${emp.id}: missing name`);
        errors++;
        continue;
      }

      if (isNaN(emp.fte) || emp.fte < 0 || emp.fte > 100) {
        console.warn(`Skipping employee ID ${emp.id}: invalid FTE (${emp.fte})`);
        errors++;
        continue;
      }

      // Check if employee exists
      const existing = await employeeRepo.findById(emp.id);

      if (existing) {
        // Update existing employee
        await db
          .prepare('UPDATE employees SET name = ?, fte_percent = ? WHERE id = ?')
          .run(emp.name, emp.fte, emp.id);
        console.log(`✓ Updated: ID ${emp.id} - ${emp.name} (${emp.fte}% FTE)`);
        updated++;
      } else {
        // Insert new employee
        await db
          .prepare('INSERT INTO employees (id, name, fte_percent) VALUES (?, ?, ?)')
          .run(emp.id, emp.name, emp.fte);
        console.log(`✓ Inserted: ID ${emp.id} - ${emp.name} (${emp.fte}% FTE)`);
        inserted++;
      }
    } catch (error: any) {
      console.error(`Error processing employee ID ${emp.id}:`, error.message);
      errors++;
    }
  }

  db.close();

  console.log('\n=== Import Summary ===');
  console.log(`Total processed: ${employees.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log('======================\n');

  if (errors > 0) {
    process.exit(1);
  }
}

// Run the import
importEmployees()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
