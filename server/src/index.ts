import express from 'express';
import path from 'path';
import { createDatabase } from './db/database';
import { EmployeeRepository } from './repositories/EmployeeRepository';
import { AllocationRepository } from './repositories/AllocationRepository';
import { ClientRepository } from './repositories/ClientRepository';
import { ProjectRepository } from './repositories/ProjectRepository';
import { AllocationAnalyzer } from './domain/AllocationAnalyzer';
import { AllocationService } from './services/AllocationService';
import { createAllocationRoutes } from './api/allocationRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../client')));

// Initialize database and repositories
const db = createDatabase('./allocation_tracker.db');
const employeeRepo = new EmployeeRepository(db);
const allocationRepo = new AllocationRepository(db);
const clientRepo = new ClientRepository(db);
const projectRepo = new ProjectRepository(db);

// Initialize domain and service
const analyzer = new AllocationAnalyzer();
const service = new AllocationService(
  employeeRepo,
  allocationRepo,
  clientRepo,
  projectRepo,
  analyzer
);

// Routes
app.use('/api', createAllocationRoutes(service));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Allocation Tracker running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
