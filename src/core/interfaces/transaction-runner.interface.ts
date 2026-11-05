import type { EntityManager } from 'typeorm';

/** Runs work atomically; services use it to define transaction boundaries. */
export type TransactionRunner = <T>(work: (manager: EntityManager) => Promise<T>) => Promise<T>;
