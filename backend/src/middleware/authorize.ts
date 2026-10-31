import type { NextFunction, Request, Response } from 'express';
import type { OfficerRole } from '@prisma/client';

// Explicit allow-list, deny by default. There is no wildcard and no
// negative check: a role added later gains access to nothing until it is
// named here. The 403 body is fixed and reveals nothing about the resource.
export function requireRole(...roles: OfficerRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth || auth.actorType !== 'OFFICER' || !roles.includes(auth.role as OfficerRole)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export function requireVoter() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth || auth.actorType !== 'VOTER') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
