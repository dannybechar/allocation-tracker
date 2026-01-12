/**
 * Repository Interfaces - Define contracts for data access
 *
 * These interfaces allow the domain/service layers to be independent
 * of the specific database implementation.
 */

import { Employee, Allocation, Client, Project } from '../domain/models';

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: number): Promise<Employee | null>;
  create(employee: Omit<Employee, 'id'>): Promise<Employee>;
  update(id: number, employee: Partial<Employee>): Promise<Employee>;
  delete(id: number): Promise<void>;
}

export interface IAllocationRepository {
  findAll(): Promise<Allocation[]>;
  findById(id: number): Promise<Allocation | null>;
  findByEmployeeId(employeeId: number): Promise<Allocation[]>;
  findByDateRange(fromDate: Date, toDate: Date): Promise<Allocation[]>;
  create(allocation: Omit<Allocation, 'id'>): Promise<Allocation>;
  update(id: number, allocation: Partial<Allocation>): Promise<Allocation>;
  delete(id: number): Promise<void>;
}

export interface IClientRepository {
  findAll(): Promise<Client[]>;
  findById(id: number): Promise<Client | null>;
  create(client: Omit<Client, 'id'>): Promise<Client>;
  update(id: number, client: Partial<Client>): Promise<Client>;
  delete(id: number): Promise<void>;
}

export interface IProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: number): Promise<Project | null>;
  findByClientId(clientId: number): Promise<Project[]>;
  create(project: Omit<Project, 'id'>): Promise<Project>;
  update(id: number, project: Partial<Project>): Promise<Project>;
  delete(id: number): Promise<void>;
}
