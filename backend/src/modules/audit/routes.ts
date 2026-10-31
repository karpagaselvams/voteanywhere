import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { listAuditRecords } from './repository';

// The System Auditor reads the audit trail. There is no write route —
// services write audit records as a side effect of state-changing
// operations, and nobody updates or deletes them.
export const auditRouter = Router();

const querySchema = z.object({
  action: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

auditRouter.get(
  '/records',
  authenticate,
  requireRole('SYSTEM_AUDITOR'),
  validate(querySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { action, limit } = req.query as unknown as z.infer<typeof querySchema>;
      res.status(200).json(await listAuditRecords({ action, limit }));
    } catch (error) {
      next(error);
    }
  },
);
