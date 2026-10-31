import { prisma, resetAndSeed, resetDatabase } from './helpers';
import { runSeed } from '../prisma/seed';

// Database-constraint tests run against real PostgreSQL: a mocked Prisma
// client cannot exercise a constraint or a transaction.

beforeAll(async () => {
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function coreIds() {
  const voter = await prisma.voter.findUniqueOrThrow({ where: { voterNumber: 'VA-0001' } });
  const election = await prisma.election.findUniqueOrThrow({ where: { code: 'GE-2026' } });
  const centre = await prisma.pollingCentre.findUniqueOrThrow({ where: { code: 'CHN-S-01' } });
  return { voter, election, centre };
}

describe('one ballot per voter per election', () => {
  it('rejects a duplicate VoterElectionStatus', async () => {
    const { voter, election } = await coreIds();
    await prisma.voterElectionStatus.create({ data: { voterId: voter.id, electionId: election.id } });
    await expect(
      prisma.voterElectionStatus.create({ data: { voterId: voter.id, electionId: election.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('one active remote polling request per voter per election', () => {
  it('rejects a second active request while one is pending', async () => {
    const { voter, election, centre } = await coreIds();
    // The seed already created a PENDING request for this voter and election.
    await expect(
      prisma.remotePollingRequest.create({
        data: { voterId: voter.id, electionId: election.id, pollingCentreId: centre.id },
      }),
    ).rejects.toThrow();
  });

  it('allows a new request once the previous one is no longer active', async () => {
    const { voter, election, centre } = await coreIds();
    await prisma.remotePollingRequest.updateMany({
      where: { voterId: voter.id, electionId: election.id },
      data: { status: 'WITHDRAWN' },
    });
    await expect(
      prisma.remotePollingRequest.create({
        data: { voterId: voter.id, electionId: election.id, pollingCentreId: centre.id },
      }),
    ).resolves.toMatchObject({ status: 'PENDING' });
  });
});

describe('secrecy boundary', () => {
  it('a rolled-back transaction leaves no rows on either side', async () => {
    // VA-0002 has no VoterElectionStatus rows from earlier tests, so the
    // transaction fails only on the forced throw.
    const voter = await prisma.voter.findUniqueOrThrow({ where: { voterNumber: 'VA-0002' } });
    const { election } = await coreIds();
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.voterElectionStatus.create({
          data: { voterId: voter.id, electionId: election.id, hasVoted: true },
        });
        await tx.submittedBallot.create({
          data: {
            ballotReference: 'rolled-back-reference',
            electionId: election.id,
            constituencyId: voter.registeredConstituencyId,
            nonce: Buffer.alloc(12),
            ciphertext: Buffer.alloc(16),
            authTag: Buffer.alloc(16),
          },
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(
      await prisma.voterElectionStatus.findFirst({
        where: { voterId: voter.id, electionId: election.id, hasVoted: true },
      }),
    ).toBeNull();
    expect(
      await prisma.submittedBallot.findUnique({ where: { ballotReference: 'rolled-back-reference' } }),
    ).toBeNull();
  });

  it('SubmittedBallot has no column that references a voter', async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'SubmittedBallot'
    `;
    expect(columns.map((c) => c.column_name.toLowerCase())).not.toContain('voterid');
  });
});

describe('seed idempotency', () => {
  it('runs twice without duplicating rows', async () => {
    await resetDatabase();
    await runSeed(prisma);
    const first = await prisma.officer.count();
    const firstVoters = await prisma.voter.count();

    await runSeed(prisma);

    expect(await prisma.officer.count()).toBe(first);
    expect(await prisma.voter.count()).toBe(firstVoters);
    expect(await prisma.remotePollingRequest.count()).toBe(1);
  });
});
