import { api } from './api';
import type {
  PollingCentre,
  QueueRequest,
  RemotePollingAssignment,
  RemotePollingRequest,
  RequestStatus,
  VoterDashboard,
} from '@/types';

export const getVoterDashboard = () =>
  api.get<VoterDashboard>('/remote-polling/dashboard').then((r) => r.data);

export const getMyRequest = () =>
  api.get<RemotePollingRequest>('/remote-polling/requests/mine').then((r) => r.data);

export const getMyAssignment = () =>
  api.get<RemotePollingAssignment>('/remote-polling/assignments/mine').then((r) => r.data);

export const getCentres = () =>
  api.get<PollingCentre[]>('/remote-polling/centres').then((r) => r.data);

export interface RemotePollingRequestInput {
  electionId: string;
  pollingCentreId: string;
  reason?: string;
}

export const submitRemotePollingRequest = (input: RemotePollingRequestInput) =>
  api.post<RemotePollingRequest>('/remote-polling/requests', input).then((r) => r.data);

export const withdrawMyRequest = () =>
  api
    .post<{ id: string; status: RequestStatus }>('/remote-polling/requests/mine/withdraw')
    .then((r) => r.data);

// --- Verification Officer queue -------------------------------------------

export const getRequestQueue = (status?: RequestStatus) =>
  api
    .get<QueueRequest[]>('/remote-polling/requests', { params: status ? { status } : {} })
    .then((r) => r.data);

export const claimRequest = (id: string) =>
  api.post(`/remote-polling/requests/${id}/claim`).then((r) => r.data);

export const releaseRequest = (id: string) =>
  api.post(`/remote-polling/requests/${id}/release`).then((r) => r.data);

export const approveRequest = (id: string) =>
  api.post(`/remote-polling/requests/${id}/approve`).then((r) => r.data);

export const rejectRequest = (id: string, reason: string) =>
  api.post(`/remote-polling/requests/${id}/reject`, { reason }).then((r) => r.data);
