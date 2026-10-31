import { api } from './api';
import type {
  AdminDashboard,
  Candidate,
  Election,
  PollingCentre,
  ReconciliationReport,
  ReportsResult,
  RequestStatus,
} from '@/types';

export const getAdminDashboard = () =>
  api.get<AdminDashboard>('/admin/dashboard').then((r) => r.data);

export const getElections = () => api.get<Election[]>('/admin/elections').then((r) => r.data);

export const activateElection = (id: string) =>
  api.post<Election>(`/admin/elections/${id}/activate`).then((r) => r.data);

export const closeElection = (id: string) =>
  api.post<Election>(`/admin/elections/${id}/close`).then((r) => r.data);

export const getCandidates = () => api.get<Candidate[]>('/admin/candidates').then((r) => r.data);

export const getCentres = () => api.get<PollingCentre[]>('/admin/centres').then((r) => r.data);

export const getReports = (status?: RequestStatus) =>
  api
    .get<ReportsResult>('/admin/reports', { params: status ? { status } : {} })
    .then((r) => r.data);

// Post-closure reconciliation: ballots issued vs recorded, per constituency.
export const getReconciliation = (electionId: string) =>
  api
    .get<ReconciliationReport>(`/simulator/elections/${electionId}/reconciliation`)
    .then((r) => r.data);
