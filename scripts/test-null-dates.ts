import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(__dirname, '..', 'allocations.db');
const db = new Database(dbPath);

try {
  console.log('Testing null date allocation...');

  const result = db.prepare(`
    INSERT INTO allocations (employee_id, target_type, target_id, start_date, end_date, allocation_percent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(10, 'CLIENT', 3, null, null, 60);

  console.log('Success! Allocation created with ID:', result.lastInsertRowid);

  // Check the allocation
  const allocation = db.prepare('SELECT * FROM allocations WHERE id = ?').get(result.lastInsertRowid);
  console.log('Allocation:', allocation);
} catch (error) {
  console.error('Error:', error);
} finally{
  db.close();
}
