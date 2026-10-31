# Data Dictionary

The Vote Anywhere data layer: PostgreSQL 16 behind Prisma 6. Source of truth for the model shape is [schema.prisma](../../backend/prisma/schema.prisma); this document explains the tables, fields, and the invariants carried by constraints. Terminology follows [GLOSSARY.md](../../GLOSSARY.md).

## Enums

| Enum | Values | Meaning |
|---|---|---|
| `OfficerRole` | `ELECTION_ADMINISTRATOR`, `VERIFICATION_OFFICER`, `POLLING_CENTRE_OFFICER`, `SYSTEM_AUDITOR` | The four officer roles. Voter is implied by session actor type, not stored here. |
| `ElectionLifecycle` | `CONFIGURED`, `ACTIVE`, `CLOSED` | The one election lifecycle. |
| `RemotePollingRequestStatus` | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN`, `USED`, `EXPIRED` | Request lifecycle. `PENDING`/`UNDER_REVIEW` are the active statuses; `USED` (ballot submitted) and `EXPIRED` (election closed) are terminal states of an approved request. |
| `ActorType` | `OFFICER`, `VOTER`, `SYSTEM` | Who performed an action, in sessions and audit records. |

## Identity side

### `Officer`

An officer account (any of the four officer roles).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | Internal identifier |
| `username` | string, unique | Login identifier |
| `passwordHash` | string | bcrypt, cost 12. Never logged |
| `role` | `OfficerRole` | Snapshot into sessions at login |
| `displayName` | string | Fictional name |
| `createdAt` | timestamp | |

### `Voter`

A fictional voter on the voter roll.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | Internal identifier |
| `voterNumber` | string, unique | Public identifier on the fictional roll |
| `fullName` | string | Fictional name |
| `registeredConstituencyId` | FK → `Constituency` | **Lives here and nowhere else.** Fixed by the voter record; changeable by nobody through the API |
| `homePollingCentreId` | FK → `PollingCentre`, nullable | Default voting location inside the registered constituency |
| `createdAt` | timestamp | |

## Geography

### `Constituency`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | string, unique | e.g. `CHN-S` |
| `name` | string | Fictional, e.g. Chennai South |

### `PollingCentre`

A physical voting location. Belongs to exactly one constituency.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | string, unique | e.g. `CHN-S-01` |
| `name` | string | |
| `constituencyId` | FK → `Constituency` | Exactly one constituency per centre |

## Elections

### `Election`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | string, unique | e.g. `GE-2026` |
| `name` | string | |
| `lifecycle` | `ElectionLifecycle` | Default `CONFIGURED` |
| `startsAt`, `endsAt` | timestamp | Contest window |
| `createdAt` | timestamp | |

### `ElectionConstituency`

Join table: an election covers a set of constituencies. Composite PK `(electionId, constituencyId)`.

### `Candidate`

A fictional contestant standing in exactly one constituency of one election.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `fullName` | string | Fictional |
| `symbol` | string, nullable | |
| `electionId`, `constituencyId` | FK pair | Composite FK → `ElectionConstituency` guarantees the constituency is part of the election |

Constraint: unique `(electionId, constituencyId, fullName)`.

## Ballots — the secrecy boundary

The two sides never join. `VoterElectionStatus` records **that** a voter voted; `SubmittedBallot` records **what** was chosen. No FK, no shared key, no relation between them.

### `VoterElectionStatus` (identity side)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `voterId` | FK → `Voter` | |
| `electionId` | FK → `Election` | |
| `hasVoted` | boolean | Default false |
| `votedAt` | timestamp, nullable | |

Constraint: unique `(voterId, electionId)` — **one ballot per voter per election**, enforced by the database so duplicate submissions are rejected under concurrency, not merely by an application check.

### `SubmittedBallot` (choice side)

| Field | Type | Notes |
|---|---|---|
| `ballotReference` | string PK | Opaque, random, non-sequential. Carries no voter information |
| `electionId` | FK → `Election` | |
| `constituencyId` | FK → `Constituency` | The ballot's constituency — the voter's *registered* constituency |
| `nonce` | bytes | AES-256-GCM nonce |
| `ciphertext` | bytes | Encrypted candidate choice |
| `authTag` | bytes | GCM authentication tag |
| `submittedAt` | timestamp | |

**No voter field exists on this table, and no Prisma relation connects it to any identity model.** A reviewer can see the secrecy boundary in the schema alone.

## Remote polling

### `RemotePollingRequest`

A voter's application to use a remote polling centre for a given election.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `voterId` | FK → `Voter` | |
| `electionId` | FK → `Election` | |
| `pollingCentreId` | FK → `PollingCentre` | The requested remote polling centre. Never a constituency |
| `reason` | string, nullable | The voter's reason for the request |
| `reviewNote` | string, nullable | The reviewing officer's note. Required on `REJECTED` and shown to the voter |
| `status` | `RemotePollingRequestStatus` | Default `PENDING`. All moves go through the transition function — see the state machine in the remote-polling-workflow skill |
| `reviewedById` | FK → `Officer`, nullable | The reviewing Verification Officer |
| `reviewedAt` | timestamp, nullable | |
| `createdAt` | timestamp | |

Constraint: partial unique index `RemotePollingRequest_one_active_per_voter_election` on `(voterId, electionId) WHERE status IN ('PENDING', 'UNDER_REVIEW')` — at most one active request per voter per election. Hand-written SQL in the initial migration; Prisma cannot express partial indexes.

### `RemotePollingAssignment`

The approved result of a request. Grants permission to appear at one named remote polling centre for one named election — and carries **no constituency field**, so the Core Rule is visible in the schema.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `requestId` | FK → `RemotePollingRequest`, unique | At most one assignment per request |
| `voterId` | FK → `Voter` | |
| `electionId` | FK → `Election` | |
| `pollingCentreId` | FK → `PollingCentre` | Where the voter may appear — **not** a constituency |
| `assignedById` | FK → `Officer` | The approving Verification Officer |
| `createdAt` | timestamp | |

Constraint: unique `(voterId, electionId)`.

## Authentication

### `OtpChallenge`

A mock OTP challenge for voter login. Simulated — no SMS, email, or government service — but built with real controls.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `challengeId` | string, unique | Opaque reference returned to the client |
| `voterId` | FK → `Voter` | |
| `otpHash` | string | bcrypt hash of the 6-digit CSPRNG OTP. Never stored plaintext |
| `expiresAt` | timestamp | Five minutes from issue; expired challenges are deleted |
| `attemptCount` | int | Incremented on every failure; five failures invalidate the challenge |
| `consumedAt` | timestamp, nullable | Set in the same transaction that issues the session — single use |
| `createdAt` | timestamp | |

### `Session`

Server-side session record backing every JWT. The auth middleware checks this record, so a session can be revoked without waiting for token expiry.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | Also the JWT `jti` claim |
| `actorType` | `ActorType` | `OFFICER` or `VOTER` |
| `officerId` | FK → `Officer`, nullable | Set for officer sessions |
| `voterId` | FK → `Voter`, nullable | Set for voter sessions |
| `role` | string | Role snapshot at issue time (officer role, or `VOTER`) |
| `issuedAt`, `expiresAt` | timestamp | Short-lived |
| `revokedAt` | timestamp, nullable | Set on revocation |

## Audit

### `AuditRecord`

One state-changing operation: the actor, the timestamp, and a reference to the operation. Written by services as a side effect — never through an API route, never updated, never deleted. **Never contains passwords, OTPs, encryption keys, or decrypted candidate choices.**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `actorType` | `ActorType` | |
| `actorId` | string, nullable | Officer ID, voter ID, or null for system actions |
| `action` | string | e.g. `auth.officer_login.success`, `auth.otp.issued` |
| `entityType` | string, nullable | |
| `entityRef` | string, nullable | Opaque reference to the affected entity |
| `createdAt` | timestamp | |
