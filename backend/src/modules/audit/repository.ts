import type { ActorType, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../config/prisma';

export interface AuditEntry {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityRef?: string;
}

type Client = PrismaClient | Prisma.TransactionClient;

// The only write path for audit records. There is no update or delete:
// audit records are written by services as a side effect of state-changing
// operations, never through an API route.
export function createAuditRepository(client: Client = prisma) {
  return {
    record(entry: AuditEntry) {
      return client.auditRecord.create({
        data: {
          actorType: entry.actorType,
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityRef: entry.entityRef,
        },
      });
    },
  };
}

export const auditRepository = createAuditRepository();

// Read side, for the System Auditor. No update or delete exists anywhere.
export function listAuditRecords(filter: { action?: string; limit: number }) {
  return prisma.auditRecord.findMany({
    where: filter.action ? { action: filter.action } : undefined,
    orderBy: { createdAt: 'desc' },
    take: filter.limit,
  });
}
