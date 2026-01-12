import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export function createDatabase(dbPath: string = ':memory:'): Database.Database {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Initialize schema
  const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schemaSQL);

  return db;
}

export function createTestDatabase(): Database.Database {
  return createDatabase(':memory:');
}
