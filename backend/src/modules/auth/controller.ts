import type { NextFunction, Request, Response } from 'express';
import { authService } from './service';
import type {
  ChangePasswordInput,
  OfficerLoginInput,
  OtpRequestInput,
  OtpVerifyInput,
} from './schema';

// Controllers parse the (already validated) request, call the service, and
// shape the response. No business rules live here.
export const authController = {
  async officerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body as OfficerLoginInput;
      const result = await authService.officerLogin(username, password);
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },

  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { voterNumber } = req.body as OtpRequestInput;
      const result = await authService.requestOtp(voterNumber);
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp } = req.body as OtpVerifyInput;
      const result = await authService.verifyOtp(challengeId, otp);
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },

  async readSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.readSession(req.auth!.sessionId);
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },

  async revokeOwnSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = req.auth!;
      const result = await authService.revokeSession(auth.sessionId, {
        actorType: auth.actorType,
        actorId: auth.officerId ?? auth.voterId ?? null,
      });
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;
      const auth = req.auth!;
      const result = await authService.changePassword(
        auth.officerId!,
        auth.sessionId,
        currentPassword,
        newPassword,
      );
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },

  async revokeSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = req.auth!;
      const result = await authService.revokeSession(req.params.id, {
        actorType: auth.actorType,
        actorId: auth.officerId ?? auth.voterId ?? null,
      });
      if (!result.ok) {
        res.status(result.error.status).json({ error: result.error.message });
        return;
      }
      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  },
};
