import type { Database } from 'better-sqlite3';
import { IClientRepository } from './IRepository';
import { Client } from '../domain/models';

export class ClientRepository implements IClientRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Client[]> {
    const rows = this.db.prepare('SELECT * FROM clients').all();
    return rows.map(this.mapRowToClient);
  }

  async findById(id: number): Promise<Client | null> {
    const row = this.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return row ? this.mapRowToClient(row) : null;
  }

  async create(client: Omit<Client, 'id'>): Promise<Client> {
    const result = this.db.prepare('INSERT INTO clients (name) VALUES (?)').run(client.name);

    return {
      id: result.lastInsertRowid as number,
      ...client,
    };
  }

  async update(id: number, client: Partial<Client>): Promise<Client> {
    if (client.name !== undefined) {
      this.db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(client.name, id);
    } else {
      throw new Error('No fields to update');
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Client with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  }

  private mapRowToClient(row: any): Client {
    return {
      id: row.id,
      name: row.name,
    };
  }
}
