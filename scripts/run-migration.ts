import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(__dirname, '..', 'allocations.db');
const migrationPath = join(__dirname, '..', 'server', 'src', 'db', 'migrations', '002_make_start_date_nullable.sql');

console.log('Running migration: 002_make_start_date_nullable.sql');
console.log('Database:', dbPath);

const db = new Database(dbPath);

try {
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  db.exec(migrationSQL);
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
