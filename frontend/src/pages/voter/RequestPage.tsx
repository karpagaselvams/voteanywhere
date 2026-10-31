import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import axios from 'axios';
import { ClipboardList, Send, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { useResource } from '@/hooks/useResource';
import {
  getCentres,
  getVoterDashboard,
  submitRemotePollingRequest,
  withdrawMyRequest,
} from '@/services/remotePolling';
import { requestStatus } from '@/lib/status';

const schema = z.object({
  pollingCentreId: z.string().min(1, 'Choose a polling centre'),
  reason: z.string().min(10, 'Give a short reason (at least 10 characters)'),
  declaration: z.boolean().refine((v) => v, 'The declaration is required'),
});

type FormValues = z.infer<typeof schema>;

export default function RequestPage() {
  const dashboard = useResource(getVoterDashboard);
  const centres = useResource(getCentres);
  const [failed, setFailed] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pollingCentreId: '', reason: '', declaration: false },
  });

  if (dashboard.loading || centres.loading) return <Loading />;
  if (dashboard.error || !dashboard.data)
    return <LoadError message={dashboard.error ?? 'Dashboard unavailable'} />;
  if (centres.error || !centres.data)
    return <LoadError message={centres.error ?? 'Centres unavailable'} />;

  const { voter, election, request } = dashboard.data;
  const active = request && (request.status === 'PENDING' || request.status === 'UNDER_REVIEW');

  // Only centres outside the voter's registered constituency are remote
  // polling centres for this voter. The ballot never follows the centre.
  const remoteCentres = centres.data.filter(
    (c) => c.constituency.name !== voter.registeredConstituency,
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!election) return;
    setFailed(null);
    try {
      await submitRemotePollingRequest({
        electionId: election.id,
        pollingCentreId: values.pollingCentreId,
        reason: values.reason,
      });
      await navigate('/voter/status');
    } catch (error) {
      const body = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)
        : undefined;
      setFailed(body?.error ?? 'Could not submit the request. Please try again.');
    }
  });

  const onWithdraw = async () => {
    setFailed(null);
    try {
      await withdrawMyRequest();
      await navigate('/voter');
    } catch {
      setFailed('Could not withdraw the request. Please try again.');
    }
  };

  if (!election || election.lifecycle !== 'CONFIGURED') {
    return (
      <Card className="w-full max-w-2xl self-center">
        <CardHeader title="Remote Polling Request" />
        <div className="flex flex-row items-start gap-2.5 px-5 pb-5">
          <TriangleAlert className="size-4 shrink-0 text-amber-solid" />
          <p className="text-[13px] text-text-2">
            Remote polling requests are accepted only while an election is configured and not yet
            open. {election ? `The current election is ${election.lifecycle.toLowerCase()}.` : 'No election is configured.'}
          </p>
        </div>
      </Card>
    );
  }

  if (active) {
    return (
      <Card className="w-full max-w-2xl self-center">
        <CardHeader title="Remote Polling Request" meta="Already active" />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-navy">
                {request.pollingCentre.name} ({request.pollingCentre.code})
              </span>
              <span className="text-xs text-text-3">
                Submitted {new Date(request.submittedAt).toLocaleString()}
              </span>
            </div>
            <StatusBadge tone={requestStatus[request.status].tone}>
              {requestStatus[request.status].label}
            </StatusBadge>
          </div>
          <p className="text-[13px] text-text-2">
            One active request per election. To change the centre, withdraw this request and submit
            a new one.
          </p>
          {failed ? (
            <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
          ) : null}
          <div className="flex flex-row gap-2.5">
            <Button variant="outline" onClick={() => navigate('/voter/status')}>
              View Status
            </Button>
            <Button variant="danger" onClick={onWithdraw}>
              Withdraw Request
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl self-center">
      <CardHeader title="Remote Polling Request" meta={election.name} />
      <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 pb-5">
        <p className="text-[13px] text-text-2">
          You are registered in <strong>{voter.registeredConstituency}</strong>. A remote polling
          centre changes <em>where</em> you vote — never the ballot you receive.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-navy">Remote polling centre</span>
          <select
            {...register('pollingCentreId')}
            className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-navy outline outline-border -outline-offset-[0.5px] focus:outline-primary"
          >
            <option value="">Choose a centre…</option>
            {remoteCentres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code}) — {c.constituency.name}
              </option>
            ))}
          </select>
          {errors.pollingCentreId ? (
            <span className="text-xs font-medium text-red">{errors.pollingCentreId.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-navy">Reason</span>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder="Why will you be away from your registered constituency on polling day?"
            className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-navy outline outline-border -outline-offset-[0.5px] placeholder:text-text-3 focus:outline-primary"
          />
          {errors.reason ? (
            <span className="text-xs font-medium text-red">{errors.reason.message}</span>
          ) : null}
        </label>

        <label className="flex flex-row items-start gap-2 text-[13px] text-text-2">
          <input
            {...register('declaration')}
            type="checkbox"
            className="mt-0.5 size-4 rounded border-border accent-primary"
          />
          I declare that I will appear in person at the chosen polling centre, and that my ballot
          remains the {voter.registeredConstituency} ballot.
        </label>
        {errors.declaration ? (
          <span className="text-xs font-medium text-red">{errors.declaration.message}</span>
        ) : null}

        {failed ? (
          <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
        ) : null}

        <Button type="submit" icon={Send} fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit Request'}
        </Button>

        <div className="flex flex-row items-start gap-2.5 rounded-lg bg-amber-soft px-3.5 py-3 outline outline-amber-border -outline-offset-[0.5px]">
          <ClipboardList className="size-4 shrink-0 text-amber-solid" />
          <span className="text-xs/[18px] text-amber">
            A Verification Officer reviews every request. You will see the decision, and the reason
            if refused, on the status page.
          </span>
        </div>
      </form>
    </Card>
  );
}
