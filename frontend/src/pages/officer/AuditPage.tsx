import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Loading, LoadError } from '@/components/PageState';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, Row, Cell } from '@/components/Table';
import { useResource } from '@/hooks/useResource';
import { getAuditRecords } from '@/services/officer';

const actorTone = { OFFICER: 'primary', VOTER: 'green', SYSTEM: 'neutral' } as const;

// System Auditor: the audit trail, read-only. Records are written by backend
// services as a side effect of state-changing operations; nobody edits or
// deletes them.
export default function AuditPage() {
  const [action, setAction] = useState('');
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data, error, loading } = useResource(() => getAuditRecords(filter), [filter]);

  return (
    <Card>
      <CardHeader title="Audit Trail" meta={data ? `${data.length} records` : undefined} />
      <div className="flex flex-row gap-2.5 px-5 pb-4">
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setFilter(action.trim() || undefined)}
          placeholder="Filter by action, e.g. remote_polling.request.approved"
          className="flex-1 rounded-lg bg-surface px-3 py-2.5 text-sm text-navy outline outline-border -outline-offset-[0.5px] placeholder:text-text-3 focus:outline-primary"
        />
        <Button variant="outline" icon={Search} onClick={() => setFilter(action.trim() || undefined)}>
          Filter
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <LoadError message={error ?? 'Audit trail unavailable'} />
      ) : data.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-text-3">No audit records match.</p>
      ) : (
        <Table columns={['Time', 'Actor', 'Action', 'Entity', 'Reference']}>
          {data.map((r) => (
            <Row key={r.id}>
              <Cell className="whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</Cell>
              <Cell>
                <StatusBadge tone={actorTone[r.actorType]}>{r.actorType}</StatusBadge>
              </Cell>
              <Cell className="font-mono text-xs">{r.action}</Cell>
              <Cell>{r.entityType ?? '—'}</Cell>
              <Cell className="max-w-56 truncate font-mono text-xs">{r.entityRef ?? '—'}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </Card>
  );
}
