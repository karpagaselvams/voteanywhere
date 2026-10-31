---
name: audit-trail
description: >-
  Governs what every state-changing operation records in the audit trail and
  what must never be recorded. Use when adding a state-changing operation,
  writing an audit entry, designing the audit model, or building the System
  Auditor's review surface.
---

# Audit Trail

Every state-changing operation leaves a record of who did what, when, and to which resource. The audit trail is how the System Auditor reconstructs what happened without ever learning how anyone voted.

## The shape of a record

```ts
type AuditRecord = {
  id: string;
  occurredAt: Date;         // server clock, UTC
  actorType: 'OFFICER' | 'VOTER' | 'SYSTEM';
  actorId: string | null;   // null only for SYSTEM
  actorRole: Role | null;
  action: string;           // 'REMOTE_POLLING_REQUEST_APPROVED'
  resourceType: string;     // 'RemotePollingRequest'
  resourceId: string;       // the operation reference
  outcome: 'SUCCESS' | 'FAILURE';
  detail: Record<string, string> | null;  // see the never-record list
};
```

`detail` holds small, non-sensitive context — a from-state and to-state, a rejection reason, a failure code. Never a request body, never a full entity, never anything from the list below.

## Never record

Passwords and password hashes. OTPs and OTP hashes. JWTs and session tokens. The ballot encryption key or any key material. Decrypted candidate choices. Full request or response bodies.

And one more, specific to this project: **never record a ballot reference alongside an identified voter.** Each alone is fine. Together they break ballot secrecy, permanently, in a store designed never to be deleted. See `ballot-secrecy`.

```ts
// ❌ BAD — the audit trail now links a voter to their ballot
audit.record({ actorId: voterId, action: 'BALLOT_SUBMITTED', resourceId: ballotReference });

// ✅ GOOD — records that the voter voted, not which ballot is theirs
audit.record({
  actorType: 'VOTER', actorId: voterId,
  action: 'BALLOT_SUBMITTED',
  resourceType: 'VoterElectionStatus', resourceId: `${voterId}:${electionId}`,
});
```

## What to record

Any operation that changes state, plus security-relevant failures.

| Area | Actions |
|---|---|
| Authentication | Login success, login failure, OTP issued, OTP verification failure, session revoked |
| Voter management | Voter record updated, eligibility verification run |
| Elections | Election created, configured, activated, closed; candidate added or changed; reconciliation run |
| Remote polling | Every state transition, naming the from-state and to-state |
| Ballots | Ballot generated, ballot submitted, duplicate submission refused, integrity verification run |
| Authorization | Every 403 on a protected route |
| Simulator | Scenario started, scenario completed, failure injected, recovery completed |

Reads are not audited, with one exception: the System Auditor's own access to the audit trail is recorded, so auditor activity is itself reviewable.

## Write it inside the transaction

An audit record written after a transaction commits can be lost by a crash in between, leaving a state change with no trace.

```ts
// ✅ GOOD — the change and its record land together or not at all
await prisma.$transaction(async (tx) => {
  await tx.remotePollingRequest.update({ where: { id }, data: { status: 'APPROVED' } });
  await tx.remotePollingAssignment.create({ data: { voterId, electionId, pollingCentreId } });
  await tx.auditRecord.create({ data: buildAuditRecord(...) });
});
```

Failures that have no transaction — a rejected login, a 403 — are recorded on their own.

A failed audit write fails the operation. Silently swallowing it produces a trail that looks complete and is not.

## Append-only

No update path, no delete path, no API route that writes one. Records are created by services as a side effect, and the System Auditor reads them. Nothing else.

Grant the application's database user `INSERT` and `SELECT` on the audit table and nothing more, so the constraint survives a bug in the service layer.

This gives an append-only trail, not a tamper-evident one. An attacker with direct database access can still alter history. Say so plainly in project documentation rather than overstating what the trail proves.

## Required tests

- Each action in the table above produces exactly one record with the correct actor, action, and resource.
- A rolled-back transaction leaves no audit record.
- A failed audit write rolls back the operation.
- No record in a full run of the suite contains a password, OTP, token, key, or candidate choice.
- No record carries both an identified voter and a ballot reference.
- Only the System Auditor can read the trail; every other role receives 403.
