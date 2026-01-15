import { Router, Request, Response } from 'express';
import { AllocationService } from '../services/AllocationService';
import { DateUtils } from '../domain/DateUtils';

export function createAllocationRoutes(service: AllocationService): Router {
  const router = Router();

  /**
   * GET /api/exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns list of allocation exceptions
   */
  router.get('/exceptions', async (req: Request, res: Response) => {
    try {
      const fromStr = req.query.from as string | undefined;
      const toStr = req.query.to as string | undefined;

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (fromStr) {
        try {
          fromDate = DateUtils.parseDate(fromStr);
        } catch {
          return res.status(400).json({
            error: 'Invalid from date format. Expected YYYY-MM-DD',
          });
        }
      }

      if (toStr) {
        try {
          toDate = DateUtils.parseDate(toStr);
        } catch {
          return res.status(400).json({
            error: 'Invalid to date format. Expected YYYY-MM-DD',
          });
        }
      }

      if (fromDate && toDate && fromDate > toDate) {
        return res.status(400).json({
          error: 'from date must be before or equal to to date',
        });
      }

      const exceptions = await service.getExceptions(fromDate, toDate);

      // Serialize dates to ISO strings for JSON
      const serialized = exceptions.map((ex) => ({
        employee_name: ex.employee_name,
        exception_type: ex.exception_type,
        exception_start_date: DateUtils.formatDate(ex.exception_start_date),
        exception_end_date: DateUtils.formatDate(ex.exception_end_date),
        free_or_excess_percent: ex.free_or_excess_percent,
        source_projects_or_clients: ex.source_projects_or_clients,
      }));

      res.json(serialized);
    } catch (error) {
      console.error('Error fetching exceptions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/employees
   * Body: { name: string, fte_percent: number, billable?: boolean }
   */
  router.post('/employees', async (req: Request, res: Response) => {
    try {
      const { name, fte_percent, billable } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required and must be a string' });
      }

      if (typeof fte_percent !== 'number') {
        return res.status(400).json({ error: 'fte_percent is required and must be a number' });
      }

      if (billable !== undefined && typeof billable !== 'boolean') {
        return res.status(400).json({ error: 'billable must be a boolean' });
      }

      const employee = await service.createEmployee(name, fte_percent, billable);

      res.status(201).json(employee);
    } catch (error: any) {
      console.error('Error creating employee:', error);

      if (error.message.includes('required') || error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/employees
   * Returns list of all employees
   */
  router.get('/employees', async (req: Request, res: Response) => {
    try {
      const employees = await service.getAllEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/employees/:id
   * Update an existing employee
   * Body: { name?: string, fte_percent?: number, vacation_days?: number, billable?: boolean }
   */
  router.put('/employees/:id', async (req: Request, res: Response) => {
    try {
      const employeeId = Number(req.params.id);
      const { name, fte_percent, vacation_days, billable } = req.body;

      if (isNaN(employeeId)) {
        return res.status(400).json({ error: 'Invalid employee ID' });
      }

      // Validation
      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }

      if (fte_percent !== undefined && typeof fte_percent !== 'number') {
        return res.status(400).json({ error: 'fte_percent must be a number' });
      }

      if (vacation_days !== undefined && typeof vacation_days !== 'number') {
        return res.status(400).json({ error: 'vacation_days must be a number' });
      }

      if (billable !== undefined && typeof billable !== 'boolean') {
        return res.status(400).json({ error: 'billable must be a boolean' });
      }

      const employee = await service.updateEmployee(
        employeeId,
        name,
        fte_percent,
        vacation_days,
        billable
      );

      res.json(employee);
    } catch (error: any) {
      console.error('Error updating employee:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/allocations
   * Body: {
   *   employee_id: number,
   *   target_type: 'CLIENT' | 'PROJECT',
   *   target_id: number,
   *   start_date: string (YYYY-MM-DD),
   *   end_date: string | null (YYYY-MM-DD),
   *   allocation_percent: number
   * }
   */
  router.post('/allocations', async (req: Request, res: Response) => {
    try {
      const {
        employee_id,
        target_type,
        target_id,
        start_date,
        end_date,
        allocation_percent,
      } = req.body;

      // Validation
      if (typeof employee_id !== 'number') {
        return res.status(400).json({ error: 'employee_id must be a number' });
      }

      if (target_type !== 'CLIENT' && target_type !== 'PROJECT') {
        return res.status(400).json({ error: 'target_type must be CLIENT or PROJECT' });
      }

      if (typeof target_id !== 'number') {
        return res.status(400).json({ error: 'target_id must be a number' });
      }

      if (typeof allocation_percent !== 'number') {
        return res.status(400).json({ error: 'allocation_percent must be a number' });
      }

      // Parse dates
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (start_date !== null && start_date !== undefined && start_date !== '') {
        try {
          startDate = DateUtils.parseDate(start_date);
        } catch {
          return res.status(400).json({ error: 'Invalid start_date format. Expected YYYY-MM-DD' });
        }
      }

      if (end_date !== null && end_date !== undefined && end_date !== '') {
        try {
          endDate = DateUtils.parseDate(end_date);
        } catch {
          return res.status(400).json({ error: 'Invalid end_date format. Expected YYYY-MM-DD' });
        }
      }

      const allocation = await service.createAllocation(
        employee_id,
        target_type,
        target_id,
        startDate,
        endDate,
        allocation_percent
      );

      // Serialize dates
      const serialized = {
        ...allocation,
        start_date: allocation.start_date ? DateUtils.formatDate(allocation.start_date) : null,
        end_date: allocation.end_date ? DateUtils.formatDate(allocation.end_date) : null,
      };

      res.status(201).json(serialized);
    } catch (error: any) {
      console.error('Error creating allocation:', error);

      if (error.message.includes('not found') || error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/allocations
   * Returns list of all allocations
   */
  router.get('/allocations', async (req: Request, res: Response) => {
    try {
      const allocations = await service.getAllAllocations();

      // Serialize dates
      const serialized = allocations.map((a) => ({
        ...a,
        start_date: a.start_date ? DateUtils.formatDate(a.start_date) : null,
        end_date: a.end_date ? DateUtils.formatDate(a.end_date) : null,
      }));

      res.json(serialized);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/clients
   * Body: { name: string }
   */
  router.post('/clients', async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required and must be a string' });
      }

      const client = await service.createClient(name);
      res.status(201).json(client);
    } catch (error: any) {
      console.error('Error creating client:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * GET /api/clients
   * Returns list of all clients
   */
  router.get('/clients', async (req: Request, res: Response) => {
    try {
      const clients = await service.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/projects
   * Body: { name: string, client_id: number | null }
   */
  router.post('/projects', async (req: Request, res: Response) => {
    try {
      const { name, client_id } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required and must be a string' });
      }

      const clientId = client_id === null || client_id === undefined ? null : Number(client_id);

      const project = await service.createProject(name, clientId);
      res.status(201).json(project);
    } catch (error: any) {
      console.error('Error creating project:', error);

      if (error.message.includes('not found')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/projects
   * Returns list of all projects
   */
  router.get('/projects', async (req: Request, res: Response) => {
    try {
      const projects = await service.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/allocations/:id
   * Update an existing allocation
   */
  router.put('/allocations/:id', async (req: Request, res: Response) => {
    try {
      const allocationId = Number(req.params.id);
      const {
        employee_id,
        target_type,
        target_id,
        start_date,
        end_date,
        allocation_percent,
      } = req.body;

      if (isNaN(allocationId)) {
        return res.status(400).json({ error: 'Invalid allocation ID' });
      }

      // Validation
      if (employee_id !== undefined && typeof employee_id !== 'number') {
        return res.status(400).json({ error: 'employee_id must be a number' });
      }

      if (target_type !== undefined && target_type !== 'CLIENT' && target_type !== 'PROJECT') {
        return res.status(400).json({ error: 'target_type must be CLIENT or PROJECT' });
      }

      if (target_id !== undefined && typeof target_id !== 'number') {
        return res.status(400).json({ error: 'target_id must be a number' });
      }

      if (allocation_percent !== undefined && typeof allocation_percent !== 'number') {
        return res.status(400).json({ error: 'allocation_percent must be a number' });
      }

      // Parse dates if provided
      let startDate: Date | null | undefined;
      let endDate: Date | null | undefined;

      if (start_date !== undefined) {
        if (start_date === null || start_date === '') {
          startDate = null;
        } else {
          try {
            startDate = DateUtils.parseDate(start_date);
          } catch {
            return res.status(400).json({ error: 'Invalid start_date format. Expected YYYY-MM-DD' });
          }
        }
      }

      if (end_date !== undefined) {
        if (end_date === null || end_date === '') {
          endDate = null;
        } else {
          try {
            endDate = DateUtils.parseDate(end_date);
          } catch {
            return res.status(400).json({ error: 'Invalid end_date format. Expected YYYY-MM-DD' });
          }
        }
      }

      const allocation = await service.updateAllocation(
        allocationId,
        employee_id,
        target_type,
        target_id,
        startDate,
        endDate,
        allocation_percent
      );

      // Serialize dates
      const serialized = {
        ...allocation,
        start_date: allocation.start_date ? DateUtils.formatDate(allocation.start_date) : null,
        end_date: allocation.end_date ? DateUtils.formatDate(allocation.end_date) : null,
      };

      res.json(serialized);
    } catch (error: any) {
      console.error('Error updating allocation:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/allocations/:id
   * Delete an allocation
   */
  router.delete('/allocations/:id', async (req: Request, res: Response) => {
    try {
      const allocationId = Number(req.params.id);

      if (isNaN(allocationId)) {
        return res.status(400).json({ error: 'Invalid allocation ID' });
      }

      await service.deleteAllocation(allocationId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting allocation:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
