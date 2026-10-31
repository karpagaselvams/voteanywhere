import request from 'supertest';
import { createApp } from '../src/app';
import { prisma, resetAndSeed, createTestVoter } from './helpers';

const app = createApp();
const PASSWORD = 'test-officer-password-1';

const OFFICERS = [
  { username: 'admin.asha', role: 'ELECTION_ADMINISTRATOR' },
  { username: 'officer.verification', role: 'VERIFICATION_OFFICER' },
  { username: 'officer.polling', role: 'POLLING_CENTRE_OFFICER' },
  { username: 'auditor.dev', role: 'SYSTEM_AUDITOR' },
] as const;

async function loginOfficer(username: string): Promise<string> {
  const res = await request(app).post('/api/auth/officer/login').send({ username, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token;
}

async function loginVoter(): Promise<string> {
  const voter = await createTestVoter();
  const issued = await request(app).post('/api/auth/voter/otp').send({ voterNumber: voter.voterNumber });
  const verified = await request(app)
    .post('/api/auth/voter/otp/verify')
    .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });
  expect(verified.status).toBe(200);
  return verified.body.token;
}

beforeAll(async () => {
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('authentication requirement', () => {
  it('rejects unauthenticated requests to protected routes with 401', async () => {
    for (const path of ['/api/auth/session', '/api/auth/sessions/00000000-0000-0000-0000-000000000000']) {
      const res = await request(app).delete(path).send();
      expect(res.status).toBe(401);
    }
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(401);
  });
});

describe('read own session — all five roles', () => {
  it.each([...OFFICERS.map((o) => [o.username] as const)])('%s can read its own session', async (username) => {
    const token = await loginOfficer(username);
    const res = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('a voter can read its own session', async () => {
    const token = await loginVoter();
    const res = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('revoke a session — Election Administrator, or a voter revoking their own', () => {
  async function victimSessionId(): Promise<string> {
    const token = await loginVoter();
    const res = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${token}`);
    return res.body.id;
  }

  it('the Election Administrator can revoke a session', async () => {
    const token = await loginOfficer('admin.asha');
    const res = await request(app)
      .delete(`/api/auth/sessions/${await victimSessionId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ revoked: true });
  });

  // Table-driven across every other role, so adding a role to the matrix
  // surfaces the gap here.
  it.each([
    ['VERIFICATION_OFFICER', 'officer.verification'],
    ['POLLING_CENTRE_OFFICER', 'officer.polling'],
    ['SYSTEM_AUDITOR', 'auditor.dev'],
  ] as const)('%s receives a bare 403', async (_role, username) => {
    const token = await loginOfficer(username);
    const res = await request(app)
      .delete(`/api/auth/sessions/${await victimSessionId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('a voter receives a bare 403 on the officer revocation route', async () => {
    const token = await loginVoter();
    const res = await request(app)
      .delete(`/api/auth/sessions/${await victimSessionId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('a voter can revoke their own session', async () => {
    const token = await loginVoter();
    const res = await request(app).delete('/api/auth/session').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it.each([
    ['ELECTION_ADMINISTRATOR', 'admin.asha'],
    ['VERIFICATION_OFFICER', 'officer.verification'],
    ['POLLING_CENTRE_OFFICER', 'officer.polling'],
    ['SYSTEM_AUDITOR', 'auditor.dev'],
  ] as const)('%s cannot use the voter own-revocation route', async (_role, username) => {
    const token = await loginOfficer(username);
    const res = await request(app).delete('/api/auth/session').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });
});
