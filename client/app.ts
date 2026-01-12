interface AllocationException {
  employee_name: string;
  exception_type: 'UNDER' | 'OVER';
  exception_start_date: string;
  exception_end_date: string;
  free_or_excess_percent: number;
  source_projects_or_clients: string[];
}

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeDates();
  loadExceptions();
});
