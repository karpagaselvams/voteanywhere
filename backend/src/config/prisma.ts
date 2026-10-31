import { PrismaClient } from '@prisma/client';

// Shared Prisma client. Imported only by repositories and the seed —
// never by controllers or services (see the backend-modules rule).
export const prisma = new PrismaClient();
