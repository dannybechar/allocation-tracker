/**
 * Export All Script
 *
 * Exports all data from the database to Excel files
 * Can be run standalone or called from the application
 */

import { exportAll } from '../server/src/utils/exportUtils';

// Run as standalone script
exportAll()
  .then(() => {
    console.log('Export completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  });
