/**
 * Cleanup Sample Employees Script
 *
 * Removes sample employees created for testing (IDs 101, 102, 104, 105)
 * Keeps ID 103 which is real data from the Excel import
 */

import { createDatabase } from '../server/src/db/database';

async function cleanupSampleEmployees() {
  console.log('Removing sample test employees (101, 102, 104, 105)...\n');

  const db = createDatabase('./allocation_tracker.db');

  try {
    const deleted = db.prepare('DELETE FROM employees WHERE id IN (101, 102, 104, 105)').run();
    console.log(`✓ Deleted ${deleted.changes} sample employees`);
    console.log('✓ Kept employee ID 103 (real data from Excel)');
  } catch (error: any) {
    console.error('Error during cleanup:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the cleanup
cleanupSampleEmployees()
  .then(() => {
    console.log('\n✓ Sample employee cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
