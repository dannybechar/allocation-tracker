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
import { exportAll } from './utils/exportUtils';
import { importAll } from './utils/importUtils';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../client')));

let db: any;

// Async startup function
async function startServer() {
  try {
    // Import data from Excel files before initializing database
    await importAll();

    // Initialize database and repositories
    db = createDatabase('./allocation_tracker.db');
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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Export database to Excel files before shutting down
    await exportAll();
  } catch (error) {
    console.error('Error during export on shutdown:', error);
  }

  // Close database connection
  db.close();
  console.log('Database closed. Exiting...');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
