import type { ActorType, OtpChallenge, Prisma, Session } from '@prisma/client';
import { prisma } from '../../config/prisma';

// Thrown inside the consume-and-issue transaction when another request
// consumed the challenge first. Enforces single use under concurrency.
export class ChallengeConsumedError extends Error {
  constructor() {
    super('OTP challenge already consumed');
    this.name = 'ChallengeConsumedError';
  }
}

interface CreateChallengeData {
  challengeId: string;
  voterId: string;
  otpHash: string;
  expiresAt: Date;
}

interface CreateSessionData {
  actorType: ActorType;
  officerId?: string;
  voterId?: string;
  role: string;
  expiresAt: Date;
}

export const authRepository = {
  findOfficerByUsername(username: string) {
    return prisma.officer.findUnique({ where: { username } });
  },

  findVoterByVoterNumber(voterNumber: string) {
    return prisma.voter.findUnique({ where: { voterNumber } });
  },

  findVoterById(id: string) {
    return prisma.voter.findUnique({ where: { id } });
  },

  createOtpChallenge(data: CreateChallengeData): Promise<OtpChallenge> {
    return prisma.otpChallenge.create({ data });
  },

  findChallengeByChallengeId(challengeId: string) {
    return prisma.otpChallenge.findUnique({ where: { challengeId } });
  },

  // Incremented on every failure, including attempts against an
  // already-invalid challenge, so an attacker learns nothing from counting.
  incrementAttempt(id: string) {
    return prisma.otpChallenge.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
  },

  deleteChallenge(id: string) {
    return prisma.otpChallenge.delete({ where: { id } });
  },

  // Single use: consumedAt is set in the same transaction that issues the
  // session, guarded by a conditional update so a concurrent verification
  // loses the race instead of issuing a second session.
  async consumeChallengeAndCreateSession(
    challengePk: string,
    session: CreateSessionData,
  ): Promise<Session> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const { count } = await tx.otpChallenge.updateMany({
        where: { id: challengePk, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (count === 0) {
        throw new ChallengeConsumedError();
      }
      return tx.session.create({ data: session });
    });
  },

  createSession(data: CreateSessionData): Promise<Session> {
    return prisma.session.create({ data });
  },

  findActiveSession(id: string) {
    return prisma.session.findFirst({
      where: { id, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  revokeSession(id: string) {
    return prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  findOfficerById(id: string) {
    return prisma.officer.findUnique({ where: { id } });
  },

  updateOfficerPassword(id: string, passwordHash: string) {
    return prisma.officer.update({ where: { id }, data: { passwordHash } });
  },

  // After a password change, every other session for the officer is revoked —
  // a stolen token should not survive a credential reset.
  revokeOtherSessions(officerId: string, exceptSessionId: string) {
    return prisma.session.updateMany({
      where: { officerId, revokedAt: null, id: { not: exceptSessionId } },
      data: { revokedAt: new Date() },
    });
  },
};
