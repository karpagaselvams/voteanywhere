import type { ElectionLifecycle } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const electionRepository = {
  // The demo works with a single current election; latest created wins.
  findCurrent() {
    return prisma.election.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { constituencies: true },
    });
  },

  findById(id: string) {
    return prisma.election.findUnique({
      where: { id },
      include: { constituencies: { include: { constituency: true } } },
    });
  },

  listAll() {
    return prisma.election.findMany({
      orderBy: { createdAt: 'desc' },
      include: { constituencies: { include: { constituency: true } } },
    });
  },

  setLifecycle(id: string, lifecycle: ElectionLifecycle) {
    return prisma.election.update({ where: { id }, data: { lifecycle } });
  },

  listCandidates() {
    return prisma.candidate.findMany({
      orderBy: [{ electionId: 'asc' }, { constituencyId: 'asc' }, { fullName: 'asc' }],
      include: { election: true, constituency: true },
    });
  },

  listCentres() {
    return prisma.pollingCentre.findMany({
      orderBy: { code: 'asc' },
      include: { constituency: true },
    });
  },
};
