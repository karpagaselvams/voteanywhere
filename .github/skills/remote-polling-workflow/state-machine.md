# Remote Polling Request State Machine

Reference for the `remote-polling-workflow` skill. This table is the source of truth for the `transition` function. A move that is not listed here is illegal.

## States

| State | Meaning |
|---|---|
| `PENDING` | Submitted by the voter, not yet picked up for review |
| `UNDER_REVIEW` | Claimed by a Verification Officer |
| `APPROVED` | Granted; a remote polling assignment exists |
| `REJECTED` | Refused; a reason is recorded |
| `WITHDRAWN` | Cancelled by the voter before a decision |
| `USED` | A ballot was submitted under the resulting assignment |
| `EXPIRED` | The election closed without the assignment being used |

`APPROVED`, `REJECTED`, `WITHDRAWN`, `USED`, and `EXPIRED` are terminal in the sense that a request never returns to `PENDING`. Only `APPROVED` has further transitions, and only to `USED` or `EXPIRED`.

## Transitions

| From | To | Who | Required | Side effects |
|---|---|---|---|---|
| — | `PENDING` | Voter (own request only) | Election configured and not yet open; voter eligible; no other active request for this election | Audit record |
| `PENDING` | `UNDER_REVIEW` | Verification Officer | — | Reviewer recorded; audit record |
| `PENDING` | `WITHDRAWN` | Voter (own request only) | — | Audit record |
| `PENDING` | `EXPIRED` | System | Election closed | Audit record |
| `UNDER_REVIEW` | `APPROVED` | Verification Officer | Election not closed; voter still eligible; requested polling centre active | **Remote polling assignment created in the same transaction**; audit record |
| `UNDER_REVIEW` | `REJECTED` | Verification Officer | Reason supplied and non-empty | Reason stored; audit record |
| `UNDER_REVIEW` | `WITHDRAWN` | Voter (own request only) | — | Reviewer released; audit record |
| `UNDER_REVIEW` | `PENDING` | Verification Officer | Reviewer releasing the claim | Reviewer cleared; audit record |
| `APPROVED` | `USED` | System | Ballot submitted successfully under this assignment | Written in the ballot submission transaction; audit record |
| `APPROVED` | `EXPIRED` | System | Election closed with the assignment unused | Audit record |

Every row writes an audit record naming the actor, the timestamp, the request ID, and the from and to states. Audit records never carry a ballot reference or a candidate choice — see `audit-trail`.

## Explicitly illegal

These are the moves most likely to be introduced by accident. Each needs a test proving it is refused.

| Move | Why it must fail |
|---|---|
| `REJECTED` → `APPROVED` | A decided refusal must not be quietly reversed; the voter resubmits instead |
| `REJECTED` → `UNDER_REVIEW` | Same |
| `WITHDRAWN` → anything | The voter cancelled; a new request is required |
| `USED` → `APPROVED` | Would permit a second ballot |
| `USED` → anything | Terminal |
| `EXPIRED` → `APPROVED` | The election is closed |
| `PENDING` → `APPROVED` | Approval must pass through review; skipping it skips the eligibility re-check |
| `PENDING` → `REJECTED` | Same |
| `APPROVED` → `REJECTED` | An assignment already exists; revocation is a separate, audited operation if it is ever added |

## Actor rules

- **Voter** acts only on their own requests, identified from the authenticated session, never from a body or query parameter.
- **Verification Officer** is the only role that may move a request to `UNDER_REVIEW`, `APPROVED`, or `REJECTED`.
- **Election Administrator**, **Polling Centre Officer**, and **System Auditor** have no transition rights. The System Auditor reads the audit trail only.
- **System** transitions (`EXPIRED`, `USED`) are triggered by election closure and ballot submission respectively. They are recorded with a system actor, never attributed to a person.
- An officer who also holds a voter record may not act on their own request.

## Invariants

Hold after every transition:

1. A request in `APPROVED` or `USED` has exactly one remote polling assignment. A request in any other state has none.
2. A voter has at most one request in `PENDING` or `UNDER_REVIEW` per election. Enforce with a partial unique constraint on `(voterId, electionId)` where the status is active.
3. A request in `REJECTED` has a non-empty reason.
4. No transition writes to the voter's registered constituency. Ever.
5. Every state change has a corresponding audit record.
