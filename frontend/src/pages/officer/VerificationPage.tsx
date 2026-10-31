import { useState } from 'react';
import axios from 'axios';
import { CircleCheck, Search, UserCheck } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, Row, Cell, PrimaryCell } from '@/components/Table';
import { useAuth } from '@/hooks/useAuth';
import { useResource } from '@/hooks/useResource';
import { verifyVoter } from '@/services/officer';
import {
  approveRequest,
  claimRequest,
  getRequestQueue,
  rejectRequest,
  releaseRequest,
} from '@/services/remotePolling';
import { requestStatus } from '@/lib/status';
import type { QueueRequest, VerificationResult } from '@/types';

/** Verification Officer: claim, approve, or reject remote polling requests. */
function ReviewQueue() {
  const queue = useResource(() => getRequestQueue());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [failed, setFailed] = useState<string | null>(null);

  if (queue.loading) return <Loading />;
  if (queue.error || !queue.data) return <LoadError message={queue.error ?? 'Queue unavailable'} />;

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setFailed(null);
    try {
      await fn();
      queue.data = queue.data!.map((r) => (r.id === id ? { ...r } : r));
      // Reload the queue for ground truth after a state change.
      queue.data = await getRequestQueue();
    } catch (error) {
      const body = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)
        : undefined;
      setFailed(body?.error ?? 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const actionable = queue.data.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW');

  return (
    <Card>
      <CardHeader title="Remote Polling Review Queue" meta={`${actionable.length} awaiting decision`} />
      {failed ? (
        <p className="mx-5 mb-3 rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">
          {failed}
        </p>
      ) : null}
      {actionable.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-text-3">No requests awaiting review.</p>
      ) : (
        <Table columns={['Voter', 'Requested centre', 'Reason', 'Status', 'Actions']}>
          {actionable.map((r: QueueRequest) => (
            <Row key={r.id}>
              <PrimaryCell title={r.voter.fullName} meta={r.voter.voterNumber} />
              <Cell>
                {r.pollingCentre.name} ({r.pollingCentre.code})
                <div className="text-[11px] text-text-3">{r.pollingCentre.constituency}</div>
              </Cell>
              <Cell className="max-w-56 whitespace-normal">{r.reason ?? '—'}</Cell>
              <Cell>
                <StatusBadge tone={requestStatus[r.status].tone}>
                  {requestStatus[r.status].label}
                </StatusBadge>
                {r.reviewedBy ? (
                  <div className="mt-1 text-[11px] text-text-3">Claimed by {r.reviewedBy}</div>
                ) : null}
              </Cell>
              <Cell>
                <div className="flex flex-col gap-2">
                  {r.status === 'PENDING' ? (
                    <Button
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, () => claimRequest(r.id))}
                    >
                      Claim
                    </Button>
                  ) : (
                    <>
                      <Button
                        icon={CircleCheck}
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, () => approveRequest(r.id))}
                      >
                        Approve
                      </Button>
                      {rejectingId === r.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            placeholder="Reason for rejection (shown to the voter)"
                            className="w-56 rounded-lg bg-surface px-3 py-2 text-sm text-navy outline outline-border -outline-offset-[0.5px] focus:outline-primary"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              disabled={busyId === r.id || !reason.trim()}
                              onClick={() =>
                                act(r.id, () => rejectRequest(r.id, reason)).then(() => {
                                  setRejectingId(null);
                                  setReason('');
                                })
                              }
                            >
                              Confirm Reject
                            </Button>
                            <Button variant="outline" onClick={() => setRejectingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            disabled={busyId === r.id}
                            onClick={() => setRejectingId(r.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, () => releaseRequest(r.id))}
                          >
                            Release
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </Card>
  );
}

/** Polling Centre Officer: pre-vote verification of a voter's assignment. */
function VoterLookup() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setFailed(null);
    setResult(null);
    try {
      setResult(await verifyVoter(query));
    } catch (error) {
      const body = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)
        : undefined;
      setFailed(body?.error ?? 'Lookup failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl self-center">
      <CardHeader title="Voter Verification" meta="Before a ballot is generated" />
      <div className="flex flex-col gap-4 px-5 pb-5">
        <div className="flex flex-row gap-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Voter number, e.g. VA-0001"
            className="flex-1 rounded-lg bg-surface px-3 py-2.5 text-sm text-navy outline outline-border -outline-offset-[0.5px] placeholder:text-text-3 focus:outline-primary"
          />
          <Button icon={Search} onClick={search} disabled={searching}>
            {searching ? 'Searching…' : 'Look Up'}
          </Button>
        </div>

        {failed ? (
          <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-navy">{result.voter.fullName}</span>
                <span className="text-xs text-text-3">
                  {result.voter.voterNumber} — registered in {result.voter.registeredConstituency}
                </span>
              </div>
              {result.hasVoted ? <StatusBadge tone="green">Ballot Submitted</StatusBadge> : null}
            </div>

            <div className="flex flex-col">
              {(
                [
                  ['Election', result.election ? `${result.election.name} (${result.election.lifecycle})` : '—'],
                  ['Home polling centre', result.voter.homePollingCentre ?? '—'],
                  [
                    'Remote request',
                    result.request ? requestStatus[result.request.status].label : 'None',
                  ],
                  [
                    'Assignment',
                    result.assignment
                      ? `${result.assignment.pollingCentre.name} (${result.assignment.pollingCentre.code})`
                      : 'None',
                  ],
                  ['Ballot', result.hasVoted ? 'Submitted' : 'Not submitted'],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-row items-center justify-between border-b border-border py-2.5 last:border-0"
                >
                  <span className="text-[13px] text-text-3">{label}</span>
                  <span className="text-[13px] font-medium text-navy">{value}</span>
                </div>
              ))}
            </div>

            {result.request?.reviewNote ? (
              <p className="rounded-lg bg-red-soft px-3 py-2 text-xs text-red">
                Review note: {result.request.reviewNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function VerificationPage() {
  const { session } = useAuth();
  if (!session) return null;

  if (session.role === 'VERIFICATION_OFFICER') return <ReviewQueue />;
  if (session.role === 'POLLING_CENTRE_OFFICER') return <VoterLookup />;
  return (
    <Card className="w-full max-w-2xl self-center">
      <CardHeader title="Voter Verification" />
      <p className="px-5 pb-5 text-[13px] text-text-2">
        The System Auditor has read-only access and does not perform verification.
      </p>
    </Card>
  );
}

export function VerificationPageHeaderIcon() {
  return <UserCheck className="size-4" />;
}
