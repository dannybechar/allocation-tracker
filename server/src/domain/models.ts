/**
 * Domain Models - Pure data structures with validation
 *
 * These types represent the core business entities and concepts.
 * They have no dependencies on infrastructure (database, HTTP, etc.).
 */

// Core domain entities
export interface Employee {
  id: number;
  name: string;
  fte_percent: number; // 0-100
  vacation_days: number; // Can be decimal (e.g., 2.5)
}

export interface Client {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  client_id: number | null;
  name: string;
}

export type TargetType = 'CLIENT' | 'PROJECT';

export interface Allocation {
  id: number;
  employee_id: number;
  target_type: TargetType;
  target_id: number;
  start_date: Date | null; // null means started indefinitely in the past
  end_date: Date | null; // null means ongoing into future
  allocation_percent: number; // 0-100
}

// Exception types
export type ExceptionType = 'UNDER' | 'OVER';

export interface AllocationException {
  employee_name: string;
  exception_type: ExceptionType;
  exception_start_date: Date;
  exception_end_date: Date;
  free_or_excess_percent: number;
  source_projects_or_clients: string[]; // Human-readable names
}

// Input for analyzer
export interface AllocationAnalysisInput {
  employees: Employee[];
  allocations: Allocation[];
  clients: Client[];
  projects: Project[];
  fromDate: Date;
  toDate: Date;
}

// Value object for type safety and validation
export class DateRange {
  constructor(public readonly from: Date, public readonly to: Date) {
    if (from > to) {
      throw new Error('Invalid date range: from must be before or equal to to');
    }
  }

  contains(date: Date): boolean {
    return date >= this.from && date <= this.to;
  }

  overlaps(other: DateRange): boolean {
    return this.from <= other.to && this.to >= other.from;
  }
}

// Domain errors
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidAllocationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAllocationError';
  }
}
