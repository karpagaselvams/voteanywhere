import type { RemotePollingRequestStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

// All Prisma access for the officer module.
export const officerRepository = {
  countRequests(statuses: RemotePollingRequestStatus[], reviewedById?: string) {
    return prisma.remotePollingRequest.count({
      where: {
        status: statuses.length === 1 ? statuses[0] : { in: statuses },
        ...(reviewedById ? { reviewedById } : {}),
      },
    });
  },

  countAssignments() {
    return prisma.remotePollingAssignment.count();
  },

  countAuditRecords() {
    return prisma.auditRecord.count();
  },

  countSubmittedBallots() {
    return prisma.submittedBallot.count();
  },

  countSessions() {
    return prisma.session.count();
  },
};
