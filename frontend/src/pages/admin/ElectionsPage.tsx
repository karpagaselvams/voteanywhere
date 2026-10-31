import { useState } from 'react';
import axios from 'axios';
import { CirclePlay, CircleStop } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, Row, Cell, PrimaryCell } from '@/components/Table';
import { useResource } from '@/hooks/useResource';
import {
  activateElection,
  closeElection,
  getElections,
  getReconciliation,
} from '@/services/admin';
import { electionLifecycle } from '@/lib/status';
import type { ReconciliationReport } from '@/types';

export default function ElectionsPage() {
  const elections = useResource(getElections);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [report, setReport] = useState<ReconciliationReport | null>(null);

  if (elections.loading) return <Loading />;
  if (elections.error || !elections.data)
    return <LoadError message={elections.error ?? 'Elections unavailable'} />;

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setFailed(null);
    try {
      await fn();
      elections.data = await getElections();
    } catch (error) {
      const body = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)
        : undefined;
      setFailed(body?.error ?? 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader title="Elections" meta="Configure, activate, close" />
        {failed ? (
          <p className="mx-5 mb-3 rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">
            {failed}
          </p>
        ) : null}
        <Table columns={['Election', 'Window', 'Constituencies', 'Lifecycle', 'Actions']}>
          {elections.data.map((e) => (
            <Row key={e.id}>
              <PrimaryCell title={e.name} meta={e.code} />
              <Cell className="whitespace-nowrap">
                {new Date(e.startsAt).toLocaleDateString()} —{' '}
                {new Date(e.endsAt).toLocaleDateString()}
              </Cell>
              <Cell>{e.constituencies.map((c) => c.name).join(', ') || '—'}</Cell>
              <Cell>
                <StatusBadge tone={electionLifecycle[e.lifecycle].tone}>
                  {electionLifecycle[e.lifecycle].label}
                </StatusBadge>
              </Cell>
              <Cell>
                <div className="flex flex-row gap-2">
                  {e.lifecycle === 'CONFIGURED' && (
                    <Button
                      icon={CirclePlay}
                      disabled={busyId === e.id}
                      onClick={() => act(e.id, () => activateElection(e.id))}
                    >
                      Activate
                    </Button>
                  )}
                  {e.lifecycle === 'ACTIVE' && (
                    <Button
                      variant="danger"
                      icon={CircleStop}
                      disabled={busyId === e.id}
                      onClick={() => act(e.id, () => closeElection(e.id))}
                    >
                      Close
                    </Button>
                  )}
                  {e.lifecycle === 'CLOSED' && (
                    <Button
                      variant="outline"
                      onClick={() => getReconciliation(e.id).then(setReport)}
                    >
                      Reconciliation
                    </Button>
                  )}
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>

      {report ? (
        <Card>
          <CardHeader
            title={`Reconciliation — ${report.election.name}`}
            meta={`Ballots issued vs recorded, per constituency`}
            action={
              <StatusBadge tone={report.totalDiscrepancy === 0 ? 'green' : 'red'}>
                {report.totalDiscrepancy === 0
                  ? 'No discrepancy'
                  : `Discrepancy: ${report.totalDiscrepancy}`}
              </StatusBadge>
            }
          />
          <Table columns={['Constituency', 'Ballots issued', 'Ballots recorded', 'Discrepancy']}>
            {report.rows.map((row) => (
              <Row key={row.constituency.code}>
                <PrimaryCell title={row.constituency.name} meta={row.constituency.code} />
                <Cell>{row.ballotsIssued}</Cell>
                <Cell>{row.ballotsRecorded}</Cell>
                <Cell>{row.discrepancy}</Cell>
              </Row>
            ))}
          </Table>
          <p className="px-5 py-4 text-xs text-text-3">
            Counts only — issuance is never matched to an individual submission. A ballot cast at a
            remote polling centre counts toward the voter's registered constituency.
          </p>
        </Card>
      ) : null}
    </>
  );
}
