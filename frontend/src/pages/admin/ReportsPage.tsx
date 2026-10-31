import { useState } from 'react';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, Row, Cell, PrimaryCell } from '@/components/Table';
import { useResource } from '@/hooks/useResource';
import { getReports } from '@/services/admin';
import { requestStatus } from '@/lib/status';
import type { RequestStatus } from '@/types';

const filterOptions: { value: '' | RequestStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'USED', label: 'Ballot Submitted' },
  { value: 'EXPIRED', label: 'Expired' },
];

export default function ReportsPage() {
  const [status, setStatus] = useState<'' | RequestStatus>('');
  const { data, error, loading } = useResource(
    () => getReports(status || undefined),
    [status],
  );

  return (
    <Card>
      <CardHeader
        title="Remote Polling Requests"
        meta={data ? `${data.totalRecords} records` : undefined}
        action={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | RequestStatus)}
            className="rounded-lg bg-surface px-3 py-2 text-[13px] text-navy outline outline-border -outline-offset-[0.5px] focus:outline-primary"
          >
            {filterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        }
      />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <LoadError message={error ?? 'Report unavailable'} />
      ) : data.requests.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-text-3">No requests match this filter.</p>
      ) : (
        <Table columns={['Voter', 'Election', 'Requested centre', 'Reviewed by', 'Status']}>
          {data.requests.map((r) => (
            <Row key={r.id}>
              <PrimaryCell title={r.voter.fullName} meta={r.voter.voterNumber} />
              <Cell>{r.election.code}</Cell>
              <Cell>
                {r.pollingCentre.name} ({r.pollingCentre.code})
                <div className="text-[11px] text-text-3">{r.pollingCentre.constituency}</div>
                {r.reviewNote ? (
                  <div className="text-[11px] text-red">Note: {r.reviewNote}</div>
                ) : null}
              </Cell>
              <Cell>{r.reviewedBy ?? '—'}</Cell>
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
  );
}
