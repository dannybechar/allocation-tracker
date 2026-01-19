/**
 * Import Vacation Days Script
 *
 * ONE-TIME IMPORT: Imports vacation days from יתרות חופשה.xlsx and updates employees
 * This script is for initial data migration only.
 * Going forward, vacation days should be maintained through the web application.
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import * as path from 'path';

async function importVacationDays() {
  console.log('Importing vacation days from יתרות חופשה.xlsx...');

  // Read Excel file
  const excelFilePath = path.join(process.cwd(), 'data', 'יתרות חופשה.xlsx');
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`Reading sheet: ${sheetName}`);

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Found ${data.length} rows in Excel file`);
  console.log('Sample row:', data[0]);

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  try {
    for (const row of data as any[]) {
      // Structure: __EMPTY = First Name, __EMPTY_1 = Last Name, 'יתרה 31.12.2025' = Vacation Balance
      const firstName = row['__EMPTY'];
      const lastName = row['__EMPTY_1'];
      const vacationBalance = row['יתרה 31.12.2025'];

      if (!firstName || !lastName) {
        continue; // Skip empty rows
      }

      // Construct employee name in "Last First" format to match database
      const employeeName = `${lastName} ${firstName}`;

      // Skip if vacation balance is missing
      if (vacationBalance === undefined || vacationBalance === null) {
        console.log(`⚠ No vacation data for ${employeeName}`);
        continue;
      }

      // Try exact match first, then case-insensitive
      let result = db.prepare(
        'UPDATE employees SET vacation_days = ? WHERE name = ?'
      ).run(vacationBalance, employeeName);

      if (result.changes === 0) {
        // Try case-insensitive match
        result = db.prepare(
          'UPDATE employees SET vacation_days = ? WHERE LOWER(name) = LOWER(?)'
        ).run(vacationBalance, employeeName);
      }

      if (result.changes > 0) {
        updated++;
        if (updated <= 10 || vacationBalance > 8) {
          console.log(`✓ Updated ${employeeName}: ${vacationBalance} days`);
        }
      } else {
        notFound++;
        console.log(`✗ Employee not found: ${employeeName}`);
      }
    }

    console.log(`\n✓ Import completed!`);
    console.log(`✓ Updated: ${updated} employees`);
    console.log(`✗ Not found: ${notFound} employees`);

    if (errors.length > 0) {
      console.log(`\nErrors:`);
      errors.forEach((err) => console.log(`  - ${err}`));
    }
  } catch (error: any) {
    console.error('Import failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the import
importVacationDays()
  .then(() => {
    console.log('\nImport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nImport failed:', error);
    process.exit(1);
  });
