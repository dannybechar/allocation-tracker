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
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    loadExceptions();
});
