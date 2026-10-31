import request from 'supertest';
import { createApp } from '../src/app';
import { prisma, resetAndSeed, createTestVoter, loginVoter, loginOfficer } from './helpers';

const app = createApp();

let electionId: string;
let remoteCentreId: string; // Madurai Central — remote for Chennai South voters
let homeCentreId: string; // Chennai South

beforeAll(async () => {
  await resetAndSeed();
  const election = await prisma.election.findUniqueOrThrow({ where: { code: 'GE-2026' } });
  electionId = election.id;
  remoteCentreId = (
    await prisma.pollingCentre.findUniqueOrThrow({ where: { code: 'MDU-C-01' } })
  ).id;
  homeCentreId = (
    await prisma.pollingCentre.findUniqueOrThrow({ where: { code: 'CHN-S-01' } })
  ).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function submitAsNewVoter(centreId = remoteCentreId) {
  const voter = await createTestVoter();
  const token = await loginVoter(app, voter.voterNumber);
  const res = await request(app)
    .post('/api/remote-polling/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ electionId, pollingCentreId: centreId, reason: 'Working away from home.' });
  return { voter, token, res };
}

describe('submitting a remote polling request', () => {
  it('creates a PENDING request for an eligible voter', async () => {
    const { res } = await submitAsNewVoter();
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.pollingCentre.code).toBe('MDU-C-01');
  });

  it('refuses a second active request for the same voter and election', async () => {
    const voter = await createTestVoter();
    const token = await loginVoter(app, voter.voterNumber);
    const first = await request(app)
      .post('/api/remote-polling/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ electionId, pollingCentreId: remoteCentreId });
    const second = await request(app)
      .post('/api/remote-polling/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ electionId, pollingCentreId: remoteCentreId });
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    // The database constraint name must never reach the response body.
    expect(JSON.stringify(second.body)).not.toContain('RemotePollingRequest_one_active');
  });

  it('refuses a centre inside the voter’s own constituency', async () => {
    const { res } = await submitAsNewVoter(homeCentreId);
    expect(res.status).toBe(422);
  });

  it('keeps requests session-scoped: another voter sees no request', async () => {
    await submitAsNewVoter();
    const other = await createTestVoter();
    const otherToken = await loginVoter(app, other.voterNumber);
    const res = await request(app)
      .get('/api/remote-polling/requests/mine')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

describe('review workflow and the transition table', () => {
  it('walks PENDING → UNDER_REVIEW → APPROVED and creates exactly one assignment', async () => {
    const { res } = await submitAsNewVoter();
    const requestId = res.body.id as string;
    const vo = await loginOfficer(app, 'officer.verification');

    const claim = await request(app)
      .post(`/api/remote-polling/requests/${requestId}/claim`)
      .set('Authorization', `Bearer ${vo}`);
    expect(claim.status).toBe(200);

    const approve = await request(app)
      .post(`/api/remote-polling/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${vo}`);
    expect(approve.status).toBe(200);

    const assignments = await prisma.remotePollingAssignment.findMany({
      where: { requestId },
    });
    expect(assignments).toHaveLength(1);

    const updated = await prisma.remotePollingRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(updated.status).toBe('APPROVED');
  });

  it('rejects PENDING → APPROVED (approval must pass through review)', async () => {
    const { res } = await submitAsNewVoter();
    const vo = await loginOfficer(app, 'officer.verification');
    const approve = await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${vo}`);
    expect(approve.status).toBe(409);
  });

  it('rejects REJECTED → APPROVED', async () => {
    const { res } = await submitAsNewVoter();
    const vo = await loginOfficer(app, 'officer.verification');
    await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/claim`)
      .set('Authorization', `Bearer ${vo}`);
    const reject = await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/reject`)
      .set('Authorization', `Bearer ${vo}`)
      .send({ reason: 'Eligibility could not be confirmed.' });
    expect(reject.status).toBe(200);

    const approve = await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${vo}`);
    expect(approve.status).toBe(409);

    const record = await prisma.remotePollingRequest.findUniqueOrThrow({
      where: { id: res.body.id },
    });
    expect(record.status).toBe('REJECTED');
    expect(record.reviewNote).toBe('Eligibility could not be confirmed.');
  });

  it('requires a reason on rejection', async () => {
    const { res } = await submitAsNewVoter();
    const vo = await loginOfficer(app, 'officer.verification');
    await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/claim`)
      .set('Authorization', `Bearer ${vo}`);
    const reject = await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/reject`)
      .set('Authorization', `Bearer ${vo}`)
      .send({ reason: '   ' });
    expect(reject.status).toBe(422);
  });

  it('refuses approval by a Polling Centre Officer and by a voter', async () => {
    const { token, res } = await submitAsNewVoter();
    const requestId = res.body.id as string;
    const vo = await loginOfficer(app, 'officer.verification');
    await request(app)
      .post(`/api/remote-polling/requests/${requestId}/claim`)
      .set('Authorization', `Bearer ${vo}`);

    const pco = await loginOfficer(app, 'officer.polling');
    const asPco = await request(app)
      .post(`/api/remote-polling/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${pco}`);
    expect(asPco.status).toBe(403);
    expect(asPco.body).toEqual({ error: 'Forbidden' });

    const asVoter = await request(app)
      .post(`/api/remote-polling/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(asVoter.status).toBe(403);
  });

  it('withdraws a pending request owned by the caller', async () => {
    const { token, res } = await submitAsNewVoter();
    const withdraw = await request(app)
      .post('/api/remote-polling/requests/mine/withdraw')
      .set('Authorization', `Bearer ${token}`);
    expect(withdraw.status).toBe(200);

    const record = await prisma.remotePollingRequest.findUniqueOrThrow({
      where: { id: res.body.id },
    });
    expect(record.status).toBe('WITHDRAWN');

    // And a fresh request may then be submitted.
    const again = await request(app)
      .post('/api/remote-polling/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ electionId, pollingCentreId: remoteCentreId });
    expect(again.status).toBe(201);
  });

  it('writes an audit record for every transition', async () => {
    const { res } = await submitAsNewVoter();
    const vo = await loginOfficer(app, 'officer.verification');
    await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/claim`)
      .set('Authorization', `Bearer ${vo}`);
    await request(app)
      .post(`/api/remote-polling/requests/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${vo}`);

    const actions = (
      await prisma.auditRecord.findMany({ select: { action: true, entityRef: true } })
    ).filter((a) => a.entityRef?.startsWith(res.body.id));

    expect(actions.map((a) => a.action)).toEqual(
      expect.arrayContaining([
        'remote_polling.request.submitted',
        'remote_polling.request.claimed',
        'remote_polling.request.approved',
      ]),
    );
  });
});
