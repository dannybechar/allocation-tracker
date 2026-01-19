/**
 * Import All Script
 *
 * Imports all data from Excel files to the database
 * Can be run standalone or called from the application
 */

import { importAll } from '../server/src/utils/importUtils';

// Run as standalone script
importAll()
  .then(() => {
    console.log('Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
