import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { remotePollingRepository } from '../remote-polling/repository';
import type { SealedChoice } from './crypto';

// The only Prisma access for ballot work. Services orchestrate; repositories
// persist.
export const ballotRepository = {
  findElectionStatus(voterId: string, electionId: string) {
    return prisma.voterElectionStatus.findUnique({
      where: { voterId_electionId: { voterId, electionId } },
    });
  },

  findCandidates(electionId: string, constituencyId: string) {
    return prisma.candidate.findMany({
      where: { electionId, constituencyId },
      orderBy: { fullName: 'asc' },
    });
  },

  findCandidateOnBallot(candidateId: string, electionId: string, constituencyId: string) {
    return prisma.candidate.findFirst({
      where: { id: candidateId, electionId, constituencyId },
    });
  },

  findAssignment(voterId: string, electionId: string) {
    return prisma.remotePollingAssignment.findUnique({
      where: { voterId_electionId: { voterId, electionId } },
      include: { pollingCentre: true, request: true },
    });
  },

  findConstituency(id: string) {
    return prisma.constituency.findUniqueOrThrow({ where: { id } });
  },

  // Two rows on opposite sides of the secrecy boundary land together or not
  // at all. If the identity-side write hits the unique constraint, the
  // choice-side write rolls back with it.
  submitInTransaction(data: {
    voterId: string;
    electionId: string;
    constituencyId: string;
    ballotReference: string;
    sealed: SealedChoice;
    requestIdToMarkUsed?: string;
  }) {
    return prisma.$transaction(async (trx: Prisma.TransactionClient) => {
      await trx.voterElectionStatus.create({
        data: {
          voterId: data.voterId,
          electionId: data.electionId,
          hasVoted: true,
          votedAt: new Date(),
        },
      });
      const ballot = await trx.submittedBallot.create({
        data: {
          ballotReference: data.ballotReference,
          electionId: data.electionId,
          constituencyId: data.constituencyId,
          nonce: data.sealed.nonce,
          ciphertext: data.sealed.ciphertext,
          authTag: data.sealed.authTag,
        },
      });
      if (data.requestIdToMarkUsed) {
        await remotePollingRepository.markUsedInTransaction(trx, data.requestIdToMarkUsed);
      }
      return ballot;
    });
  },

  listBallotsForElection(electionId: string) {
    return prisma.submittedBallot.findMany({ where: { electionId } });
  },

  listCandidatesForElection(electionId: string) {
    return prisma.candidate.findMany({
      where: { electionId },
      include: { constituency: true },
    });
  },

  countBallotsByConstituency(electionId: string) {
    return prisma.submittedBallot.groupBy({
      by: ['constituencyId'],
      where: { electionId },
      _count: { ballotReference: true },
    });
  },

  // Identity side has no constituency column; issued counts per
  // constituency come through the voter's registered constituency.
  listIssuedStatuses(electionId: string) {
    return prisma.voterElectionStatus.findMany({
      where: { electionId, hasVoted: true },
      include: { voter: { select: { registeredConstituencyId: true } } },
    });
  },
};
