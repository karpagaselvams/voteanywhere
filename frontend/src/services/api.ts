import axios from 'axios';
import type { Role, Session } from '@/types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'va.session.token';
const PROFILE_KEY = 'va.session.profile';

// The JWT is the credential. The profile is display-only context (name,
// subtitle) persisted so a reload can render the shell while the session is
// revalidated against the backend.
export function setSession(token: string, profile: Session) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredProfile(): Session | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  // The mock service worker (used for not-yet-built modules) reads the role
  // from this header. The real backend ignores it — authorization comes from
  // the JWT and the server-side session record.
  const profile = getStoredProfile();
  if (profile) config.headers.set('X-Session-Role', profile.role);
  return config;
});

// An unreachable API can fall through to the SPA fallback, which answers 200
// with the index document. Treat that as a failure rather than letting HTML
// reach a page.
api.interceptors.response.use((response) => {
  const contentType = response.headers['content-type'];
  if (typeof contentType === 'string' && !contentType.includes('json')) {
    throw new Error(`Expected JSON from ${response.config.url ?? 'the API'}`);
  }
  return response;
});

export function isRole(value: unknown): value is Role {
  return (
    value === 'VOTER' ||
    value === 'ELECTION_ADMINISTRATOR' ||
    value === 'VERIFICATION_OFFICER' ||
    value === 'POLLING_CENTRE_OFFICER' ||
    value === 'SYSTEM_AUDITOR'
  );
}
