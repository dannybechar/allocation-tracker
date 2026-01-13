import type { Database } from 'better-sqlite3';
import { IAllocationRepository } from './IRepository';
import { Allocation, TargetType } from '../domain/models';
import { DateUtils } from '../domain/DateUtils';

export class AllocationRepository implements IAllocationRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Allocation[]> {
    const rows = this.db.prepare('SELECT * FROM allocations').all();
    return rows.map(this.mapRowToAllocation);
  }

  async findById(id: number): Promise<Allocation | null> {
    const row = this.db.prepare('SELECT * FROM allocations WHERE id = ?').get(id);
    return row ? this.mapRowToAllocation(row) : null;
  }

  async findByEmployeeId(employeeId: number): Promise<Allocation[]> {
    const rows = this.db
      .prepare('SELECT * FROM allocations WHERE employee_id = ?')
      .all(employeeId);
    return rows.map(this.mapRowToAllocation);
  }

  async findByDateRange(fromDate: Date, toDate: Date): Promise<Allocation[]> {
    // Query: allocations that overlap with [fromDate, toDate]
    // Overlap logic: start_date <= toDate AND (end_date IS NULL OR end_date >= fromDate)

    const rows = this.db
      .prepare(
        `
      SELECT * FROM allocations
      WHERE start_date <= ?
        AND (end_date IS NULL OR end_date >= ?)
    `
      )
      .all(DateUtils.formatDate(toDate), DateUtils.formatDate(fromDate));

    return rows.map(this.mapRowToAllocation);
  }

  async create(allocation: Omit<Allocation, 'id'>): Promise<Allocation> {
    const result = this.db
      .prepare(
        `
      INSERT INTO allocations
        (employee_id, target_type, target_id, start_date, end_date, allocation_percent)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        allocation.employee_id,
        allocation.target_type,
        allocation.target_id,
        allocation.start_date ? DateUtils.formatDate(allocation.start_date) : null,
        allocation.end_date ? DateUtils.formatDate(allocation.end_date) : null,
        allocation.allocation_percent
      );

    return {
      id: result.lastInsertRowid as number,
      ...allocation,
    };
  }

  async update(id: number, allocation: Partial<Allocation>): Promise<Allocation> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (allocation.employee_id !== undefined) {
      fields.push('employee_id = ?');
      values.push(allocation.employee_id);
    }

    if (allocation.target_type !== undefined) {
      fields.push('target_type = ?');
      values.push(allocation.target_type);
    }

    if (allocation.target_id !== undefined) {
      fields.push('target_id = ?');
      values.push(allocation.target_id);
    }

    if (allocation.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(allocation.start_date ? DateUtils.formatDate(allocation.start_date) : null);
    }

    if (allocation.end_date !== undefined) {
      fields.push('end_date = ?');
      values.push(allocation.end_date ? DateUtils.formatDate(allocation.end_date) : null);
    }

    if (allocation.allocation_percent !== undefined) {
      fields.push('allocation_percent = ?');
      values.push(allocation.allocation_percent);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const sql = `UPDATE allocations SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Allocation with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM allocations WHERE id = ?').run(id);
  }

  private mapRowToAllocation(row: any): Allocation {
    return {
      id: row.id,
      employee_id: row.employee_id,
      target_type: row.target_type as TargetType,
      target_id: row.target_id,
      start_date: DateUtils.parseDate(row.start_date),
      end_date: row.end_date ? DateUtils.parseDate(row.end_date) : null,
      allocation_percent: row.allocation_percent,
    };
  }
}
