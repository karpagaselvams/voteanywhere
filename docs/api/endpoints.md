# API Reference

Base URL in development: `http://localhost:4000/api` (the Vite dev server proxies `/api`).

All routes except `/health` and the three login endpoints require `Authorization: Bearer <token>` and declare their roles in middleware. Error bodies are always `{ "error": "<message>" }` — never a stack trace, Prisma error, or constraint name. Terminology follows [GLOSSARY.md](../../GLOSSARY.md); who may call what is governed by the permission matrix in the `role-authorization` skill.

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Liveness + database connectivity check |

## Authentication — `/auth`

| Method | Path | Role | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/officer/login` | public | `{ username, password }` | Identical 401 for unknown username and wrong password. Rate-limited per username + IP |
| POST | `/auth/voter/otp` | public | `{ voterNumber }` | Issues a mock OTP challenge → `{ challengeId, expiresAt }`. In development the code is logged server-side only (`[DEV ONLY]`). Rate-limited per voter + IP |
| POST | `/auth/voter/otp/verify` | public | `{ challengeId, otp }` | 5-minute expiry, single use, 5-attempt cap. Every failure: `401 { "error": "Invalid or expired code" }` |
| GET | `/auth/session` | any | — | Reads the caller's session |
| DELETE | `/auth/session` | Voter (own) | — | Revokes the caller's own session |
| DELETE | `/auth/sessions/:id` | Election Administrator | — | Revokes any session |
| POST | `/auth/password` | any officer | `{ currentPassword, newPassword }` | Verifies current password, revokes other sessions, audits the change |

Login responses carry `{ token, expiresAt, officer|voter }`. The JWT holds `sub`, `role`, and `jti` — never personal data or anything ballot-related.

## Voters — `/voters`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/voters/me` | Voter | Own profile: voter number, registered constituency, home polling centre |
| POST | `/voters/eligibility` | Voter | Runs eligibility verification for the current election against the caller's record |

## Remote polling — `/remote-polling`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/remote-polling/dashboard` | Voter | Own profile + election + latest request + assignment + has-voted, one read |
| GET | `/remote-polling/centres` | any authenticated | All polling centres with their constituencies |
| GET | `/remote-polling/requests/mine` | Voter | Own latest request (404 if none) |
| POST | `/remote-polling/requests` | Voter | Submit: `{ electionId, pollingCentreId, reason? }`. Refused if the centre is in the voter's own constituency, the election is already open, or an active request exists (partial unique index) |
| POST | `/remote-polling/requests/mine/withdraw` | Voter | Withdraws the caller's active request |
| GET | `/remote-polling/assignments/mine` | Voter | Own assignment (404 if none) |
| GET | `/remote-polling/requests?status=` | Verification Officer, Polling Centre Officer | Review queue |
| POST | `/remote-polling/requests/:id/claim` | Verification Officer | PENDING → UNDER_REVIEW |
| POST | `/remote-polling/requests/:id/release` | Verification Officer | UNDER_REVIEW → PENDING |
| POST | `/remote-polling/requests/:id/approve` | Verification Officer | UNDER_REVIEW → APPROVED; creates the assignment in the same transaction |
| POST | `/remote-polling/requests/:id/reject` | Verification Officer | `{ reason }` required; stored and shown to the voter |

All status changes go through one transition function; illegal moves (e.g. REJECTED → APPROVED) return 409.

## Controlled ballot — `/simulator`

The Election Simulator's ballot surface. One backend module; not an online vote.

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/simulator/controlled-ballot` | Voter | Ballot for the caller: election, **registered** constituency, its candidates, and the remote assignment (if any) |
| POST | `/simulator/controlled-ballot/submit` | Voter | `{ candidateId }` → seals the choice (AES-256-GCM, AAD-bound), writes both sides of the secrecy boundary in one transaction, marks the assignment USED → `{ ballotReference, submittedAt }`. Duplicate → 409 |
| GET | `/simulator/elections/:id/reconciliation` | Election Administrator, System Auditor | Post-closure: ballots issued vs recorded per constituency, with discrepancy |
| GET | `/simulator/elections/:id/results` | any authenticated | Post-closure aggregate per candidate per constituency |

## Officer — `/officer`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/officer/dashboard` | VO, PCO, SA | Role-aware aggregate stats |
| GET | `/officer/verification?query=` | VO, PCO | Pre-vote verification: voter record + request + assignment + has-voted |

## Administration — `/admin`

Election Administrator only.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Aggregates: voters, centres, elections by lifecycle, requests by status, approval rate, ballots cast |
| GET | `/admin/elections` | Elections with constituencies and lifecycle |
| POST | `/admin/elections/:id/activate` | CONFIGURED → ACTIVE |
| POST | `/admin/elections/:id/close` | ACTIVE → CLOSED; expires open requests as SYSTEM transitions |
| GET | `/admin/candidates` | All candidates with election and constituency |
| GET | `/admin/centres` | All polling centres with constituency |
| GET | `/admin/reports?status=` | Filterable remote polling request report |

## Audit — `/audit`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/audit/records?action=&limit=` | System Auditor | The audit trail, newest first. There is no write, update, or delete route — services write records as a side effect of state-changing operations |
