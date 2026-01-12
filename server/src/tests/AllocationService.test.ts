import { AllocationService } from '../services/AllocationService';
import { createTestDatabase } from '../db/database';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ClientRepository } from '../repositories/ClientRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { AllocationAnalyzer } from '../domain/AllocationAnalyzer';
import { DateUtils } from '../domain/DateUtils';
import type { Database } from 'better-sqlite3';

describe('AllocationService Integration Tests', () => {
  let service: AllocationService;
  let db: Database;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = createTestDatabase();

    const employeeRepo = new EmployeeRepository(db);
    const allocationRepo = new AllocationRepository(db);
    const clientRepo = new ClientRepository(db);
    const projectRepo = new ProjectRepository(db);
    const analyzer = new AllocationAnalyzer();

    service = new AllocationService(
      employeeRepo,
      allocationRepo,
      clientRepo,
      projectRepo,
      analyzer
    );
  });

  afterEach(() => {
    db.close();
  });

  it('should return exceptions for seeded database', async () => {
    // Seed database
    const employee = await service.createEmployee('John Doe', 100);
    const client = await service.createClient('Acme Corp');
    const project = await service.createProject('Website Redesign', client.id);

    await service.createAllocation(
      employee.id,
      'PROJECT',
      project.id,
      DateUtils.parseDate('2026-01-01'),
      DateUtils.parseDate('2026-01-15'),
      100
    );

    // Get exceptions
    const exceptions = await service.getExceptions(
      DateUtils.parseDate('2026-01-01'),
      DateUtils.parseDate('2026-01-31')
    );

    // Should have under-allocation from 2026-01-16 to 2026-01-31
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toMatchObject({
      employee_name: 'John Doe',
      exception_type: 'UNDER',
      free_or_excess_percent: 100,
    });
    expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-16');
    expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-31');
  });

  it('should handle multiple employees with complex allocations', async () => {
    // Create employees
    const alice = await service.createEmployee('Alice', 100);
    const bob = await service.createEmployee('Bob', 50);

    // Create projects
    const client = await service.createClient('TechCorp');
    const project1 = await service.createProject('Project Alpha', client.id);
    const project2 = await service.createProject('Project Beta', null);

    // Alice: 80% to Project Alpha (under-allocated)
    await service.createAllocation(
      alice.id,
      'PROJECT',
      project1.id,
      DateUtils.parseDate('2026-01-01'),
      null,
      80
    );

    // Bob: 60% to Project Beta (over-allocated, 50% FTE)
    await service.createAllocation(
      bob.id,
      'PROJECT',
      project2.id,
      DateUtils.parseDate('2026-01-01'),
      null,
      60
    );

    const exceptions = await service.getExceptions(
      DateUtils.parseDate('2026-01-01'),
      DateUtils.parseDate('2026-01-31')
    );

    expect(exceptions).toHaveLength(2);

    const aliceException = exceptions.find((e) => e.employee_name === 'Alice');
    const bobException = exceptions.find((e) => e.employee_name === 'Bob');

    expect(aliceException).toMatchObject({
      exception_type: 'UNDER',
      free_or_excess_percent: 20,
    });

    expect(bobException).toMatchObject({
      exception_type: 'OVER',
      free_or_excess_percent: 10,
    });
  });

  it('should validate employee creation', async () => {
    await expect(service.createEmployee('', 100)).rejects.toThrow('name is required');

    await expect(service.createEmployee('John', -10)).rejects.toThrow(
      'FTE percent must be between 0 and 100'
    );

    await expect(service.createEmployee('John', 150)).rejects.toThrow(
      'FTE percent must be between 0 and 100'
    );
  });

  it('should validate allocation creation', async () => {
    const employee = await service.createEmployee('John', 100);
    const client = await service.createClient('Acme');
    const project = await service.createProject('Project', client.id);

    // Invalid allocation percent
    await expect(
      service.createAllocation(
        employee.id,
        'PROJECT',
        project.id,
        DateUtils.parseDate('2026-01-01'),
        null,
        150
      )
    ).rejects.toThrow('Allocation percent must be between 0 and 100');

    // Invalid date range
    await expect(
      service.createAllocation(
        employee.id,
        'PROJECT',
        project.id,
        DateUtils.parseDate('2026-01-15'),
        DateUtils.parseDate('2026-01-10'), // End before start
        50
      )
    ).rejects.toThrow('Start date must be before or equal to end date');

    // Non-existent employee
    await expect(
      service.createAllocation(
        99999,
        'PROJECT',
        project.id,
        DateUtils.parseDate('2026-01-01'),
        null,
        50
      )
    ).rejects.toThrow('Employee with id 99999 not found');

    // Non-existent project
    await expect(
      service.createAllocation(
        employee.id,
        'PROJECT',
        99999,
        DateUtils.parseDate('2026-01-01'),
        null,
        50
      )
    ).rejects.toThrow('Project with id 99999 not found');
  });

  it('should validate client creation', async () => {
    await expect(service.createClient('')).rejects.toThrow('Client name is required');
  });

  it('should validate project creation', async () => {
    await expect(service.createProject('', null)).rejects.toThrow(
      'Project name is required'
    );

    // Non-existent client
    await expect(service.createProject('Project', 99999)).rejects.toThrow(
      'Client with id 99999 not found'
    );
  });

  it('should use default date range (today + 3 months)', async () => {
    await service.createEmployee('John', 100);

    // No allocations, so should have under-allocation

    const exceptions = await service.getExceptions(); // No params = default range

    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].employee_name).toBe('John');
    expect(exceptions[0].exception_type).toBe('UNDER');

    // Verify date range is approximately 3 months
    const start = exceptions[0].exception_start_date;
    const end = exceptions[0].exception_end_date;

    const today = DateUtils.today();
    expect(DateUtils.isSameDay(start, today)).toBe(true);

    // End should be approximately 3 months from today
    const threeMonthsLater = DateUtils.addMonths(today, 3);
    expect(DateUtils.isSameDay(end, threeMonthsLater)).toBe(true);
  });

  it('should handle allocations to clients', async () => {
    const employee = await service.createEmployee('Jane', 100);
    const client = await service.createClient('BigCorp');

    await service.createAllocation(
      employee.id,
      'CLIENT',
      client.id,
      DateUtils.parseDate('2026-01-01'),
      null,
      100
    );

    const exceptions = await service.getExceptions(
      DateUtils.parseDate('2026-01-01'),
      DateUtils.parseDate('2026-01-31')
    );

    // No exceptions - perfectly allocated
    expect(exceptions).toHaveLength(0);

    // Verify the allocation was created
    const allocations = await service.getAllAllocations();
    expect(allocations).toHaveLength(1);
    expect(allocations[0].target_type).toBe('CLIENT');
  });
});
