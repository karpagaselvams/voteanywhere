import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, Row, Cell, PrimaryCell } from '@/components/Table';
import { useResource } from '@/hooks/useResource';
import { getRequestQueue } from '@/services/remotePolling';
import { requestStatus } from '@/lib/status';

// Polling Centre Officer: the assignments in force and the ballots already
// submitted under them. Ballot generation and submission happen on the
// voter's own screen; this is the centre's read on who may appear.
export default function BallotControlPage() {
  const approved = useResource(() => getRequestQueue('APPROVED'));
  const used = useResource(() => getRequestQueue('USED'));

  if (approved.loading || used.loading) return <Loading />;
  if (approved.error || used.error || !approved.data || !used.data) {
    return <LoadError message={approved.error ?? used.error ?? 'Unavailable'} />;
  }

  const renderTable = (rows: typeof approved.data, empty: string) =>
    rows.length === 0 ? (
      <p className="px-5 pb-5 text-[13px] text-text-3">{empty}</p>
    ) : (
      <Table columns={['Voter', 'Assigned centre', 'Submitted', 'Status']}>
        {rows.map((r) => (
          <Row key={r.id}>
            <PrimaryCell title={r.voter.fullName} meta={r.voter.voterNumber} />
            <Cell>
              {r.pollingCentre.name} ({r.pollingCentre.code})
              <div className="text-[11px] text-text-3">{r.pollingCentre.constituency}</div>
            </Cell>
            <Cell>{new Date(r.submittedAt).toLocaleDateString()}</Cell>
            <Cell>
              <StatusBadge tone={requestStatus[r.status].tone}>
                {requestStatus[r.status].label}
              </StatusBadge>
            </Cell>
          </Row>
        ))}
      </Table>
    );

  return (
    <>
      <Card>
        <CardHeader
          title="Approved Assignments"
          meta={`${approved.data.length} voters may appear at a remote centre`}
        />
        {renderTable(approved.data, 'No approved assignments yet.')}
      </Card>

      <Card>
        <CardHeader title="Ballots Submitted Under Assignment" meta={`${used.data.length} used`} />
        {renderTable(used.data, 'No ballots submitted under an assignment yet.')}
      </Card>

      <Card>
        <CardHeader title="Before enabling a ballot" />
        <p className="px-5 pb-5 text-[13px] text-text-2">
          Confirm the voter has an approved assignment for this centre and has not already voted —
          use the Verification &amp; Check-in page. The ballot itself is generated from the voter's
          registered constituency, never from this centre.
        </p>
      </Card>
    </>
  );
}
