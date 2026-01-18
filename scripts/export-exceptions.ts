/**
 * Export Exceptions Script
 *
 * Exports allocation exceptions from the API to exceptions.xlsx
 * Excel format: EmployeeName, ExceptionType, StartDate, EndDate, FreeOrExcessPercent, SourceProjectsOrClients
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

async function exportExceptions() {
  console.log('Exporting exceptions from API to Excel...');

  try {
    // Calculate date range: today to today + 3 months
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const fromDate = today.toISOString().split('T')[0];
    const toDate = threeMonthsLater.toISOString().split('T')[0];

    console.log(`Fetching exceptions from ${fromDate} to ${toDate}...`);

    // Fetch exceptions from the API
    const response = await fetch(`http://localhost:3000/api/exceptions?from=${fromDate}&to=${toDate}`);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const exceptions = await response.json() as any[];

    if (exceptions.length === 0) {
      console.log('No exceptions found.');
      return;
    }

    console.log(`Found ${exceptions.length} exceptions to export.`);

    // Map to Excel format
    const excelData = exceptions.map((exception: any) => ({
      EmployeeName: exception.employee_name,
      ExceptionType: exception.exception_type,
      StartDate: exception.exception_start_date,
      EndDate: exception.exception_end_date,
      FreeOrExcessPercent: exception.free_or_excess_percent,
      SourceProjectsOrClients: exception.source_projects_or_clients.join(', ') || 'None',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exceptions');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 30 },  // EmployeeName
      { wch: 15 },  // ExceptionType
      { wch: 15 },  // StartDate
      { wch: 15 },  // EndDate
      { wch: 20 },  // FreeOrExcessPercent
      { wch: 50 },  // SourceProjectsOrClients
    ];

    // Write to file
    const excelFilePath = path.join(process.cwd(), 'data', 'exceptions.xlsx');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    XLSX.writeFile(workbook, excelFilePath);
    console.log(`\n✓ Exported to: ${excelFilePath}`);
    console.log(`✓ Total exceptions: ${exceptions.length}`);
    console.log(`✓ Date range: ${fromDate} to ${toDate}`);

    // Show exception type breakdown
    const underCount = exceptions.filter((e: any) => e.exception_type === 'UNDER').length;
    const overCount = exceptions.filter((e: any) => e.exception_type === 'OVER').length;
    console.log(`✓ Under-allocated: ${underCount}`);
    console.log(`✓ Over-allocated: ${overCount}`);

  } catch (error: any) {
    console.error('Export failed:', error.message);
    throw error;
  }
}

// Run the export
exportExceptions()
  .then(() => {
    console.log('\nExport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nExport failed:', error);
    process.exit(1);
  });
