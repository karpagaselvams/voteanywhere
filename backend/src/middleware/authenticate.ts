import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { authRepository } from '../modules/auth/repository';

interface TokenPayload {
  sub: string;
  role: string;
  jti: string;
}

// Verifies the JWT AND the server-side session record, so a revoked session
// stops working immediately instead of at token expiry.
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET) as TokenPayload;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const session = await authRepository.findActiveSession(payload.jti);
    if (!session) {
      res.status(401).json({ error: 'Session expired or revoked' });
      return;
    }
    req.auth = {
      sessionId: session.id,
      actorType: session.actorType,
      role: session.role,
      officerId: session.officerId ?? undefined,
      voterId: session.voterId ?? undefined,
    };
    next();
  } catch (error) {
    next(error);
  }
}
