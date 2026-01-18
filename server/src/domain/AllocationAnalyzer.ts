/**
 * AllocationAnalyzer - Core business logic for detecting allocation exceptions
 *
 * Implements change-point detection algorithm to efficiently identify
 * periods where employees are under-allocated or over-allocated.
 */

import {
  Employee,
  Allocation,
  AllocationException,
  AllocationAnalysisInput,
  DateRange,
  Client,
  Project,
} from './models';
import { DateUtils } from './DateUtils';

// Internal type for tracking exception intervals before merging
interface RawException {
  employee_name: string;
  exception_type: 'UNDER' | 'OVER';
  exception_start_date: Date;
  exception_end_date: Date;
  free_or_excess_percent: number;
  source_allocations: Allocation[];
}

export class AllocationAnalyzer {
  /**
   * Main entry point: analyzes all employees and returns only exceptions
   */
  public analyze(input: AllocationAnalysisInput): AllocationException[] {
    const exceptions: AllocationException[] = [];

    for (const employee of input.employees) {
      const employeeAllocations = input.allocations.filter(
        (a) => a.employee_id === employee.id
      );

      const employeeExceptions = this.analyzeEmployee(
        employee,
        employeeAllocations,
        new DateRange(input.fromDate, input.toDate),
        input.clients,
        input.projects
      );

      exceptions.push(...employeeExceptions);
    }

    // Sort exceptions: full-window exceptions first (currently free employees),
    // then by end date (employees who will become free soon)
    exceptions.sort((a, b) => {
      const aSpansFullWindow = this.spansApproximatelyFullWindow(a, input.fromDate, input.toDate);
      const bSpansFullWindow = this.spansApproximatelyFullWindow(b, input.fromDate, input.toDate);

      // Full-window exceptions (currently free) come first
      if (aSpansFullWindow && !bSpansFullWindow) return -1;
      if (!aSpansFullWindow && bSpansFullWindow) return 1;

      // Both full-window or both partial: sort by end date
      return a.exception_end_date.getTime() - b.exception_end_date.getTime();
    });

    return exceptions;
  }

  /**
   * Analyzes a single employee for exceptions
   */
  private analyzeEmployee(
    employee: Employee,
    allocations: Allocation[],
    window: DateRange,
    clients: Client[],
    projects: Project[]
  ): AllocationException[] {
    // Step 1: Collect all change points
    const changePoints = this.collectChangePoints(allocations, window);

    // Step 2: Analyze each interval between consecutive change points
    const rawExceptions: RawException[] = [];

    for (let i = 0; i < changePoints.length - 1; i++) {
      const intervalStart = changePoints[i];
      const intervalEnd = changePoints[i + 1];

      // Skip intervals outside the analysis window
      if (intervalStart >= window.to || intervalEnd <= window.from) {
        continue;
      }

      // Calculate total allocation for this interval
      const { total, activeAllocations } = this.calculateTotalAllocation(
        allocations,
        intervalStart,
        intervalEnd
      );

      // Compare with FTE and create exception if needed
      const fteDifference = total - employee.fte_percent;

      if (fteDifference < 0) {
        // UNDER-ALLOCATION
        rawExceptions.push({
          employee_name: employee.name,
          exception_type: 'UNDER',
          exception_start_date: intervalStart,
          exception_end_date: intervalEnd,
          free_or_excess_percent: Math.abs(fteDifference),
          source_allocations: [],
        });
      } else if (fteDifference > 0) {
        // OVER-ALLOCATION
        rawExceptions.push({
          employee_name: employee.name,
          exception_type: 'OVER',
          exception_start_date: intervalStart,
          exception_end_date: intervalEnd,
          free_or_excess_percent: fteDifference,
          source_allocations: activeAllocations,
        });
      }
      // If fteDifference === 0, no exception (perfectly allocated)
    }

    // Step 3: Transform UNDER exceptions to show preceding allocation period
    const transformedExceptions = this.transformUnderExceptions(
      rawExceptions,
      allocations,
      window,
      employee
    );

    // Step 4: Merge contiguous intervals
    const mergedExceptions = this.mergeContiguousExceptions(transformedExceptions);

    // Step 5: Resolve source names
    return mergedExceptions.map((ex) => ({
      ...ex,
      source_projects_or_clients: this.resolveSourceNames(
        ex.source_allocations,
        clients,
        projects
      ),
    }));
  }

  /**
   * Collects all change points (dates where allocation state may change)
   */
  private collectChangePoints(allocations: Allocation[], window: DateRange): Date[] {
    const changePointsSet = new Set<string>();

    // Add analysis window boundaries
    changePointsSet.add(DateUtils.formatDate(window.from));
    changePointsSet.add(DateUtils.formatDate(DateUtils.addDays(window.to, 1)));

    // Add allocation start dates (skip null start dates - they mean indefinite past)
    for (const allocation of allocations) {
      if (allocation.start_date && allocation.start_date <= window.to) {
        changePointsSet.add(DateUtils.formatDate(allocation.start_date));
      }
    }

    // Add allocation end dates + 1 (because end_date is inclusive)
    for (const allocation of allocations) {
      if (allocation.end_date && allocation.end_date >= window.from) {
        const dayAfterEnd = DateUtils.addDays(allocation.end_date, 1);
        changePointsSet.add(DateUtils.formatDate(dayAfterEnd));
      }
    }

    // Convert to sorted array
    return Array.from(changePointsSet)
      .map((dateStr) => DateUtils.parseDate(dateStr))
      .sort((a, b) => DateUtils.compare(a, b));
  }

  /**
   * Calculates total allocation percentage active during an interval
   */
  private calculateTotalAllocation(
    allocations: Allocation[],
    intervalStart: Date,
    intervalEnd: Date
  ): { total: number; activeAllocations: Allocation[] } {
    let total = 0;
    const activeAllocations: Allocation[] = [];

    for (const allocation of allocations) {
      // Check if allocation is active during this interval
      // Allocation is active if it overlaps with [intervalStart, intervalEnd)

      // Treat null start_date as "infinite past"
      const allocationStart = allocation.start_date || new Date(1900, 0, 1);
      // Treat null end_date as "infinite future"
      const allocationEnd = allocation.end_date || new Date(9999, 11, 31);

      // Interval logic: allocation overlaps if start < intervalEnd AND end >= intervalStart
      // Note: We use >= for end because end_date is inclusive (active through end of day)
      if (allocationStart < intervalEnd && allocationEnd >= intervalStart) {
        total += allocation.allocation_percent;
        activeAllocations.push(allocation);
      }
    }

    return { total, activeAllocations };
  }

  /**
   * Transforms UNDER exceptions to show the preceding allocation period
   * instead of the future under-allocated period, but only if the employee
   * was fully allocated during that period
   */
  private transformUnderExceptions(
    rawExceptions: RawException[],
    allocations: Allocation[],
    window: DateRange,
    employee: Employee
  ): RawException[] {
    return rawExceptions.map((exception) => {
      if (exception.exception_type === 'UNDER') {
        // Find allocations that end just before this under-allocation period starts
        const underStartDate = exception.exception_start_date;

        const precedingAllocations = allocations.filter((a) => {
          const endDate = a.end_date;
          if (!endDate) return false; // Skip ongoing allocations

          // Check if allocation ends the day before under-allocation starts
          const dayAfterEnd = DateUtils.addDays(endDate, 1);
          return DateUtils.isSameDay(dayAfterEnd, underStartDate);
        });

        if (precedingAllocations.length > 0) {
          // Calculate total allocation percentage
          const totalAllocationPercent = precedingAllocations.reduce(
            (sum, alloc) => sum + alloc.allocation_percent,
            0
          );

          // Only transform if employee was fully allocated (within 1% tolerance)
          if (Math.abs(totalAllocationPercent - employee.fte_percent) <= 1) {
            // Find the earliest start and latest end among preceding allocations
            let earliestStart: Date | null = null;
            let latestEnd: Date | null = null;

            for (const allocation of precedingAllocations) {
              const start = allocation.start_date || new Date(1900, 0, 1);
              const end = allocation.end_date!; // We know it's not null from filter above

              if (!earliestStart || DateUtils.compare(start, earliestStart) < 0) {
                earliestStart = start;
              }
              if (!latestEnd || DateUtils.compare(end, latestEnd) > 0) {
                latestEnd = end;
              }
            }

            if (earliestStart && latestEnd) {
              // Return intersection of allocation period with query window
              const start =
                DateUtils.compare(earliestStart, window.from) > 0
                  ? earliestStart
                  : window.from;
              const end =
                DateUtils.compare(latestEnd, window.to) < 0 ? latestEnd : window.to;

              // Convert end to exclusive format (add 1 day) since finalizeException will subtract 1
              const exclusiveEnd = DateUtils.addDays(end, 1);

              return {
                ...exception,
                exception_start_date: start,
                exception_end_date: exclusiveEnd,
                source_allocations: precedingAllocations,
              };
            }
          }
        } else {
          // No preceding allocation found - person is already under-allocated
          // Show from query start to query end (or keep original if it makes sense)
          // Keep the original under-allocation period
        }
      }
      return exception;
    });
  }

  /**
   * Merges contiguous exception intervals
   */
  private mergeContiguousExceptions(rawExceptions: RawException[]): RawException[] {
    if (rawExceptions.length === 0) return [];

    // Sort by start date
    rawExceptions.sort(
      (a, b) => a.exception_start_date.getTime() - b.exception_start_date.getTime()
    );

    const merged: RawException[] = [];
    let current = { ...rawExceptions[0] };

    for (let i = 1; i < rawExceptions.length; i++) {
      const next = rawExceptions[i];

      // Can merge if:
      // 1. Same exception type
      // 2. Same free/excess percent
      // 3. Next starts exactly where current ends (contiguous)
      const canMerge =
        current.exception_type === next.exception_type &&
        current.free_or_excess_percent === next.free_or_excess_percent &&
        DateUtils.isSameDay(current.exception_end_date, next.exception_start_date);

      if (canMerge) {
        // Extend current exception's end date
        current.exception_end_date = next.exception_end_date;
        // For over-allocation, merge source allocations
        if (current.exception_type === 'OVER') {
          current.source_allocations = this.mergeUniqueSources(
            current.source_allocations,
            next.source_allocations
          );
        }
      } else {
        // Cannot merge, save current and start new one
        merged.push(this.finalizeException(current));
        current = { ...next };
      }
    }

    // Don't forget the last one
    merged.push(this.finalizeException(current));

    return merged;
  }

  /**
   * Merges source allocations, keeping unique entries by id
   */
  private mergeUniqueSources(
    sources1: Allocation[],
    sources2: Allocation[]
  ): Allocation[] {
    const allSources = [...sources1, ...sources2];
    const uniqueMap = new Map<number, Allocation>();

    for (const source of allSources) {
      uniqueMap.set(source.id, source);
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Finalizes exception by adjusting end date
   * Interval end dates are exclusive, but exception end_date should be inclusive
   */
  private finalizeException(exception: RawException): RawException {
    // Intervals are [start, end), so the actual exception ends on the day before interval end
    const adjustedEndDate = DateUtils.addDays(exception.exception_end_date, -1);

    return {
      ...exception,
      exception_end_date: adjustedEndDate,
    };
  }

  /**
   * Checks if an exception spans approximately the full query window
   * (indicating employee is currently free with no allocations)
   */
  private spansApproximatelyFullWindow(
    exception: AllocationException,
    windowStart: Date,
    windowEnd: Date
  ): boolean {
    const startDiff = Math.abs(
      exception.exception_start_date.getTime() - windowStart.getTime()
    );
    const endDiff = Math.abs(
      exception.exception_end_date.getTime() - windowEnd.getTime()
    );

    // Allow 2 days tolerance on each end (in milliseconds)
    const tolerance = 2 * 24 * 60 * 60 * 1000;

    return startDiff <= tolerance && endDiff <= tolerance;
  }

  /**
   * Resolves allocation sources to human-readable names
   */
  private resolveSourceNames(
    allocations: Allocation[],
    clients: Client[],
    projects: Project[]
  ): string[] {
    const names: string[] = [];

    for (const allocation of allocations) {
      if (allocation.target_type === 'CLIENT') {
        const client = clients.find((c) => c.id === allocation.target_id);
        if (client) {
          names.push(client.name);
        }
      } else {
        const project = projects.find((p) => p.id === allocation.target_id);
        if (project) {
          names.push(project.name);
        }
      }
    }

    return names;
  }
}
