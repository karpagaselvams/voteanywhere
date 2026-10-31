# Role Permission Matrix

Reference for the `role-authorization` skill. This is the single source of truth for who may call what. Update it in the same commit as the route it describes.

Abbreviations: **EA** Election Administrator, **VO** Verification Officer, **PCO** Polling Centre Officer, **SA** System Auditor, **V** Voter.

`own` means the operation is permitted only on the caller's own resources, resolved from the authenticated session.

## Authentication

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| Officer login (username + password) | ✓ | ✓ | ✓ | ✓ | — |
| Request voter OTP | — | — | — | — | ✓ |
| Verify voter OTP | — | — | — | — | ✓ |
| Read own session | ✓ | ✓ | ✓ | ✓ | ✓ |
| Revoke a session | ✓ | — | — | — | own |

## Voter management

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| Read own voter profile | — | — | — | — | ✓ |
| Search voter records | — | ✓ | ✓ | — | — |
| Read any voter record | — | ✓ | ✓ | — | — |
| Update a voter record | ✓ | ✓ | — | — | — |
| Change a registered constituency | — | — | — | — | — |
| Run eligibility verification | — | ✓ | ✓ | — | — |

Changing a registered constituency is permitted to nobody through the API. It is set at seed time. Any route that would alter it violates the Core Rule — see `constituency-invariant`.

## Election management

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| Create or configure an election | ✓ | — | — | — | — |
| Manage candidates | ✓ | — | — | — | — |
| Activate an election | ✓ | — | — | — | — |
| Close an election | ✓ | — | — | — | — |
| Read election details | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read aggregate results | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trigger reconciliation | ✓ | — | — | — | — |
| Read a reconciliation report | ✓ | — | — | ✓ | — |

## Remote polling

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| List available remote polling centres | ✓ | ✓ | ✓ | — | ✓ |
| Submit a remote polling request | — | — | — | — | own |
| Read a remote polling request | — | ✓ | ✓ | — | own |
| Withdraw a remote polling request | — | — | — | — | own |
| Claim a request for review | — | ✓ | — | — | — |
| Approve a request | — | ✓ | — | — | — |
| Reject a request | — | ✓ | — | — | — |
| Read a remote polling assignment | — | ✓ | ✓ | — | own |

## Ballots

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| Generate a ballot | — | — | — | — | own |
| Submit a ballot | — | — | — | — | own |
| Read a submitted ballot's contents | — | — | — | — | — |
| Verify ballot integrity (boolean) | — | — | — | ✓ | — |
| Read own has-voted status | — | ✓ | ✓ | — | own |

Nobody reads a submitted ballot's contents through the API. Decryption for counting happens only inside the Election Simulator after an election closes — see `ballot-integrity` and `election-simulator`.

Integrity verification returns a boolean only. It never returns a candidate choice, even to the System Auditor.

## Simulator

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| Run a polling-centre simulation | ✓ | — | ✓ | — | — |
| Run a failure or recovery scenario | ✓ | — | — | — | — |
| Read simulation output | ✓ | ✓ | ✓ | ✓ | — |

## Audit

| Operation | EA | VO | PCO | SA | V |
|---|:-:|:-:|:-:|:-:|:-:|
| Read the audit trail | — | — | — | ✓ | — |
| Filter or export audit records | — | — | — | ✓ | — |
| Write an audit record | — | — | — | — | — |

Audit records are written by services as a side effect of state-changing operations, never through an API route, and never deleted or edited by anyone. See `audit-trail`.

## Invariants

1. The System Auditor has no ✓ in any write operation, anywhere in this document.
2. No role may read a candidate choice through any route.
3. No role may change a registered constituency.
4. Every ✓ in a voter column is either `own` or an operation with no per-voter scope.
5. Approval rights belong to the Verification Officer alone.
