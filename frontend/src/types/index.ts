// Frontend types mirror the backend API responses. Terminology follows
// GLOSSARY.md. Nothing here invents data the backend does not have.

export type Role =
  | 'VOTER'
  | 'ELECTION_ADMINISTRATOR'
  | 'VERIFICATION_OFFICER'
  | 'POLLING_CENTRE_OFFICER'
  | 'SYSTEM_AUDITOR';

export interface Session {
  id: string;
  role: Role;
  name: string;
  initials: string;
  /** Shown under the name in the sidebar and header, e.g. "Voter • VA-0001". */
  subtitle: string;
  /** Present only for officer sessions. */
  centreCode?: string;
}

export type ElectionLifecycle = 'CONFIGURED' | 'ACTIVE' | 'CLOSED';

/** Generic step rail item used by the Stepper component. */
export interface TimelineStep {
  label: string;
  detail: string;
  state: 'done' | 'current' | 'upcoming';
}

export type RequestStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'USED'
  | 'EXPIRED';

export interface ConstituencyRef {
  code: string;
  name: string;
}

export interface PollingCentre {
  id: string;
  code: string;
  name: string;
  constituency: ConstituencyRef;
}

export interface Election {
  id: string;
  code: string;
  name: string;
  lifecycle: ElectionLifecycle;
  startsAt: string;
  endsAt: string;
  constituencies: ConstituencyRef[];
}

export interface Candidate {
  id: string;
  fullName: string;
  symbol: string | null;
  election: { code: string; name: string };
  constituency: ConstituencyRef;
}

export interface VoterProfile {
  id: string;
  voterNumber: string;
  fullName: string;
  registeredConstituency: { id: string; code: string; name: string };
  homePollingCentre: { id: string; code: string; name: string } | null;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  passed: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  election: { id: string; code: string; name: string; lifecycle: ElectionLifecycle } | null;
  checks: EligibilityCheck[];
}

export interface RemotePollingRequest {
  id: string;
  status: RequestStatus;
  reason: string | null;
  /** The reviewing officer's note. Shown to the voter on rejection. */
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  pollingCentre: { id: string; code: string; name: string; constituency: string };
  election: { id: string; code: string; name: string; lifecycle: ElectionLifecycle };
}

export interface QueueRequest extends RemotePollingRequest {
  voter: { voterNumber: string; fullName: string };
  reviewedBy: string | null;
}

export interface RemotePollingAssignment {
  id: string;
  /** The named remote polling centre. Never a constituency. */
  pollingCentre: { code: string; name: string };
  election: { code: string; name: string };
  assignedAt: string;
  used: boolean;
}

export interface VoterDashboard {
  voter: {
    voterNumber: string;
    fullName: string;
    registeredConstituency: string;
    homePollingCentre: string | null;
  };
  election: {
    id: string;
    code: string;
    name: string;
    lifecycle: ElectionLifecycle;
    startsAt: string;
    endsAt: string;
  } | null;
  request: RemotePollingRequest | null;
  assignment: Omit<RemotePollingAssignment, 'id' | 'election'> | null;
  hasVoted: boolean;
}

/** The ballot presented to a voter. Constituency is always the registered one. */
export interface Ballot {
  election: { id: string; code: string; name: string };
  constituency: { id: string; code: string; name: string };
  candidates: { id: string; fullName: string; symbol: string | null }[];
  remoteAssignment: {
    pollingCentre: { code: string; name: string };
    used: boolean;
  } | null;
}

/** Proves a ballot was recorded. Never contains the choice. */
export interface VoteReceipt {
  ballotReference: string;
  submittedAt: string;
}

export interface OfficerDashboard {
  role: Role;
  election: { id: string; code: string; name: string; lifecycle: ElectionLifecycle } | null;
  stats: Record<string, number>;
}

export interface VerificationResult {
  voter: {
    voterNumber: string;
    fullName: string;
    registeredConstituency: string;
    homePollingCentre: string | null;
  };
  election: { code: string; name: string; lifecycle: ElectionLifecycle } | null;
  request: { id: string; status: RequestStatus; reviewNote: string | null } | null;
  assignment: {
    pollingCentre: { code: string; name: string };
    assignedAt: string;
  } | null;
  hasVoted: boolean;
}

export interface AdminDashboard {
  elections: { configured: number; active: number; closed: number };
  voters: number;
  pollingCentres: number;
  submittedBallots: number;
  requests: Record<string, number> & { total: number; approvalRate: number | null };
}

export interface ReportsResult {
  totalRecords: number;
  requests: QueueRequest[];
}

export interface AuditRecord {
  id: string;
  actorType: 'OFFICER' | 'VOTER' | 'SYSTEM';
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityRef: string | null;
  createdAt: string;
}

export interface ReconciliationRow {
  constituency: ConstituencyRef;
  ballotsIssued: number;
  ballotsRecorded: number;
  discrepancy: number;
}

export interface ReconciliationReport {
  election: { code: string; name: string };
  reconciledAt: string;
  rows: ReconciliationRow[];
  totalDiscrepancy: number;
}
