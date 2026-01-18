/**
 * Export Allocations Script
 *
 * Exports allocation data from the database to allocations.xlsx
 * Excel format: ID, EmployeeName, TargetType, TargetName, AllocationPercent, StartDate, EndDate
 */

import * as XLSX from 'xlsx';
import { createDatabase } from '../server/src/db/database';
import * as path from 'path';
import * as fs from 'fs';

async function exportAllocations() {
  console.log('Exporting allocations from database to Excel...');

  // Connect to database
  const db = createDatabase('./allocation_tracker.db');

  try {
    // Get all allocations with employee, client, and project info
    const allocations = db.prepare(`
      SELECT
        a.id,
        e.name as employee_name,
        a.target_type,
        a.target_id,
        a.allocation_percent,
        a.start_date,
        a.end_date
      FROM allocations a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY e.name, a.id
    `).all();

    if (allocations.length === 0) {
      console.log('No allocations found in the database.');
      return;
    }

    console.log(`Found ${allocations.length} allocations to export.`);

    // Get clients and projects for name lookup
    const clients = db.prepare('SELECT id, name FROM clients').all();
    const projects = db.prepare('SELECT id, name FROM projects').all();

    const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

    // Map to Excel format
    const excelData = allocations.map((allocation: any) => {
      let targetName = '';
      if (allocation.target_type === 'CLIENT') {
        targetName = clientMap.get(allocation.target_id) || `Unknown Client (ID ${allocation.target_id})`;
      } else {
        targetName = projectMap.get(allocation.target_id) || `Unknown Project (ID ${allocation.target_id})`;
      }

      return {
        ID: allocation.id,
        EmployeeName: allocation.employee_name,
        TargetType: allocation.target_type,
        TargetName: targetName,
        AllocationPercent: allocation.allocation_percent,
        StartDate: allocation.start_date || '',
        EndDate: allocation.end_date || '',
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 30 },  // EmployeeName
      { wch: 12 },  // TargetType
      { wch: 40 },  // TargetName
      { wch: 18 },  // AllocationPercent
      { wch: 15 },  // StartDate
      { wch: 15 },  // EndDate
    ];

    // Write to file
    const excelFilePath = path.join(process.cwd(), 'data', 'allocations.xlsx');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    XLSX.writeFile(workbook, excelFilePath);
    console.log(`\n✓ Exported to: ${excelFilePath}`);
    console.log(`✓ Total allocations: ${allocations.length}`);

  } catch (error: any) {
    console.error('Export failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the export
exportAllocations()
  .then(() => {
    console.log('\nExport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nExport failed:', error);
    process.exit(1);
  });
