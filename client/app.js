"use strict";
// State for caching data
let employeesCache = [];
let clientsCache = [];
let projectsCache = [];
// Initialize date inputs with default values (today to today + 3 months)
function initializeDates() {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const fromInput = document.getElementById('fromDate');
    const toInput = document.getElementById('toDate');
    fromInput.value = formatDateForInput(today);
    toInput.value = formatDateForInput(threeMonthsLater);
}
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
async function loadExceptions() {
    const fromInput = document.getElementById('fromDate');
    const toInput = document.getElementById('toDate');
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
        const exceptions = await response.json();
        displayExceptions(exceptions);
    }
    catch (error) {
        showError(error.message);
    }
    finally {
        hideLoading();
    }
}
function displayExceptions(exceptions) {
    const table = document.getElementById('exceptionsTable');
    const tbody = document.getElementById('exceptionsBody');
    const noData = document.getElementById('noData');
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
        row.className =
            exception.exception_type === 'UNDER' ? 'exception-under' : 'exception-over';
        row.insertCell(0).textContent = exception.employee_name;
        row.insertCell(1).textContent = exception.exception_type;
        row.insertCell(2).textContent = exception.exception_start_date;
        row.insertCell(3).textContent = exception.exception_end_date;
        row.insertCell(4).textContent = `${exception.free_or_excess_percent}%`;
        row.insertCell(5).textContent = exception.source_projects_or_clients.join(', ') || '-';
    });
}
function showLoading() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
}
function hideLoading() {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';
}
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.style.display = 'block';
}
function hideError() {
    const error = document.getElementById('error');
    error.style.display = 'none';
}
// Tab switching
function switchTab(tabName) {
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
    const clickedNavTab = event?.target;
    if (clickedNavTab) {
        clickedNavTab.classList.add('active');
    }
    // Load data for the selected tab
    if (tabName === 'allocations') {
        loadAllocations();
    }
    else if (tabName === 'employees') {
        loadEmployees();
    }
    else if (tabName === 'clients') {
        loadClients();
    }
    else if (tabName === 'projects') {
        loadProjects();
    }
}
// Load employees
async function loadEmployees() {
    const table = document.getElementById('employeesTable');
    const tbody = document.getElementById('employeesBody');
    const loading = document.getElementById('employeesLoading');
    const error = document.getElementById('employeesError');
    const noData = document.getElementById('employeesNoData');
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
        const employees = await response.json();
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
            row.insertCell(2).textContent = `${employee.fte_percent}%`;
            row.insertCell(3).textContent = String(employee.vacation_days);
        });
        table.style.display = 'table';
    }
    catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
    finally {
        loading.style.display = 'none';
    }
}
// Load clients
async function loadClients() {
    const table = document.getElementById('clientsTable');
    const tbody = document.getElementById('clientsBody');
    const loading = document.getElementById('clientsLoading');
    const error = document.getElementById('clientsError');
    const noData = document.getElementById('clientsNoData');
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
        const clients = await response.json();
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
    }
    catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
    finally {
        loading.style.display = 'none';
    }
}
// Load projects
async function loadProjects() {
    const table = document.getElementById('projectsTable');
    const tbody = document.getElementById('projectsBody');
    const loading = document.getElementById('projectsLoading');
    const error = document.getElementById('projectsError');
    const noData = document.getElementById('projectsNoData');
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
        const projects = await projectsResponse.json();
        const clients = await clientsResponse.json();
        // Create a map of client_id to client_name
        const clientMap = new Map();
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
    }
    catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
    finally {
        loading.style.display = 'none';
    }
}
// Load allocations
async function loadAllocations() {
    const table = document.getElementById('allocationsTable');
    const tbody = document.getElementById('allocationsBody');
    const loading = document.getElementById('allocationsLoading');
    const error = document.getElementById('allocationsError');
    const noData = document.getElementById('allocationsNoData');
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
        const allocations = await allocationsRes.json();
        employeesCache = await employeesRes.json();
        clientsCache = await clientsRes.json();
        projectsCache = await projectsRes.json();
        // Clear existing rows
        tbody.innerHTML = '';
        if (allocations.length === 0) {
            noData.style.display = 'block';
            return;
        }
        // Display allocations
        allocations.forEach((allocation) => {
            const row = tbody.insertRow();
            // Employee name
            const employee = employeesCache.find((e) => e.id === allocation.employee_id);
            row.insertCell(0).textContent = employee ? employee.name : `ID ${allocation.employee_id}`;
            // Target type
            row.insertCell(1).textContent = allocation.target_type;
            // Target name
            let targetName = '';
            if (allocation.target_type === 'CLIENT') {
                const client = clientsCache.find((c) => c.id === allocation.target_id);
                targetName = client ? client.name : `ID ${allocation.target_id}`;
            }
            else {
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
        table.style.display = 'table';
    }
    catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
    finally {
        loading.style.display = 'none';
    }
}
// Show allocation form
async function showAllocationForm() {
    const formContainer = document.getElementById('allocationFormContainer');
    const formTitle = document.getElementById('formTitle');
    const form = document.getElementById('allocationForm');
    // Reset form
    form.reset();
    document.getElementById('allocationId').value = '';
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
    const employeeSelect = document.getElementById('employeeSelect');
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
// Update target dropdown based on selected type
function updateTargetDropdown() {
    const targetType = document.querySelector('input[name="targetType"]:checked')
        ?.value;
    const targetSelect = document.getElementById('targetSelect');
    targetSelect.innerHTML = '<option value="">Select Target</option>';
    if (targetType === 'CLIENT') {
        clientsCache.forEach((client) => {
            const option = document.createElement('option');
            option.value = String(client.id);
            option.textContent = client.name;
            targetSelect.appendChild(option);
        });
    }
    else if (targetType === 'PROJECT') {
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
    const employeeSelect = document.getElementById('employeeSelect');
    // Remove existing listener by replacing with clone
    const clone = employeeSelect.cloneNode(true);
    employeeSelect.parentNode?.replaceChild(clone, employeeSelect);
    // Add change event listener to the new element
    const newSelect = document.getElementById('employeeSelect');
    newSelect.addEventListener('change', () => {
        const allocationPercentInput = document.getElementById('allocationPercent');
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
    const formContainer = document.getElementById('allocationFormContainer');
    formContainer.style.display = 'none';
}
// Save allocation (create or update)
async function saveAllocation(event) {
    event.preventDefault();
    const allocationId = document.getElementById('allocationId').value;
    const employeeId = Number(document.getElementById('employeeSelect').value);
    const targetType = document.querySelector('input[name="targetType"]:checked')
        .value;
    const targetId = Number(document.getElementById('targetSelect').value);
    const allocationPercent = Number(document.getElementById('allocationPercent').value);
    const startDate = document.getElementById('startDate').value || null;
    const endDate = document.getElementById('endDate').value || null;
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
        }
        else {
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
    }
    catch (err) {
        alert('Error: ' + err.message);
    }
}
// Edit allocation
async function editAllocation(id) {
    const formContainer = document.getElementById('allocationFormContainer');
    const formTitle = document.getElementById('formTitle');
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
        const employeeSelect = document.getElementById('employeeSelect');
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
        const allocations = await response.json();
        const allocation = allocations.find((a) => a.id === id);
        if (!allocation) {
            throw new Error('Allocation not found');
        }
        // Populate form
        document.getElementById('allocationId').value = String(allocation.id);
        employeeSelect.value = String(allocation.employee_id);
        // Set target type and populate target dropdown
        const targetTypeRadio = document.querySelector(`input[name="targetType"][value="${allocation.target_type}"]`);
        if (targetTypeRadio) {
            targetTypeRadio.checked = true;
            updateTargetDropdown();
        }
        document.getElementById('targetSelect').value = String(allocation.target_id);
        document.getElementById('allocationPercent').value = String(allocation.allocation_percent);
        document.getElementById('startDate').value = allocation.start_date || '';
        document.getElementById('endDate').value = allocation.end_date || '';
        formTitle.textContent = 'Edit Allocation';
        formContainer.style.display = 'block';
    }
    catch (err) {
        alert('Error: ' + err.message);
    }
}
// Delete allocation
async function deleteAllocation(id) {
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
    }
    catch (err) {
        alert('Error: ' + err.message);
    }
}
// Make functions available globally
window.switchTab = switchTab;
window.showAllocationForm = showAllocationForm;
window.updateTargetDropdown = updateTargetDropdown;
window.cancelAllocationForm = cancelAllocationForm;
window.saveAllocation = saveAllocation;
window.editAllocation = editAllocation;
window.deleteAllocation = deleteAllocation;
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    loadExceptions();
});
