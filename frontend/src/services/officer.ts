import { api } from './api';
import type { AuditRecord, OfficerDashboard, VerificationResult } from '@/types';

export const getOfficerDashboard = () =>
  api.get<OfficerDashboard>('/officer/dashboard').then((r) => r.data);

// Pre-vote verification: look up a voter by voter number and see their
// request, assignment, and has-voted state.
export const verifyVoter = (query: string) =>
  api.get<VerificationResult>('/officer/verification', { params: { query } }).then((r) => r.data);

// System Auditor: the audit trail, read-only.
export const getAuditRecords = (action?: string) =>
  api
    .get<AuditRecord[]>('/audit/records', { params: action ? { action } : {} })
    .then((r) => r.data);
