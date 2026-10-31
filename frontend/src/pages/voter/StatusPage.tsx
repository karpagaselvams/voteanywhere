import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { VerticalSteps } from '@/components/Stepper';
import { useResource } from '@/hooks/useResource';
import { getVoterDashboard } from '@/services/remotePolling';
import { requestStatus } from '@/lib/status';

export default function StatusPage() {
  const { data, error, loading } = useResource(getVoterDashboard);

  if (loading) return <Loading />;
  if (error || !data) return <LoadError message={error ?? 'Status unavailable'} />;

  const { voter, request, assignment, hasVoted } = data;

  if (!request) {
    return (
      <Card className="w-full max-w-2xl self-center">
        <CardHeader title="Request Status" />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <p className="text-[13px] text-text-2">
            You have not submitted a remote polling request for the current election.
          </p>
          <Link to="/voter/request" className="w-fit">
            <Button iconRight={ArrowRight}>Submit a Request</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const steps = [
    {
      label: 'Request submitted',
      detail: new Date(request.submittedAt).toLocaleString(),
      state: 'done' as const,
    },
    {
      label: 'Officer review',
      detail:
        request.status === 'PENDING'
          ? 'Waiting for a Verification Officer'
          : `Reviewed ${request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : ''}`,
      state:
        request.status === 'PENDING'
          ? ('current' as const)
          : ('done' as const),
    },
    {
      label:
        request.status === 'APPROVED' || request.status === 'USED'
          ? 'Approved — assignment issued'
          : request.status === 'REJECTED'
            ? 'Rejected'
            : request.status === 'WITHDRAWN'
              ? 'Withdrawn by you'
              : request.status === 'EXPIRED'
                ? 'Expired — election closed'
                : 'Decision pending',
      detail:
        request.status === 'REJECTED' && request.reviewNote
          ? `Reason: ${request.reviewNote}`
          : '',
      state: ['APPROVED', 'USED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'].includes(request.status)
        ? ('done' as const)
        : ('upcoming' as const),
    },
    {
      label: 'Ballot submitted',
      detail: hasVoted ? 'Recorded under your opaque ballot reference' : '',
      state: hasVoted ? ('done' as const) : ('upcoming' as const),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader
          title="Request Status"
          meta={request.election.name}
          action={
            <StatusBadge tone={requestStatus[request.status].tone}>
              {requestStatus[request.status].label}
            </StatusBadge>
          }
        />
        <div className="px-5 pb-5">
          <VerticalSteps steps={steps} />
        </div>
      </Card>

      <div className="flex w-full flex-row gap-6">
        <Card className="flex-1">
          <CardHeader title="Requested Centre" />
          <div className="flex flex-col gap-1 px-5 pb-5">
            <span className="text-[13px] font-semibold text-navy">
              {request.pollingCentre.name} ({request.pollingCentre.code})
            </span>
            <span className="text-xs text-text-3">
              Located in {request.pollingCentre.constituency} — your ballot still comes from{' '}
              {voter.registeredConstituency}.
            </span>
          </div>
        </Card>

        {assignment ? (
          <Card className="flex-1">
            <CardHeader title="Remote Polling Assignment" meta="Approved" />
            <div className="flex flex-col gap-2 px-5 pb-5">
              <div className="flex flex-row items-center gap-2.5 rounded-lg bg-green-soft px-3.5 py-3 outline outline-green-border -outline-offset-[0.5px]">
                <MapPin className="size-4 shrink-0 text-green-solid" />
                <span className="text-xs text-green">
                  Appear at {assignment.pollingCentre.name} ({assignment.pollingCentre.code}) on
                  polling day.
                </span>
              </div>
              <span className="text-xs text-text-3">
                Assigned {new Date(assignment.assignedAt).toLocaleString()}
                {assignment.used ? ' — ballot submitted' : ''}
              </span>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
