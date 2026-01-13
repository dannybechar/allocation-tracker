import type { Database } from 'better-sqlite3';
import { IEmployeeRepository } from './IRepository';
import { Employee } from '../domain/models';

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Employee[]> {
    const rows = this.db.prepare('SELECT * FROM employees').all();
    return rows.map(this.mapRowToEmployee);
  }

  async findById(id: number): Promise<Employee | null> {
    const row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    return row ? this.mapRowToEmployee(row) : null;
  }

  async create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const result = this.db
      .prepare('INSERT INTO employees (name, fte_percent, vacation_days) VALUES (?, ?, ?)')
      .run(employee.name, employee.fte_percent, employee.vacation_days);

    return {
      id: result.lastInsertRowid as number,
      ...employee,
    };
  }

  async update(id: number, employee: Partial<Employee>): Promise<Employee> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (employee.name !== undefined) {
      fields.push('name = ?');
      values.push(employee.name);
    }

    if (employee.fte_percent !== undefined) {
      fields.push('fte_percent = ?');
      values.push(employee.fte_percent);
    }

    if (employee.vacation_days !== undefined) {
      fields.push('vacation_days = ?');
      values.push(employee.vacation_days);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const sql = `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Employee with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  }

  private mapRowToEmployee(row: any): Employee {
    return {
      id: row.id,
      name: row.name,
      fte_percent: row.fte_percent,
      vacation_days: row.vacation_days || 0,
    };
  }
}
