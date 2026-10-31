import { api } from './api';
import type { EligibilityResult, VoterProfile } from '@/types';

export const getMyProfile = () => api.get<VoterProfile>('/voters/me').then((r) => r.data);

// Eligibility runs against the authenticated voter — no identifiers are
// sent in the request body.
export const checkEligibility = () =>
  api.post<EligibilityResult>('/voters/eligibility').then((r) => r.data);
