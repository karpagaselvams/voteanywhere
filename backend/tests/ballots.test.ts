import request from 'supertest';
import { createApp } from '../src/app';
import { prisma, resetAndSeed, createTestVoter, loginVoter, loginOfficer } from './helpers';
import { verifyBallotIntegrity } from '../src/modules/ballots/crypto';

const app = createApp();

let electionId: string;
// Voters with pre-approved Madurai assignments, prepared while the election
// is CONFIGURED — requests cannot be submitted once the election opens.
let coreRuleVoter: Awaited<ReturnType<typeof createTestVoter>>;
let usedMarkingVoter: Awaited<ReturnType<typeof createTestVoter>>;

async function activateElection() {
  const admin = await loginOfficer(app, 'admin.asha');
  const res = await request(app)
    .post(`/api/admin/elections/${electionId}/activate`)
    .set('Authorization', `Bearer ${admin}`);
  expect(res.status).toBe(200);
}

/** Approves a remote polling assignment to Madurai Central for the voter. */
async function approveRemoteAssignment(voterNumber: string): Promise<void> {
  const token = await loginVoter(app, voterNumber);
  const centre = await prisma.pollingCentre.findUniqueOrThrow({ where: { code: 'MDU-C-01' } });
  const submitted = await request(app)
    .post('/api/remote-polling/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ electionId, pollingCentreId: centre.id, reason: 'Away for work.' });
  expect(submitted.status).toBe(201);
  const vo = await loginOfficer(app, 'officer.verification');
  await request(app)
    .post(`/api/remote-polling/requests/${submitted.body.id}/claim`)
    .set('Authorization', `Bearer ${vo}`);
  const approved = await request(app)
    .post(`/api/remote-polling/requests/${submitted.body.id}/approve`)
    .set('Authorization', `Bearer ${vo}`);
  expect(approved.status).toBe(200);
}

beforeAll(async () => {
  await resetAndSeed();
  electionId = (await prisma.election.findUniqueOrThrow({ where: { code: 'GE-2026' } })).id;
  coreRuleVoter = await createTestVoter();
  usedMarkingVoter = await createTestVoter();
  await approveRemoteAssignment(coreRuleVoter.voterNumber);
  await approveRemoteAssignment(usedMarkingVoter.voterNumber);
  await activateElection();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ballot generation — the Core Rule regression test', () => {
  it('a voter registered in Chennai South, approved to appear at a Madurai centre, receives the Chennai South ballot', async () => {
    const voter = coreRuleVoter; // registered in Chennai South, approved for Madurai
    const token = await loginVoter(app, voter.voterNumber);
    const res = await request(app)
      .get('/api/simulator/controlled-ballot')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.constituency.code).toBe('CHN-S');
    expect(res.body.candidates.length).toBeGreaterThan(0);
    for (const candidate of res.body.candidates) {
      const row = await prisma.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
      const constituency = await prisma.constituency.findUniqueOrThrow({
        where: { id: row.constituencyId },
      });
      expect(constituency.code).toBe('CHN-S');
    }
    expect(res.body.remoteAssignment.pollingCentre.code).toBe('MDU-C-01');
  });

  it('refuses generation while the election is not active', async () => {
    await prisma.election.update({ where: { id: electionId }, data: { lifecycle: 'CONFIGURED' } });
    const voter = await createTestVoter();
    const token = await loginVoter(app, voter.voterNumber);
    const res = await request(app)
      .get('/api/simulator/controlled-ballot')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    await prisma.election.update({ where: { id: electionId }, data: { lifecycle: 'ACTIVE' } });
  });
});

describe('ballot submission', () => {
  async function ballotFor(voterNumber: string) {
    const token = await loginVoter(app, voterNumber);
    const ballot = await request(app)
      .get('/api/simulator/controlled-ballot')
      .set('Authorization', `Bearer ${token}`);
    return { token, ballot: ballot.body };
  }

  it('submits a ballot and returns an opaque receipt without the choice', async () => {
    const voter = await createTestVoter();
    const { token, ballot } = await ballotFor(voter.voterNumber);
    const candidateId = ballot.candidates[0].id;

    const res = await request(app)
      .post('/api/simulator/controlled-ballot/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId });

    expect(res.status).toBe(201);
    expect(res.body.ballotReference).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(res.body)).not.toContain(candidateId);

    // The choice side holds no voter link; the identity side records the vote.
    const stored = await prisma.submittedBallot.findUniqueOrThrow({
      where: { ballotReference: res.body.ballotReference },
    });
    expect(verifyBallotIntegrity(stored)).toBe(true);
    const status = await prisma.voterElectionStatus.findUniqueOrThrow({
      where: { voterId_electionId: { voterId: voter.id, electionId } },
    });
    expect(status.hasVoted).toBe(true);
  });

  it('rejects a second submission for the same voter and election', async () => {
    const voter = await createTestVoter();
    const { token, ballot } = await ballotFor(voter.voterNumber);
    const candidateId = ballot.candidates[1].id;

    await request(app)
      .post('/api/simulator/controlled-ballot/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId });
    const second = await request(app)
      .post('/api/simulator/controlled-ballot/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId });

    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'A ballot has already been submitted for this election' });
  });

  it('exactly one of two concurrent submissions succeeds', async () => {
    const voter = await createTestVoter();
    const { token, ballot } = await ballotFor(voter.voterNumber);
    const candidateId = ballot.candidates[0].id;

    const [a, b] = await Promise.all([
      request(app)
        .post('/api/simulator/controlled-ballot/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ candidateId }),
      request(app)
        .post('/api/simulator/controlled-ballot/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ candidateId }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(
      await prisma.submittedBallot.count({ where: { electionId } }),
    ).toBe(
      (
        await prisma.voterElectionStatus.findMany({
          where: { electionId, hasVoted: true },
        })
      ).length,
    );
  });

  it('rejects a candidate from another constituency', async () => {
    const voter = await createTestVoter(); // Chennai South
    const { token } = await ballotFor(voter.voterNumber);
    const madurai = await prisma.constituency.findUniqueOrThrow({ where: { code: 'MDU-C' } });
    const foreign = await prisma.candidate.findFirstOrThrow({
      where: { electionId, constituencyId: madurai.id },
    });

    const res = await request(app)
      .post('/api/simulator/controlled-ballot/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId: foreign.id });
    expect(res.status).toBe(422);
  });

  it('marks the approved request USED after a remote submission', async () => {
    const voter = usedMarkingVoter;
    const { token, ballot } = await ballotFor(voter.voterNumber);
    await request(app)
      .post('/api/simulator/controlled-ballot/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId: ballot.candidates[0].id });

    const requestRow = await prisma.remotePollingRequest.findFirstOrThrow({
      where: { voterId: voter.id, electionId },
    });
    expect(requestRow.status).toBe('USED');
  });
});

describe('integrity verification', () => {
  it('detects a tampered ciphertext', async () => {
    const stored = await prisma.submittedBallot.findFirstOrThrow();
    const tampered = {
      ...stored,
      ciphertext: Buffer.from(stored.ciphertext).map((b, i) => (i === 0 ? b ^ 1 : b)),
    };
    expect(verifyBallotIntegrity(tampered)).toBe(false);
    expect(verifyBallotIntegrity(stored)).toBe(true);
  });
});
