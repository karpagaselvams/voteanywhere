import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requireVoter } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { remotePollingService as service } from './service';
import {
  queueQuerySchema,
  rejectSchema,
  requestIdParamsSchema,
  submitRequestSchema,
} from './schema';

// Permission matrix:
//   centres list        — all officers and voters
//   submit/withdraw/read own — voter, own resources only (session-scoped)
//   queue               — Verification Officer, Polling Centre Officer
//   claim/release/approve/reject — Verification Officer alone
export const remotePollingRouter = Router();

const send = async (
  res: Response,
  next: NextFunction,
  result: { ok: boolean; value?: unknown; error?: { status: number; message: string } },
  successStatus = 200,
): Promise<void> => {
  if (!result.ok) {
    res.status(result.error!.status).json({ error: result.error!.message });
    return;
  }
  res.status(successStatus).json(result.value);
  return undefined;
};

const wrap =
  (fn: (req: Request) => Promise<Parameters<typeof send>[2]>, successStatus = 200) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await send(res, next, await fn(req), successStatus);
    } catch (error) {
      next(error);
    }
  };

remotePollingRouter.get(
  '/centres',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Any authenticated actor may list centres; the matrix grants this to all
    // officers and voters.
    try {
      res.status(200).json(await service.listCentres());
    } catch (error) {
      next(error);
    }
  },
);

remotePollingRouter.get(
  '/dashboard',
  authenticate,
  requireVoter(),
  wrap((req) => service.dashboard(req.auth!.voterId!)),
);

remotePollingRouter.get(
  '/requests/mine',
  authenticate,
  requireVoter(),
  wrap((req) => service.getMyRequest(req.auth!.voterId!)),
);

remotePollingRouter.post(
  '/requests',
  authenticate,
  requireVoter(),
  validate(submitRequestSchema),
  wrap((req) => service.submitRequest(req.auth!.voterId!, req.body), 201),
);

remotePollingRouter.post(
  '/requests/mine/withdraw',
  authenticate,
  requireVoter(),
  wrap((req) => service.withdrawMyRequest(req.auth!.voterId!)),
);

remotePollingRouter.get(
  '/assignments/mine',
  authenticate,
  requireVoter(),
  wrap((req) => service.getMyAssignment(req.auth!.voterId!)),
);

remotePollingRouter.get(
  '/requests',
  authenticate,
  requireRole('VERIFICATION_OFFICER', 'POLLING_CENTRE_OFFICER'),
  validate(queueQuerySchema, 'query'),
  wrap((req) => service.listQueue((req.query as { status?: never }).status)),
);

remotePollingRouter.post(
  '/requests/:id/claim',
  authenticate,
  requireRole('VERIFICATION_OFFICER'),
  validate(requestIdParamsSchema, 'params'),
  wrap((req) => service.claim(req.params.id, req.auth!.officerId!)),
);

remotePollingRouter.post(
  '/requests/:id/release',
  authenticate,
  requireRole('VERIFICATION_OFFICER'),
  validate(requestIdParamsSchema, 'params'),
  wrap((req) => service.release(req.params.id, req.auth!.officerId!)),
);

remotePollingRouter.post(
  '/requests/:id/approve',
  authenticate,
  requireRole('VERIFICATION_OFFICER'),
  validate(requestIdParamsSchema, 'params'),
  wrap((req) => service.approve(req.params.id, req.auth!.officerId!)),
);

remotePollingRouter.post(
  '/requests/:id/reject',
  authenticate,
  requireRole('VERIFICATION_OFFICER'),
  validate(requestIdParamsSchema, 'params'),
  validate(rejectSchema),
  wrap((req) => service.reject(req.params.id, req.auth!.officerId!, req.body.reason)),
);
