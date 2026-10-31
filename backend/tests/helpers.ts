import crypto from 'crypto';
import type { Voter } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { runSeed } from '../prisma/seed';

// Deletes every row in FK-safe order.
export async function resetDatabase(): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.auditRecord.deleteMany();
  await prisma.remotePollingAssignment.deleteMany();
  await prisma.remotePollingRequest.deleteMany();
  await prisma.voterElectionStatus.deleteMany();
  await prisma.submittedBallot.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.electionConstituency.deleteMany();
  await prisma.election.deleteMany();
  await prisma.voter.deleteMany();
  await prisma.pollingCentre.deleteMany();
  await prisma.constituency.deleteMany();
  await prisma.officer.deleteMany();
}

export async function resetAndSeed(): Promise<void> {
  await resetDatabase();
  await runSeed(prisma);
}

// Fresh voter per test so OTP-issue rate limits (per voter number) never
// collide across tests.
export async function createTestVoter(): Promise<Voter> {
  const constituency = await prisma.constituency.findUniqueOrThrow({ where: { code: 'CHN-S' } });
  return prisma.voter.create({
    data: {
      voterNumber: `VA-T-${crypto.randomUUID().slice(0, 8)}`,
      fullName: 'Test Voter',
      registeredConstituencyId: constituency.id,
    },
  });
}

// Logs a voter in through the real OTP flow and returns the Bearer token.
export async function loginVoter(app: Express, voterNumber: string): Promise<string> {
  const issued = await request(app).post('/api/auth/voter/otp').send({ voterNumber });
  const verified = await request(app)
    .post('/api/auth/voter/otp/verify')
    .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });
  if (verified.status !== 200) throw new Error(`voter login failed: ${verified.status}`);
  return verified.body.token as string;
}

export async function loginOfficer(app: Express, username: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/officer/login')
    .send({ username, password: 'test-officer-password-1' });
  if (res.status !== 200) throw new Error(`officer login failed: ${res.status}`);
  return res.body.token as string;
}

export { prisma };
