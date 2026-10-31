import { prisma } from '../../config/prisma';

export const voterRepository = {
  findByIdWithGeography(id: string) {
    return prisma.voter.findUnique({
      where: { id },
      include: {
        registeredConstituency: true,
        homePollingCentre: true,
      },
    });
  },

  findByVoterNumberWithGeography(voterNumber: string) {
    return prisma.voter.findUnique({
      where: { voterNumber },
      include: {
        registeredConstituency: true,
        homePollingCentre: true,
      },
    });
  },

  hasVoted(voterId: string, electionId: string) {
    return prisma.voterElectionStatus.findUnique({
      where: { voterId_electionId: { voterId, electionId } },
    });
  },
};
