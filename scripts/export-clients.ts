/**
 * Export Clients Script
 *
 * Exports client data from the database to clients.xlsx
 * Excel format: ID, Name
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import * as path from 'path';
import * as fs from 'fs';

async function exportClients() {
  console.log('Exporting clients from database to Excel...');

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  try {
    // Get all clients
    const clients = db.prepare('SELECT id, name FROM clients ORDER BY id').all();

    if (clients.length === 0) {
      console.log('No clients found in the database.');
      return;
    }

    console.log(`Found ${clients.length} clients to export.`);

    // Map to Excel format
    const excelData = clients.map((client: any) => ({
      ID: client.id,
      Name: client.name,
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 40 },  // Name
    ];

    // Write to file
    const excelFilePath = path.join(process.cwd(), 'data', 'clients.xlsx');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    XLSX.writeFile(workbook, excelFilePath);
    console.log(`\n✓ Exported to: ${excelFilePath}`);
    console.log(`✓ Total clients: ${clients.length}`);

  } catch (error: any) {
    console.error('Export failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the export
exportClients()
  .then(() => {
    console.log('\nExport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nExport failed:', error);
    process.exit(1);
  });
