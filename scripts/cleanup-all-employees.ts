/**
 * Cleanup All Employees Script
 *
 * Removes all employees from the database
 */

import { createDatabase } from '../server/src/db/database';

async function cleanupAllEmployees() {
  console.log('Removing all employees from the database...\n');

  const db = createDatabase('./allocation_tracker.db');

  try {
    const deleted = db.prepare('DELETE FROM employees').run();
    console.log(`✓ Deleted ${deleted.changes} employees`);
  } catch (error: any) {
    console.error('Error during cleanup:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the cleanup
cleanupAllEmployees()
  .then(() => {
    console.log('\n✓ All employees removed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
