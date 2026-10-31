import { CalendarRange, ClipboardList, MapPin, Users, Vote } from 'lucide-react';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useResource } from '@/hooks/useResource';
import { getAdminDashboard } from '@/services/admin';
import { requestStatus } from '@/lib/status';
import type { RequestStatus } from '@/types';

export default function DashboardPage() {
  const { data, error, loading } = useResource(getAdminDashboard);

  if (loading) return <Loading />;
  if (error || !data) return <LoadError message={error ?? 'Dashboard unavailable'} />;

  const requestRows = (
    Object.entries(requestStatus) as [RequestStatus, { label: string; tone: never }][]
  ).map(([status, meta]) => ({ status, meta, count: data.requests[status] ?? 0 }));

  return (
    <>
      <div className="flex w-full flex-row gap-6">
        <StatCard label="Registered voters" value={String(data.voters)} icon={Users} tone="primary" />
        <StatCard label="Polling centres" value={String(data.pollingCentres)} icon={MapPin} tone="neutral" />
        <StatCard
          label="Open requests"
          value={String((data.requests.PENDING ?? 0) + (data.requests.UNDER_REVIEW ?? 0))}
          icon={ClipboardList}
          tone="amber"
        />
        <StatCard label="Ballots submitted" value={String(data.submittedBallots)} icon={Vote} tone="green" />
      </div>

      <div className="flex w-full flex-row gap-6">
        <Card className="flex-1">
          <CardHeader title="Elections" />
          <div className="flex flex-col px-5 pb-5">
            {(
              [
                ['Configured', data.elections.configured],
                ['Active', data.elections.active],
                ['Closed', data.elections.closed],
              ] as const
            ).map(([label, count]) => (
              <div
                key={label}
                className="flex flex-row items-center justify-between border-b border-border py-2.5 last:border-0"
              >
                <span className="text-[13px] text-text-3">{label}</span>
                <span className="text-[13px] font-semibold text-navy">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex-1">
          <CardHeader
            title="Remote Polling Requests"
            meta={
              data.requests.approvalRate !== null
                ? `${data.requests.approvalRate}% of decided requests approved`
                : 'No decided requests yet'
            }
          />
          <div className="flex flex-col px-5 pb-5">
            {requestRows.map(({ status, meta, count }) => (
              <div
                key={status}
                className="flex flex-row items-center justify-between border-b border-border py-2 last:border-0"
              >
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                <span className="text-[13px] font-semibold text-navy">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Operations" meta="Election Administrator" />
        <div className="flex flex-row items-center gap-2.5 px-5 pb-5">
          <CalendarRange className="size-4 shrink-0 text-primary" />
          <span className="text-[13px] text-text-2">
            Configure, activate, and close elections from the Election Management page. Closing an
            election expires open remote polling requests and unlocks reconciliation.
          </span>
        </div>
      </Card>
    </>
  );
}
