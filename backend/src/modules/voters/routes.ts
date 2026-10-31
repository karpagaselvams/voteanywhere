import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireVoter } from '../../middleware/authorize';
import { voterService } from './service';

export const voterRouter = Router();

const handle =
  (fn: (voterId: string) => Promise<{ ok: boolean; value?: unknown; error?: { status: number; message: string } }>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ownership is resolved from the authenticated session, never from input.
      const result = await fn(req.auth!.voterId!);
      if (!result.ok) {
        res.status(result.error!.status).json({ error: result.error!.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  };

voterRouter.get('/me', authenticate, requireVoter(), handle((id) => voterService.getProfile(id)));
voterRouter.post(
  '/eligibility',
  authenticate,
  requireVoter(),
  handle((id) => voterService.checkEligibility(id)),
);
