import request from 'supertest';
import { createApp } from '../src/app';
import { prisma, resetAndSeed, createTestVoter, loginVoter, loginOfficer } from './helpers';

const app = createApp();

let electionId: string;

beforeAll(async () => {
  await resetAndSeed();
  electionId = (await prisma.election.findUniqueOrThrow({ where: { code: 'GE-2026' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('election lifecycle', () => {
  it('only the Election Administrator activates an election', async () => {
    const vo = await loginOfficer(app, 'officer.verification');
    const asVo = await request(app)
      .post(`/api/admin/elections/${electionId}/activate`)
      .set('Authorization', `Bearer ${vo}`);
    expect(asVo.status).toBe(403);

    const admin = await loginOfficer(app, 'admin.asha');
    const res = await request(app)
      .post(`/api/admin/elections/${electionId}/activate`)
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.lifecycle).toBe('ACTIVE');
  });

  it('closing expires open requests and writes system audit records', async () => {
    // A fresh voter submits a request while the election is already ACTIVE —
    // which must be refused (requests close when the election opens)...
    const lateVoter = await createTestVoter();
    const lateToken = await loginVoter(app, lateVoter.voterNumber);
    const centre = await prisma.pollingCentre.findUniqueOrThrow({ where: { code: 'MDU-C-01' } });
    const late = await request(app)
      .post('/api/remote-polling/requests')
      .set('Authorization', `Bearer ${lateToken}`)
      .send({ electionId, pollingCentreId: centre.id });
    expect(late.status).toBe(409);

    // ...and the seeded PENDING request from before activation expires on close.
    const seeded = await prisma.remotePollingRequest.findFirstOrThrow({
      where: { status: 'PENDING' },
    });

    const admin = await loginOfficer(app, 'admin.asha');
    const close = await request(app)
      .post(`/api/admin/elections/${electionId}/close`)
      .set('Authorization', `Bearer ${admin}`);
    expect(close.status).toBe(200);
    expect(close.body.lifecycle).toBe('CLOSED');

    const expired = await prisma.remotePollingRequest.findUniqueOrThrow({
      where: { id: seeded.id },
    });
    expect(expired.status).toBe('EXPIRED');

    const audits = await prisma.auditRecord.findMany({
      where: { action: { in: ['election.activated', 'election.closed', 'remote_polling.request.expired'] } },
    });
    expect(audits.map((a) => a.action)).toEqual(
      expect.arrayContaining(['election.activated', 'election.closed', 'remote_polling.request.expired']),
    );
  });

  it('reconciliation after closure reports zero discrepancy on a clean run', async () => {
    const admin = await loginOfficer(app, 'admin.asha');
    const res = await request(app)
      .get(`/api/simulator/elections/${electionId}/reconciliation`)
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.totalDiscrepancy).toBe(0);
    for (const row of res.body.rows) {
      expect(row.ballotsIssued).toBe(row.ballotsRecorded);
    }
  });

  it('the System Auditor may read the reconciliation report and audit trail, nothing else', async () => {
    const auditor = await loginOfficer(app, 'auditor.dev');
    const report = await request(app)
      .get(`/api/simulator/elections/${electionId}/reconciliation`)
      .set('Authorization', `Bearer ${auditor}`);
    expect(report.status).toBe(200);

    const records = await request(app)
      .get('/api/audit/records')
      .set('Authorization', `Bearer ${auditor}`);
    expect(records.status).toBe(200);
    expect(records.body.length).toBeGreaterThan(0);

    const writeAttempt = await request(app)
      .post(`/api/admin/elections/${electionId}/activate`)
      .set('Authorization', `Bearer ${auditor}`);
    expect(writeAttempt.status).toBe(403);

    const admin = await loginOfficer(app, 'admin.asha');
    const auditAsAdmin = await request(app)
      .get('/api/audit/records')
      .set('Authorization', `Bearer ${admin}`);
    expect(auditAsAdmin.status).toBe(403);
  });
});
