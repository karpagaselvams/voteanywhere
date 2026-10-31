import { useState } from 'react';
import axios from 'axios';
import { CircleCheck, Lock, Vote } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { useResource } from '@/hooks/useResource';
import { getControlledBallot, submitControlledBallot } from '@/services/controlledBallot';
import { cn } from '@/lib/cn';

export default function BallotPage() {
  const { data, error, loading } = useResource(getControlledBallot);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ ballotReference: string; submittedAt: string } | null>(
    null,
  );

  if (loading) return <Loading />;
  if (error || !data) {
    const message = axios.isAxiosError(error)
      ? ((error.response?.data as { error?: string } | undefined)?.error ?? 'Ballot unavailable')
      : (error ?? 'Ballot unavailable');
    return <LoadError message={message} />;
  }

  const onSubmit = async () => {
    if (!selected) return;
    setFailed(null);
    setSubmitting(true);
    try {
      setReceipt(await submitControlledBallot(selected));
    } catch (e) {
      const body = axios.isAxiosError(e)
        ? (e.response?.data as { error?: string } | undefined)
        : undefined;
      setFailed(body?.error ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <Card className="w-full max-w-2xl self-center">
        <CardHeader title="Ballot Recorded" meta={data.election.name} />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <div className="flex flex-row items-center gap-2.5 rounded-lg bg-green-soft px-3.5 py-3 outline outline-green-border -outline-offset-[0.5px]">
            <CircleCheck className="size-4 shrink-0 text-green-solid" />
            <span className="text-xs text-green">
              Your ballot was sealed and recorded. It cannot be traced back to you.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-text-3">Ballot reference (your receipt)</span>
            <code className="rounded-lg bg-neutral-soft px-3 py-2.5 font-mono text-[13px] text-navy">
              {receipt.ballotReference}
            </code>
            <span className="text-xs text-text-3">
              Recorded {new Date(receipt.submittedAt).toLocaleString()}. The receipt proves a ballot
              exists — it never contains your choice.
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl self-center">
      <CardHeader
        title={`${data.election.name} — Ballot`}
        meta={`Constituency: ${data.constituency.name} (${data.constituency.code})`}
      />
      <div className="flex flex-col gap-4 px-5 pb-5">
        <div className="flex flex-row items-start gap-2.5 rounded-lg bg-primary-soft px-3.5 py-3 outline outline-border -outline-offset-[0.5px]">
          <Lock className="size-4 shrink-0 text-primary" />
          <span className="text-xs/[18px] text-navy">
            This ballot is built from your <strong>registered constituency</strong>
            {data.remoteAssignment
              ? `, even though you are approved to appear at ${data.remoteAssignment.pollingCentre.name}`
              : ''}
            . Your choice is encrypted before it is stored, and stored apart from your identity.
          </span>
        </div>

        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Candidates">
          {data.candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="radio"
              aria-checked={selected === candidate.id}
              onClick={() => setSelected(candidate.id)}
              className={cn(
                'flex w-full flex-row items-center justify-between rounded-xl px-4 py-3.5 text-left outline -outline-offset-[0.5px] transition-colors',
                selected === candidate.id
                  ? 'bg-primary-soft outline-primary'
                  : 'bg-surface outline-border hover:bg-neutral-soft',
              )}
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-navy">{candidate.fullName}</span>
                {candidate.symbol ? (
                  <span className="text-xs text-text-3">Symbol: {candidate.symbol}</span>
                ) : null}
              </span>
              <span
                className={cn(
                  'size-4 rounded-full outline',
                  selected === candidate.id
                    ? 'bg-primary outline-primary'
                    : 'bg-surface outline-border',
                )}
              />
            </button>
          ))}
        </div>

        {failed ? (
          <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
        ) : null}

        <Button
          icon={Vote}
          fullWidth
          disabled={!selected || submitting}
          onClick={onSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit Ballot'}
        </Button>
        <p className="text-center text-xs text-text-3">
          Submission is final. One ballot per voter per election.
        </p>
      </div>
    </Card>
  );
}
