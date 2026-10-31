import { prisma } from '../../config/prisma';

// Read-only aggregates for the admin dashboard. All Prisma access for the
// admin module lives here.
export const adminRepository = {
  electionsByLifecycle() {
    return prisma.election.groupBy({ by: ['lifecycle'], _count: { id: true } });
  },

  countVoters() {
    return prisma.voter.count();
  },

  countCentres() {
    return prisma.pollingCentre.count();
  },

  requestsByStatus() {
    return prisma.remotePollingRequest.groupBy({ by: ['status'], _count: { id: true } });
  },

  countSubmittedBallots() {
    return prisma.submittedBallot.count();
  },
};
