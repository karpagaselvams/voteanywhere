import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { Table, Row, Cell, PrimaryCell } from '@/components/Table';
import { useResource } from '@/hooks/useResource';
import { getCandidates, getCentres } from '@/services/admin';

export default function CandidatesPage() {
  const candidates = useResource(getCandidates);
  const centres = useResource(getCentres);

  if (candidates.loading || centres.loading) return <Loading />;
  if (candidates.error || !candidates.data)
    return <LoadError message={candidates.error ?? 'Candidates unavailable'} />;
  if (centres.error || !centres.data)
    return <LoadError message={centres.error ?? 'Centres unavailable'} />;

  return (
    <>
      <Card>
        <CardHeader title="Candidates" meta={`${candidates.data.length} registered (fictional)`} />
        <Table columns={['Candidate', 'Symbol', 'Election', 'Constituency']}>
          {candidates.data.map((c) => (
            <Row key={c.id}>
              <PrimaryCell title={c.fullName} />
              <Cell>{c.symbol ?? '—'}</Cell>
              <Cell>{c.election.name}</Cell>
              <Cell>
                {c.constituency.name} ({c.constituency.code})
              </Cell>
            </Row>
          ))}
        </Table>
        <p className="px-5 py-4 text-xs text-text-3">
          Each candidate stands in exactly one constituency of one election. All data is fictional.
        </p>
      </Card>

      <Card>
        <CardHeader title="Polling Centres" meta={`${centres.data.length} centres`} />
        <Table columns={['Centre', 'Code', 'Constituency']}>
          {centres.data.map((c) => (
            <Row key={c.id}>
              <PrimaryCell title={c.name} />
              <Cell className="font-mono text-xs">{c.code}</Cell>
              <Cell>
                {c.constituency.name} ({c.constituency.code})
              </Cell>
            </Row>
          ))}
        </Table>
        <p className="px-5 py-4 text-xs text-text-3">
          A polling centre belongs to exactly one constituency. Serving as a remote polling centre
          for another constituency's voter never changes that voter's ballot.
        </p>
      </Card>
    </>
  );
}
