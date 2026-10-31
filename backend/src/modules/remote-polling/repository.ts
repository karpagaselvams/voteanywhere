import type { Prisma, RemotePollingRequestStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

const withGeography = {
  pollingCentre: { include: { constituency: true } },
  election: true,
} satisfies Prisma.RemotePollingRequestInclude;

export const remotePollingRepository = {
  listCentres() {
    return prisma.pollingCentre.findMany({
      orderBy: { code: 'asc' },
      include: { constituency: true },
    });
  },

  findCentreById(id: string) {
    return prisma.pollingCentre.findUnique({
      where: { id },
      include: { constituency: true },
    });
  },

  findLatestRequestForVoter(voterId: string, electionId?: string) {
    return prisma.remotePollingRequest.findFirst({
      where: { voterId, ...(electionId ? { electionId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: withGeography,
    });
  },

  findRequestById(id: string) {
    return prisma.remotePollingRequest.findUnique({
      where: { id },
      include: { ...withGeography, voter: true, reviewedBy: true },
    });
  },

  listRequests(status?: RemotePollingRequestStatus) {
    return prisma.remotePollingRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { ...withGeography, voter: true, reviewedBy: true },
    });
  },

  createRequest(data: { voterId: string; electionId: string; pollingCentreId: string; reason?: string }) {
    return prisma.remotePollingRequest.create({
      data: { ...data, status: 'PENDING' },
      include: withGeography,
    });
  },

  findAssignmentForVoter(voterId: string, electionId: string) {
    return prisma.remotePollingAssignment.findUnique({
      where: { voterId_electionId: { voterId, electionId } },
      include: { pollingCentre: { include: { constituency: true } }, election: true, request: true },
    });
  },

  // Approve: status flip and assignment creation land in one transaction —
  // an approved request with no assignment would let a voter through with
  // nothing to verify against.
  async approveWithAssignment(
    requestId: string,
    officerId: string,
    data: { voterId: string; electionId: string; pollingCentreId: string },
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const request = await tx.remotePollingRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedById: officerId, reviewedAt: new Date() },
      });
      const assignment = await tx.remotePollingAssignment.create({
        data: { requestId, assignedById: officerId, ...data },
      });
      return { request, assignment };
    });
  },

  updateStatus(
    id: string,
    status: RemotePollingRequestStatus,
    extra: { reviewedById?: string | null; reviewedAt?: Date; reviewNote?: string } = {},
  ) {
    return prisma.remotePollingRequest.update({
      where: { id },
      data: { status, ...extra },
    });
  },

  findOpenRequestIds(electionId: string) {
    return prisma.remotePollingRequest.findMany({
      where: { electionId, status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] } },
      select: { id: true, status: true },
    });
  },

  // System transition on election closure: every still-open request expires.
  expireOpenRequests(electionId: string) {
    return prisma.remotePollingRequest.updateMany({
      where: { electionId, status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] } },
      data: { status: 'EXPIRED' },
    });
  },

  // APPROVED → USED, written inside the ballot submission transaction.
  // The conditional where-clause makes the transition idempotent-safe: a
  // request not in APPROVED matches zero rows and the caller treats that as
  // an illegal transition.
  markUsedInTransaction(tx: Prisma.TransactionClient, requestId: string) {
    return tx.remotePollingRequest.updateMany({
      where: { id: requestId, status: 'APPROVED' },
      data: { status: 'USED' },
    });
  },
};
