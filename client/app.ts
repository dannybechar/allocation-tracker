interface AllocationException {
  employee_name: string;
  exception_type: 'UNDER' | 'OVER' | 'VACATION';
  exception_start_date: string;
  exception_end_date: string;
  free_or_excess_percent: number;
  source_projects_or_clients: string[];
  availability_date: string;
  vacation_days: number;
}

interface Employee {
  id: number;
  name: string;
  fte_percent: number;
  vacation_days: number;
  billable: boolean;
}

interface Client {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  client_id: number | null;
}

interface Allocation {
  id: number;
  employee_id: number;
  target_type: 'CLIENT' | 'PROJECT';
  target_id: number;
  start_date: string;
  end_date: string | null;
  allocation_percent: number;
}

// State for caching data
let employeesCache: Employee[] = [];
let clientsCache: Client[] = [];
let projectsCache: Project[] = [];

// Initialize date inputs with default values (today to today + 3 months)
function initializeDates() {
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const fromInput = document.getElementById('fromDate') as HTMLInputElement;
  const toInput = document.getElementById('toDate') as HTMLInputElement;

  fromInput.value = formatDateForInput(today);
  toInput.value = formatDateForInput(threeMonthsLater);
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadExceptions() {
  const fromInput = document.getElementById('fromDate') as HTMLInputElement;
  const toInput = document.getElementById('toDate') as HTMLInputElement;

  const fromDate = fromInput.value;
  const toDate = toInput.value;

  showLoading();
  hideError();

  try {
    const url = `/api/exceptions?from=${fromDate}&to=${toDate}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch exceptions');
    }

    const exceptions: AllocationException[] = await response.json();

    displayExceptions(exceptions);
  } catch (error: any) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

function displayExceptions(exceptions: AllocationException[]) {
  const table = document.getElementById('exceptionsTable') as HTMLTableElement;
  const tbody = document.getElementById('exceptionsBody') as HTMLTableSectionElement;
  const noData = document.getElementById('noData') as HTMLDivElement;

  // Clear existing rows
  tbody.innerHTML = '';

  if (exceptions.length === 0) {
    table.style.display = 'none';
    noData.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  noData.style.display = 'none';

  exceptions.forEach((exception) => {
    const row = tbody.insertRow();

    // Apply color coding based on exception type and availability
    if (exception.exception_type === 'VACATION') {
      row.className = 'exception-vacation'; // Yellow - High vacation balance
    } else if (exception.exception_type === 'OVER') {
      row.className = 'exception-over'; // Red - Over-allocated
    } else if (exception.source_projects_or_clients.length > 0) {
      row.className = 'exception-allocated'; // Blue - Currently allocated, will become available
    } else {
      row.className = 'exception-free'; // Green - Available now
    }

    row.insertCell(0).textContent = exception.employee_name;
    row.insertCell(1).textContent = exception.exception_type;
    row.insertCell(2).textContent = exception.availability_date;
    row.insertCell(3).textContent = `${exception.free_or_excess_percent}%`;
    row.insertCell(4).textContent = String(exception.vacation_days);
    row.insertCell(5).textContent = exception.source_projects_or_clients.join(', ') || '-';
  });
}

function showLoading() {
  const loading = document.getElementById('loading') as HTMLDivElement;
  loading.style.display = 'block';
}

function hideLoading() {
  const loading = document.getElementById('loading') as HTMLDivElement;
  loading.style.display = 'none';
}

function showError(message: string) {
  const error = document.getElementById('error') as HTMLDivElement;
  error.textContent = message;
  error.style.display = 'block';
}

function hideError() {
  const error = document.getElementById('error') as HTMLDivElement;
  error.style.display = 'none';
}

// Tab switching
function switchTab(tabName: string) {
  // Hide all tab contents
  const allTabs = document.querySelectorAll('.tab-content');
  allTabs.forEach((tab) => {
    tab.classList.remove('active');
  });

  // Remove active class from all nav tabs
  const allNavTabs = document.querySelectorAll('.nav-tab');
  allNavTabs.forEach((tab) => {
    tab.classList.remove('active');
  });

  // Show selected tab content
  const selectedTab = document.getElementById(`${tabName}Tab`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Add active class to clicked nav tab
  const clickedNavTab = event?.target as HTMLElement;
  if (clickedNavTab) {
    clickedNavTab.classList.add('active');
  }

  // Load data for the selected tab
  if (tabName === 'allocations') {
    loadAllocations();
  } else if (tabName === 'employees') {
    loadEmployees();
  } else if (tabName === 'clients') {
    loadClients();
  } else if (tabName === 'projects') {
    loadProjects();
  }
}

// Load employees
async function loadEmployees() {
  const table = document.getElementById('employeesTable') as HTMLTableElement;
  const tbody = document.getElementById('employeesBody') as HTMLTableSectionElement;
  const loading = document.getElementById('employeesLoading') as HTMLDivElement;
  const error = document.getElementById('employeesError') as HTMLDivElement;
  const noData = document.getElementById('employeesNoData') as HTMLDivElement;

  // Hide everything
  table.style.display = 'none';
  error.style.display = 'none';
  noData.style.display = 'none';
  loading.style.display = 'block';

  try {
    const response = await fetch('/api/employees');
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }

    const employees: Employee[] = await response.json();

    // Clear existing rows
    tbody.innerHTML = '';

    if (employees.length === 0) {
      noData.style.display = 'block';
      return;
    }

    // Display employees
    employees.forEach((employee) => {
      const row = tbody.insertRow();
      row.insertCell(0).textContent = String(employee.id);
      row.insertCell(1).textContent = employee.name;

      // Billable checkbox
      const billableCell = row.insertCell(2);
      billableCell.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = employee.billable;
      checkbox.style.cssText = 'cursor: pointer; width: 18px; height: 18px;';
      checkbox.onchange = async () => {
        await updateEmployeeBillable(employee.id, checkbox.checked);
      };
      billableCell.appendChild(checkbox);

      row.insertCell(3).textContent = `${employee.fte_percent}%`;
      row.insertCell(4).textContent = String(employee.vacation_days);
    });

    table.style.display = 'table';
  } catch (err: any) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

// Update employee billable status
async function updateEmployeeBillable(employeeId: number, billable: boolean) {
  try {
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billable }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update billable status');
    }

    // Update cache
    const employee = employeesCache.find((e) => e.id === employeeId);
    if (employee) {
      employee.billable = billable;
    }
  } catch (err: any) {
    alert(`Error updating billable status: ${err.message}`);
    // Reload to revert the checkbox
    await loadEmployees();
  }
}

// Load clients
async function loadClients() {
  const table = document.getElementById('clientsTable') as HTMLTableElement;
  const tbody = document.getElementById('clientsBody') as HTMLTableSectionElement;
  const loading = document.getElementById('clientsLoading') as HTMLDivElement;
  const error = document.getElementById('clientsError') as HTMLDivElement;
  const noData = document.getElementById('clientsNoData') as HTMLDivElement;

  // Hide everything
  table.style.display = 'none';
  error.style.display = 'none';
  noData.style.display = 'none';
  loading.style.display = 'block';

  try {
    const response = await fetch('/api/clients');
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }

    const clients: Client[] = await response.json();

    // Clear existing rows
    tbody.innerHTML = '';

    if (clients.length === 0) {
      noData.style.display = 'block';
      return;
    }

    // Display clients
    clients.forEach((client) => {
      const row = tbody.insertRow();
      row.insertCell(0).textContent = String(client.id);
      row.insertCell(1).textContent = client.name;
    });

    table.style.display = 'table';
  } catch (err: any) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

// Load projects
async function loadProjects() {
  const table = document.getElementById('projectsTable') as HTMLTableElement;
  const tbody = document.getElementById('projectsBody') as HTMLTableSectionElement;
  const loading = document.getElementById('projectsLoading') as HTMLDivElement;
  const error = document.getElementById('projectsError') as HTMLDivElement;
  const noData = document.getElementById('projectsNoData') as HTMLDivElement;

  // Hide everything
  table.style.display = 'none';
  error.style.display = 'none';
  noData.style.display = 'none';
  loading.style.display = 'block';

  try {
    // Fetch both projects and clients to show client names
    const [projectsResponse, clientsResponse] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/clients'),
    ]);

    if (!projectsResponse.ok || !clientsResponse.ok) {
      throw new Error('Failed to fetch projects or clients');
    }

    const projects: Project[] = await projectsResponse.json();
    const clients: Client[] = await clientsResponse.json();

    // Create a map of client_id to client_name
    const clientMap = new Map<number, string>();
    clients.forEach((client) => {
      clientMap.set(client.id, client.name);
    });

    // Clear existing rows
    tbody.innerHTML = '';

    if (projects.length === 0) {
      noData.style.display = 'block';
      return;
    }

    // Display projects
    projects.forEach((project) => {
      const row = tbody.insertRow();
      row.insertCell(0).textContent = String(project.id);
      row.insertCell(1).textContent = project.name;
      const clientName = project.client_id ? clientMap.get(project.client_id) || '-' : '-';
      row.insertCell(2).textContent = clientName;
    });

    table.style.display = 'table';
  } catch (err: any) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

// Load allocations
async function loadAllocations() {
  const table = document.getElementById('allocationsTable') as HTMLTableElement;
  const tbody = document.getElementById('allocationsBody') as HTMLTableSectionElement;
  const loading = document.getElementById('allocationsLoading') as HTMLDivElement;
  const error = document.getElementById('allocationsError') as HTMLDivElement;
  const noData = document.getElementById('allocationsNoData') as HTMLDivElement;

  // Hide everything
  table.style.display = 'none';
  error.style.display = 'none';
  noData.style.display = 'none';
  loading.style.display = 'block';

  try {
    // Fetch all data in parallel
    const [allocationsRes, employeesRes, clientsRes, projectsRes] = await Promise.all([
      fetch('/api/allocations'),
      fetch('/api/employees'),
      fetch('/api/clients'),
      fetch('/api/projects'),
    ]);

    if (!allocationsRes.ok || !employeesRes.ok || !clientsRes.ok || !projectsRes.ok) {
      throw new Error('Failed to fetch data');
    }

    const allocations: Allocation[] = await allocationsRes.json();
    employeesCache = await employeesRes.json();
    clientsCache = await clientsRes.json();
    projectsCache = await projectsRes.json();

    // Clear existing rows
    tbody.innerHTML = '';

    // Get only billable employees
    const billableEmployees = employeesCache.filter((e) => e.billable);

    if (billableEmployees.length === 0) {
      noData.style.display = 'block';
      return;
    }

    // Group allocations by employee
    const allocationsByEmployee = new Map<number, Allocation[]>();
    allocations.forEach((allocation) => {
      if (!allocationsByEmployee.has(allocation.employee_id)) {
        allocationsByEmployee.set(allocation.employee_id, []);
      }
      allocationsByEmployee.get(allocation.employee_id)!.push(allocation);
    });

    // Display each billable employee
    billableEmployees.forEach((employee) => {
      const employeeAllocations = allocationsByEmployee.get(employee.id) || [];

      if (employeeAllocations.length > 0) {
        // Employee has allocations - show them
        employeeAllocations.forEach((allocation) => {
          const row = tbody.insertRow();

          // Employee name
          row.insertCell(0).textContent = employee.name;

          // Target type
          row.insertCell(1).textContent = allocation.target_type;

          // Target name
          let targetName = '';
          if (allocation.target_type === 'CLIENT') {
            const client = clientsCache.find((c) => c.id === allocation.target_id);
            targetName = client ? client.name : `ID ${allocation.target_id}`;
          } else {
            const project = projectsCache.find((p) => p.id === allocation.target_id);
            targetName = project ? project.name : `ID ${allocation.target_id}`;
          }
          row.insertCell(2).textContent = targetName;

          // Allocation %
          row.insertCell(3).textContent = `${allocation.allocation_percent}%`;

          // Start date
          row.insertCell(4).textContent = allocation.start_date || 'Indefinite';

          // End date
          row.insertCell(5).textContent = allocation.end_date || 'Ongoing';

          // Actions
          const actionsCell = row.insertCell(6);
          actionsCell.innerHTML = `
            <button onclick="editAllocation(${allocation.id})" style="padding: 5px 10px; margin-right: 5px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Edit</button>
            <button onclick="deleteAllocation(${allocation.id})" style="padding: 5px 10px; background-color: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Delete</button>
          `;
        });
      } else {
        // Employee has no allocations - show placeholder row
        const row = tbody.insertRow();
        row.style.backgroundColor = '#f8f9fa';

        // Employee name
        row.insertCell(0).textContent = employee.name;

        // Target type - empty
        row.insertCell(1).textContent = '-';

        // Target name - empty
        row.insertCell(2).textContent = '-';

        // Allocation % - pre-fill with FTE%
        row.insertCell(3).textContent = `${employee.fte_percent}%`;

        // Start date - empty
        row.insertCell(4).textContent = '-';

        // End date - empty
        row.insertCell(5).textContent = '-';

        // Actions - Add button
        const actionsCell = row.insertCell(6);
        actionsCell.innerHTML = `
          <button onclick="addAllocationForEmployee(${employee.id})" style="padding: 5px 10px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Add Allocation</button>
        `;
      }
    });

    table.style.display = 'table';
  } catch (err: any) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

// Show allocation form
async function showAllocationForm() {
  const formContainer = document.getElementById('allocationFormContainer') as HTMLDivElement;
  const formTitle = document.getElementById('formTitle') as HTMLHeadingElement;
  const form = document.getElementById('allocationForm') as HTMLFormElement;

  // Reset form
  form.reset();
  (document.getElementById('allocationId') as HTMLInputElement).value = '';
  formTitle.textContent = 'Add New Allocation';

  // Load employees, clients, projects if not already loaded
  if (employeesCache.length === 0 || clientsCache.length === 0 || projectsCache.length === 0) {
    const [employeesRes, clientsRes, projectsRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/clients'),
      fetch('/api/projects'),
    ]);

    employeesCache = await employeesRes.json();
    clientsCache = await clientsRes.json();
    projectsCache = await projectsRes.json();
  }

  // Populate employee dropdown
  const employeeSelect = document.getElementById('employeeSelect') as HTMLSelectElement;
  employeeSelect.innerHTML = '<option value="">Select Employee</option>';
  employeesCache.forEach((employee) => {
    const option = document.createElement('option');
    option.value = String(employee.id);
    option.textContent = employee.name;
    employeeSelect.appendChild(option);
  });

  // Add event listener to auto-fill allocation percent with employee FTE
  setupEmployeeSelectListener();

  // Populate target dropdown (default to clients)
  updateTargetDropdown();

  formContainer.style.display = 'block';
}

// Add allocation for a specific employee (from placeholder row)
async function addAllocationForEmployee(employeeId: number) {
  const formContainer = document.getElementById('allocationFormContainer') as HTMLDivElement;
  const formTitle = document.getElementById('formTitle') as HTMLHeadingElement;
  const form = document.getElementById('allocationForm') as HTMLFormElement;

  // Reset form
  form.reset();
  (document.getElementById('allocationId') as HTMLInputElement).value = '';
  formTitle.textContent = 'Add New Allocation';

  // Load data if not already loaded
  if (employeesCache.length === 0 || clientsCache.length === 0 || projectsCache.length === 0) {
    const [employeesRes, clientsRes, projectsRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/clients'),
      fetch('/api/projects'),
    ]);

    employeesCache = await employeesRes.json();
    clientsCache = await clientsRes.json();
    projectsCache = await projectsRes.json();
  }

  // Populate employee dropdown
  const employeeSelect = document.getElementById('employeeSelect') as HTMLSelectElement;
  employeeSelect.innerHTML = '<option value="">Select Employee</option>';
  employeesCache.forEach((employee) => {
    const option = document.createElement('option');
    option.value = String(employee.id);
    option.textContent = employee.name;
    employeeSelect.appendChild(option);
  });

  // Pre-select the employee
  employeeSelect.value = String(employeeId);

  // Pre-fill allocation percent with employee's FTE%
  const employee = employeesCache.find((e) => e.id === employeeId);
  if (employee) {
    const allocationPercentInput = document.getElementById('allocationPercent') as HTMLInputElement;
    allocationPercentInput.value = String(employee.fte_percent);
  }

  // Setup employee select listener
  setupEmployeeSelectListener();

  // Populate target dropdown
  updateTargetDropdown();

  formContainer.style.display = 'block';
}

// Update target dropdown based on selected type
function updateTargetDropdown() {
  const targetType = (document.querySelector('input[name="targetType"]:checked') as HTMLInputElement)
    ?.value;
  const targetSelect = document.getElementById('targetSelect') as HTMLSelectElement;

  targetSelect.innerHTML = '<option value="">Select Target</option>';

  if (targetType === 'CLIENT') {
    clientsCache.forEach((client) => {
      const option = document.createElement('option');
      option.value = String(client.id);
      option.textContent = client.name;
      targetSelect.appendChild(option);
    });
  } else if (targetType === 'PROJECT') {
    projectsCache.forEach((project) => {
      const option = document.createElement('option');
      option.value = String(project.id);
      option.textContent = project.name;
      targetSelect.appendChild(option);
    });
  }
}

// Setup employee select listener to auto-fill allocation percent with FTE
function setupEmployeeSelectListener() {
  const employeeSelect = document.getElementById('employeeSelect') as HTMLSelectElement;

  // Remove existing listener by replacing with clone
  const clone = employeeSelect.cloneNode(true) as HTMLSelectElement;
  employeeSelect.parentNode?.replaceChild(clone, employeeSelect);

  // Add change event listener to the new element
  const newSelect = document.getElementById('employeeSelect') as HTMLSelectElement;
  newSelect.addEventListener('change', () => {
    const allocationPercentInput = document.getElementById('allocationPercent') as HTMLInputElement;
    const selectedEmployeeId = Number(newSelect.value);

    if (selectedEmployeeId) {
      const employee = employeesCache.find((e) => e.id === selectedEmployeeId);
      if (employee) {
        // Only set the allocation percent if it's currently empty or default
        if (!allocationPercentInput.value || allocationPercentInput.value === '0') {
          allocationPercentInput.value = String(employee.fte_percent);
        }
      }
    }
  });
}

// Cancel allocation form
function cancelAllocationForm() {
  const formContainer = document.getElementById('allocationFormContainer') as HTMLDivElement;
  formContainer.style.display = 'none';
}

// Save allocation (create or update)
async function saveAllocation(event: Event) {
  event.preventDefault();

  const allocationId = (document.getElementById('allocationId') as HTMLInputElement).value;
  const employeeId = Number((document.getElementById('employeeSelect') as HTMLSelectElement).value);
  const targetType = (document.querySelector('input[name="targetType"]:checked') as HTMLInputElement)
    .value as 'CLIENT' | 'PROJECT';
  const targetId = Number((document.getElementById('targetSelect') as HTMLSelectElement).value);
  const allocationPercent = Number(
    (document.getElementById('allocationPercent') as HTMLInputElement).value
  );
  const startDate = (document.getElementById('startDate') as HTMLInputElement).value || null;
  const endDate = (document.getElementById('endDate') as HTMLInputElement).value || null;

  try {
    const body = {
      employee_id: employeeId,
      target_type: targetType,
      target_id: targetId,
      allocation_percent: allocationPercent,
      start_date: startDate,
      end_date: endDate,
    };

    let response;
    if (allocationId) {
      // Update existing
      response = await fetch(`/api/allocations/${allocationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      // Create new
      response = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save allocation');
    }

    // Hide form and reload allocations
    cancelAllocationForm();
    await loadAllocations();
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
}

// Edit allocation
async function editAllocation(id: number) {
  const formContainer = document.getElementById('allocationFormContainer') as HTMLDivElement;
  const formTitle = document.getElementById('formTitle') as HTMLHeadingElement;

  try {
    // Load employees, clients, projects if not already loaded
    if (employeesCache.length === 0 || clientsCache.length === 0 || projectsCache.length === 0) {
      const [employeesRes, clientsRes, projectsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/clients'),
        fetch('/api/projects'),
      ]);

      employeesCache = await employeesRes.json();
      clientsCache = await clientsRes.json();
      projectsCache = await projectsRes.json();
    }

    // Populate employee dropdown
    const employeeSelect = document.getElementById('employeeSelect') as HTMLSelectElement;
    employeeSelect.innerHTML = '<option value="">Select Employee</option>';
    employeesCache.forEach((employee) => {
      const option = document.createElement('option');
      option.value = String(employee.id);
      option.textContent = employee.name;
      employeeSelect.appendChild(option);
    });

    // Add event listener to auto-fill allocation percent with employee FTE
    setupEmployeeSelectListener();

    // Fetch current allocations
    const response = await fetch('/api/allocations');
    const allocations: Allocation[] = await response.json();
    const allocation = allocations.find((a) => a.id === id);

    if (!allocation) {
      throw new Error('Allocation not found');
    }

    // Populate form
    (document.getElementById('allocationId') as HTMLInputElement).value = String(allocation.id);
    employeeSelect.value = String(allocation.employee_id);

    // Set target type and populate target dropdown
    const targetTypeRadio = document.querySelector(
      `input[name="targetType"][value="${allocation.target_type}"]`
    ) as HTMLInputElement;
    if (targetTypeRadio) {
      targetTypeRadio.checked = true;
      updateTargetDropdown();
    }

    (document.getElementById('targetSelect') as HTMLSelectElement).value = String(
      allocation.target_id
    );
    (document.getElementById('allocationPercent') as HTMLInputElement).value = String(
      allocation.allocation_percent
    );
    (document.getElementById('startDate') as HTMLInputElement).value = allocation.start_date || '';
    (document.getElementById('endDate') as HTMLInputElement).value = allocation.end_date || '';

    formTitle.textContent = 'Edit Allocation';
    formContainer.style.display = 'block';
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
}

// Delete allocation
async function deleteAllocation(id: number) {
  if (!confirm('Are you sure you want to delete this allocation?')) {
    return;
  }

  try {
    const response = await fetch(`/api/allocations/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete allocation');
    }

    await loadAllocations();
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
}

// Make functions available globally
(window as any).switchTab = switchTab;
(window as any).showAllocationForm = showAllocationForm;
(window as any).updateTargetDropdown = updateTargetDropdown;
(window as any).cancelAllocationForm = cancelAllocationForm;
(window as any).saveAllocation = saveAllocation;
(window as any).editAllocation = editAllocation;
(window as any).deleteAllocation = deleteAllocation;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeDates();
  loadExceptions();
});
