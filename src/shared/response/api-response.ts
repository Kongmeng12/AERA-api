import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function sendSuccess<T>(res: Response, data: T, message: string, status = 200): void {
  res.status(status).json({ success: true, message, data });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
