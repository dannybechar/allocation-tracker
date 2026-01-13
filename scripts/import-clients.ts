/**
 * Import Clients Script
 *
 * Reads client data from clients.xlsx and imports into the database.
 * Excel format: ID, Name
 * Updates existing clients if ID matches.
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import { ClientRepository } from '../server/src/repositories/ClientRepository';
import * as path from 'path';
import * as fs from 'fs';

interface ClientRow {
  id: number;
  name: string;
}

async function importClients() {
  const excelFilePath = path.join(process.cwd(), 'data', 'clients.xlsx');

  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: clients.xlsx not found at ${excelFilePath}`);
    console.error('Please create a clients.xlsx file in the data/ directory.');
    process.exit(1);
  }

  console.log(`Reading clients from: ${excelFilePath}`);

  // Read Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: ['id', 'name'] });

  // Skip header row (first row)
  const clients: ClientRow[] = data.slice(1).map((row: any) => ({
    id: Number(row.id),
    name: String(row.name || '').trim(),
  }));

  if (clients.length === 0) {
    console.log('No clients found in the Excel file.');
    return;
  }

  console.log(`Found ${clients.length} clients to import.`);

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');
  const clientRepo = new ClientRepository(db);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      // Validate data
      if (!client.id || isNaN(client.id)) {
        console.warn(`Skipping row with invalid ID: ${client.id}`);
        errors++;
        continue;
      }

      if (!client.name) {
        console.warn(`Skipping client ID ${client.id}: missing name`);
        errors++;
        continue;
      }

      // Check if client exists
      const existing = await clientRepo.findById(client.id);

      if (existing) {
        // Update existing client
        await db
          .prepare('UPDATE clients SET name = ? WHERE id = ?')
          .run(client.name, client.id);
        console.log(`✓ Updated: ID ${client.id} - ${client.name}`);
        updated++;
      } else {
        // Insert new client
        await db
          .prepare('INSERT INTO clients (id, name) VALUES (?, ?)')
          .run(client.id, client.name);
        console.log(`✓ Inserted: ID ${client.id} - ${client.name}`);
        inserted++;
      }
    } catch (error: any) {
      console.error(`Error processing client ID ${client.id}:`, error.message);
      errors++;
    }
  }

  db.close();

  console.log('\n=== Import Summary ===');
  console.log(`Total processed: ${clients.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log('======================\n');

  if (errors > 0) {
    process.exit(1);
  }
}

// Run the import
importClients()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
