import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authService from '@/services/auth';
import { getStoredProfile, getToken } from '@/services/api';
import type { Role, Session } from '@/types';

interface AuthValue {
  session: Session | null;
  loading: boolean;
  signInOfficer: (input: authService.OfficerLoginInput) => Promise<Session>;
  requestOtp: (voterNumber: string) => Promise<{ challengeId: string; expiresAt: string }>;
  signInVoter: (challengeId: string, otp: string) => Promise<Session>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// Every role resolves to its portal's home. The officer portal is shared by
// the three officer roles; which pages each sees is a navigation concern —
// the backend enforces the permission matrix regardless.
export const portalHome: Record<Role, string> = {
  VOTER: '/voter',
  ELECTION_ADMINISTRATOR: '/admin',
  VERIFICATION_OFFICER: '/officer',
  POLLING_CENTRE_OFFICER: '/officer',
  SYSTEM_AUDITOR: '/officer',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken() || !getStoredProfile()) {
      setLoading(false);
      return;
    }
    // Restore the display profile only after the backend confirms the
    // server-side session is still active (not expired or revoked).
    authService
      .getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const signInOfficer = useCallback(async (input: authService.OfficerLoginInput) => {
    const next = await authService.officerLogin(input);
    setSession(next);
    return next;
  }, []);

  const requestOtp = useCallback((voterNumber: string) => {
    return authService.requestVoterOtp(voterNumber);
  }, []);

  const signInVoter = useCallback(async (challengeId: string, otp: string) => {
    const next = await authService.verifyVoterOtp(challengeId, otp);
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signInOfficer, requestOtp, signInVoter, signOut }),
    [session, loading, signInOfficer, requestOtp, signInVoter, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
