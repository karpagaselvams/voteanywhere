import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  ScrollText,
  Vote,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, Row, Cell, PrimaryCell } from '@/components/Table';
import { useAuth } from '@/hooks/useAuth';
import { useResource } from '@/hooks/useResource';
import { getOfficerDashboard } from '@/services/officer';
import { getRequestQueue } from '@/services/remotePolling';
import { electionLifecycle, requestStatus } from '@/lib/status';

export default function DashboardPage() {
  const { session } = useAuth();
  const dashboard = useResource(getOfficerDashboard);
  // Only the Verification Officer reviews requests — other roles never call
  // the queue endpoint.
  const isVerificationOfficer = session?.role === 'VERIFICATION_OFFICER';
  const pendingQueue = useResource(
    () => (isVerificationOfficer ? getRequestQueue('PENDING') : Promise.resolve([])),
    [isVerificationOfficer],
  );

  if (dashboard.loading) return <Loading />;
  if (dashboard.error || !dashboard.data)
    return <LoadError message={dashboard.error ?? 'Dashboard unavailable'} />;

  const { role, election, stats } = dashboard.data;
  const queue = pendingQueue.data ?? [];

  return (
    <>
      <div className="flex w-full flex-row items-center justify-between rounded-xl bg-navy-deep px-6 py-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-white">
            {role === 'VERIFICATION_OFFICER'
              ? 'Request Review Console'
              : role === 'POLLING_CENTRE_OFFICER'
                ? 'Polling Centre Operations'
                : 'Audit Overview'}
          </h2>
          <p className="text-[13px] text-navy-text-2">
            {election ? `${election.name} — ` : 'No election configured — '}
            {election ? electionLifecycle[election.lifecycle].label : ''}
          </p>
        </div>
        {role === 'VERIFICATION_OFFICER' && (
          <Link to="/officer/verification">
            <Button variant="white" iconRight={ArrowRight}>
              Open Review Queue
            </Button>
          </Link>
        )}
      </div>

      <div className="flex w-full flex-row gap-6">
        {role === 'VERIFICATION_OFFICER' && (
          <>
            <StatCard label="Pending requests" value={String(stats.pending ?? 0)} icon={ClipboardList} tone="amber" />
            <StatCard label="Under review" value={String(stats.underReview ?? 0)} icon={FileText} tone="primary" />
            <StatCard label="Claimed by you" value={String(stats.claimedByMe ?? 0)} icon={BadgeCheck} tone="primary" />
            <StatCard label="Decided by you" value={String(stats.decidedByMe ?? 0)} icon={Vote} tone="green" />
          </>
        )}
        {role === 'POLLING_CENTRE_OFFICER' && (
          <>
            <StatCard label="Active assignments" value={String(stats.assignments ?? 0)} icon={ClipboardList} tone="primary" />
            <StatCard label="Ballots submitted" value={String(stats.ballotsSubmitted ?? 0)} icon={Vote} tone="green" />
            <StatCard label="Requests in review" value={String(stats.requestsInReview ?? 0)} icon={FileText} tone="amber" />
          </>
        )}
        {role === 'SYSTEM_AUDITOR' && (
          <>
            <StatCard label="Audit records" value={String(stats.auditRecords ?? 0)} icon={ScrollText} tone="primary" />
            <StatCard label="Submitted ballots" value={String(stats.submittedBallots ?? 0)} icon={Vote} tone="green" />
            <StatCard label="Sessions issued" value={String(stats.sessions ?? 0)} icon={BadgeCheck} tone="neutral" />
          </>
        )}
      </div>

      {role === 'VERIFICATION_OFFICER' && (
        <Card>
          <CardHeader title="Pending Requests" meta={`${queue.length} waiting`} />
          {queue.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-text-3">No pending requests.</p>
          ) : (
            <Table columns={['Voter', 'Requested centre', 'Reason', 'Submitted', 'Status']}>
              {queue.map((r) => (
                <Row key={r.id}>
                  <PrimaryCell title={r.voter.fullName} meta={r.voter.voterNumber} />
                  <Cell>
                    {r.pollingCentre.name} ({r.pollingCentre.code})
                  </Cell>
                  <Cell className="max-w-60 whitespace-normal">{r.reason ?? '—'}</Cell>
                  <Cell>{new Date(r.submittedAt).toLocaleDateString()}</Cell>
                  <Cell>
                    <StatusBadge tone={requestStatus[r.status].tone}>
                      {requestStatus[r.status].label}
                    </StatusBadge>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      )}

      {role === 'SYSTEM_AUDITOR' && (
        <Card>
          <CardHeader title="Read-only role" />
          <p className="px-5 pb-5 text-[13px] text-text-2">
            The System Auditor reviews audit records and integrity-verification activity. It has no
            write access anywhere in the system.
          </p>
        </Card>
      )}
    </>
  );
}
