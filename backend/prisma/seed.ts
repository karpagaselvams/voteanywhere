import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';

// Fictional demonstration data only: invented voters, constituencies,
// polling centres, candidates, and elections. No real names, no real
// electoral data, no production credentials.
//
// Officer passwords come from SEED_OFFICER_PASSWORD and are bcrypt-hashed
// like any other — the seed never stores a plaintext password, an OTP, or
// an encryption key.
//
// Idempotent: re-running upserts and does not duplicate rows.

const BCRYPT_COST = 12;

export async function runSeed(prisma: PrismaClient): Promise<void> {
  if (!env.SEED_OFFICER_PASSWORD) {
    throw new Error('SEED_OFFICER_PASSWORD is required to seed officer accounts');
  }
  const officerPasswordHash = await bcrypt.hash(env.SEED_OFFICER_PASSWORD, BCRYPT_COST);

  // --- Constituencies and polling centres -------------------------------
  const chennaiSouth = await prisma.constituency.upsert({
    where: { code: 'CHN-S' },
    update: {},
    create: { code: 'CHN-S', name: 'Chennai South' },
  });
  const maduraiCentral = await prisma.constituency.upsert({
    where: { code: 'MDU-C' },
    update: {},
    create: { code: 'MDU-C', name: 'Madurai Central' },
  });

  const chennaiSouthPc = await prisma.pollingCentre.upsert({
    where: { code: 'CHN-S-01' },
    update: {},
    create: { code: 'CHN-S-01', name: 'Chennai South Polling Centre 1', constituencyId: chennaiSouth.id },
  });
  const maduraiCentralPc = await prisma.pollingCentre.upsert({
    where: { code: 'MDU-C-01' },
    update: {},
    create: { code: 'MDU-C-01', name: 'Madurai Central Polling Centre 1', constituencyId: maduraiCentral.id },
  });

  // --- Election -----------------------------------------------------------
  const election = await prisma.election.upsert({
    where: { code: 'GE-2026' },
    update: {},
    create: {
      code: 'GE-2026',
      name: 'General Election 2026 (Simulated)',
      lifecycle: 'CONFIGURED',
      startsAt: new Date('2026-05-01T00:00:00Z'),
      endsAt: new Date('2026-05-01T12:00:00Z'),
    },
  });

  for (const constituency of [chennaiSouth, maduraiCentral]) {
    await prisma.electionConstituency.upsert({
      where: { electionId_constituencyId: { electionId: election.id, constituencyId: constituency.id } },
      update: {},
      create: { electionId: election.id, constituencyId: constituency.id },
    });
  }

  // --- Candidates (fictional) ---------------------------------------------
  const candidates = [
    { fullName: 'Kavin Raj', symbol: 'Lamp', constituency: chennaiSouth },
    { fullName: 'Divya Nair', symbol: 'Book', constituency: chennaiSouth },
    { fullName: 'Saran Prakash', symbol: 'Cycle', constituency: maduraiCentral },
    { fullName: 'Anitha Selvi', symbol: 'Star', constituency: maduraiCentral },
  ];
  for (const candidate of candidates) {
    await prisma.candidate.upsert({
      where: {
        electionId_constituencyId_fullName: {
          electionId: election.id,
          constituencyId: candidate.constituency.id,
          fullName: candidate.fullName,
        },
      },
      update: {},
      create: {
        fullName: candidate.fullName,
        symbol: candidate.symbol,
        electionId: election.id,
        constituencyId: candidate.constituency.id,
      },
    });
  }

  // --- Officers (one per role) ---------------------------------------------
  const officers = [
    { username: 'admin.asha', displayName: 'Asha Raman', role: 'ELECTION_ADMINISTRATOR' as const },
    { username: 'officer.verification', displayName: 'Vikram Surya', role: 'VERIFICATION_OFFICER' as const },
    { username: 'officer.polling', displayName: 'Nila Krishnan', role: 'POLLING_CENTRE_OFFICER' as const },
    { username: 'auditor.dev', displayName: 'Devika Menon', role: 'SYSTEM_AUDITOR' as const },
  ];
  for (const officer of officers) {
    await prisma.officer.upsert({
      where: { username: officer.username },
      // Re-seeding refreshes demo credentials when SEED_OFFICER_PASSWORD changes.
      update: { passwordHash: officerPasswordHash },
      create: { ...officer, passwordHash: officerPasswordHash },
    });
  }

  // --- Voters (fictional) ---------------------------------------------------
  // Arjun exercises the Core Rule: registered in Chennai South, approved to
  // appear at a Madurai Central polling centre, and still receives the
  // Chennai South ballot.
  const arjun = await prisma.voter.upsert({
    where: { voterNumber: 'VA-0001' },
    update: {},
    create: {
      voterNumber: 'VA-0001',
      fullName: 'Arjun Karthik',
      registeredConstituencyId: chennaiSouth.id,
      homePollingCentreId: chennaiSouthPc.id,
    },
  });
  await prisma.voter.upsert({
    where: { voterNumber: 'VA-0002' },
    update: {},
    create: {
      voterNumber: 'VA-0002',
      fullName: 'Meera Lakshmi',
      registeredConstituencyId: maduraiCentral.id,
      homePollingCentreId: maduraiCentralPc.id,
    },
  });

  // Core Rule scenario: a pending remote polling request from a Chennai
  // South voter for the Madurai Central polling centre.
  const existingRequest = await prisma.remotePollingRequest.findFirst({
    where: { voterId: arjun.id, electionId: election.id },
  });
  if (!existingRequest) {
    await prisma.remotePollingRequest.create({
      data: {
        voterId: arjun.id,
        electionId: election.id,
        pollingCentreId: maduraiCentralPc.id,
        reason: 'Working away from registered constituency during the election period.',
        status: 'PENDING',
      },
    });
  }
}

// Run directly via `prisma db seed`; imported by tests for idempotency checks.
if (require.main === module) {
  const { PrismaClient: Client } = require('@prisma/client') as typeof import('@prisma/client');
  const prisma = new Client();
  runSeed(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
