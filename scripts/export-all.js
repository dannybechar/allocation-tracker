"use strict";
/**
 * Export All Script
 *
 * Exports all data from the database to Excel files
 * This is designed to run on application shutdown
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAll = exportAll;
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../server/src/db/database");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Export employees to employees.xlsx
 */
async function exportEmployees(db) {
    const employees = db.prepare('SELECT id, name, fte_percent, vacation_days, billable FROM employees ORDER BY id').all();
    if (employees.length === 0) {
        console.log('  No employees found.');
        return;
    }
    const excelData = employees.map((emp) => ({
        ID: emp.id,
        Name: emp.name,
        FTE: emp.fte_percent,
        VacationDays: emp.vacation_days,
        Billable: emp.billable === 1 ? 1 : 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 10 },
        { wch: 15 },
        { wch: 10 },
    ];
    const excelFilePath = path.join(process.cwd(), 'data', 'employees.xlsx');
    XLSX.writeFile(workbook, excelFilePath);
    console.log(`  ✓ Employees: ${employees.length} records exported`);
}
/**
 * Export clients to clients.xlsx
 */
async function exportClients(db) {
    const clients = db.prepare('SELECT id, name FROM clients ORDER BY id').all();
    if (clients.length === 0) {
        console.log('  No clients found.');
        return;
    }
    const excelData = clients.map((client) => ({
        ID: client.id,
        Name: client.name,
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 40 },
    ];
    const excelFilePath = path.join(process.cwd(), 'data', 'clients.xlsx');
    XLSX.writeFile(workbook, excelFilePath);
    console.log(`  ✓ Clients: ${clients.length} records exported`);
}
/**
 * Export projects to projects.xlsx
 */
async function exportProjects(db) {
    const projects = db.prepare(`
    SELECT
      p.id,
      p.name,
      c.name as client_name
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    ORDER BY p.id
  `).all();
    if (projects.length === 0) {
        console.log('  No projects found.');
        return;
    }
    const excelData = projects.map((project) => ({
        ID: project.id,
        Name: project.name,
        Client: project.client_name || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 40 },
        { wch: 40 },
    ];
    const excelFilePath = path.join(process.cwd(), 'data', 'projects.xlsx');
    XLSX.writeFile(workbook, excelFilePath);
    console.log(`  ✓ Projects: ${projects.length} records exported`);
}
/**
 * Export allocations to allocations.xlsx
 */
async function exportAllocations(db) {
    const allocations = db.prepare(`
    SELECT
      a.id,
      e.name as employee_name,
      a.target_type,
      a.target_id,
      a.allocation_percent,
      a.start_date,
      a.end_date
    FROM allocations a
    JOIN employees e ON a.employee_id = e.id
    ORDER BY e.name, a.id
  `).all();
    if (allocations.length === 0) {
        console.log('  No allocations found.');
        return;
    }
    const clients = db.prepare('SELECT id, name FROM clients').all();
    const projects = db.prepare('SELECT id, name FROM projects').all();
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const excelData = allocations.map((allocation) => {
        let targetName = '';
        if (allocation.target_type === 'CLIENT') {
            targetName = clientMap.get(allocation.target_id) || `Unknown Client (ID ${allocation.target_id})`;
        }
        else {
            targetName = projectMap.get(allocation.target_id) || `Unknown Project (ID ${allocation.target_id})`;
        }
        return {
            ID: allocation.id,
            EmployeeName: allocation.employee_name,
            TargetType: allocation.target_type,
            TargetName: targetName,
            AllocationPercent: allocation.allocation_percent,
            StartDate: allocation.start_date || '',
            EndDate: allocation.end_date || '',
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 12 },
        { wch: 40 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
    ];
    const excelFilePath = path.join(process.cwd(), 'data', 'allocations.xlsx');
    XLSX.writeFile(workbook, excelFilePath);
    console.log(`  ✓ Allocations: ${allocations.length} records exported`);
}
/**
 * Main export function - exports all data
 */
async function exportAll() {
    console.log('\n📦 Exporting database to Excel files...');
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    // Connect to database
    const db = (0, database_1.createDatabase)('./allocation_tracker.db');
    try {
        await exportEmployees(db);
        await exportClients(db);
        await exportProjects(db);
        await exportAllocations(db);
        console.log('✓ All data exported successfully!\n');
    }
    catch (error) {
        console.error('✗ Export failed:', error.message);
        throw error;
    }
    finally {
        db.close();
    }
}
// Allow running as standalone script
if (require.main === module) {
    exportAll()
        .then(() => {
        console.log('Export completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Export failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=export-all.js.map