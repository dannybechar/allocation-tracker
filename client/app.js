"use strict";
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
    if (tabName === 'employees') {
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
// Make switchTab available globally
window.switchTab = switchTab;
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    loadExceptions();
});
