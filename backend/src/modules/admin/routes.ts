import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { adminRepository as repo } from './repository';
import { remotePollingRepository } from '../remote-polling/repository';

// Election Administrator oversight: real aggregates and a filterable
// request report. Configuration operations live in the elections module.
export const adminRouter = Router();

adminRouter.get(
  '/dashboard',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [elections, voters, centres, byStatus, ballots] = await Promise.all([
        repo.electionsByLifecycle(),
        repo.countVoters(),
        repo.countCentres(),
        repo.requestsByStatus(),
        repo.countSubmittedBallots(),
      ]);
      const lifecycle = Object.fromEntries(
        elections.map((e) => [e.lifecycle, e._count.id]),
      ) as Record<string, number>;
      const requests = Object.fromEntries(
        byStatus.map((r) => [r.status, r._count.id]),
      ) as Record<string, number>;
      const decided = (requests.APPROVED ?? 0) + (requests.REJECTED ?? 0);
      res.status(200).json({
        elections: {
          configured: lifecycle.CONFIGURED ?? 0,
          active: lifecycle.ACTIVE ?? 0,
          closed: lifecycle.CLOSED ?? 0,
        },
        voters,
        pollingCentres: centres,
        submittedBallots: ballots,
        requests: {
          ...requests,
          total: byStatus.reduce((sum, r) => sum + r._count.id, 0),
          approvalRate: decided > 0 ? Math.round(((requests.APPROVED ?? 0) / decided) * 100) : null,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

const reportQuery = z.object({
  status: z
    .enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'USED', 'EXPIRED'])
    .optional(),
});

adminRouter.get(
  '/reports',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  validate(reportQuery, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.query as unknown as z.infer<typeof reportQuery>;
      const requests = await remotePollingRepository.listRequests(status);
      res.status(200).json({
        totalRecords: requests.length,
        requests: requests.map((r) => ({
          id: r.id,
          status: r.status,
          voter: { voterNumber: r.voter.voterNumber, fullName: r.voter.fullName },
          election: { code: r.election.code, name: r.election.name },
          pollingCentre: {
            code: r.pollingCentre.code,
            name: r.pollingCentre.name,
            constituency: r.pollingCentre.constituency.name,
          },
          submittedAt: r.createdAt,
          reviewedAt: r.reviewedAt,
          reviewedBy: r.reviewedBy?.displayName ?? null,
          reviewNote: r.reviewNote,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);
