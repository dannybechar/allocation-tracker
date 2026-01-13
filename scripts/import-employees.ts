/**
 * Import Employees Script
 *
 * Reads employee data from employees.xlsx and imports into the database.
 * Excel format: ID, First Name, Last Name
 * Sets FTE to 100% for all employees.
 * Updates existing employees if ID matches.
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import { EmployeeRepository } from '../server/src/repositories/EmployeeRepository';
import * as path from 'path';
import * as fs from 'fs';

interface EmployeeRow {
  id: number;
  firstName: string;
  lastName: string;
}

async function importEmployees() {
  const excelFilePath = path.join(process.cwd(), 'employees.xlsx');

  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: employees.xlsx not found at ${excelFilePath}`);
    console.error('Please create an employees.xlsx file in the project root directory.');
    process.exit(1);
  }

  console.log(`Reading employees from: ${excelFilePath}`);

  // Read Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: ['id', 'firstName', 'lastName'] });

  // Skip header row (first row)
  const employees: EmployeeRow[] = data.slice(1).map((row: any) => ({
    id: Number(row.id),
    firstName: String(row.firstName || '').trim(),
    lastName: String(row.lastName || '').trim(),
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

      if (!emp.firstName || !emp.lastName) {
        console.warn(`Skipping employee ID ${emp.id}: missing name`);
        errors++;
        continue;
      }

      const fullName = `${emp.firstName} ${emp.lastName}`;
      const ftePercent = 100; // Default to 100% as requested

      // Check if employee exists
      const existing = await employeeRepo.findById(emp.id);

      if (existing) {
        // Update existing employee
        await db
          .prepare('UPDATE employees SET name = ?, fte_percent = ? WHERE id = ?')
          .run(fullName, ftePercent, emp.id);
        console.log(`✓ Updated: ID ${emp.id} - ${fullName}`);
        updated++;
      } else {
        // Insert new employee
        await db
          .prepare('INSERT INTO employees (id, name, fte_percent) VALUES (?, ?, ?)')
          .run(emp.id, fullName, ftePercent);
        console.log(`✓ Inserted: ID ${emp.id} - ${fullName}`);
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
