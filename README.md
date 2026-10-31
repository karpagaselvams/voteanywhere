# Vote Anywhere

## A Remote Polling System Simulator for Geographically Mobile Voters

Vote Anywhere is a BCA final-year academic project that simulates a remote polling workflow for geographically mobile voters. It demonstrates how a voter can request permission to vote at an alternative polling centre while retaining their registered constituency and election eligibility.

The system covers voter authentication, eligibility verification, remote polling requests, officer approval, constituency-based ballot generation, ballot integrity concepts, election simulation, and audit tracking.

> **Academic prototype disclaimer:** Vote Anywhere uses fictional electoral data. It does not connect to real electoral rolls, Election Commission of India (ECI) systems, Aadhaar or biometric services, government APIs, or actual elections. It is a workflow simulator, not a production election platform.

---

## 1. Project Overview

Geographically mobile voters may be away from their registered polling area during an election. Vote Anywhere models a workflow in which an eligible voter requests to use an approved alternative polling centre without changing their registered constituency.

The project demonstrates the application workflow and the security concepts involved. All voters, constituencies, polling centres, candidates, and election data used by the prototype are fictional.

### Core Rule

**A remote polling centre changes where a voter votes. It never changes the voter's registered constituency or the ballot they receive.**

Example:

| Attribute | Example |
|---|---|
| Registered constituency | Chennai South |
| Requested remote polling centre | Madurai |
| Ballot constituency | Chennai South |

The ballot is generated using the voter's registered constituency, not the location of the remote polling centre.

### Ballot Secrecy Principle

The system is designed to keep voter identity separate from candidate choices.

- Use opaque ballot references.
- Keep voter identity data separate from ballot-choice data.
- Do not expose candidate choices alongside voter identifiers in API responses, logs, or database views.
- Do not include decrypted candidate choices in audit records.

---

## 2. Project Objectives

- Provide separate interfaces for voters and authorized election officers.
- Demonstrate voter authentication using a mock OTP workflow.
- Maintain fictional voter, eligibility, and constituency records.
- Allow voters to submit remote polling requests.
- Allow authorized officers to approve or reject requests.
- Generate ballots based on the voter's registered constituency.
- Demonstrate ballot encryption and integrity verification.
- Prevent duplicate ballot submissions for an election.
- Record important state-changing actions in an audit trail.
- Simulate polling operations using one Election Simulator.
- Provide a Docker-based local development environment.

---

## 3. User Roles

| Role | Responsibilities |
|---|---|
| Election Administrator | Configure elections and manage election operations |
| Verification Officer | Review voter eligibility and remote polling requests |
| Polling Centre Officer | Support polling-centre operations and voter verification |
| System Auditor | Review audit records and integrity-verification activity |
| Voter | Authenticate, request remote polling access, and participate in the voting simulation |

Role permissions must be enforced by the backend, not only by hiding frontend pages or controls.

---

## 4. Core Modules

### 4.1 Authentication Module

- Officer username and password login.
- Officer self-service password change (verifies the current password and revokes the officer's other sessions).
- Mock voter OTP authentication.
- JWT-based authenticated sessions backed by a server-side session record.
- Role-based access control.
- Session validation and revocation.

### 4.2 Voter Management

- Voter profile management.
- Voter identification and eligibility verification.
- Registered constituency information.
- Voter record search and authorized updates.

### 4.3 Election Management

- Election configuration.
- Constituency-based election information.
- Candidate management using fictional data.
- Election activation and closure.
- Simulated counting and reconciliation.

### 4.4 Remote Polling Management

- Display available remote polling centres.
- Submit remote polling requests.
- Officer review and approval or rejection.
- Maintain approved remote polling assignments.
- Verify assignment and voter eligibility before simulated voting.

### 4.5 Ballot Management

- Generate ballots using registered constituency information.
- Maintain opaque ballot references.
- Demonstrate ballot encryption.
- Verify ballot integrity.
- Prevent duplicate submissions within an election.

### 4.6 Election Simulator

The project uses **one Election Simulator** to demonstrate the remote polling workflow. It is not intended to represent a distributed election network.

The simulator demonstrates:

- Mock polling-centre operations.
- Voter and remote-assignment verification.
- Ballot generation and submission.
- Simulated ballot processing.
- Integrity verification.
- Controlled failure and recovery scenarios.
- Election reconciliation.

The simulator can initially be implemented as a module inside the backend. A separate simulator service is not required for the initial development scope.

### 4.7 Audit Management

- Record important state-changing operations.
- Track the officer or system actor responsible for an action.
- Record timestamps and operation references.
- Support audit and integrity review.
- Avoid recording passwords, OTPs, encryption keys, or decrypted candidate choices.

---

## 5. Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe frontend development |
| Vite | Development server and build tooling |
| Tailwind CSS 4 | UI styling |
| React Router | Application routing |
| Axios | HTTP communication with the backend |
| React Hook Form | Form management |
| Zod | Input and form validation |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| TypeScript | Type-safe backend development |
| PostgreSQL 16 | Relational database |
| Prisma 6 | ORM, schema management, and migrations |
| JWT | Authentication tokens |
| bcrypt | Password hashing |

### Infrastructure — Development

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Local multi-container development |
| Docker named volumes | Persistent database storage |
| Bind mounts | Source-code synchronization |
| Vite HMR / backend watch mode | Development hot reload |

TanStack Query and Redux are not required for the initial frontend scope. They can be considered later if application state-management needs justify them.

---

## 6. System Architecture

The application follows a **modular monolithic architecture**. The frontend communicates with a single Express REST API. The backend is organized into domain modules and uses Prisma to access PostgreSQL.

The Election Simulator is initially a backend module rather than a separate microservice.

```mermaid
flowchart TD
    A["Vote Anywhere"]

    A --> F["React + TypeScript Frontend"]
    F --> V["Voter Portal"]
    F --> O["Officer Portal"]
    F --> AD["Admin Portal"]

    F -->|"Axios / REST API"| B["Node.js + Express + TypeScript"]

    B --> AU["Authentication Module"]
    B --> VM["Voter Management"]
    B --> EM["Election Management"]
    B --> RPM["Remote Polling Management"]
    B --> BM["Ballot Management"]
    B --> SM["Election Simulator"]
    B --> AM["Audit Management"]

    AU --> P["Prisma ORM"]
    VM --> P
    EM --> P
    RPM --> P
    BM --> P
    SM --> P
    AM --> P

    P --> DB[("PostgreSQL 16")]
```

### Architecture Decisions

- Use a modular monolith to keep development and deployment manageable.
- Keep business logic in backend modules.
- Enforce authorization and validation on the backend.
- Keep database access behind Prisma and service-layer logic.
- Use one Election Simulator for workflow demonstrations.
- Do not claim distributed consensus, quorum, or production election resilience.

---

## 7. Repository Structure

The current repository structure:

```text
vote-anywhere/
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Shared UI (Card, Table, StatCard, dialogs, …)
│   │   ├── pages/
│   │   │   ├── voter/         # Dashboard, eligibility, request, status, ballot
│   │   │   ├── officer/       # Dashboard, review queue / verification,
│   │   │   │                  #   ballot control, audit trail
│   │   │   └── admin/         # Dashboard, elections, candidates, reports
│   │   ├── layouts/           # PortalLayout (sidebar + header shell)
│   │   ├── routes/            # Router and per-role route guards
│   │   ├── services/          # Typed API access — the only place Axios lives
│   │   ├── hooks/             # useAuth, useResource
│   │   ├── types/             # DTOs mirroring backend responses
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts         # Dev proxy: /api → localhost:4000
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Officer login, voter mock OTP, sessions,
│   │   │   │                  #   password change
│   │   │   ├── voters/        # Profile and eligibility verification
│   │   │   ├── elections/     # Lifecycle: activate, close
│   │   │   ├── remote-polling/# Request workflow, transitions, assignments
│   │   │   ├── ballots/       # Generation, AES-256-GCM sealing, submission
│   │   │   ├── simulator/     # Controlled ballot surface, counting,
│   │   │   │                  #   reconciliation
│   │   │   ├── officer/       # Role-aware dashboards, pre-vote verification
│   │   │   ├── admin/         # Aggregates and request reports
│   │   │   └── audit/         # Audit trail write path and read endpoint
│   │   ├── middleware/        # authenticate, requireRole/requireVoter,
│   │   │                      #   validation, rate limits, error handler
│   │   ├── config/            # env, Prisma client, logger
│   │   ├── lib/               # Domain error / Result types
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts            # Idempotent fictional demo data
│   ├── tests/                 # Jest + Supertest against real PostgreSQL
│   └── package.json
│
├── docs/
│   ├── api/                   # Endpoint reference
│   └── database/              # Data dictionary
│
├── docker-compose.yml         # PostgreSQL 16 (named volume, healthcheck)
├── .env.example
├── .gitignore
└── README.md
```

Detailed references: [docs/api/endpoints.md](docs/api/endpoints.md) for the
REST surface and [docs/database/data-dictionary.md](docs/database/data-dictionary.md)
for every table, field, and constraint.

`Dockerfile.dev` files for the frontend and backend, and full three-container
orchestration, are a planned later phase — see section 10.

---

## 8. Prerequisites

### Current development setup (recommended)

- Docker with Docker Compose (the `docker-compose` standalone CLI or the `docker compose` plugin).
- Node.js 20 or newer and npm on the host.
- Git and a code editor such as Visual Studio Code.

Only PostgreSQL runs in a container in this phase. The backend and frontend
run on the host in watch mode, which keeps the edit–reload loop fast and
debugging simple. A later phase adds `Dockerfile.dev` for both apps so the
whole stack can run under Compose as originally designed.

### Optional: fully local development without Docker

- Node.js 20 or newer, npm, and PostgreSQL 16 installed directly.

---

## 9. Getting Started

### Step 1: Clone the repository

```bash
git clone <repository-url>
cd vote-anywhere
```

Replace `<repository-url>` with the actual repository URL.

### Step 2: Create the environment file

```bash
cp .env.example .env
```

Fill in the secrets. Example development configuration:

```env
NODE_ENV=development
PORT=4000

# PostgreSQL container credentials (consumed by docker-compose.yml)
POSTGRES_USER=vote_anywhere
POSTGRES_PASSWORD=vote_anywhere_dev
POSTGRES_DB=vote_anywhere

# The backend runs on the host in this phase, so the database is localhost.
# When the backend is containerized, switch the host to the Compose service
# name: postgresql://vote_anywhere:vote_anywhere_dev@postgres:5432/vote_anywhere
DATABASE_URL=postgresql://vote_anywhere:vote_anywhere_dev@localhost:5432/vote_anywhere

# Replace with a securely generated development secret
JWT_SECRET=replace_with_a_secure_development_secret

# Generate 32 random bytes and encode as 64 hexadecimal characters:
#   openssl rand -hex 32
# Required for ballot sealing; the backend fails fast if it is malformed.
BALLOT_ENCRYPTION_KEY=replace_with_64_hexadecimal_characters

# Plaintext consumed only by the seed to bcrypt-hash fictional officer
# passwords. Never stored, never logged. Re-running the seed updates the
# demo accounts to a changed value.
SEED_OFFICER_PASSWORD=replace_with_a_dev_only_officer_password

# Browser-accessible backend URL. Optional in development: the Vite dev
# server proxies /api to localhost:4000, so the default '/api' just works.
VITE_API_BASE_URL=http://localhost:4000/api
```

Do not commit `.env` or real secrets to source control.

### Step 3: Start PostgreSQL

```bash
docker-compose up -d postgres
```

(Or `docker compose up -d postgres` with the Compose plugin.) PostgreSQL 16
starts with a named volume and a healthcheck on `localhost:5432`.

### Step 4: Install dependencies, migrate, and seed

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy   # or: npx prisma migrate dev when writing new migrations
npx prisma db seed          # fictional demonstration data only
```

The seed is idempotent and creates the demo scenario: two constituencies
(Chennai South, Madurai Central), a polling centre in each, four fictional
candidates, one configured election, two voters, four officers (one per
role), and a pending remote polling request that exercises the Core Rule.

Seeded demo accounts (officer password = `SEED_OFFICER_PASSWORD`):

| Account | Role |
|---|---|
| `admin.asha` | Election Administrator |
| `officer.verification` | Verification Officer |
| `officer.polling` | Polling Centre Officer |
| `auditor.dev` | System Auditor |
| `VA-0001`, `VA-0002` | Voters (mock OTP login) |

### Step 5: Start the backend and frontend

```bash
cd backend && npm run dev                     # Express API on http://localhost:4000
cd frontend && npm install && npm run dev     # Vite on http://localhost:5173
```

### Step 6: Access the application

| Service | Local address |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| API health check | http://localhost:4000/api/health |
| PostgreSQL | localhost:5432 |

In development, a voter's mock OTP is printed in the backend console as a
clearly marked `[DEV ONLY]` log line. It is never returned from a production
code path.

---

## 10. Docker Development Workflow

Only PostgreSQL is containerized in the current phase; the backend and
frontend run on the host (`npm run dev` in each). Full three-container
orchestration with `Dockerfile.dev`, bind mounts, and watch mode is a planned
later phase.

### Start the database

```bash
docker-compose up -d postgres
```

### Check container status

```bash
docker-compose ps
```

### Follow database logs

```bash
docker-compose logs -f postgres
```

### Inspect the database

```bash
docker-compose exec postgres psql -U vote_anywhere -d vote_anywhere
```

### Stop the database

```bash
docker-compose down
```

### Reset the development database

**Warning:** This removes the named volume and permanently deletes local
database data. After a reset, re-apply migrations and re-run the seed (Step 4
above) — an empty database makes every API call fail.

```bash
docker-compose down -v
docker-compose up -d postgres
```

### Requirements that carry over to the containerized phase

- PostgreSQL uses a named volume for persistent development data.
- The backend will connect to PostgreSQL using the Compose service hostname
  `postgres` and container port `5432`; only the browser uses `localhost`.
- Frontend source will be bind-mounted with Vite HMR; the backend will run a
  watch process (`tsx watch`).
- Environment files and secrets remain outside source control.

---

## 11. Development Commands

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server with HMR on :5173 (proxies /api → :4000)
npm run build        # tsc -b && vite build
npm run typecheck    # tsc --noEmit
```

No frontend test suite is configured yet; Vitest is the planned tooling.

### Backend

```bash
cd backend
npm install
npm run dev          # tsx watch on :4000
npm run build        # tsc → dist/
npm run test         # Jest + Supertest against a real PostgreSQL test database
npm run typecheck    # tsc --noEmit
```

### Prisma

```bash
cd backend

npx prisma generate
npx prisma migrate dev      # create + apply a new migration
npx prisma migrate deploy   # apply existing migrations (e.g. after a reset)
npx prisma db seed          # idempotent fictional demo data
npx prisma studio
```

The backend test suite creates and migrates a separate `vote_anywhere_test`
database in the same PostgreSQL container, so the Docker database must be
running (`docker-compose up -d postgres`) before `npm test`.

---

## 12. Testing Strategy

| Area | Tooling | Status |
|---|---|---|
| Backend integration tests | Jest + Supertest against a real PostgreSQL test database | **Implemented — 60 tests passing** (`cd backend && npm test`) |
| Frontend unit/component tests | Vitest | Not yet implemented |
| Manual API testing | Postman or equivalent | Optional |
| UI verification | Browser-based testing | Exercised during development |

Integration tests run against a real PostgreSQL database — a mocked Prisma
client cannot exercise a constraint or a transaction, so no rule that depends
on one is tested against a fake.

### Implemented test coverage (`backend/tests/`)

**Authentication (`auth.test.ts`)**
- Officer login succeeds; unknown username and wrong password return identical 401 bodies.
- OTP: issue, correct-code login, replay rejected, expiry rejected (and the challenge is deleted), sixth attempt rejected even when correct, identical 401 body for unknown voter / wrong / expired / consumed, issue rate limit returns 429.
- Password change: wrong current password rejected with nothing changed; success rotates the hash, revokes other sessions, keeps the current session, and writes an audit record containing no password; too-short password rejected; voters refused.
- No audit record contains a plaintext OTP or password.

**Authorization (`authorization.test.ts`)**
- Unauthenticated requests to protected routes get 401.
- Table-driven across all five roles: session read allowed for all; session revocation allowed for the Election Administrator and a voter's own session only; every other role gets a bare 403.

**Remote polling workflow (`remote-polling.test.ts`)**
- Request submission; a second active request per voter per election is refused (constraint name never leaks); a centre inside the voter's own constituency is refused; requests are session-scoped.
- Transition table: PENDING → UNDER_REVIEW → APPROVED creates exactly one assignment; PENDING → APPROVED and REJECTED → APPROVED are refused; rejection requires a reason; withdrawal works and frees the slot.
- Approval is refused for a Polling Centre Officer and for a voter.
- Every transition writes an audit record.

**Ballots (`ballots.test.ts`)**
- Core Rule regression: a Chennai South voter approved for a Madurai centre receives the Chennai South ballot — asserted on the constituency **and** the candidate list.
- Submission returns an opaque receipt without the choice; a second submission is rejected; two concurrent submissions yield exactly one success and one row per table.
- A candidate from another constituency is rejected; generation is refused while the election is not active; an approved request moves to USED on submission.
- Tampered ciphertext fails integrity verification; the untouched ballot passes.

**Election lifecycle (`elections.test.ts`)**
- Only the Election Administrator activates/closes.
- Closing expires open requests with SYSTEM audit records; late submissions are refused once the election is active.
- Reconciliation after closure reports zero discrepancy on a clean run.
- The System Auditor reads the reconciliation report and audit trail and nothing else; the Election Administrator cannot read the audit trail.

**Data layer (`constraints.test.ts`)**
- Unique constraints reject duplicates; a rolled-back transaction leaves no rows on either side of the secrecy boundary; `SubmittedBallot` has no voter column; the seed runs twice without duplicating rows.

---

## 13. Security Considerations

The prototype demonstrates security concepts appropriate to its academic scope.

- Hash officer passwords using bcrypt.
- Enforce role-based authorization on protected backend routes.
- Validate request bodies and parameters.
- Apply appropriate login and OTP rate limits.
- Enforce OTP expiry and single-use behavior.
- Keep JWT secrets and encryption keys outside source control.
- Use standard cryptographic libraries rather than implementing cryptographic algorithms manually.
- Use AES-256-GCM for authenticated ballot encryption where implemented.
- Use cryptographically secure random nonces.
- Separate voter identity from candidate-choice information.
- Use database constraints and transactions to prevent duplicate submissions.
- Avoid sensitive information in application logs and audit records.
- Apply appropriate CORS and HTTP security-header configuration.

A hash alone does not establish ballot authenticity if an attacker can modify both the ballot and its stored hash. Integrity verification must be designed and tested as part of the backend.

---

## 14. Project Scope and Limitations

Vote Anywhere is an academic remote polling workflow simulator.

It does not:

- Connect to real electoral rolls or government systems.
- Authenticate real voters.
- Use Aadhaar, biometric, or government OTP services.
- Conduct actual public elections.
- Provide certified election infrastructure.
- Implement a production distributed consensus network.
- Establish production-grade election security through simulation alone.

The single Election Simulator demonstrates application workflows and selected failure/recovery scenarios. It should not be described as a multi-node election network.

---

## 15. Future Enhancements

Potential extensions, subject to project scope and time:

- Full three-container Docker development (`Dockerfile.dev` for both apps, bind mounts, watch mode) — the originally designed end state of section 10.
- Frontend test suite with Vitest.
- Named simulator failure and recovery scenarios exposed as runnable demonstrations.
- Improved cryptographic key-management demonstrations.
- Stronger audit-log integrity controls.
- Additional concurrent-request and recovery tests.
- Improved accessibility and responsive UI.
- More comprehensive automated security testing.
- Separate simulator deployment as an optional extension.

---

## 16. Project Information

| Attribute | Details |
|---|---|
| Project Title | Vote Anywhere: A Remote Polling System Simulator for Geographically Mobile Voters |
| Short Name | Vote Anywhere |
| Academic Level | BCA Final Year Project |
| Project Domain | Web Application / E-Governance Simulation |
| Application Type | Remote Polling System Simulator |
| Architecture | Modular Monolith |
| Frontend | React + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Development Infrastructure | Docker Compose |
| Simulator | Single Election Simulator |

---

## 17. Project Summary

Vote Anywhere demonstrates a simulated remote polling workflow for geographically mobile voters. It focuses on preserving registered constituency and voter eligibility while allowing an approved alternative polling-centre assignment.

The project brings together frontend development, backend API design, relational database management, authentication, role-based access, ballot-integrity concepts, audit tracking, and Docker-based development.

**Vote Anywhere — Demonstrating remote polling workflows while preserving constituency-based voter eligibility and ballot secrecy.**