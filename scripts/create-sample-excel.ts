/**
 * Creates a sample employees.xlsx file for testing the import functionality
 */

import * as XLSX from 'xlsx';

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

XLSX.writeFile(workbook, 'employees.xlsx');

console.log('✓ Created sample employees.xlsx file');
console.log('Sample data:');
sampleData.slice(1).forEach((row) => {
  console.log(`  ID ${row[0]}: ${row[1]} ${row[2]}`);
});
