import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { prisma, resetAndSeed, createTestVoter, loginVoter } from './helpers';

const app = createApp();

const OFFICER = { username: 'admin.asha', password: 'test-officer-password-1' };

// Dedicated voter for the rate-limit test, created once, so no other test
// approaches the OTP issue limit for it.
let rateLimitVoterNumber: string;

async function issueOtp(voterNumber: string) {
  return request(app).post('/api/auth/voter/otp').send({ voterNumber });
}

beforeAll(async () => {
  await resetAndSeed();
  rateLimitVoterNumber = (await createTestVoter()).voterNumber;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('officer login', () => {
  it('authenticates a valid officer and returns a session token', async () => {
    const res = await request(app).post('/api/auth/officer/login').send(OFFICER);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.officer.role).toBe('ELECTION_ADMINISTRATOR');
  });

  it('returns an identical status and body for unknown username and wrong password', async () => {
    const unknown = await request(app)
      .post('/api/auth/officer/login')
      .send({ username: 'no.such.officer', password: 'whatever-password' });
    const wrong = await request(app)
      .post('/api/auth/officer/login')
      .send({ username: OFFICER.username, password: 'wrong-password' });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('records login success and failure in the audit trail', async () => {
    await request(app).post('/api/auth/officer/login').send(OFFICER);
    await request(app)
      .post('/api/auth/officer/login')
      .send({ username: OFFICER.username, password: 'wrong-password' });

    const actions = await prisma.auditRecord.findMany({ select: { action: true } });
    const names = actions.map((a) => a.action);
    expect(names).toContain('auth.officer_login.success');
    expect(names).toContain('auth.officer_login.failure');
  });
});

describe('voter mock OTP', () => {
  it('issues a challenge without exposing the OTP in the production response shape', async () => {
    const voter = await createTestVoter();
    const res = await issueOtp(voter.voterNumber);
    expect(res.status).toBe(200);
    expect(res.body.challengeId).toEqual(expect.any(String));
    // devOnlyOtp exists only because NODE_ENV=test; it is never issued in production.
    expect(res.body.devOnlyOtp).toMatch(/^\d{6}$/);
    expect(res.body).not.toHaveProperty('otp');
  });

  it('authenticates a correct OTP within the window and returns a session', async () => {
    const voter = await createTestVoter();
    const issued = await issueOtp(voter.voterNumber);
    const res = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.voter.voterNumber).toBe(voter.voterNumber);
  });

  it('rejects a replay of the same correct OTP', async () => {
    const voter = await createTestVoter();
    const issued = await issueOtp(voter.voterNumber);
    const payload = { challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp };

    const first = await request(app).post('/api/auth/voter/otp/verify').send(payload);
    const replay = await request(app).post('/api/auth/voter/otp/verify').send(payload);

    expect(first.status).toBe(200);
    expect(replay.status).toBe(401);
    expect(replay.body).toEqual({ error: 'Invalid or expired code' });
  });

  it('rejects an OTP submitted after expiry and deletes the challenge', async () => {
    const voter = await createTestVoter();
    const issued = await issueOtp(voter.voterNumber);
    await prisma.otpChallenge.update({
      where: { challengeId: issued.body.challengeId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const res = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired code' });
    const remaining = await prisma.otpChallenge.findUnique({
      where: { challengeId: issued.body.challengeId },
    });
    expect(remaining).toBeNull();
  });

  it('rejects the sixth attempt even when the OTP is correct', async () => {
    const voter = await createTestVoter();
    const issued = await issueOtp(voter.voterNumber);
    for (let i = 0; i < env.OTP_MAX_ATTEMPTS; i += 1) {
      const wrong = await request(app)
        .post('/api/auth/voter/otp/verify')
        .send({ challengeId: issued.body.challengeId, otp: '000000' });
      expect(wrong.status).toBe(401);
    }

    const sixth = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });
    expect(sixth.status).toBe(401);
    expect(sixth.body).toEqual({ error: 'Invalid or expired code' });
  });

  it('produces identical status and body for unknown voter, wrong OTP, expired, and consumed', async () => {
    const unknownVoter = await issueOtp('VA-NOPE');

    const voterA = await createTestVoter();
    const issued = await issueOtp(voterA.voterNumber);
    const wrongOtp = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: issued.body.challengeId, otp: '000000' });

    await prisma.otpChallenge.update({
      where: { challengeId: issued.body.challengeId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expired = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });

    const voterB = await createTestVoter();
    const consumedIssue = await issueOtp(voterB.voterNumber);
    await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: consumedIssue.body.challengeId, otp: consumedIssue.body.devOnlyOtp });
    const consumed = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: consumedIssue.body.challengeId, otp: consumedIssue.body.devOnlyOtp });

    for (const res of [unknownVoter, wrongOtp, expired, consumed]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid or expired code' });
    }
  });

  it('refuses OTP issue beyond the rate limit', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 6; i += 1) {
      lastStatus = (await issueOtp(rateLimitVoterNumber)).status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe('officer password change', () => {
  async function login(username: string, password: string) {
    return request(app).post('/api/auth/officer/login').send({ username, password });
  }

  it('rejects a wrong current password and changes nothing', async () => {
    const token = (await login('officer.polling', OFFICER.password)).body.token;
    const res = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-the-password', newPassword: 'new-password-1' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Current password is incorrect' });

    const stillWorks = await login('officer.polling', OFFICER.password);
    expect(stillWorks.status).toBe(200);
  });

  it('changes the password, revokes other sessions, and audits the change', async () => {
    const first = (await login('officer.verification', OFFICER.password)).body.token;
    const second = (await login('officer.verification', OFFICER.password)).body.token;

    const res = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${first}`)
      .send({ currentPassword: OFFICER.password, newPassword: 'rotated-password-9' });
    expect(res.status).toBe(200);

    // Old password is dead, new password works.
    expect((await login('officer.verification', OFFICER.password)).status).toBe(401);
    expect((await login('officer.verification', 'rotated-password-9')).status).toBe(200);

    // The other session was revoked; the current one survives.
    const other = await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${second}`);
    expect(other.status).toBe(401);
    const current = await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${first}`);
    expect(current.status).toBe(200);

    const audit = await prisma.auditRecord.findFirst({
      where: { action: 'auth.password.changed' },
    });
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit)).not.toContain('rotated-password-9');
  });

  it('rejects a too-short new password and refuses voters', async () => {
    const token = (await login('officer.polling', OFFICER.password)).body.token;
    const short = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: OFFICER.password, newPassword: 'short' });
    expect(short.status).toBe(400);

    const voter = await createTestVoter();
    const voterToken = await loginVoter(app, voter.voterNumber);
    const asVoter = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ currentPassword: 'x', newPassword: 'long-enough-1' });
    expect(asVoter.status).toBe(403);
  });
});

describe('sessions', () => {
  it('rejects a revoked session token immediately', async () => {
    const voter = await createTestVoter();
    const issued = await issueOtp(voter.voterNumber);
    const verified = await request(app)
      .post('/api/auth/voter/otp/verify')
      .send({ challengeId: issued.body.challengeId, otp: issued.body.devOnlyOtp });
    const token = verified.body.token as string;

    const before = await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);

    await request(app).delete('/api/auth/session').set('Authorization', `Bearer ${token}`);

    const after = await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
  });

  it('never writes a plaintext OTP or password to audit records', async () => {
    const records = await prisma.auditRecord.findMany();
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain(OFFICER.password);
    expect(serialized).not.toMatch(/\b\d{6}\b.*otp|otp.*\b\d{6}\b/i);
  });
});
