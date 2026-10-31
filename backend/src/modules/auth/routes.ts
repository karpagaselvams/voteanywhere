import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requireVoter } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  officerLoginLimiter,
  otpIssueLimiter,
  otpVerifyLimiter,
  passwordChangeLimiter,
} from '../../middleware/rateLimit';
import { authController } from './controller';
import {
  changePasswordSchema,
  officerLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
  sessionIdParamsSchema,
} from './schema';

// Paths, middleware chain, nothing else.
// Permission matrix: officer login — all officer roles; OTP issue/verify —
// voter path; read own session — all roles; revoke a session — Election
// Administrator, or a voter revoking their own.
export const authRouter = Router();

authRouter.post(
  '/officer/login',
  officerLoginLimiter,
  validate(officerLoginSchema),
  authController.officerLogin,
);

authRouter.post(
  '/voter/otp',
  otpIssueLimiter,
  validate(otpRequestSchema),
  authController.requestOtp,
);

authRouter.post(
  '/voter/otp/verify',
  otpVerifyLimiter,
  validate(otpVerifySchema),
  authController.verifyOtp,
);

authRouter.get('/session', authenticate, authController.readSession);

// Officers change their own password. Voters have no password — they
// authenticate with a mock OTP.
authRouter.post(
  '/password',
  authenticate,
  requireRole(
    'ELECTION_ADMINISTRATOR',
    'VERIFICATION_OFFICER',
    'POLLING_CENTRE_OFFICER',
    'SYSTEM_AUDITOR',
  ),
  passwordChangeLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);

// A voter revoking their own session (matrix: Voter — own).
authRouter.delete('/session', authenticate, requireVoter(), authController.revokeOwnSession);

// Election Administrator revoking any session.
authRouter.delete(
  '/sessions/:id',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR'),
  validate(sessionIdParamsSchema, 'params'),
  authController.revokeSessionById,
);
