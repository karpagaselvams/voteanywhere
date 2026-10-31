import type { ActorType } from '@prisma/client';

// Authenticated caller context, attached by the authenticate middleware.
export interface AuthContext {
  sessionId: string;
  actorType: ActorType;
  role: string;
  officerId?: string;
  voterId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
