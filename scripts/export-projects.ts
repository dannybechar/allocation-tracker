/**
 * Export Projects Script
 *
 * Exports project data from the database to projects.xlsx
 * Excel format: ID, Name, ClientID
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import * as path from 'path';
import * as fs from 'fs';

async function exportProjects() {
  console.log('Exporting projects from database to Excel...');

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  try {
    // Get all projects
    const projects = db.prepare('SELECT id, name, client_id FROM projects ORDER BY id').all();

    if (projects.length === 0) {
      console.log('No projects found in the database.');
      return;
    }

    console.log(`Found ${projects.length} projects to export.`);

    // Map to Excel format
    const excelData = projects.map((project: any) => ({
      ID: project.id,
      Name: project.name,
      ClientID: project.client_id || '',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 40 },  // Name
      { wch: 10 },  // ClientID
    ];

    // Write to file
    const excelFilePath = path.join(process.cwd(), 'data', 'projects.xlsx');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    XLSX.writeFile(workbook, excelFilePath);
    console.log(`\n✓ Exported to: ${excelFilePath}`);
    console.log(`✓ Total projects: ${projects.length}`);

  } catch (error: any) {
    console.error('Export failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the export
exportProjects()
  .then(() => {
    console.log('\nExport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nExport failed:', error);
    process.exit(1);
  });
