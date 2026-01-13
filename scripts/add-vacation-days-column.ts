/**
 * Migration Script: Add vacation_days column to employees table
 *
 * Adds a vacation_days REAL column (allows decimals) to track employee vacation days
 * Defaults to 0 for existing employees
 */

import { createDatabase } from '../server/src/db/database';

async function addVacationDaysColumn() {
  console.log('Adding vacation_days column to employees table...\n');

  const db = createDatabase('./allocation_tracker.db');

  try {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(employees)").all();
    const hasVacationDays = tableInfo.some((col: any) => col.name === 'vacation_days');

    if (hasVacationDays) {
      console.log('✓ vacation_days column already exists');
      return;
    }

    // Add the column
    db.prepare('ALTER TABLE employees ADD COLUMN vacation_days REAL DEFAULT 0').run();
    console.log('✓ Added vacation_days column (default: 0)');

    // Count employees
    const count = db.prepare('SELECT COUNT(*) as count FROM employees').get() as any;
    console.log(`✓ Updated ${count.count} existing employees with default vacation_days = 0`);
  } catch (error: any) {
    console.error('Error during migration:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the migration
addVacationDaysColumn()
  .then(() => {
    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
