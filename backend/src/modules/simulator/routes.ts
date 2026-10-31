import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requireVoter } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { ballotService } from '../ballots/service';
import { voterRepository } from '../voters/repository';
import { simulatorService } from './service';

// The simulator's ballot surface. One module, not a second voting system.
// The ballot's constituency always comes from the voter record inside the
// service; the client never supplies it.
export const simulatorRouter = Router();

const submitSchema = z.object({ candidateId: z.string().uuid() });
const idParams = z.object({ id: z.string().uuid() });

async function loadVoter(req: Request, res: Response) {
  const voter = await voterRepository.findByIdWithGeography(req.auth!.voterId!);
  if (!voter) {
    res.status(404).json({ error: 'Voter record not found' });
    return null;
  }
  return voter;
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };

simulatorRouter.get(
  '/controlled-ballot',
  authenticate,
  requireVoter(),
  wrap(async (req, res) => {
    const voter = await loadVoter(req, res);
    if (!voter) return;
    const result = await ballotService.generateBallot(voter);
    if (!result.ok) {
      res.status(result.error.status).json({ error: result.error.message });
      return;
    }
    res.status(200).json(result.value);
  }),
);

simulatorRouter.post(
  '/controlled-ballot/submit',
  authenticate,
  requireVoter(),
  validate(submitSchema),
  wrap(async (req, res) => {
    const voter = await loadVoter(req, res);
    if (!voter) return;
    const result = await ballotService.submitBallot(voter, req.body);
    if (!result.ok) {
      res.status(result.error.status).json({ error: result.error.message });
      return;
    }
    res.status(201).json(result.value);
  }),
);

// Reconciliation report: Election Administrator and System Auditor.
simulatorRouter.get(
  '/elections/:id/reconciliation',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR', 'SYSTEM_AUDITOR'),
  validate(idParams, 'params'),
  wrap(async (req, res) => {
    const result = await simulatorService.reconcile(req.params.id);
    if (!result.ok) {
      res.status(result.error.status).json({ error: result.error.message });
      return;
    }
    res.status(200).json(result.value);
  }),
);

// Aggregate results after closure: every role may read them.
simulatorRouter.get(
  '/elections/:id/results',
  authenticate,
  validate(idParams, 'params'),
  wrap(async (req, res) => {
    const result = await simulatorService.results(req.params.id);
    if (!result.ok) {
      res.status(result.error.status).json({ error: result.error.message });
      return;
    }
    res.status(200).json(result.value);
  }),
);
