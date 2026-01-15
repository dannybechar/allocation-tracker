/**
 * Export Employees Script
 *
 * Exports employee data from the database to employees.xlsx
 * Excel format: ID, Name, FTE, VacationDays, Billable
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import * as path from 'path';
import * as fs from 'fs';

async function exportEmployees() {
  console.log('Exporting employees from database to Excel...');

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  try {
    // Get all employees
    const employees = db.prepare('SELECT id, name, fte_percent, vacation_days, billable FROM employees ORDER BY id').all();

    if (employees.length === 0) {
      console.log('No employees found in the database.');
      return;
    }

    console.log(`Found ${employees.length} employees to export.`);

    // Map to Excel format
    const excelData = employees.map((emp: any) => ({
      ID: emp.id,
      Name: emp.name,
      FTE: emp.fte_percent,
      VacationDays: emp.vacation_days,
      Billable: emp.billable === 1 ? 1 : 0, // Export as 1 or 0
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 30 },  // Name
      { wch: 10 },  // FTE
      { wch: 15 },  // VacationDays
      { wch: 10 },  // Billable
    ];

    // Write to file
    const excelFilePath = path.join(process.cwd(), 'data', 'employees.xlsx');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    XLSX.writeFile(workbook, excelFilePath);
    console.log(`\n✓ Exported to: ${excelFilePath}`);
    console.log(`✓ Total employees: ${employees.length}`);

    // Show billable statistics
    const billableCount = employees.filter((e: any) => e.billable === 1).length;
    const nonBillableCount = employees.filter((e: any) => e.billable === 0).length;
    console.log(`✓ Billable: ${billableCount}`);
    console.log(`✓ Non-billable: ${nonBillableCount}`);

  } catch (error: any) {
    console.error('Export failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the export
exportEmployees()
  .then(() => {
    console.log('\nExport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nExport failed:', error);
    process.exit(1);
  });
