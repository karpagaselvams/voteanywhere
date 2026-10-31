import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import type { OfficerRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { officerService as service } from './service';

export const officerRouter = Router();

const verificationQuery = z.object({ query: z.string().min(1).max(50) });

officerRouter.get(
  '/dashboard',
  authenticate,
  requireRole('VERIFICATION_OFFICER', 'POLLING_CENTRE_OFFICER', 'SYSTEM_AUDITOR'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await service.dashboard(req.auth!.role as OfficerRole, req.auth!.officerId!);
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },
);

// Voter and remote-assignment verification before simulated voting.
officerRouter.get(
  '/verification',
  authenticate,
  requireRole('VERIFICATION_OFFICER', 'POLLING_CENTRE_OFFICER'),
  validate(verificationQuery, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req.query as unknown as z.infer<typeof verificationQuery>;
      const result = await service.verifyVoter(query);
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },
);
