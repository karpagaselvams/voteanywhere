import { api, clearSession, getStoredProfile, getToken, isRole, setSession } from './api';
import type { Role, Session } from '@/types';

// Maps the backend auth contract to the display Session the portals render.
// The role always comes from the server — never from anything the user picks.

const ROLE_LABELS: Record<Role, string> = {
  VOTER: 'Voter',
  ELECTION_ADMINISTRATOR: 'Election Administrator',
  VERIFICATION_OFFICER: 'Verification Officer',
  POLLING_CENTRE_OFFICER: 'Polling Centre Officer',
  SYSTEM_AUDITOR: 'System Auditor',
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

interface OfficerLoginResponse {
  token: string;
  expiresAt: string;
  officer: { id: string; username: string; role: string; displayName: string };
}

interface OtpIssuedResponse {
  challengeId: string;
  expiresAt: string;
}

interface VoterLoginResponse {
  token: string;
  expiresAt: string;
  voter: { id: string; voterNumber: string; fullName: string; registeredConstituencyId: string };
}

export interface OfficerLoginInput {
  username: string;
  password: string;
}

export const officerLogin = (input: OfficerLoginInput) =>
  api.post<OfficerLoginResponse>('/auth/officer/login', input).then((r) => {
    const { token, officer } = r.data;
    if (!isRole(officer.role)) throw new Error('Sign-in returned an unknown role');
    const session: Session = {
      id: officer.id,
      role: officer.role,
      name: officer.displayName,
      initials: initialsOf(officer.displayName),
      subtitle: `${ROLE_LABELS[officer.role]} • ${officer.username}`,
    };
    setSession(token, session);
    return session;
  });

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Officers only — voters authenticate with a mock OTP and have no password.
export const changePassword = (input: ChangePasswordInput) =>
  api.post<{ changed: true }>('/auth/password', input).then((r) => r.data);

export const requestVoterOtp = (voterNumber: string) =>
  api
    .post<OtpIssuedResponse>('/auth/voter/otp', { voterNumber })
    .then((r) => r.data);

export const verifyVoterOtp = (challengeId: string, otp: string) =>
  api.post<VoterLoginResponse>('/auth/voter/otp/verify', { challengeId, otp }).then((r) => {
    const { token, voter } = r.data;
    const session: Session = {
      id: voter.id,
      role: 'VOTER',
      name: voter.fullName,
      initials: initialsOf(voter.fullName),
      subtitle: `Voter • ${voter.voterNumber}`,
    };
    setSession(token, session);
    return session;
  });

export const logout = async () => {
  const profile = getStoredProfile();
  // Permission matrix: a voter may revoke their own session; officer
  // revocation belongs to the Election Administrator, so an officer sign-out
  // simply discards the token locally.
  if (profile?.role === 'VOTER' && getToken()) {
    await api.delete('/auth/session').catch(() => undefined);
  }
  clearSession();
};

// Validates the stored token against the server-side session record and
// returns the stored display profile. Any failure clears local state.
export const getSession = async (): Promise<Session> => {
  const profile = getStoredProfile();
  if (!profile || !getToken()) throw new Error('No stored session');
  await api.get('/auth/session');
  return profile;
};
