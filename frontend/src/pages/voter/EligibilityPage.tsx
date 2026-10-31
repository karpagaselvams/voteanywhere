import { useState } from 'react';
import { BadgeCheck, CircleCheck, CircleX } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { checkEligibility } from '@/services/voters';
import { electionLifecycle } from '@/lib/status';
import type { EligibilityResult } from '@/types';

export default function EligibilityPage() {
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setFailed(null);
    setRunning(true);
    try {
      // The check runs against the authenticated voter — no form, no IDs.
      setResult(await checkEligibility());
    } catch {
      setFailed('Eligibility check failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl self-center">
      <CardHeader title="Eligibility Verification" meta="Checked against the current election" />
      <div className="flex flex-col gap-4 px-5 pb-5">
        <p className="text-[13px] text-text-2">
          This verifies that your voter record is active, the election covers your registered
          constituency, and no ballot has been submitted for you in this election.
        </p>

        <Button icon={BadgeCheck} onClick={run} disabled={running} className="w-fit">
          {running ? 'Checking…' : 'Run Eligibility Check'}
        </Button>

        {failed ? (
          <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center gap-2.5">
              <StatusBadge tone={result.eligible ? 'green' : 'red'}>
                {result.eligible ? 'Eligible' : 'Not eligible'}
              </StatusBadge>
              {result.election ? (
                <StatusBadge tone={electionLifecycle[result.election.lifecycle].tone}>
                  {`${result.election.name} — ${electionLifecycle[result.election.lifecycle].label}`}
                </StatusBadge>
              ) : null}
            </div>

            <div className="flex flex-col">
              {result.checks.map((check) => (
                <div
                  key={check.key}
                  className="flex flex-row items-center gap-2.5 border-b border-border py-2.5 last:border-0"
                >
                  {check.passed ? (
                    <CircleCheck className="size-4 shrink-0 text-green-solid" />
                  ) : (
                    <CircleX className="size-4 shrink-0 text-red-solid" />
                  )}
                  <span className="text-[13px] text-navy">{check.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
