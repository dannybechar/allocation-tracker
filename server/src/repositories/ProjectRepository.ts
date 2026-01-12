import type { Database } from 'better-sqlite3';
import { IProjectRepository } from './IRepository';
import { Project } from '../domain/models';

export class ProjectRepository implements IProjectRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Project[]> {
    const rows = this.db.prepare('SELECT * FROM projects').all();
    return rows.map(this.mapRowToProject);
  }

  async findById(id: number): Promise<Project | null> {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return row ? this.mapRowToProject(row) : null;
  }

  async findByClientId(clientId: number): Promise<Project[]> {
    const rows = this.db.prepare('SELECT * FROM projects WHERE client_id = ?').all(clientId);
    return rows.map(this.mapRowToProject);
  }

  async create(project: Omit<Project, 'id'>): Promise<Project> {
    const result = this.db
      .prepare('INSERT INTO projects (name, client_id) VALUES (?, ?)')
      .run(project.name, project.client_id);

    return {
      id: result.lastInsertRowid as number,
      ...project,
    };
  }

  async update(id: number, project: Partial<Project>): Promise<Project> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (project.name !== undefined) {
      fields.push('name = ?');
      values.push(project.name);
    }

    if (project.client_id !== undefined) {
      fields.push('client_id = ?');
      values.push(project.client_id);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Project with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      client_id: row.client_id,
    };
  }
}
