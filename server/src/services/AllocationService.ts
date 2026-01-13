/**
 * AllocationService - Application layer orchestrating repositories and domain logic
 *
 * Coordinates data access and business logic to implement use cases.
 */

import { AllocationAnalyzer } from '../domain/AllocationAnalyzer';
import {
  IEmployeeRepository,
  IAllocationRepository,
  IClientRepository,
  IProjectRepository,
} from '../repositories/IRepository';
import {
  AllocationException,
  AllocationAnalysisInput,
  Employee,
  Allocation,
  Client,
  Project,
  TargetType,
} from '../domain/models';
import { DateUtils } from '../domain/DateUtils';

export class AllocationService {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private allocationRepo: IAllocationRepository,
    private clientRepo: IClientRepository,
    private projectRepo: IProjectRepository,
    private analyzer: AllocationAnalyzer
  ) {}

  /**
   * Main use case: Get allocation exceptions for a date range
   */
  async getExceptions(
    fromDate?: Date,
    toDate?: Date
  ): Promise<AllocationException[]> {
    // Default to today + 3 months if not provided
    const from = fromDate || DateUtils.today();
    const to = toDate || DateUtils.addMonths(from, 3);

    // Fetch all necessary data
    const [employees, allocations, clients, projects] = await Promise.all([
      this.employeeRepo.findAll(),
      this.allocationRepo.findByDateRange(from, to),
      this.clientRepo.findAll(),
      this.projectRepo.findAll(),
    ]);

    // Delegate to domain layer
    const input: AllocationAnalysisInput = {
      employees,
      allocations,
      clients,
      projects,
      fromDate: from,
      toDate: to,
    };

    return this.analyzer.analyze(input);
  }

  /**
   * Create a new employee
   */
  async createEmployee(name: string, ftePercent: number): Promise<Employee> {
    // Validation
    if (!name || name.trim().length === 0) {
      throw new Error('Employee name is required');
    }
    if (ftePercent < 0 || ftePercent > 100) {
      throw new Error('FTE percent must be between 0 and 100');
    }

    return this.employeeRepo.create({ name, fte_percent: ftePercent, vacation_days: 0 });
  }

  /**
   * Get all employees
   */
  async getAllEmployees(): Promise<Employee[]> {
    return this.employeeRepo.findAll();
  }

  /**
   * Create a new allocation
   */
  async createAllocation(
    employeeId: number,
    targetType: TargetType,
    targetId: number,
    startDate: Date | null,
    endDate: Date | null,
    allocationPercent: number
  ): Promise<Allocation> {
    // Validation
    if (allocationPercent < 0 || allocationPercent > 100) {
      throw new Error('Allocation percent must be between 0 and 100');
    }

    if (startDate && endDate && startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    // Verify employee exists
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee with id ${employeeId} not found`);
    }

    // Verify target exists (client or project)
    if (targetType === 'CLIENT') {
      const client = await this.clientRepo.findById(targetId);
      if (!client) {
        throw new Error(`Client with id ${targetId} not found`);
      }
    } else {
      const project = await this.projectRepo.findById(targetId);
      if (!project) {
        throw new Error(`Project with id ${targetId} not found`);
      }
    }

    return this.allocationRepo.create({
      employee_id: employeeId,
      target_type: targetType,
      target_id: targetId,
      start_date: startDate,
      end_date: endDate,
      allocation_percent: allocationPercent,
    });
  }

  /**
   * Get all allocations
   */
  async getAllAllocations(): Promise<Allocation[]> {
    return this.allocationRepo.findAll();
  }

  /**
   * Create a new client
   */
  async createClient(name: string): Promise<Client> {
    if (!name || name.trim().length === 0) {
      throw new Error('Client name is required');
    }
    return this.clientRepo.create({ name });
  }

  /**
   * Get all clients
   */
  async getAllClients(): Promise<Client[]> {
    return this.clientRepo.findAll();
  }

  /**
   * Create a new project
   */
  async createProject(name: string, clientId: number | null): Promise<Project> {
    if (!name || name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    // Verify client exists if provided
    if (clientId !== null) {
      const client = await this.clientRepo.findById(clientId);
      if (!client) {
        throw new Error(`Client with id ${clientId} not found`);
      }
    }

    return this.projectRepo.create({ name, client_id: clientId });
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    return this.projectRepo.findAll();
  }

  /**
   * Update an existing allocation
   */
  async updateAllocation(
    id: number,
    employeeId?: number,
    targetType?: 'CLIENT' | 'PROJECT',
    targetId?: number,
    startDate?: Date | null,
    endDate?: Date | null,
    allocationPercent?: number
  ): Promise<Allocation> {
    // Verify allocation exists
    const existing = await this.allocationRepo.findById(id);
    if (!existing) {
      throw new Error(`Allocation with id ${id} not found`);
    }

    // Verify employee exists if being updated
    if (employeeId !== undefined) {
      const employee = await this.employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error(`Employee with id ${employeeId} not found`);
      }
    }

    // Verify target exists if being updated
    if (targetType !== undefined && targetId !== undefined) {
      if (targetType === 'CLIENT') {
        const client = await this.clientRepo.findById(targetId);
        if (!client) {
          throw new Error(`Client with id ${targetId} not found`);
        }
      } else if (targetType === 'PROJECT') {
        const project = await this.projectRepo.findById(targetId);
        if (!project) {
          throw new Error(`Project with id ${targetId} not found`);
        }
      }
    }

    // Validation
    if (allocationPercent !== undefined && (allocationPercent < 0 || allocationPercent > 100)) {
      throw new Error('Allocation percent must be between 0 and 100');
    }

    if (startDate && endDate && startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    // Build update object
    const updates: Partial<Allocation> = {};
    if (employeeId !== undefined) updates.employee_id = employeeId;
    if (targetType !== undefined) updates.target_type = targetType;
    if (targetId !== undefined) updates.target_id = targetId;
    if (startDate !== undefined) updates.start_date = startDate;
    if (endDate !== undefined) updates.end_date = endDate;
    if (allocationPercent !== undefined) updates.allocation_percent = allocationPercent;

    return this.allocationRepo.update(id, updates);
  }

  /**
   * Delete an allocation
   */
  async deleteAllocation(id: number): Promise<void> {
    const existing = await this.allocationRepo.findById(id);
    if (!existing) {
      throw new Error(`Allocation with id ${id} not found`);
    }
    return this.allocationRepo.delete(id);
  }
}
