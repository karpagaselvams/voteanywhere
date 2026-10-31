import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { ActorType, Officer, Session, Voter } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { err, ok, type Result } from '../../lib/result';
import { auditService } from '../audit/service';
import { authRepository, ChallengeConsumedError } from './repository';

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

export interface OfficerLoginResult extends IssuedSession {
  officer: Pick<Officer, 'id' | 'username' | 'role' | 'displayName'>;
}

export interface OtpIssuedResult {
  challengeId: string;
  expiresAt: Date;
  // Clearly marked development channel — present only outside production so
  // tests and local development can complete the mock OTP flow.
  devOnlyOtp?: string;
}

export interface VoterLoginResult extends IssuedSession {
  voter: Pick<Voter, 'id' | 'voterNumber' | 'fullName' | 'registeredConstituencyId'>;
}

const INVALID_CREDENTIALS = 'Invalid username or password';
const INVALID_OTP = 'Invalid or expired code';

// Precomputed hash used to keep bcrypt.compare running on paths where no
// account or challenge exists, so response timing does not reveal which
// usernames and voter numbers are registered.
const DUMMY_HASH = bcrypt.hashSync('dummy-value-for-uniform-timing', 12);

function signToken(session: Session): string {
  return jwt.sign(
    { sub: session.officerId ?? session.voterId, role: session.role, jti: session.id },
    env.JWT_SECRET,
    { expiresIn: `${env.SESSION_TTL_MINUTES}m` },
  );
}

function sessionExpiry(): Date {
  return new Date(Date.now() + env.SESSION_TTL_MINUTES * 60_000);
}

export const authService = {
  async officerLogin(username: string, password: string): Promise<Result<OfficerLoginResult>> {
    const officer = await authRepository.findOfficerByUsername(username);
    const passwordMatches = await bcrypt.compare(password, officer?.passwordHash ?? DUMMY_HASH);

    if (!officer || !passwordMatches) {
      await auditService.record({
        actorType: 'OFFICER',
        actorId: officer?.id ?? null,
        action: 'auth.officer_login.failure',
        entityType: 'Officer',
        entityRef: username,
      });
      return err(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS);
    }

    const session = await authRepository.createSession({
      actorType: 'OFFICER',
      officerId: officer.id,
      role: officer.role,
      expiresAt: sessionExpiry(),
    });

    await auditService.record({
      actorType: 'OFFICER',
      actorId: officer.id,
      action: 'auth.officer_login.success',
      entityType: 'Session',
      entityRef: session.id,
    });

    return ok({
      token: signToken(session),
      expiresAt: session.expiresAt,
      officer: {
        id: officer.id,
        username: officer.username,
        role: officer.role,
        displayName: officer.displayName,
      },
    });
  },

  async requestOtp(voterNumber: string): Promise<Result<OtpIssuedResult>> {
    const voter = await authRepository.findVoterByVoterNumber(voterNumber);
    if (!voter) {
      // Uniform failure: an unknown voter number is indistinguishable from
      // any other OTP failure, so valid voter numbers cannot be enumerated.
      await bcrypt.compare(voterNumber, DUMMY_HASH);
      return err(401, 'INVALID_CREDENTIALS', INVALID_OTP);
    }

    // 6 digits from a CSPRNG — never Math.random.
    const otp = crypto.randomInt(100_000, 1_000_000).toString();
    const challenge = await authRepository.createOtpChallenge({
      challengeId: crypto.randomBytes(16).toString('hex'),
      voterId: voter.id,
      otpHash: await bcrypt.hash(otp, env.BCRYPT_COST),
      expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1_000),
    });

    await auditService.record({
      actorType: 'VOTER',
      actorId: voter.id,
      action: 'auth.otp.issued',
      entityType: 'OtpChallenge',
      entityRef: challenge.challengeId,
    });

    if (env.NODE_ENV === 'development') {
      logger.info('[DEV ONLY] mock OTP issued', { voterId: voter.id, otp });
    }

    const result: OtpIssuedResult = {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
    };
    if (env.NODE_ENV === 'test') {
      result.devOnlyOtp = otp;
    }
    return ok(result);
  },

  async verifyOtp(challengeId: string, otp: string): Promise<Result<VoterLoginResult>> {
    const invalid = () => err(401, 'INVALID_CREDENTIALS', INVALID_OTP);
    const challenge = await authRepository.findChallengeByChallengeId(challengeId);
    const otpMatches = await bcrypt.compare(otp, challenge?.otpHash ?? DUMMY_HASH);

    if (!challenge) {
      return invalid();
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      // An expired challenge is rejected and deleted, not merely marked.
      await authRepository.deleteChallenge(challenge.id);
      await this.recordVerifyFailure(challenge.voterId, challengeId);
      return invalid();
    }

    if (challenge.consumedAt !== null || challenge.attemptCount >= env.OTP_MAX_ATTEMPTS) {
      await authRepository.incrementAttempt(challenge.id);
      await this.recordVerifyFailure(challenge.voterId, challengeId);
      return invalid();
    }

    if (!otpMatches) {
      await authRepository.incrementAttempt(challenge.id);
      await this.recordVerifyFailure(challenge.voterId, challengeId);
      return invalid();
    }

    let session: Session;
    try {
      session = await authRepository.consumeChallengeAndCreateSession(challenge.id, {
        actorType: 'VOTER',
        voterId: challenge.voterId,
        role: 'VOTER',
        expiresAt: sessionExpiry(),
      });
    } catch (error) {
      if (error instanceof ChallengeConsumedError) {
        // Lost a concurrent verification race: the challenge is single use.
        await this.recordVerifyFailure(challenge.voterId, challengeId);
        return invalid();
      }
      throw error;
    }

    return ok({
      token: signToken(session),
      expiresAt: session.expiresAt,
      voter: await this.loadVoter(challenge.voterId),
    });
  },

  async readSession(sessionId: string): Promise<Result<{ id: string; role: string; issuedAt: Date; expiresAt: Date }>> {
    const session = await authRepository.findActiveSession(sessionId);
    if (!session) {
      return err(401, 'SESSION_INVALID', 'Session expired or revoked');
    }
    return ok({
      id: session.id,
      role: session.role,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    });
  },

  async revokeSession(
    sessionId: string,
    actor: { actorType: ActorType; actorId: string | null },
  ): Promise<Result<{ revoked: true }>> {
    const { count } = await authRepository.revokeSession(sessionId);
    if (count === 0) {
      return err(404, 'NOT_FOUND', 'Session not found');
    }
    await auditService.record({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: 'auth.session.revoked',
      entityType: 'Session',
      entityRef: sessionId,
    });
    return ok({ revoked: true });
  },

  // Officer self-service password change. The current password is verified
  // first; other sessions are revoked so a stolen token dies with the old
  // credential.
  async changePassword(
    officerId: string,
    sessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Result<{ changed: true }>> {
    const officer = await authRepository.findOfficerById(officerId);
    const matches = await bcrypt.compare(currentPassword, officer?.passwordHash ?? DUMMY_HASH);
    if (!officer || !matches) {
      await auditService.record({
        actorType: 'OFFICER',
        actorId: officerId,
        action: 'auth.password.change.failure',
        entityType: 'Officer',
        entityRef: officerId,
      });
      return err(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }

    await authRepository.updateOfficerPassword(
      officerId,
      await bcrypt.hash(newPassword, env.BCRYPT_COST),
    );
    await authRepository.revokeOtherSessions(officerId, sessionId);
    await auditService.record({
      actorType: 'OFFICER',
      actorId: officerId,
      action: 'auth.password.changed',
      entityType: 'Officer',
      entityRef: officerId,
    });
    return ok({ changed: true });
  },

  async recordVerifyFailure(voterId: string, challengeId: string): Promise<void> {
    await auditService.record({
      actorType: 'VOTER',
      actorId: voterId,
      action: 'auth.otp.verify.failure',
      entityType: 'OtpChallenge',
      entityRef: challengeId,
    });
  },

  async loadVoter(voterId: string): Promise<VoterLoginResult['voter']> {
    const voter = await authRepository.findVoterById(voterId);
    if (!voter) {
      throw new Error('voter missing for verified challenge');
    }
    return {
      id: voter.id,
      voterNumber: voter.voterNumber,
      fullName: voter.fullName,
      registeredConstituencyId: voter.registeredConstituencyId,
    };
  },
};
