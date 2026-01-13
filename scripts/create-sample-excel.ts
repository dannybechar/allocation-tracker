/**
 * Creates a sample employees.xlsx file for testing the import functionality
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const sampleData = [
  ['ID', 'First Name', 'Last Name'], // Header row
  [101, 'John', 'Doe'],
  [102, 'Jane', 'Smith'],
  [103, 'Michael', 'Johnson'],
  [104, 'Emily', 'Williams'],
  [105, 'David', 'Brown'],
];

const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const filePath = path.join(dataDir, 'employees.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`✓ Created sample employees.xlsx file at ${filePath}`);
console.log('Sample data:');
sampleData.slice(1).forEach((row) => {
  console.log(`  ID ${row[0]}: ${row[1]} ${row[2]}`);
});
