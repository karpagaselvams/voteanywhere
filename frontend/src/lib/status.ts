import type { BadgeTone } from '@/components/StatusBadge';
import type { ElectionLifecycle, RequestStatus } from '@/types';

// Labels and tones for the real remote polling request state machine.
export const requestStatus: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  UNDER_REVIEW: { label: 'Under Review', tone: 'primary' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral' },
  USED: { label: 'Ballot Submitted', tone: 'green' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
};

export const electionLifecycle: Record<ElectionLifecycle, { label: string; tone: BadgeTone }> = {
  CONFIGURED: { label: 'Configured', tone: 'amber' },
  ACTIVE: { label: 'Active', tone: 'green' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};
