/**
 * Import Projects Script
 *
 * Reads project data from projects.xlsx and imports into the database.
 * Excel format: ID, Name, Client ID (optional)
 * Updates existing projects if ID matches.
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import { ProjectRepository } from '../server/src/repositories/ProjectRepository';
import * as path from 'path';
import * as fs from 'fs';

interface ProjectRow {
  id: number;
  name: string;
  clientId: number | null;
}

async function importProjects() {
  const excelFilePath = path.join(process.cwd(), 'data', 'projects.xlsx');

  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: projects.xlsx not found at ${excelFilePath}`);
    console.error('Please create a projects.xlsx file in the data/ directory.');
    process.exit(1);
  }

  console.log(`Reading projects from: ${excelFilePath}`);

  // Read Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: ['id', 'name', 'clientId'] });

  // Skip header row (first row)
  const projects: ProjectRow[] = data.slice(1).map((row: any) => ({
    id: Number(row.id),
    name: String(row.name || '').trim(),
    clientId: row.clientId && !isNaN(Number(row.clientId)) ? Number(row.clientId) : null,
  }));

  if (projects.length === 0) {
    console.log('No projects found in the Excel file.');
    return;
  }

  console.log(`Found ${projects.length} projects to import.`);

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');
  const projectRepo = new ProjectRepository(db);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  for (const project of projects) {
    try {
      // Validate data
      if (!project.id || isNaN(project.id)) {
        console.warn(`Skipping row with invalid ID: ${project.id}`);
        errors++;
        continue;
      }

      if (!project.name) {
        console.warn(`Skipping project ID ${project.id}: missing name`);
        errors++;
        continue;
      }

      // Check if project exists
      const existing = await projectRepo.findById(project.id);

      if (existing) {
        // Update existing project
        await db
          .prepare('UPDATE projects SET name = ?, client_id = ? WHERE id = ?')
          .run(project.name, project.clientId, project.id);
        console.log(`✓ Updated: ID ${project.id} - ${project.name}${project.clientId ? ` (Client ID: ${project.clientId})` : ''}`);
        updated++;
      } else {
        // Insert new project
        await db
          .prepare('INSERT INTO projects (id, name, client_id) VALUES (?, ?, ?)')
          .run(project.id, project.name, project.clientId);
        console.log(`✓ Inserted: ID ${project.id} - ${project.name}${project.clientId ? ` (Client ID: ${project.clientId})` : ''}`);
        inserted++;
      }
    } catch (error: any) {
      console.error(`Error processing project ID ${project.id}:`, error.message);
      errors++;
    }
  }

  db.close();

  console.log('\n=== Import Summary ===');
  console.log(`Total processed: ${projects.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log('======================\n');

  if (errors > 0) {
    process.exit(1);
  }
}

// Run the import
importProjects()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
