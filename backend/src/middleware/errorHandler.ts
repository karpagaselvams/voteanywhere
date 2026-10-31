import type { NextFunction, Request, Response } from 'express';
import { DomainError } from '../lib/result';
import { logger } from '../config/logger';

// Single place where errors become HTTP responses. Never leak stack traces,
// Prisma errors, or database constraint names in a response body.
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof DomainError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  logger.error('unhandled error', {
    operation: `${req.method} ${req.path}`,
    errorName: error instanceof Error ? error.name : 'unknown',
  });
  res.status(500).json({ error: 'Internal server error' });
}
