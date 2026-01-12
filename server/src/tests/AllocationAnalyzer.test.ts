import { AllocationAnalyzer } from '../domain/AllocationAnalyzer';
import {
  Employee,
  Allocation,
  AllocationAnalysisInput,
  Project,
} from '../domain/models';
import { DateUtils } from '../domain/DateUtils';

describe('AllocationAnalyzer', () => {
  let analyzer: AllocationAnalyzer;

  beforeEach(() => {
    analyzer = new AllocationAnalyzer();
  });

  // Helper to create test data
  const createEmployee = (id: number, name: string, ftePercent: number): Employee => ({
    id,
    name,
    fte_percent: ftePercent,
  });

  const createProject = (id: number, name: string): Project => ({
    id,
    name,
    client_id: null,
  });

  const createAllocation = (
    id: number,
    employeeId: number,
    projectId: number,
    startDate: string,
    endDate: string | null,
    percent: number
  ): Allocation => ({
    id,
    employee_id: employeeId,
    target_type: 'PROJECT',
    target_id: projectId,
    start_date: DateUtils.parseDate(startDate),
    end_date: endDate ? DateUtils.parseDate(endDate) : null,
    allocation_percent: percent,
  });

  describe('Under-allocation detection', () => {
    it('should detect under-allocation when employee has no allocations', () => {
      const employee = createEmployee(1, 'John Doe', 100);

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations: [],
        clients: [],
        projects: [],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        employee_name: 'John Doe',
        exception_type: 'UNDER',
        free_or_excess_percent: 100,
      });
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-01');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-31');
    });

    it('should detect under-allocation when allocation ends', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project = createProject(1, 'Project A');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', '2026-01-15', 100),
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        employee_name: 'John Doe',
        exception_type: 'UNDER',
        free_or_excess_percent: 100,
      });
      // Under-allocation starts on end_date + 1 = 2026-01-16
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-16');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-31');
    });

    it('should detect partial under-allocation', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project = createProject(1, 'Project A');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', null, 60), // Only 60% allocated
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        employee_name: 'John Doe',
        exception_type: 'UNDER',
        free_or_excess_percent: 40, // 100 - 60 = 40% under
      });
    });
  });

  describe('Over-allocation detection', () => {
    it('should detect over-allocation when total exceeds FTE', () => {
      const employee = createEmployee(1, 'Jane Smith', 100);
      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', null, 80),
        createAllocation(2, 1, 2, '2026-01-01', null, 50),
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        employee_name: 'Jane Smith',
        exception_type: 'OVER',
        free_or_excess_percent: 30, // 80 + 50 - 100 = 30% over
      });
      expect(exceptions[0].source_projects_or_clients).toContain('Project A');
      expect(exceptions[0].source_projects_or_clients).toContain('Project B');
    });

    it('should detect over-allocation that starts mid-period', () => {
      const employee = createEmployee(1, 'Jane Smith', 100);
      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', null, 80),
        createAllocation(2, 1, 2, '2026-01-15', null, 50), // Starts mid-month
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(2);

      // First exception: under-allocation from 2026-01-01 to 2026-01-14
      expect(exceptions[0]).toMatchObject({
        employee_name: 'Jane Smith',
        exception_type: 'UNDER',
        free_or_excess_percent: 20,
      });
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-01');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-14');

      // Second exception: over-allocation from 2026-01-15 to 2026-01-31
      expect(exceptions[1]).toMatchObject({
        employee_name: 'Jane Smith',
        exception_type: 'OVER',
        free_or_excess_percent: 30,
      });
      expect(DateUtils.formatDate(exceptions[1].exception_start_date)).toBe('2026-01-15');
      expect(DateUtils.formatDate(exceptions[1].exception_end_date)).toBe('2026-01-31');
    });
  });

  describe('Inclusive end date handling', () => {
    it('should treat allocation as active on end_date', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project = createProject(1, 'Project A');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-10', '2026-01-15', 100), // Inclusive
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      // Should have under-allocation before start and after end
      expect(exceptions).toHaveLength(2);

      // Before allocation starts
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-01');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-09');

      // After allocation ends (starts on end_date + 1)
      expect(DateUtils.formatDate(exceptions[1].exception_start_date)).toBe('2026-01-16');
      expect(DateUtils.formatDate(exceptions[1].exception_end_date)).toBe('2026-01-31');
    });
  });

  describe('Gap between allocations', () => {
    it('should detect under-allocation in gaps', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', '2026-01-10', 100),
        createAllocation(2, 1, 2, '2026-01-20', '2026-01-31', 100), // Gap from 11th to 19th
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        employee_name: 'John Doe',
        exception_type: 'UNDER',
        free_or_excess_percent: 100,
      });
      // Gap is from 2026-01-11 to 2026-01-19
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-11');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-19');
    });
  });

  describe('Overlapping allocations', () => {
    it('should sum overlapping allocations correctly', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', '2026-01-31', 50),
        createAllocation(2, 1, 2, '2026-01-15', '2026-01-31', 30),
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(2);

      // First half: only 50% allocated
      expect(exceptions[0]).toMatchObject({
        exception_type: 'UNDER',
        free_or_excess_percent: 50,
      });
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-01');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-14');

      // Second half: 50% + 30% = 80% allocated
      expect(exceptions[1]).toMatchObject({
        exception_type: 'UNDER',
        free_or_excess_percent: 20,
      });
      expect(DateUtils.formatDate(exceptions[1].exception_start_date)).toBe('2026-01-15');
      expect(DateUtils.formatDate(exceptions[1].exception_end_date)).toBe('2026-01-31');
    });
  });

  describe('Merging contiguous intervals', () => {
    it('should merge contiguous intervals with same exception type and percent', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', '2026-01-10', 60),
        createAllocation(2, 1, 2, '2026-01-11', '2026-01-20', 60), // Same under-allocation percent
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      // Should have 2 exceptions:
      // 1. Merged under-allocation from 2026-01-01 to 2026-01-20 (40% free)
      // 2. Under-allocation from 2026-01-21 to 2026-01-31 (100% free)
      expect(exceptions).toHaveLength(2);

      expect(exceptions[0]).toMatchObject({
        exception_type: 'UNDER',
        free_or_excess_percent: 40,
      });
      expect(DateUtils.formatDate(exceptions[0].exception_start_date)).toBe('2026-01-01');
      expect(DateUtils.formatDate(exceptions[0].exception_end_date)).toBe('2026-01-20');
    });

    it('should NOT merge intervals with different exception percents', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', '2026-01-10', 60),
        createAllocation(2, 1, 2, '2026-01-11', '2026-01-20', 50), // Different allocation
      ];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      // Should have 3 separate exceptions due to different percents
      expect(exceptions.length).toBeGreaterThan(1);

      // Verify they have different percents
      const uniquePercents = new Set(exceptions.map((e) => e.free_or_excess_percent));
      expect(uniquePercents.size).toBeGreaterThan(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle employee with 0% FTE', () => {
      const employee = createEmployee(1, 'Contractor', 0);
      const project = createProject(1, 'Project A');

      const allocations = [createAllocation(1, 1, 1, '2026-01-01', null, 50)];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      // Should show over-allocation (50% over 0% FTE)
      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        exception_type: 'OVER',
        free_or_excess_percent: 50,
      });
    });

    it('should handle allocation with 0% allocation_percent', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project = createProject(1, 'Project A');

      const allocations = [createAllocation(1, 1, 1, '2026-01-01', null, 0)];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      // Should show 100% under-allocation
      expect(exceptions).toHaveLength(1);
      expect(exceptions[0]).toMatchObject({
        exception_type: 'UNDER',
        free_or_excess_percent: 100,
      });
    });

    it('should return empty array for perfectly allocated employee', () => {
      const employee = createEmployee(1, 'John Doe', 100);
      const project = createProject(1, 'Project A');

      const allocations = [createAllocation(1, 1, 1, '2026-01-01', null, 100)];

      const input: AllocationAnalysisInput = {
        employees: [employee],
        allocations,
        clients: [],
        projects: [project],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

      expect(exceptions).toHaveLength(0);
    });
  });

  describe('Multiple employees', () => {
    it('should analyze all employees independently', () => {
      const alice = createEmployee(1, 'Alice', 100);
      const bob = createEmployee(2, 'Bob', 50);

      const project1 = createProject(1, 'Project A');
      const project2 = createProject(2, 'Project B');

      const allocations = [
        createAllocation(1, 1, 1, '2026-01-01', null, 80), // Alice under-allocated
        createAllocation(2, 2, 2, '2026-01-01', null, 60), // Bob over-allocated
      ];

      const input: AllocationAnalysisInput = {
        employees: [alice, bob],
        allocations,
        clients: [],
        projects: [project1, project2],
        fromDate: DateUtils.parseDate('2026-01-01'),
        toDate: DateUtils.parseDate('2026-01-31'),
      };

      const exceptions = analyzer.analyze(input);

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
  });
});
