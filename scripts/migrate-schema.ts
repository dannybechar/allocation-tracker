import Database from 'better-sqlite3';
import { join } from 'path';
import { readFileSync } from 'fs';

const dbPath = join(__dirname, '..', 'allocation_tracker.db');
const migrationPath = join(__dirname, '..', 'server', 'src', 'db', 'migrations', '002_make_start_date_nullable.sql');

console.log('Running migration on:', dbPath);

const db = new Database(dbPath);

try {
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  db.exec(migrationSQL);
  console.log('Migration completed successfully!');

  // Verify the change
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='allocations'").get();
  console.log('\nNew schema:');
  console.log(schema);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
