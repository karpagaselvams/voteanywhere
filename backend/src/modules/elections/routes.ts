import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import { electionService as service } from './service';

// Election configuration belongs to the Election Administrator alone. The
// Verification Officer who approves remote polling requests has no rights
// here — separation of duties.
export const electionRouter = Router();

const idParams = z.object({ id: z.string().uuid() });

const wrap =
  (fn: (req: Request) => Promise<{ ok: boolean; value?: unknown; error?: { status: number; message: string } }>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fn(req);
      if (!result.ok) {
        res.status(result.error!.status).json({ error: result.error!.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  };

electionRouter.get(
  '/elections',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  wrap(() => service.listElections()),
);

electionRouter.post(
  '/elections/:id/activate',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  validate(idParams, 'params'),
  wrap((req) => service.activate(req.params.id, req.auth!.officerId!)),
);

electionRouter.post(
  '/elections/:id/close',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  validate(idParams, 'params'),
  wrap((req) => service.close(req.params.id, req.auth!.officerId!)),
);

electionRouter.get(
  '/candidates',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  wrap(() => service.listCandidates()),
);

electionRouter.get(
  '/centres',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  wrap(() => service.listCentres()),
);
