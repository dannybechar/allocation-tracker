/**
 * Inspect Excel File Script
 *
 * Shows the first 5 rows of the employees.xlsx file to see its structure
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

const excelFilePath = path.join(process.cwd(), 'data', 'employees.xlsx');
const workbook = XLSX.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON to see the data
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('First 5 rows of employees.xlsx:\n');
data.slice(0, 5).forEach((row: any, index: number) => {
  console.log(`Row ${index + 1}:`, row);
});

console.log('\n--- Parsed as objects (auto-detect headers) ---\n');
const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet);
console.log('First 3 employees:', JSON.stringify(dataWithHeaders.slice(0, 3), null, 2));
