import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, Vote } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { useResource } from '@/hooks/useResource';
import { getVoterDashboard } from '@/services/remotePolling';
import { electionLifecycle, requestStatus } from '@/lib/status';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="text-[13px] text-text-3">{label}</span>
      <span className="text-[13px] font-medium text-navy">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading } = useResource(getVoterDashboard);

  if (loading) return <Loading />;
  if (error || !data) return <LoadError message={error ?? 'Dashboard unavailable'} />;

  const { voter, election, request, assignment, hasVoted } = data;

  return (
    <>
      <div className="flex w-full flex-row items-center justify-between rounded-xl bg-navy-deep px-6 py-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-white">Welcome back, {voter.fullName}</h2>
          <p className="text-[13px] text-navy-text-2">
            {election ? `${election.name} — ` : ''}Registered in {voter.registeredConstituency}
          </p>
        </div>
        <div className="flex flex-row gap-2.5">
          {!request && (
            <Link to="/voter/request">
              <Button variant="white" iconRight={ArrowRight}>
                Request Remote Polling
              </Button>
            </Link>
          )}
          {election?.lifecycle === 'ACTIVE' && !hasVoted && (
            <Link to="/voter/ballot">
              <Button variant="translucent" icon={Vote}>
                Cast Your Ballot
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex w-full flex-row gap-6">
        <Card className="flex-1">
          <CardHeader title="Your Registration" meta={voter.voterNumber} />
          <div className="flex flex-col px-5 pb-4">
            <Row label="Voter number" value={voter.voterNumber} />
            <Row label="Registered constituency" value={voter.registeredConstituency} />
            <Row label="Home polling centre" value={voter.homePollingCentre ?? '—'} />
            <Row label="Ballot status" value={hasVoted ? 'Ballot submitted' : 'Not yet voted'} />
          </div>
        </Card>

        <Card className="flex-1">
          <CardHeader
            title="Current Election"
            meta={election ? electionLifecycle[election.lifecycle].label : undefined}
          />
          <div className="flex flex-col px-5 pb-4">
            {election ? (
              <>
                <Row label="Election" value={election.name} />
                <Row label="Polling opens" value={new Date(election.startsAt).toLocaleString()} />
                <Row label="Polling closes" value={new Date(election.endsAt).toLocaleString()} />
                <div className="pt-2.5">
                  <StatusBadge tone={electionLifecycle[election.lifecycle].tone}>
                    {electionLifecycle[election.lifecycle].label}
                  </StatusBadge>
                </div>
              </>
            ) : (
              <p className="py-3 text-[13px] text-text-3">No election is configured yet.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Remote Polling" meta="Request and assignment" />
        <div className="flex flex-col gap-3 px-5 pb-5">
          {request ? (
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-navy">
                  {request.pollingCentre.name} ({request.pollingCentre.code})
                </span>
                <span className="text-xs text-text-3">
                  Submitted {new Date(request.submittedAt).toLocaleString()} — ballot always from{' '}
                  {voter.registeredConstituency}
                </span>
                {request.status === 'REJECTED' && request.reviewNote ? (
                  <span className="text-xs text-red">Reason: {request.reviewNote}</span>
                ) : null}
              </div>
              <StatusBadge tone={requestStatus[request.status].tone}>
                {requestStatus[request.status].label}
              </StatusBadge>
            </div>
          ) : (
            <p className="text-[13px] text-text-3">
              No remote polling request yet. If you will be away from {voter.registeredConstituency}{' '}
              on polling day, submit one.
            </p>
          )}

          {assignment ? (
            <div className="flex flex-row items-center gap-2.5 rounded-lg bg-green-soft px-3.5 py-3 outline outline-green-border -outline-offset-[0.5px]">
              <MapPin className="size-4 shrink-0 text-green-solid" />
              <span className="text-xs text-green">
                Approved to vote at {assignment.pollingCentre.name} (
                {assignment.pollingCentre.code}) — your ballot still comes from{' '}
                {voter.registeredConstituency}.
              </span>
            </div>
          ) : null}

          <div className="flex flex-row gap-2.5">
            <Link to="/voter/eligibility">
              <Button variant="outline" icon={BadgeCheck}>
                Check Eligibility
              </Button>
            </Link>
            <Link to="/voter/status">
              <Button variant="outline" icon={CalendarDays}>
                Request Status
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}
