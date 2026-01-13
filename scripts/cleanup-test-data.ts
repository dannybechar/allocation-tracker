/**
 * Cleanup Test Data Script
 *
 * Removes all test data that was created during application development:
 * - Test allocations (IDs 1-4)
 * - Test employees (IDs 1-3: Erez Shabtai, Bob Smith, Carol Davis)
 * - Test projects (IDs 1-3: Website Redesign, Mobile App, Cloud Migration)
 * - Test clients (IDs 1-2: Testing, XTR)
 */

import { createDatabase } from '../server/src/db/database';

async function cleanupTestData() {
  console.log('Starting test data cleanup...\n');

  const db = createDatabase('./allocation_tracker.db');

  try {
    // Step 1: Delete test allocations (must delete first due to foreign keys)
    console.log('Step 1: Deleting test allocations...');
    const allocationsDeleted = db.prepare('DELETE FROM allocations WHERE id IN (1, 2, 3, 4)').run();
    console.log(`✓ Deleted ${allocationsDeleted.changes} test allocations\n`);

    // Step 2: Delete test projects
    console.log('Step 2: Deleting test projects...');
    const projectsDeleted = db.prepare('DELETE FROM projects WHERE id IN (1, 2, 3)').run();
    console.log(`✓ Deleted ${projectsDeleted.changes} test projects\n`);

    // Step 3: Delete test clients
    console.log('Step 3: Deleting test clients...');
    const clientsDeleted = db.prepare('DELETE FROM clients WHERE id IN (1, 2)').run();
    console.log(`✓ Deleted ${clientsDeleted.changes} test clients\n`);

    // Step 4: Delete test employees
    console.log('Step 4: Deleting test employees...');
    const employeesDeleted = db.prepare('DELETE FROM employees WHERE id IN (1, 2, 3)').run();
    console.log(`✓ Deleted ${employeesDeleted.changes} test employees\n`);

    console.log('=== Cleanup Summary ===');
    console.log(`Allocations deleted: ${allocationsDeleted.changes}`);
    console.log(`Projects deleted: ${projectsDeleted.changes}`);
    console.log(`Clients deleted: ${clientsDeleted.changes}`);
    console.log(`Employees deleted: ${employeesDeleted.changes}`);
    console.log('=======================\n');
    console.log('✓ Test data cleanup completed successfully!');
  } catch (error: any) {
    console.error('Error during cleanup:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the cleanup
cleanupTestData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
