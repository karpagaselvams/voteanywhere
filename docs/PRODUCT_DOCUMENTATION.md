# Vote Anywhere: Remote Polling System Simulator

## Comprehensive Product Documentation

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Academic Prototype

---

## Table of Contents

1. Executive Summary & Project Overview
2. System Analysis & Problem Statement
3. Proposed System Architecture
4. System Specifications & Requirements
5. Technical Architecture & Design
6. Database Design & Schema
7. Security & Integrity Architecture
8. API Endpoints & Integration
9. Frontend Portals & User Workflows
10. Backend Implementation & Modules
11. Core Workflows & Use Cases
12. System Processes & Reconciliation
13. Testing & Validation
14. Reference & Appendices

---

# Part 1: Executive Summary & Project Overview

## 1.1 Project Vision & Objectives

**Vote Anywhere** is a BCA final-year academic project that simulates a remote polling workflow for geographically mobile voters. It demonstrates how an eligible voter can request permission to vote at an alternative polling centre while retaining their registered constituency and election eligibility.

The system covers the complete workflow: voter authentication, eligibility verification, remote polling requests, officer approval, constituency-based ballot generation, ballot integrity verification, election simulation, and audit tracking.

### Core Innovation: The Central Rule

**A remote polling centre changes WHERE a voter votes. It never changes the voter's registered constituency or the ballot they receive.**

This principle is enforced throughout the system:

| Attribute | Example |
|---|---|
| Registered constituency | Chennai South |
| Requested remote polling centre | Madurai |
| Ballot constituency | Chennai South (not Madurai) |
| Ballot contents | Candidates from Chennai South |

The ballot is generated from the voter's registered constituency, not from the location of the remote polling centre. This invariant is enforced at every layer: the database schema forbids the wrong field; the service functions accept only the voter record; and the API never accepts a constituency parameter for ballot generation.

### Ballot Secrecy Principle

The system is designed to keep voter identity strictly separate from candidate choices:

- **No joins:** Voter identity never appears alongside candidate choices in API responses, logs, database views, or audit records.
- **Opaque references:** Submitted ballots are referred to only by random, non-sequential ballot references that carry no voter information.
- **Encrypted choices:** Candidate choices are stored in AES-256-GCM encrypted form and only decrypted during counting, never in audit records.
- **Immutable separation:** The database schema itself enforces this separation—the `VoterElectionStatus` table (identity side) has no relation to `SubmittedBallot` (choice side).

### Academic Scope & Fictional Data

Vote Anywhere uses entirely fictional electoral data. It does **not**:

- Connect to real electoral rolls or the Election Commission of India (ECI)
- Integrate with Aadhaar, biometric services, or government APIs
- Run actual elections or produce real voting results
- Implement distributed consensus, quorum, or multi-node replication
- Provide production election infrastructure

The project is a **workflow simulator** that demonstrates security concepts and eligibility checking in a controlled academic environment.

## 1.2 Intended Audience

This documentation serves:

- **Developers:** Understanding architecture, extending modules, contributing to the codebase
- **Election Officers:** Using the officer portal for approval workflows and eligibility verification
- **System Administrators:** Deployment, database management, Docker configuration
- **Auditors:** Reviewing audit trails, verifying ballot integrity, reconciliation
- **Stakeholders:** Understanding system capabilities, scope, and design decisions

## 1.3 Key Features

- **Voter Authentication:** Mock OTP authentication with expiry, consumption, and attempt limits
- **Eligibility Verification:** Comprehensive voter eligibility checks (active status, not yet voted, no bar)
- **Remote Polling Workflow:** Request submission, officer review and approval, assignment lifecycle
- **Constituency-Based Ballots:** Ballots generated from registered constituency, never remote location
- **Ballot Encryption & Integrity:** AES-256-GCM encryption with tamper detection via authentication tags
- **Duplicate Prevention:** Database constraint ensures one ballot per voter per election
- **Audit Trail:** Immutable record of all state-changing operations
- **Role-Based Access:** Five roles with fine-grained backend authorization
- **Election Simulation:** Simulated voting, ballot processing, reconciliation, and counting
- **Development Environment:** Docker Compose for consistent local setup

---

# Part 2: System Analysis & Problem Statement

## 2.1 Geographically Mobile Voters: The Challenge

Many voters are away from their registered polling area during elections—traveling for work, education, personal reasons, or temporarily relocated. Traditional polling systems require physical presence at a designated polling centre in the voter's registered constituency. This creates a dilemma:

1. **Disenfranchisement:** A voter away during the election period cannot vote at home
2. **Travel burden:** Requiring the voter to return to their constituency is impractical
3. **Verification complexity:** Proving eligibility at an unfamiliar polling centre is difficult
4. **Administrative overhead:** Manual exception processes are error-prone and unauditable

## 2.2 Existing Approaches & Limitations

**Postal voting** (current real-world approach): Voters request a postal ballot before the election. This requires advance planning and trusts the postal system.

**Limitations:**
- Requires advance notice; not available for last-minute absences
- Postal delays can prevent ballot arrival
- No in-person verification at an alternative location

**Advance voting locations** (some jurisdictions): Voters can cast ballots before election day at designated early voting centers. 

**Limitations:**
- Requires early participation; not accessible to late deciders
- Centers may not be convenient to where the voter actually is

**Remote polling centres** (proposed by Vote Anywhere): A voter can use a polling centre in any constituency if approved by election officials, while retaining their registered constituency.

**Advantages:**
- Flexible: available during normal voting period
- Verified: election officer reviews and approves requests
- Auditable: complete workflow recorded
- Secure: ballot remains tied to registered constituency, not remote location

## 2.3 Why Vote Anywhere Was Designed

Vote Anywhere demonstrates a response to geographic mobility. It shows:

1. How to approve alternative voting locations without compromising eligibility
2. How to keep a voter's registered constituency (and therefore ballot content) fixed even when voting remotely
3. How to prevent duplicate submissions under database constraints
4. How to encrypt ballots and verify integrity separately from voter identity
5. How to maintain a complete audit trail of all decisions and state changes

The project is expressly **not** a production system—it's a teaching tool for election workflow design and security concepts.

---

# Part 3: Proposed System Overview

## 3.1 System Context

Vote Anywhere operates as a modular monolith with distinct layers:

```
┌─────────────────────────────────────┐
│    Frontend Portals (React)         │  Voter, Officer, Admin, Auditor
├─────────────────────────────────────┤
│    Express Backend API              │  Modular services
├─────────────────────────────────────┤
│    PostgreSQL Database (Prisma)     │  Voters, Ballots, Elections, Audit
├─────────────────────────────────────┤
│    Security Layer                   │  JWT, bcrypt, AES-256-GCM
└─────────────────────────────────────┘
```

## 3.2 Core Subsystems

### Authentication & Sessions

**Voter authentication:** Mock OTP mechanism
- Voter provides voter number
- System issues a one-time password (OTP) with 5-minute expiry
- Voter submits OTP; system verifies and issues JWT session token
- Session backed by server-side record that can be revoked

**Officer authentication:** Username and password
- Officer logs in with username and password
- Passwords are bcrypt-hashed; never stored in plaintext
- Officers can change their own password (verification required)
- Password change revokes all other sessions (logout from everywhere)
- JWT session token issued, backed by server-side session record

### Ballot Subsystem

**Ballot generation:**
- Voter eligibility verified
- Candidates fetched from voter's **registered constituency**
- Ballot presented to voter in UI

**Ballot submission:**
- Voter selects candidate
- Ballot encrypted with AES-256-GCM
- Encrypted ballot stored with opaque ballot reference
- Duplicate submission prevented by database constraint (one per voter per election)
- Audit record created

**Ballot integrity:**
- Integrity tag generated during encryption
- Cannot be recomputed without the encryption key
- Verified during counting and auditing
- Decrypted choice never appears in audit records

### Remote Polling Subsystem

**Request workflow:**
1. Voter submits remote polling request (election, remote centre, reason)
2. Request enters PENDING status
3. Verification Officer reviews request
4. Officer checks voter eligibility (active, not yet voted)
5. Officer approves or rejects with reason
6. Approved requests move to UNDER_REVIEW → APPROVED
7. Rejected requests end in REJECTED status
8. Approved request creates a RemotePollingAssignment

**Assignment lifecycle:**
- Assignment grants permission to vote at one remote centre
- Valid during the election period
- Voter can vote at remote centre (instead of home polling centre)
- After voting, assignment moves to USED
- After election closes without voting, moves to EXPIRED

### Election Lifecycle

Elections follow a strict lifecycle:

1. **CONFIGURED:** Election created, candidates and constituencies added
2. **ACTIVE:** Voting is open; voters can cast ballots
3. **CLOSED:** Voting ended; election finalized

Only during ACTIVE state can voters submit ballots. Counting and reconciliation occur after CLOSED.

### Audit Trail

Every state-changing operation is recorded immutably:

- **Actor:** Officer ID, voter ID, or null (for system actions)
- **Action:** Operation name (e.g., "voter.remote_polling.approved")
- **Entity reference:** Opaque reference (ballot reference, request ID, etc.)
- **Timestamp:** When the operation occurred

**Never logged:** Passwords, OTPs, encryption keys, decrypted candidate choices.

The audit trail is the source of truth for accountability. It serves regulatory compliance, forensic investigation, and operator verification.

## 3.3 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React | 18 |
| | TypeScript | Latest |
| | Vite | Latest |
| | Tailwind CSS | 4 |
| **Backend** | Node.js | 18+ |
| | Express | Latest |
| | TypeScript | Latest |
| **Database** | PostgreSQL | 16 |
| | Prisma | 6 |
| **Security** | JWT | Node jsonwebtoken |
| | Bcrypt | Node bcrypt |
| | AES-256-GCM | Node crypto |
| **DevOps** | Docker | Latest |
| | Docker Compose | Latest |

---

# Part 4: System Specifications & Requirements

## 4.1 Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR1 | Voter OTP Authentication | Voter provides voter number, receives mock OTP via system, verifies OTP to obtain JWT session |
| FR2 | Officer Password Login | Officer logs in with username and password; password verified against bcrypt hash |
| FR3 | Remote Polling Request Submission | Voter submits request to vote at remote polling centre for a given election |
| FR4 | Officer Request Review | Verification Officer reviews request and voter eligibility |
| FR5 | Request Approval/Rejection | Officer approves or rejects request with optional note |
| FR6 | Ballot Generation | Generate ballot with candidates from voter's **registered constituency** (not remote centre) |
| FR7 | Ballot Submission | Voter selects candidate and submits ballot; encrypted with AES-256-GCM |
| FR8 | Duplicate Submission Prevention | Database constraint ensures at most one ballot per voter per election |
| FR9 | Ballot Integrity Verification | Auditor can verify submitted ballot has not been tampered with (via authentication tag) |
| FR10 | Audit Trail Recording | All state-changing operations recorded immutably with actor, action, timestamp |
| FR11 | Role-Based Access Control | Five roles with fine-grained permissions; enforced by backend middleware |
| FR12 | Election Lifecycle Management | Elections cycle through CONFIGURED → ACTIVE → CLOSED states |
| FR13 | Voter Eligibility Check | System verifies voter is active, correct election, not yet voted, not barred |
| FR14 | Reconciliation & Counting | Post-closure comparison of ballots issued vs. ballots counted, per constituency |

## 4.2 Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Security** | Ballot secrecy | Voter identity never joined to candidate choice in any layer |
| | Integrity | Ballots cannot be altered without detection (AES-256-GCM auth tags) |
| | Authentication | All sessions backed by server-side records; revocable |
| | Authorization | Backend enforces roles; frontend visibility is not sufficient |
| **Performance** | Response time | API responses < 200ms (target) |
| | Throughput | Support ~1000 concurrent voters (for academic prototype) |
| **Availability** | Uptime | 99% for development/demonstration |
| **Scalability** | Concurrency | Ballot duplicate prevention via database constraint (atomic) |
| | Data volume | Support 10,000+ voters, 1000+ candidates, 500+ polling centres |
| **Maintainability** | Code quality | TypeScript, linting, modular architecture |
| | Testing | Unit, integration, security tests |
| | Auditability | Complete audit trail; no operations hidden |

## 4.3 Security Requirements

| Requirement | Implementation |
|---|---|
| Ballot secrecy | Voter ID and candidate choice stored in separate, unrelated tables; no foreign key |
| Ballot integrity | AES-256-GCM encryption with authentication tag; tampering detected at decryption |
| Authentication | JWT tokens backed by server-side session records (revocable) |
| Session revocation | Session can be revoked immediately; JWT alone does not grant access |
| Password security | Bcrypt hashing with salt; no plaintext storage |
| OTP security | Bcrypt-hashed; 5-minute expiry; one-time use; 5 attempt limit |
| Rate limiting | OTP issue/verify, officer login, password change rate limited |
| Authorization | Five roles; backend middleware enforces all access control |
| Audit immutability | Audit records never deleted or modified; append-only |
| Encryption key | Loaded from environment; never logged; fail-fast if invalid |

## 4.4 Data Requirements

### Voter Records
- Minimum 1000 fictional voters (seed data)
- Each voter has: voter number, name, registered constituency, home polling centre
- Voter records are immutable through API (no updates to registered constituency)

### Elections
- Multiple elections may be configured
- Each election has: code, name, lifecycle status, start/end times, set of constituencies
- Election data seeded or created by Election Administrator

### Constituencies & Polling Centres
- Constituencies are geographical divisions
- Each polling centre belongs to exactly one constituency
- Candidates stand in exactly one constituency of one election

### Candidates
- Candidates are seeded with fictional names
- Each candidate tied to one constituency and one election
- Candidates presented to voters based on registered constituency

### Sessions & Audit Records
- One session record per authenticated user
- Session revocable by Election Administrator or self (voters can revoke own sessions)
- Audit records created as side effect of every state change
- Audit records immutable and append-only

### Constraints
- One ballot per voter per election (database unique constraint)
- One active remote polling request per voter per election (partial unique index)
- Election must be ACTIVE for ballot submission
- Voter must be eligible (not yet voted, not barred, etc.)

---


---

# Part 5: Technical Architecture & Design

## 5.1 System Architecture Overview

Vote Anywhere is organized as a **modular monolith** with clear separation of concerns:

### Frontend Architecture

The frontend is organized into three main portals, each serving a different actor:

```
/pages
  ├── LoginPage.tsx          (Universal entry point)
  ├── voter/                 (Voter Portal)
  │   ├── Dashboard.tsx
  │   ├── RemotePollingRequest.tsx
  │   ├── BallotPage.tsx
  │   └── ConfirmationPage.tsx
  ├── officer/               (Officer Portal)
  │   ├── Dashboard.tsx
  │   ├── RequestQueue.tsx
  │   ├── ApprovalForm.tsx
  │   └── EligibilityCheck.tsx
  └── admin/                 (Admin Portal)
      ├── ElectionSetup.tsx
      ├── CandidateManagement.tsx
      └── PollingCentreConfig.tsx
```

Each portal is a complete user workflow with forms, state management, and API integration. Navigation and visibility are role-based at the frontend, but **authorization is enforced by the backend**—frontend visibility is a UX feature, not a security boundary.

### Backend Architecture

The backend is organized into nine domain modules:

```
/modules
  ├── auth/                  (Authentication & sessions)
  ├── voters/                (Voter management & eligibility)
  ├── ballots/               (Ballot generation, encryption, integrity)
  ├── remote-polling/        (Request workflow, assignments)
  ├── elections/             (Election lifecycle, candidates)
  ├── admin/                 (Election configuration)
  ├── officer/               (Officer operations)
  ├── audit/                 (Audit trail recording)
  └── simulator/             (Election simulation, reconciliation)
```

Each module follows a consistent internal structure:

```
auth/
  ├── controller.ts          (Route handlers)
  ├── routes.ts              (Express routes with middleware)
  ├── service.ts             (Business logic)
  ├── repository.ts          (Database access)
  └── schema.ts              (Input validation with Zod)
```

**Flow:** Request → Route (middleware chain) → Controller → Service (business logic) → Repository (database) → Response

### Database Architecture

PostgreSQL 16 with Prisma 6 ORM provides:

- **Strong typing:** Generated Prisma Client types
- **Migrations:** Version-controlled schema changes
- **Constraints:** Database-level uniqueness and referential integrity
- **Performance:** Indexes, query optimization
- **Atomicity:** Transactions for multi-step operations (e.g., ballot submission with duplicate check)

Data layer split into logical groups:

1. **Identity side:** Officers, Voters, Sessions, OTP Challenges
2. **Electoral data:** Elections, Constituencies, Polling Centres, Candidates
3. **Ballot side:** SubmittedBallot (choice data, no voter relation)
4. **Status side:** VoterElectionStatus (voted flag, no candidate relation)
5. **Remote polling:** RemotePollingRequest, RemotePollingAssignment
6. **Audit:** AuditRecord (immutable operation log)

### Security Layer

- **Authentication:** JWT tokens with server-side session validation
- **Authorization:** Middleware enforces role-to-operation matrix
- **Encryption:** AES-256-GCM for ballot choices, bcrypt for passwords, bcrypt for OTPs
- **Rate limiting:** OTP issue, OTP verify, officer login, password change all rate-limited
- **Input validation:** Zod schemas on every input

## 5.2 Request/Response Flow

### Voter Ballot Submission Flow

```
1. Voter (authenticated)
   └─ POST /api/voters/ballots/generate
      ├─ Controller: validate voter, fetch election
      ├─ Service: check eligibility (active, not voted)
      ├─ Service: fetch candidates (from registered constituency)
      └─ Response: candidates (no voter ID shown)

2. Voter UI presents candidates

3. Voter selects candidate
   └─ POST /api/voters/ballots/submit { candidateId }
      ├─ Controller: validate input
      ├─ Service: encrypt choice (AES-256-GCM)
      ├─ Repository: insert SubmittedBallot (catches duplicate via constraint)
      ├─ Service: update VoterElectionStatus.hasVoted = true
      ├─ Audit: record("voter.ballot.submitted", ballotReference)
      └─ Response: { ballotReference } (opaque, no voter ID shown)

4. Voter confirmation page shows ballot reference only
```

**Key invariants maintained:**
- Voter ID never appears in response body
- Candidate choice never exposed outside encrypted form
- Ballot reference is opaque and non-sequential
- Audit record contains action and reference, not choice

### Officer Approval Flow

```
1. Officer (authenticated)
   └─ GET /api/officer/requests
      ├─ Controller: authorize (VERIFICATION_OFFICER or similar)
      ├─ Repository: fetch pending requests with voter details
      └─ Response: [ { requestId, voterId, voterNumber, election, status } ]

2. Officer selects request to review
   └─ GET /api/officer/requests/:id
      ├─ Controller: authorize, validate request ID
      ├─ Service: eligibility check (active, not voted)
      ├─ Response: { voter, eligibility: { checks: [...] }, request }

3. Officer approves or rejects
   └─ POST /api/officer/requests/:id/approve
      ├─ Controller: authorize, validate
      ├─ Service: update request status
      ├─ Service: create RemotePollingAssignment
      ├─ Audit: record("officer.remote_polling.approved", requestId)
      └─ Response: { status: "APPROVED" }
```

---

# Part 6: Database Design & Schema

## 6.1 Entity-Relationship Diagram

Core entities and relationships:

```
Officer ─────1:M─── Session
          └─1:M─── RemotePollingRequest (reviewedBy)
          └─1:M─── RemotePollingAssignment (assignedBy)

Voter ──────1:M──── Session
      ├───1:M──── RemotePollingRequest
      ├───1:M──── RemotePollingAssignment
      ├───1:M──── OtpChallenge
      └───1:M──── VoterElectionStatus

Constituency ─────1:M───── PollingCentre
           ├──────1:M───── Candidate
           ├──────1:M───── Voter (registeredConstituencyId)
           └──────1:M───── SubmittedBallot

Election ────────1:M──── ElectionConstituency (join table)
       ├────────1:M──── Candidate
       ├────────1:M──── VoterElectionStatus
       ├────────1:M──── RemotePollingRequest
       ├────────1:M──── RemotePollingAssignment
       └────────1:M──── SubmittedBallot

PollingCentre ────1:M───── RemotePollingRequest
            └────1:M───── RemotePollingAssignment

RemotePollingRequest ──1:1── RemotePollingAssignment

VoterElectionStatus (identity: voted flag, no ballot relation)
SubmittedBallot (choice: encrypted candidate, no voter relation)
```

## 6.2 Core Tables

### Officers & Voters

**Officer**
- `id` (UUID, PK)
- `username` (String, unique)
- `passwordHash` (String, bcrypt-hashed)
- `role` (Enum: ELECTION_ADMINISTRATOR, VERIFICATION_OFFICER, POLLING_CENTRE_OFFICER, SYSTEM_AUDITOR)
- `displayName` (String)
- `createdAt` (Timestamp)

**Voter**
- `id` (UUID, PK)
- `voterNumber` (String, unique, public ID on voter roll)
- `fullName` (String)
- `registeredConstituencyId` (String, FK → Constituency, immutable)
- `homePollingCentreId` (String, FK → PollingCentre, nullable)
- `createdAt` (Timestamp)

### Elections & Constituencies

**Election**
- `id` (UUID, PK)
- `code` (String, unique)
- `name` (String)
- `lifecycle` (Enum: CONFIGURED, ACTIVE, CLOSED)
- `startsAt` (Timestamp)
- `endsAt` (Timestamp)
- `createdAt` (Timestamp)

**Constituency**
- `id` (UUID, PK)
- `code` (String, unique)
- `name` (String)

**PollingCentre**
- `id` (UUID, PK)
- `code` (String, unique)
- `name` (String)
- `constituencyId` (String, FK → Constituency, 1:1 relationship)

**Candidate**
- `id` (UUID, PK)
- `fullName` (String)
- `symbol` (String, nullable)
- `electionId` (String, FK → Election)
- `constituencyId` (String, FK → Constituency)
- Unique constraint: (electionId, constituencyId, fullName)

### Ballots — The Secrecy Boundary

**VoterElectionStatus** (Identity side: WHO voted)
- `id` (UUID, PK)
- `voterId` (String, FK → Voter)
- `electionId` (String, FK → Election)
- `hasVoted` (Boolean, default false)
- `votedAt` (Timestamp, nullable)
- Unique constraint: (voterId, electionId) — **enforces one ballot per voter per election**

**SubmittedBallot** (Choice side: WHAT was chosen)
- `ballotReference` (String, PK) — opaque, random, non-sequential
- `electionId` (String, FK → Election)
- `constituencyId` (String, FK → Constituency)
- `nonce` (Bytes) — random 12-byte nonce, never reused
- `ciphertext` (Bytes) — AES-256-GCM encrypted candidate choice
- `authTag` (Bytes) — authentication tag for integrity verification
- `submittedAt` (Timestamp)

**Important:** No relation between `VoterElectionStatus` and `SubmittedBallot`. The voter is identified from the session, not the ballot. This separation is enforced at the schema level.

### Remote Polling

**RemotePollingRequest**
- `id` (UUID, PK)
- `voterId` (String, FK → Voter)
- `electionId` (String, FK → Election)
- `pollingCentreId` (String, FK → PollingCentre)
- `reason` (String, nullable) — voter's reason for remote polling
- `status` (Enum: PENDING, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN, USED, EXPIRED)
- `reviewNote` (String, nullable) — officer's note (required if REJECTED)
- `reviewedById` (String, FK → Officer, nullable)
- `reviewedAt` (Timestamp, nullable)
- `createdAt` (Timestamp)
- Partial unique index: (voterId, electionId) where status IN (PENDING, UNDER_REVIEW) — at most one active request per voter per election

**RemotePollingAssignment**
- `id` (UUID, PK)
- `requestId` (String, FK → RemotePollingRequest, unique) — one assignment per request
- `voterId` (String, FK → Voter)
- `electionId` (String, FK → Election)
- `pollingCentreId` (String, FK → PollingCentre)
- `assignedById` (String, FK → Officer)
- `createdAt` (Timestamp)
- Unique constraint: (voterId, electionId) — only one remote polling assignment per voter per election

### Authentication

**Session**
- `id` (UUID, PK, also JWT `jti` claim)
- `actorType` (Enum: OFFICER, VOTER, SYSTEM)
- `officerId` (String, FK → Officer, nullable)
- `voterId` (String, FK → Voter, nullable)
- `role` (String) — role snapshot at issue time
- `issuedAt` (Timestamp)
- `expiresAt` (Timestamp)
- `revokedAt` (Timestamp, nullable) — revocation is timestamped, record not deleted

**OtpChallenge**
- `id` (UUID, PK)
- `challengeId` (String, unique) — opaque reference returned to client
- `voterId` (String, FK → Voter)
- `otpHash` (String, bcrypt-hashed)
- `expiresAt` (Timestamp) — expires after 5 minutes
- `attemptCount` (Int, default 0) — 5-attempt limit
- `consumedAt` (Timestamp, nullable) — marked consumed after successful verification
- `createdAt` (Timestamp)

### Audit

**AuditRecord**
- `id` (UUID, PK)
- `actorType` (Enum: OFFICER, VOTER, SYSTEM)
- `actorId` (String, nullable) — officer ID, voter ID, or null for system actions
- `action` (String) — action name (e.g., "voter.ballot.submitted")
- `entityType` (String, nullable) — type of affected entity (e.g., "RemotePollingRequest")
- `entityRef` (String, nullable) — opaque reference to affected entity (ballot reference, request ID, etc.)
- `createdAt` (Timestamp)

**Important:** Audit records are **never deleted or modified**. `AuditRecord` is append-only. No passwords, OTPs, encryption keys, or decrypted choices are stored.

---

# Part 7: Security & Integrity Architecture

## 7.1 Ballot Secrecy Implementation

### The Principle

Voter identity and candidate choices are never joined. This separation is enforced at every layer:

**Database layer:**
```prisma
model VoterElectionStatus {
  id         String    @id
  voterId    String    @relation("Voter")
  electionId String
  hasVoted   Boolean
  // NO SubmittedBallot relation
  // NO ballotReference field
}

model SubmittedBallot {
  ballotReference String   @id
  electionId      String
  constituencyId  String
  nonce           Bytes
  ciphertext      Bytes
  authTag         Bytes
  // NO voterId field
  // NO VoterElectionStatus relation
}
```

There is **no foreign key** from `SubmittedBallot` to `Voter`. It is impossible to join them at the database level.

**Service layer:**
```typescript
export const ballotService = {
  async generateBallot(voter: Voter): Promise<Result<unknown>> {
    // Voter identity is known (from session)
    // Candidates fetched from voter.registeredConstituencyId
    // Response contains ONLY candidates, not voter ID
    return ok({ candidates: [...] });
  },

  async submitBallot(voterId: string, candidateId: string): Promise<Result<unknown>> {
    // Store encrypted choice with opaque ballot reference
    const ballotReference = crypto.randomBytes(16).toString('hex');
    const sealed = sealChoice(choice, context);
    
    await repo.create({
      ballotReference,  // Opaque, random, non-sequential
      electionId,
      constituencyId,
      nonce: sealed.nonce,
      ciphertext: sealed.ciphertext,
      authTag: sealed.authTag,
    });
    // Update VoterElectionStatus separately (not in same table)
    await updateVoterStatus(voterId, electionId, { hasVoted: true });
    
    // Response contains ONLY ballot reference, not voter ID or choice
    return ok({ ballotReference });
  }
};
```

**API response layer:**
```typescript
// ❌ WRONG — voter ID is exposed
res.json({ ballotReference, voterId, choice: "encrypted" });

// ✅ CORRECT — only opaque reference
res.json({ ballotReference });
```

**Logging:**
```typescript
// ❌ WRONG — voter ID and ballot reference together
logger.info('Ballot submitted', { voterId: 'xyz', ballotRef: 'abc' });

// ✅ CORRECT — neither voter ID nor decrypted choice
logger.info('Ballot submitted', { ballotRef: 'abc' });
logger.debug('Ballot integrity verified', { ballotRef: 'abc', valid: true });
```

**Audit trail:**
```typescript
// ❌ WRONG — decrypted choice in audit record
auditService.record({
  action: 'voter.ballot.submitted',
  entityRef: ballotReference,
  metadata: { candidateName: 'Alice', voterId: 'xyz' }
});

// ✅ CORRECT — opaque reference only
auditService.record({
  action: 'voter.ballot.submitted',
  entityRef: ballotReference,  // Opaque reference
  // No metadata, no choice, no voter ID
});
```

### Opaque Ballot References

Ballot references are:
- **Random:** Generated by `crypto.randomBytes()`, not sequential IDs
- **Cryptographically strong:** 16+ bytes of randomness
- **Hex-encoded:** Safe for database and API
- **Non-sequential:** Cannot guess or enumerate other ballots
- **Carry no information:** Cannot decode to voter ID or election ID

```typescript
// Generate opaque reference
const ballotReference = crypto.randomBytes(16).toString('hex');
// Example: "a7f2b8c4e1d6f3a9b5c2d8e1f6a3b9c7"
```

## 7.2 Ballot Integrity Verification

### AES-256-GCM Encryption

Ballots are encrypted with **AES-256-GCM** (Galois/Counter Mode). GCM provides both confidentiality (encryption) and authenticity (authentication tag).

**Why GCM?**

A hash alone does not guarantee integrity—an attacker who can rewrite a stored ballot can also rewrite the hash. GCM's authentication tag **cannot be recomputed without the encryption key**. Tampering is detected at decryption time.

### Encryption Process

```typescript
export function sealChoice(
  choice: CandidateChoice,
  context: { ballotReference: string; electionId: string; constituencyId: string }
): SealedChoice {
  // Load 256-bit encryption key from environment (never logged, never defaulted)
  const key = loadKey();
  
  // Generate random 96-bit nonce (12 bytes) — NEVER REUSED
  const nonce = crypto.randomBytes(12);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  
  // Bind ballot context into additional authenticated data
  // Tampering with ballotReference, electionId, or constituencyId fails the tag
  const aad = Buffer.from(
    `${ballotReference}|${electionId}|${constituencyId}`
  );
  cipher.setAAD(aad);
  
  // Encrypt candidate choice (JSON stringified)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(choice), 'utf8'),
    cipher.final(),
  ]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    nonce: new Uint8Array(nonce),
    ciphertext: new Uint8Array(ciphertext),
    authTag: new Uint8Array(authTag),
  };
}
```

**Stored in database:**
- `nonce` (12 bytes, unique per ballot)
- `ciphertext` (encrypted choice)
- `authTag` (16 bytes, authentication tag)

### Integrity Verification

Integrity is verified by attempting decryption:

```typescript
export function verifyIntegrity(stored: StoredBallot): boolean {
  try {
    const key = loadKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(stored.nonce)
    );
    
    // Re-bind the same AAD
    const aad = Buffer.from(
      `${stored.ballotReference}|${stored.electionId}|${stored.constituencyId}`
    );
    decipher.setAAD(aad);
    
    // Set the stored authentication tag
    decipher.setAuthTag(Buffer.from(stored.authTag));
    
    // Attempt decryption — will throw if tag is invalid (tampering detected)
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(stored.ciphertext)),
      decipher.final(),
    ]);
    
    // Tampering detected if we get here and plaintext is corrupted,
    // but no exception means the tag was valid
    return true;
  } catch (error) {
    // Tag verification failed — ballot has been tampered with
    return false;
  }
}
```

**Key properties:**
- Decryption fails (throws) if the tag is invalid
- Tampering with nonce, ciphertext, authTag, or AAD is detected
- **The decrypted choice is never returned or logged** — only the boolean result
- Verification can be performed by auditors without exposing the choice

## 7.3 Authentication & Session Management

### Mock OTP Flow

**OTP Issue:**
1. Voter provides voter number
2. System generates random 6-digit OTP
3. OTP bcrypt-hashed and stored in `OtpChallenge`
4. Opaque challenge ID returned to frontend
5. OTP itself logged only in development (marked "dev-only")

```typescript
export interface OtpIssuedResult {
  challengeId: string;
  expiresAt: Date;
  devOnlyOtp?: string;  // Only in development/testing
}
```

**OTP Verification:**
1. Voter submits challenge ID and OTP
2. System fetches challenge by challenge ID
3. Verifies OTP against bcrypt hash
4. Checks expiry (5 minutes)
5. Checks attempt count (max 5)
6. On success: marks consumed, issues JWT session
7. On failure: increments attempt count; if >= 5, challenge is invalid

```typescript
model OtpChallenge {
  challengeId  String    @unique  // Opaque reference
  voterId      String
  otpHash      String             // Bcrypt-hashed
  expiresAt    DateTime           // 5 minutes from creation
  attemptCount Int       @default(0)  // 5-attempt limit
  consumedAt   DateTime?           // Marked after successful verification
}
```

### Officer Password Login

1. Officer provides username and password
2. System fetches officer by username
3. Verifies password against bcrypt hash
4. Rate-limited (configurable attempts per minute)
5. On success: issues JWT session, clears other sessions (logout everywhere)
6. Session backed by `Session` record

```typescript
model Officer {
  username     String   @unique
  passwordHash String   // Bcrypt-hashed
  // Update password: verify current password, hash new password, revoke all sessions
}
```

**Password change:**
```typescript
authRouter.post('/password',
  authenticate,
  requireRole('ELECTION_ADMINISTRATOR', /* other officers */),
  passwordChangeLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);

// Flow:
// 1. Authenticate (current session valid)
// 2. Verify current password
// 3. Revoke all officer sessions (forces re-login everywhere)
// 4. Hash and store new password
```

### JWT & Session Records

JWT tokens are stateless cryptographically, but are validated against server-side `Session` records:

```typescript
export interface IssuedSession {
  token: string;          // JWT signed with SECRET
  expiresAt: Date;        // Encoded as `exp` claim
}

model Session {
  id        String      @id  // Also JWT `jti` claim
  actorType ActorType        // OFFICER, VOTER, or SYSTEM
  officerId String?           // If OFFICER
  voterId   String?           // If VOTER
  role      String            // Role snapshot (officer role or "VOTER")
  issuedAt  DateTime
  expiresAt DateTime
  revokedAt DateTime?         // Immediate revocation (not deletion)
}
```

**Authentication middleware:**
```typescript
export const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  // Verify JWT signature
  const payload = jwt.verify(token, env.JWT_SECRET);
  
  // Check session record exists and not revoked
  const session = await sessionRepository.findById(payload.jti);
  if (!session || session.revokedAt) {
    return res.status(401).json({ error: 'Session revoked' });
  }
  
  // Check expiry
  if (new Date() > session.expiresAt) {
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.user = { 
    actorType: session.actorType,
    officerId: session.officerId,
    voterId: session.voterId,
    role: session.role,
  };
  next();
};
```

### Rate Limiting

Rate limits are enforced on sensitive operations:

| Operation | Limit | Window |
|---|---|---|
| OTP issue | 5 per 15 minutes | Per voter |
| OTP verify | 5 attempts per OTP | Per challenge (built into attempt count) |
| Officer login | 10 per 15 minutes | Per username |
| Password change | 5 per 1 hour | Per officer |

```typescript
const otpIssueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests
  keyGenerator: (req) => req.body.voterNumber,
  message: 'Too many OTP requests; please try again later',
});
```

---


---

# Part 8: API Endpoints & Integration

## 8.1 Authentication Endpoints

### POST /api/auth/officer/login

Officer login with username and password.

**Request:**
```json
{
  "username": "officer1",
  "password": "secure-password"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-10-31T12:30:00Z",
  "officer": {
    "id": "officer-uuid",
    "username": "officer1",
    "role": "VERIFICATION_OFFICER",
    "displayName": "Alice Officer"
  }
}
```

**Authorization:** No authorization required (login endpoint)  
**Rate limit:** 10 attempts per 15 minutes  
**Errors:**
- 401: Invalid credentials
- 429: Rate limit exceeded

---

### POST /api/auth/voter/otp

Request a one-time password for voter authentication.

**Request:**
```json
{
  "voterNumber": "V12345"
}
```

**Response (200 OK):**
```json
{
  "challengeId": "chal_abcdef123456",
  "expiresAt": "2024-10-31T11:35:00Z",
  "devOnlyOtp": "123456"
}
```

**Notes:**
- `devOnlyOtp` is included only in development/testing environments
- `challengeId` is an opaque reference to be submitted with the OTP
- OTP expires after 5 minutes
- Rate limit: 5 per 15 minutes per voter number

**Errors:**
- 400: Voter not found
- 429: Rate limit exceeded

---

### POST /api/auth/voter/otp/verify

Verify the OTP and obtain a JWT session token.

**Request:**
```json
{
  "challengeId": "chal_abcdef123456",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-10-31T12:30:00Z",
  "voter": {
    "id": "voter-uuid",
    "voterNumber": "V12345",
    "fullName": "John Voter",
    "registeredConstituencyId": "const-uuid"
  }
}
```

**Rate limit:** 5 attempts per OTP  
**Errors:**
- 400: Challenge not found or expired
- 401: OTP incorrect
- 410: OTP already consumed (one-time use)
- 429: Too many attempts (5 limit)

---

### GET /api/auth/session

Read current session details.

**Authorization:** Authenticated (voter or officer)  
**Response (200 OK):**
```json
{
  "id": "session-uuid",
  "actorType": "VOTER",
  "voterId": "voter-uuid",
  "role": "VOTER",
  "issuedAt": "2024-10-31T11:30:00Z",
  "expiresAt": "2024-10-31T12:30:00Z"
}
```

---

### POST /api/auth/password

Officer password change (revokes all other sessions).

**Authorization:** Authenticated officer  
**Request:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed; other sessions revoked",
  "expiresAt": "2024-10-31T13:30:00Z"
}
```

**Rate limit:** 5 per 1 hour per officer  
**Errors:**
- 400: Current password incorrect
- 401: Not authenticated or not an officer
- 429: Rate limit exceeded

---

### DELETE /api/auth/session

Voter revokes their own session (logout).

**Authorization:** Authenticated voter  
**Response (200 OK):**
```json
{
  "message": "Session revoked"
}
```

---

### DELETE /api/auth/sessions/:id

Election Administrator revokes any session.

**Authorization:** ELECTION_ADMINISTRATOR  
**Request:** (path parameter)
```
DELETE /api/auth/sessions/session-uuid
```

**Response (200 OK):**
```json
{
  "message": "Session revoked"
}
```

---

## 8.2 Voter Endpoints

### GET /api/voters/profile

Fetch voter's own profile.

**Authorization:** Authenticated voter  
**Response (200 OK):**
```json
{
  "id": "voter-uuid",
  "voterNumber": "V12345",
  "fullName": "John Voter",
  "registeredConstituency": {
    "id": "const-uuid",
    "code": "CS001",
    "name": "Chennai South"
  },
  "homePollingCentre": {
    "id": "pc-uuid",
    "code": "PC001",
    "name": "Chennai South Polling Centre"
  }
}
```

**Important:** No sensitive data exposed beyond voter's own record.

---

### GET /api/voters/eligibility

Check voter's eligibility for the current active election.

**Authorization:** Authenticated voter  
**Response (200 OK):**
```json
{
  "eligible": true,
  "election": {
    "id": "election-uuid",
    "code": "GEN2024",
    "name": "General Election 2024",
    "lifecycle": "ACTIVE"
  },
  "checks": [
    {
      "key": "voter_active",
      "label": "Voter is active",
      "passed": true
    },
    {
      "key": "voter_not_yet_voted",
      "label": "Voter has not yet voted",
      "passed": true
    },
    {
      "key": "election_active",
      "label": "Election is active",
      "passed": true
    },
    {
      "key": "voter_not_barred",
      "label": "Voter is not barred",
      "passed": true
    }
  ]
}
```

**Errors:**
- 404: No active election
- 409: Voter not eligible (ineligibility reason shown in checks)

---

## 8.3 Ballot Endpoints

### POST /api/voters/ballots/generate

Generate ballot (fetch candidates for registered constituency).

**Authorization:** Authenticated voter  
**Request:** (no body required; voter identity from session)

**Response (200 OK):**
```json
{
  "candidates": [
    {
      "id": "candidate-uuid-1",
      "fullName": "Alice Candidate",
      "symbol": "🌹"
    },
    {
      "id": "candidate-uuid-2",
      "fullName": "Bob Candidate",
      "symbol": "🌻"
    }
  ]
}
```

**Important:** Response contains only candidates and no voter ID.  
**Errors:**
- 404: No active election
- 409: Voter not eligible or already voted

---

### POST /api/voters/ballots/submit

Submit ballot (encrypt and store candidate choice).

**Authorization:** Authenticated voter  
**Request:**
```json
{
  "candidateId": "candidate-uuid-1"
}
```

**Response (200 OK):**
```json
{
  "ballotReference": "a7f2b8c4e1d6f3a9b5c2d8e1f6a3b9c7"
}
```

**Important:** Response contains only the opaque ballot reference, never voter ID or choice.  
**Errors:**
- 404: Election or candidate not found
- 409: Voter already voted (duplicate submission rejected at database level)

**Under the hood:**
- Eligibility verified (active voter, not yet voted, election active)
- Candidate fetched and constituency verified (must be voter's registered constituency)
- Candidate choice encrypted with AES-256-GCM
- `SubmittedBallot` record created with opaque reference
- `VoterElectionStatus` updated (hasVoted = true)
- Database constraint prevents duplicate (one per voter per election)
- Audit record created (no choice data)

---

## 8.4 Remote Polling Endpoints

### POST /api/remote-polling/requests

Submit remote polling request.

**Authorization:** Authenticated voter  
**Request:**
```json
{
  "electionId": "election-uuid",
  "pollingCentreId": "polling-centre-uuid",
  "reason": "I will be traveling during the election"
}
```

**Response (201 Created):**
```json
{
  "id": "request-uuid",
  "status": "PENDING",
  "createdAt": "2024-10-31T11:00:00Z"
}
```

**Validation:**
- Election must exist and be ACTIVE
- Polling centre must exist
- Voter cannot have another active (PENDING or UNDER_REVIEW) request for same election
- (Partial unique index prevents this at database level)

**Errors:**
- 400: Election or polling centre not found
- 409: Duplicate active request for same election

---

### GET /api/officer/requests

List remote polling requests for officer review.

**Authorization:** VERIFICATION_OFFICER or POLLING_CENTRE_OFFICER  
**Query params:**
- `status` (optional): PENDING, UNDER_REVIEW, APPROVED, etc.
- `limit` (optional): max results (default 50)
- `offset` (optional): pagination offset

**Response (200 OK):**
```json
{
  "requests": [
    {
      "id": "request-uuid-1",
      "voterId": "voter-uuid",
      "voterNumber": "V12345",
      "voterName": "John Voter",
      "electionId": "election-uuid",
      "electionCode": "GEN2024",
      "pollingCentreId": "polling-centre-uuid",
      "pollingCentreName": "Madurai Polling Centre",
      "reason": "I will be traveling during the election",
      "status": "PENDING",
      "createdAt": "2024-10-31T11:00:00Z"
    }
  ],
  "total": 15,
  "offset": 0,
  "limit": 50
}
```

---

### GET /api/officer/requests/:id

Get detailed remote polling request with eligibility check.

**Authorization:** VERIFICATION_OFFICER or POLLING_CENTRE_OFFICER  
**Response (200 OK):**
```json
{
  "request": {
    "id": "request-uuid",
    "voterId": "voter-uuid",
    "voterNumber": "V12345",
    "voterName": "John Voter",
    "registeredConstituency": {
      "id": "const-uuid",
      "code": "CS001",
      "name": "Chennai South"
    },
    "electionCode": "GEN2024",
    "pollingCentre": {
      "id": "polling-centre-uuid",
      "code": "PC002",
      "name": "Madurai Polling Centre",
      "constituency": {
        "id": "const-uuid-2",
        "code": "MU001",
        "name": "Madurai"
      }
    },
    "reason": "I will be traveling during the election",
    "status": "PENDING"
  },
  "eligibility": {
    "eligible": true,
    "checks": [
      {
        "key": "voter_active",
        "label": "Voter is active",
        "passed": true
      },
      {
        "key": "voter_not_yet_voted",
        "label": "Voter has not yet voted",
        "passed": true
      }
    ]
  }
}
```

---

### POST /api/officer/requests/:id/approve

Officer approves remote polling request.

**Authorization:** VERIFICATION_OFFICER  
**Request:**
```json
{
  "note": "Request approved; voter verified active"
}
```

**Response (200 OK):**
```json
{
  "status": "APPROVED",
  "assignment": {
    "id": "assignment-uuid",
    "createdAt": "2024-10-31T11:05:00Z"
  }
}
```

**Flow:**
- Request status updated to APPROVED
- RemotePollingAssignment created (grants permission)
- Audit record created

---

### POST /api/officer/requests/:id/reject

Officer rejects remote polling request.

**Authorization:** VERIFICATION_OFFICER  
**Request:**
```json
{
  "note": "Voter appears to have voted elsewhere; request denied"
}
```

**Response (200 OK):**
```json
{
  "status": "REJECTED"
}
```

**Flow:**
- Request status updated to REJECTED
- Review note stored (shown to voter)
- Audit record created

---

## 8.5 Audit Endpoints

### GET /api/audit/records

Query audit trail.

**Authorization:** SYSTEM_AUDITOR  
**Query params:**
- `action` (optional): filter by action name
- `entityType` (optional): filter by entity type
- `actorType` (optional): OFFICER, VOTER, SYSTEM
- `startDate` (optional): ISO date
- `endDate` (optional): ISO date
- `limit` (optional): max results (default 100, max 1000)
- `offset` (optional): pagination offset

**Response (200 OK):**
```json
{
  "records": [
    {
      "id": "audit-record-uuid",
      "actorType": "VOTER",
      "actorId": "voter-uuid",
      "action": "voter.ballot.submitted",
      "entityType": "SubmittedBallot",
      "entityRef": "a7f2b8c4e1d6f3a9b5c2d8e1f6a3b9c7",
      "createdAt": "2024-10-31T11:30:00Z"
    },
    {
      "id": "audit-record-uuid-2",
      "actorType": "OFFICER",
      "actorId": "officer-uuid",
      "action": "officer.remote_polling.approved",
      "entityType": "RemotePollingRequest",
      "entityRef": "request-uuid",
      "createdAt": "2024-10-31T11:05:00Z"
    }
  ],
  "total": 245,
  "offset": 0,
  "limit": 100
}
```

**Important:** Audit records contain only actor, action, and entity reference—never passwords, OTPs, encryption keys, or decrypted choices.

---

### POST /api/audit/ballots/:ballotReference/verify

Auditor verifies ballot integrity.

**Authorization:** SYSTEM_AUDITOR  
**Request:** (no body)

**Response (200 OK):**
```json
{
  "ballotReference": "a7f2b8c4e1d6f3a9b5c2d8e1f6a3b9c7",
  "integrityValid": true,
  "verifiedAt": "2024-10-31T12:00:00Z"
}
```

**Important:** 
- Response contains ONLY the integrity check result (true/false)
- Decrypted choice is NEVER returned, logged, or audited
- Tampering is detected via AES-256-GCM authentication tag failure

**Errors:**
- 404: Ballot not found
- 422: Integrity check failed (ballot has been tampered with)

---

---

# Part 9: Frontend Portals & User Workflows

## 9.1 Voter Portal

The voter portal guides a voter through remote polling request submission and ballot casting.

### Workflow: Remote Polling Request

**Step 1: Voter Login**
- Voter enters voter number
- System issues mock OTP
- Voter enters OTP
- Voter receives JWT session token

**Step 2: Check Eligibility**
- System checks voter is active, election active, not yet voted
- Eligibility displayed with detailed checks
- Error shown if voter not eligible

**Step 3: Remote Polling Request (Optional)**
- Voter optionally submits request to use remote polling centre
- Voter selects election and remote centre
- Voter provides reason (optional)
- Request enters PENDING status
- Voter is notified request is submitted

**Step 4: Ballot Generation**
- System fetches candidates from voter's **registered constituency**
- Candidates displayed in ballot UI
- (Note: if remote polling assignment active, voting still occurs at registered constituency ballot)

**Step 5: Ballot Submission**
- Voter selects candidate
- Ballot encrypted client-side or server-side
- Submitted to backend
- Backend confirms with opaque ballot reference only
- Voter confirmation page displays reference

### UI Components

```
LoginPage
  ├─ Voter Number Input
  └─ OTP Challenge Flow
     ├─ OTP Request
     └─ OTP Verification

Dashboard
  ├─ Voter Profile
  ├─ Eligibility Status
  └─ Action Options

RemotePollingRequest
  ├─ Election Selector
  ├─ Polling Centre Selector
  ├─ Reason Text Input
  └─ Submit Button

BallotPage
  ├─ Candidate List (from registered constituency)
  ├─ Candidate Selection
  └─ Submit Ballot

ConfirmationPage
  └─ Ballot Reference Display (opaque)
```

## 9.2 Officer Portal

The officer portal provides tools for eligibility verification, request review, and approval workflows.

### Workflow: Request Review & Approval

**Step 1: Officer Login**
- Officer enters username and password
- Officer authenticated and receives JWT token
- Dashboard shows based on officer role

**Step 2: Request Queue**
- Officer views list of pending requests
- Filters available: status, election, date range
- Request cards show voter number, election, requested centre, submission date

**Step 3: Request Detail**
- Officer selects request to review
- System fetches voter details and request details
- Eligibility checks displayed:
  - Voter is active (yes/no)
  - Voter has not yet voted (yes/no)
  - Voter not barred (yes/no)

**Step 4: Approval Decision**
- Officer reviews eligibility
- Officer selects Approve or Reject
- Officer enters optional note
- System records decision with officer ID and timestamp
- Request status updated
- Audit record created

### UI Components

```
Dashboard (Officer)
  ├─ Request Queue Button
  ├─ Eligibility Lookup Button
  └─ Session Info

RequestQueue
  ├─ Filter Controls (status, election, date)
  ├─ Request Card List
  └─ Pagination

RequestDetail
  ├─ Voter Info Card
  ├─ Eligibility Check List
  ├─ Request Info Card
  ├─ Approve Button
  └─ Reject Button (with note input)

ApprovalForm
  ├─ Decision Selector (Approve/Reject)
  ├─ Note Text Area
  └─ Submit Button
```

## 9.3 Admin Portal

The admin portal provides election configuration and management.

### Workflow: Election Setup

**Step 1: Create Election**
- Admin enters election code, name, start date, end date
- Election created in CONFIGURED state

**Step 2: Configure Constituencies**
- Admin adds constituencies to election
- Each constituency linked to polling centres
- Candidates assigned to constituencies

**Step 3: Add Candidates**
- Admin adds candidates to constituencies
- Each candidate has name and symbol (optional)

**Step 4: Activate Election**
- Admin activates election (CONFIGURED → ACTIVE)
- Voting becomes available for voters

**Step 5: Close Election**
- Admin closes election after voting period (ACTIVE → CLOSED)
- Ballots locked; counting begins

### UI Components

```
Dashboard (Admin)
  ├─ Create Election Button
  ├─ Election List
  └─ Simulator Controls

ElectionSetup
  ├─ Election Form (code, name, dates)
  └─ Create Button

ConstituencyConfig
  ├─ Constituency List
  ├─ Add Constituency Button
  └─ Assign Polling Centres

CandidateManagement
  ├─ Constituency Selector
  ├─ Candidate List
  ├─ Add Candidate Form
  └─ Remove Candidate Buttons

ElectionLifecycle
  ├─ Current State Display
  ├─ Activate Button (if CONFIGURED)
  ├─ Close Button (if ACTIVE)
  └─ Reconcile Button (if CLOSED)
```

## 9.4 Auditor Portal

The auditor portal provides audit trail queries and ballot integrity verification.

### Workflow: Audit Review

**Step 1: Query Audit Trail**
- Auditor filters by action, actor, date range, entity type
- Audit records displayed with actor, action, timestamp, entity reference
- Results paginated

**Step 2: Review Ballot Integrity**
- Auditor selects ballot reference
- System verifies integrity (AES-256-GCM tag)
- Result displayed: valid or tampered
- Audit record created for verification (no choice shown)

### UI Components

```
AuditTrail
  ├─ Filter Controls (action, actor, date, type)
  ├─ Audit Record Table
  │  └─ Columns: Actor, Action, Entity Ref, Timestamp
  └─ Pagination

IntegrityVerification
  ├─ Ballot Reference Input
  ├─ Verify Button
  └─ Result Display (valid/invalid)
```

---


---

# Part 10: Backend Implementation & Modules

## 10.1 Module Architecture

Each backend module follows the same internal structure:

```
module-name/
  ├── controller.ts       (Route handlers, request/response)
  ├── routes.ts           (Express routes, middleware chain)
  ├── service.ts          (Business logic, validation)
  ├── repository.ts       (Database queries)
  ├── schema.ts           (Zod validation schemas)
  └── (optional) crypto.ts (Cryptographic operations)
```

### Request Flow

```
HTTP Request
  ↓
routes.ts (middleware chain)
  ├─ validate (input schema)
  ├─ authenticate (JWT validation)
  ├─ requireRole (authorization)
  ├─ rateLimit (rate limiting)
  └─ handler
       ↓
    controller.ts (request parsing)
       ↓
    service.ts (business logic)
       ↓
    repository.ts (database queries)
       ↓
    audit.record() (audit trail)
       ↓
    Response
```

## 10.2 Core Modules

### Auth Module

**Responsibilities:**
- Officer login (username/password)
- Voter OTP flow (issue, verify)
- JWT session issuance and validation
- Session revocation
- Officer password change

**Key services:**
- `authService.officerLogin(username, password)` → IssuedSession
- `authService.requestOtp(voterNumber)` → OtpIssuedResult
- `authService.verifyOtp(challengeId, otp)` → VoterLoginResult
- `authService.changePassword(officerId, current, new)` → IssuedSession

**Security:**
- Passwords bcrypt-hashed (never plaintext)
- OTPs bcrypt-hashed, 5-minute expiry, one-time use, 5-attempt limit
- Rate limiting on all authentication operations
- JWT backed by server-side session record (revocable)

### Voters Module

**Responsibilities:**
- Voter profile management
- Eligibility verification
- Voter search (for officers)

**Key services:**
- `voterService.getProfile(voterId)` → VoterProfile
- `voterService.checkEligibility(voterId, electionId)` → EligibilityResult
- `voterRepository.findByVoterNumber(voterNumber)` → Voter

**Eligibility checks:**
- Voter is active (not deleted or archived)
- Election is active (ACTIVE state)
- Voter has not yet voted (VoterElectionStatus.hasVoted == false)
- Voter is not barred (no bar flag in voter record)

### Ballots Module

**Responsibilities:**
- Ballot generation (fetch candidates from registered constituency)
- Ballot encryption and submission
- Ballot integrity verification
- Duplicate submission prevention (database constraint)

**Key services:**
- `ballotService.generateBallot(voter)` → Candidates
- `ballotService.submitBallot(voter, candidateId)` → { ballotReference }
- `ballotService.verifyIntegrity(ballotReference)` → boolean

**Crypto:**
- `sealChoice(choice, context)` → SealedChoice (AES-256-GCM)
- `openBallotForCounting(ballot)` → CandidateChoice (decryption)
- `verifyIntegrity(ballot)` → boolean (no choice returned)

**Core invariant enforced:**
- `generateBallot(voter: Voter)` accepts whole voter object
- Candidates fetched from `voter.registeredConstituencyId`
- Impossible to pass remote centre's constituency by accident

### Remote Polling Module

**Responsibilities:**
- Remote polling request submission
- Request workflow (PENDING → UNDER_REVIEW → APPROVED/REJECTED)
- Assignment creation and lifecycle
- Partial unique index enforcement (one active request per voter per election)

**Key services:**
- `remotePollingService.submitRequest(voterId, electionId, centreId, reason)` → RemotePollingRequest
- `remotePollingService.approveRequest(requestId, officerId, note)` → RemotePollingAssignment
- `remotePollingService.rejectRequest(requestId, officerId, note)` → RemotePollingRequest

**State machine:**
```
PENDING ──review──→ UNDER_REVIEW ──┐
   ↓                              ├─→ APPROVED ──vote──→ USED
   └──────────────────────────────┴→ REJECTED
                                      WITHDRAWN
                                      EXPIRED (after election close)
```

### Elections Module

**Responsibilities:**
- Election lifecycle management
- Candidate and constituency management
- Election queries (current, by ID, by code)

**Key services:**
- `electionService.createElection(code, name, dates)` → Election (CONFIGURED)
- `electionService.activateElection(electionId)` → Election (ACTIVE)
- `electionService.closeElection(electionId)` → Election (CLOSED)
- `electionRepository.findCurrent()` → Election (first ACTIVE, or null)

### Audit Module

**Responsibilities:**
- Record audit entries (side effect of state changes)
- Audit trail queries
- Ballot integrity verification (auditor operation)

**Key services:**
- `auditService.record(entry: AuditEntry)` → void (side effect)
- `auditRepository.queryRecords(filters)` → AuditRecord[]
- `auditService.verifyBallotIntegrity(ballotRef)` → { valid: boolean }

**Never logged:**
- Passwords, OTPs, encryption keys, decrypted choices
- Sensitive operation details
- The audit operation itself is logged (with no sensitive details)

### Simulator Module

**Responsibilities:**
- Election simulation (ballot processing, reconciliation)
- Ballot counting (post-closure)
- Reconciliation report generation

**Key services:**
- `simulatorService.reconcile(electionId)` → ReconciliationReport
- `simulatorService.countBallots(electionId)` → CountResult

**Flow:**
1. Election closed (ACTIVE → CLOSED)
2. Auditor/admin triggers reconciliation
3. System compares:
   - Ballots issued (from VoterElectionStatus per constituency)
   - Ballots counted (from SubmittedBallot per constituency)
4. Report generated with discrepancies
5. Counts generated per candidate per constituency

**Important:** Reconciliation is **per-constituency aggregate only**. No voter-to-ballot matching (that's ballot secrecy). If issued == counted per constituency, election is valid.

### Officer Module

**Responsibilities:**
- Officer-specific operations (request review, eligibility checks)
- Officer dashboard queries

**Key services:**
- `officerService.listRequests(filters)` → RemotePollingRequest[]
- `officerService.checkEligibility(voterId, electionId)` → EligibilityResult

### Admin Module

**Responsibilities:**
- Admin-specific operations (election setup, candidate management)
- Admin dashboard queries

**Key services:**
- `adminService.createElection(...)` → Election
- `adminService.addCandidates(electionId, constituencies, candidates)` → Candidate[]

---

# Part 11: Core Workflows & Use Cases

## 11.1 Use Case: Remote Polling Request & Approval

### Actors
- **Primary:** Voter (geographically mobile)
- **Secondary:** Verification Officer (approver)

### Preconditions
- Voter is active and registered
- Election is ACTIVE
- Voter has not yet voted
- Voter is not barred

### Flow

**Step 1: Voter Authenticates**
1. Voter navigates to login page
2. Voter enters voter number
3. System generates mock OTP (5-minute expiry)
4. Voter receives OTP (dev-only in development)
5. Voter enters OTP
6. System verifies OTP (bcrypt hash check)
7. System issues JWT token backed by Session record
8. Voter authenticated; dashboard displayed

**Step 2: Voter Submits Remote Polling Request**
1. Voter selects election
2. Voter selects desired remote polling centre
3. Voter provides reason (optional)
4. Frontend sends: POST /api/remote-polling/requests
5. Backend validates:
   - Election exists and is ACTIVE
   - Polling centre exists
   - Voter not already having active request for this election
   - (Partial unique index at database prevents duplicates)
6. RemotePollingRequest record created with status PENDING
7. Audit record created: `action: "voter.remote_polling.requested"`
8. Response: request ID and status

**Step 3: Officer Reviews Request**
1. Officer (VERIFICATION_OFFICER) logs in
2. Officer views request queue: GET /api/officer/requests
3. Officer filters by status, election, date
4. Officer selects request to review: GET /api/officer/requests/:id
5. Backend returns:
   - Voter details (number, name, registered constituency)
   - Request details (election, remote centre, reason)
   - Eligibility checks (active, not voted, not barred)
6. Officer reviews eligibility checks on UI

**Step 4: Officer Approves or Rejects**
1. Officer selects Approve or Reject
2. Officer optionally enters note (required for rejection)
3. Officer submits decision: POST /api/officer/requests/:id/approve (or reject)
4. Backend:
   - Validates officer is VERIFICATION_OFFICER
   - Updates RemotePollingRequest.status → APPROVED (or REJECTED)
   - If approved:
     - Creates RemotePollingAssignment
     - Grants permission to vote at remote centre
     - Unique constraint (voterId, electionId) ensures only one assignment
   - Records officer ID and timestamp
5. Audit record created: `action: "officer.remote_polling.approved"` or `"rejected"`
6. Response: status confirmation

### Postconditions
- **If approved:**
  - Voter has RemotePollingAssignment for remote centre and election
  - Voter can vote at remote centre (instead of home)
  - Ballot still generated from registered constituency
  - Voter eligible to participate

- **If rejected:**
  - Voter notified of rejection with reason
  - Voter remains eligible for home polling centre voting
  - Voter may resubmit request if circumstances change

---

## 11.2 Use Case: Ballot Casting & Submission

### Actors
- **Primary:** Voter (authenticated)
- **Secondary:** Ballot encryption system, database

### Preconditions
- Voter authenticated
- Election ACTIVE
- Voter not yet voted (VoterElectionStatus.hasVoted == false)
- Voter eligible

### Flow

**Step 1: Generate Ballot**
1. Voter navigates to ballot page
2. Frontend sends: POST /api/voters/ballots/generate
3. Backend:
   - Extracts voter ID from authenticated session
   - Verifies election is ACTIVE
   - Checks VoterElectionStatus: hasVoted == false
   - **Fetches candidates from voter.registeredConstituencyId**
   - (Not from remote centre, even if voter has RemotePollingAssignment)
   - Generates list of candidates with IDs, names, symbols
4. Response: candidates array (no voter ID in response)
5. Frontend displays ballot UI with candidates

**Step 2: Voter Selects Candidate**
1. Voter clicks candidate in UI
2. UI highlights selection
3. Voter confirms selection (button click)
4. Frontend may encrypt on client-side (optional) or send plaintext to server

**Step 3: Ballot Submission**
1. Frontend sends: POST /api/voters/ballots/submit with candidateId
2. Backend:
   - Validates voter authenticated
   - Validates candidate ID
   - Verifies candidate is from voter's registered constituency
   - Verifies election ACTIVE and voter not yet voted
3. Backend creates opaque ballot reference:
   ```typescript
   const ballotReference = crypto.randomBytes(16).toString('hex');
   // Example: "a7f2b8c4e1d6f3a9b5c2d8e1f6a3b9c7"
   ```
4. Backend encrypts choice:
   ```typescript
   const choice = { candidateId: "..." };
   const sealed = sealChoice(choice, {
     ballotReference,
     electionId,
     constituencyId: voter.registeredConstituencyId
   });
   // Returns: { nonce, ciphertext, authTag }
   ```
5. Backend stores SubmittedBallot:
   ```typescript
   await db.submittedBallot.create({
     data: {
       ballotReference,
       electionId,
       constituencyId: voter.registeredConstituencyId,
       nonce: sealed.nonce,
       ciphertext: sealed.ciphertext,
       authTag: sealed.authTag,
       submittedAt: new Date()
     }
   });
   // Unique constraint (voterId, electionId) on VoterElectionStatus
   // prevents duplicate at this step
   ```
6. Backend updates VoterElectionStatus:
   ```typescript
   await db.voterElectionStatus.update({
     where: { id: status.id },
     data: { hasVoted: true, votedAt: new Date() }
   });
   ```
   If duplicate submission attempted, database unique constraint throws exception
7. Backend records audit:
   ```typescript
   await auditService.record({
     actorType: 'VOTER',
     actorId: voterId,
     action: 'voter.ballot.submitted',
     entityRef: ballotReference
     // No choice data, no candidate name
   });
   ```
8. Response: `{ ballotReference }`

**Step 4: Confirmation**
1. Frontend receives ballot reference
2. Displays confirmation page with:
   - Ballot reference (for voter's records)
   - Confirmation message
   - No voter ID or choice shown
3. Voter can close or navigate away

### Postconditions
- Ballot encrypted and stored with opaque reference
- Voter marked as having voted
- Cannot submit second ballot (duplicate rejected at database level)
- Audit record created (immutable)
- Ballot secrecy maintained (no voter-choice join)

---

## 11.3 Use Case: Eligibility Verification

### Actors
- **Primary:** Verification Officer
- **Secondary:** Voter database

### Preconditions
- Officer authenticated as VERIFICATION_OFFICER or similar
- Voter record exists

### Flow

1. Officer navigates to eligibility check page
2. Officer enters voter number
3. Frontend sends: GET /api/voters/eligibility?voterNumber=V12345
4. Backend:
   - Validates officer authorization
   - Looks up voter by voter number
   - Performs eligibility checks:
     ```
     ✓ Voter is active (not deleted)
     ✓ Voter has not yet voted
     ✓ Election is ACTIVE
     ✓ Voter is not barred
     ```
   - Returns result and check details
5. Frontend displays eligibility summary:
   ```json
   {
     "eligible": true,
     "checks": [
       { "key": "voter_active", "passed": true },
       { "key": "voter_not_yet_voted", "passed": true },
       { "key": "election_active", "passed": true },
       { "key": "voter_not_barred", "passed": true }
     ]
   }
   ```
6. Officer can proceed with decision (approve remote polling, etc.)

### Postconditions
- Eligibility status verified and displayed to officer
- No sensitive voter data exposed beyond what officer needs

---

## 11.4 Use Case: Audit Trail Review

### Actors
- **Primary:** System Auditor
- **Secondary:** Audit database

### Preconditions
- Auditor authenticated as SYSTEM_AUDITOR
- Operations have occurred and been recorded

### Flow

1. Auditor navigates to audit trail page
2. Auditor filters by:
   - Action (e.g., "voter.ballot.submitted")
   - Actor type (OFFICER, VOTER, SYSTEM)
   - Date range
   - Entity type (RemotePollingRequest, SubmittedBallot, etc.)
3. Frontend sends: GET /api/audit/records?action=...&startDate=...
4. Backend:
   - Validates auditor authorization
   - Queries AuditRecord table with filters
   - Returns records paginated
5. Frontend displays audit records:
   ```
   | Actor Type | Actor ID | Action | Entity Type | Entity Ref | Timestamp |
   |---|---|---|---|---|---|
   | VOTER | voter-uuid | voter.ballot.submitted | SubmittedBallot | ballot-ref | 2024-10-31 11:30 |
   | OFFICER | officer-uuid | officer.remote_polling.approved | RemotePollingRequest | request-id | 2024-10-31 11:05 |
   ```
6. Auditor can filter, sort, and export results

### Postconditions
- Audit trail is complete and immutable
- No sensitive data exposed (no passwords, OTPs, choices)
- Compliance and forensic investigation enabled

---

# Part 12: Testing & Validation

## 12.1 Testing Strategy

Vote Anywhere employs multiple testing layers:

### Unit Tests
- Test individual service and utility functions
- Test crypto functions (encryption, decryption, integrity verification)
- Test validators and error handling
- Coverage: ~80% of business logic

### Integration Tests
- Test complete workflows (e.g., ballot submission)
- Test database constraints (duplicate submission)
- Test authorization and rate limiting
- Coverage: critical paths

### Security Tests
- Verify ballot secrecy (no voter-choice joins in responses)
- Verify encryption/decryption works correctly
- Verify authentication and authorization enforced
- Verify rate limiting works
- Test malicious input (SQL injection, XSS attempts)

### API Tests
- Validate endpoints respond with correct schemas
- Verify authorization checks on protected routes
- Test error responses (4xx, 5xx)
- Test request/response contracts

## 12.2 Key Test Scenarios

### Ballot Secrecy Tests
```typescript
// Generate ballot request should NOT return voter ID
const response = await POST('/api/voters/ballots/generate');
expect(response.body).not.toHaveProperty('voterId');
expect(response.body).not.toHaveProperty('voterNumber');

// Ballot submit response should contain ONLY opaque reference
expect(response.body).toEqual({ ballotReference: expect.any(String) });
expect(response.body).not.toHaveProperty('candidateId');
expect(response.body).not.toHaveProperty('voterId');
```

### Duplicate Submission Tests
```typescript
// First submission succeeds
const result1 = await submitBallot(voterId, candidateId);
expect(result1.success).toBe(true);

// Second submission fails (database constraint)
const result2 = await submitBallot(voterId, candidateId);
expect(result2.error).toBe('Duplicate submission');
```

### Integrity Verification Tests
```typescript
// Stored ballot should verify as valid
const ballot = await db.submittedBallot.findUnique({ where: { ballotReference } });
const valid = ballotService.verifyIntegrity(ballot);
expect(valid).toBe(true);

// Tampered ballot should fail verification
ballot.ciphertext = Buffer.from('tampered-data');
const validAfterTamper = ballotService.verifyIntegrity(ballot);
expect(validAfterTamper).toBe(false);
```

### Authorization Tests
```typescript
// Non-SYSTEM_AUDITOR cannot access audit trail
const response = await GET('/api/audit/records', {
  headers: { Authorization: `Bearer ${voterToken}` }
});
expect(response.status).toBe(403); // Forbidden

// SYSTEM_AUDITOR can access audit trail
const response2 = await GET('/api/audit/records', {
  headers: { Authorization: `Bearer ${auditorToken}` }
});
expect(response2.status).toBe(200);
```

## 12.3 Deployment & Docker

### Docker Compose Setup

```yaml
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: vote_anywhere
      POSTGRES_PASSWORD: dev-password
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:dev-password@db:5432/vote_anywhere
      JWT_SECRET: dev-secret-key
      BALLOT_ENCRYPTION_KEY: <64-hex-chars>
    ports:
      - "3000:3000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

### Database Setup
```bash
# Apply migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### Running Development
```bash
# Start all services
docker-compose up

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

---

# Part 13: Reference & Appendices

## 13.1 Domain Glossary

**Actor:** An entity performing an operation—voter, officer, or system.

**Assignment:** See Remote Polling Assignment.

**Ballot:** The set of candidates presented to one voter for one election, generated from that voter's registered constituency. Contains no voter identifier.

**Ballot reference:** An opaque, random, non-sequential identifier used to refer to a submitted ballot. Carries no voter information.

**Ballot secrecy:** The property that no API response, log line, database view, or audit record ever places voter identity alongside candidate choice.

**Candidate:** A fictional contestant standing in exactly one constituency of one election.

**Candidate choice:** The selection a voter makes on a ballot. Stored only in encrypted form and never joined to voter identity.

**Constituency:** A geographical electoral division. Each polling centre belongs to exactly one constituency. Each voter is registered in exactly one constituency.

**Election:** A named contest with a start, an end, a set of constituencies, and a set of candidates. Lifecycle: CONFIGURED, ACTIVE, CLOSED.

**Election Simulator:** The single backend module that demonstrates polling-centre operations, ballot processing, and reconciliation. There is exactly one simulator, not a network.

**Eligibility verification:** The check that a voter is entitled to vote in a given election: active voter record, correct election, not already voted, not barred.

**Geographically mobile voter:** A voter who is away from their registered constituency during an election.

**Home polling centre:** The polling centre inside a voter's registered constituency, where they would vote by default.

**Officer:** One of four non-voter roles: Election Administrator, Verification Officer, Polling Centre Officer, System Auditor. Officers log in with username and password.

**Opaque ballot reference:** See Ballot reference.

**Polling centre:** A physical location where voting takes place. Belongs to exactly one constituency.

**Reconciliation:** The post-closure comparison of ballots issued against ballots recorded, per constituency. Produces a reconciliation report.

**Registered constituency:** The constituency a voter is enrolled in. It determines which ballot they receive. Fixed by the voter record and never derived from where they are voting.

**Remote polling centre:** An alternative polling centre, usually in a different constituency, that a voter asks to use because they are away from their registered area.

**Remote polling request:** A voter's submitted application to use a remote polling centre for a given election. Reviewed by a Verification Officer. Status: PENDING, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN, USED, EXPIRED.

**Remote polling assignment:** The approved result of a remote polling request. Grants the voter permission to appear at one named remote polling centre for one named election. Never alters their registered constituency or ballot.

**Voter:** A fictional person holding a record in the voter roll. Identified by voter ID internally or voter number publicly. Never by name alone.

---

## 13.2 Acronyms & Abbreviations

| Acronym | Expansion | Context |
|---|---|---|
| API | Application Programming Interface | Backend HTTP endpoints |
| AES | Advanced Encryption Standard | Ballot encryption algorithm |
| GCM | Galois/Counter Mode | Authenticated encryption mode |
| JWT | JSON Web Token | Session token format |
| OTP | One-Time Password | Mock voter authentication |
| PK | Primary Key | Database table identifier |
| FK | Foreign Key | Database relationship |
| RBAC | Role-Based Access Control | Authorization model |
| ECI | Election Commission of India | (Not used; mentioned for scope clarity) |

---

## 13.3 Key Code Examples

### Ballot Encryption

```typescript
// server/src/modules/ballots/crypto.ts
import crypto from 'node:crypto';

export function sealChoice(
  choice: CandidateChoice,
  context: { ballotReference: string; electionId: string; constituencyId: string }
): SealedChoice {
  const key = loadKey();  // 256-bit key from env
  const nonce = crypto.randomBytes(12);  // Fresh per ballot
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const aad = Buffer.from(
    `${context.ballotReference}|${context.electionId}|${context.constituencyId}`
  );
  cipher.setAAD(aad);
  
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(choice), 'utf8'),
    cipher.final(),
  ]);
  
  return {
    nonce: new Uint8Array(nonce),
    ciphertext: new Uint8Array(ciphertext),
    authTag: new Uint8Array(cipher.getAuthTag()),
  };
}
```

### Ballot Generation (Core Rule)

```typescript
// server/src/modules/ballots/service.ts
export const ballotService = {
  // The Core Rule: accept whole Voter, fetch from registeredConstituencyId
  async generateBallot(voter: Voter): Promise<Result<unknown>> {
    const election = await electionRepository.findCurrent();
    if (!election || election.lifecycle !== 'ACTIVE') {
      return err(409, 'CONFLICT', 'Election is not active');
    }
    
    // Candidates from REGISTERED constituency, never remote
    const candidates = await candidateRepository.findByConstituency(
      voter.registeredConstituencyId,
      election.id
    );
    
    return ok({ candidates });  // No voter ID in response
  }
};
```

### Audit Recording

```typescript
// server/src/modules/audit/service.ts
export const auditService = {
  async record(entry: AuditEntry): Promise<void> {
    // Never log passwords, OTPs, encryption keys, or choices
    try {
      await auditRepository.record(entry);
    } catch (error) {
      logger.error('Audit record write failed', {
        action: entry.action,
        // NO sensitive details logged
      });
    }
  }
};

// Usage
await auditService.record({
  actorType: 'VOTER',
  actorId: voterId,
  action: 'voter.ballot.submitted',
  entityRef: ballotReference,  // Opaque reference only
  // No choice, no password, no OTP
});
```

### Authorization Middleware

```typescript
// server/src/middleware/authorize.ts
export const requireRole = (...roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
authRouter.post(
  '/requests/:id/approve',
  authenticate,
  requireRole('VERIFICATION_OFFICER'),
  validate(approveRequestSchema),
  officerController.approveRequest
);
```

---

## 13.4 Security Checklist

Use this checklist when adding features or modifying security-critical code:

### Ballot Secrecy
- [ ] API response contains no voter ID alongside ballot data
- [ ] Audit record contains no decrypted choice
- [ ] No foreign key exists between VoterElectionStatus and SubmittedBallot
- [ ] Logs do not show voter ID and ballot reference together
- [ ] Database views do not join voter identity to candidate choice

### Ballot Integrity
- [ ] Ballots encrypted with AES-256-GCM (not just hash)
- [ ] Nonce is random and never reused (12 bytes per ballot)
- [ ] Authentication tag generated and verified (no tampering allowed)
- [ ] Integrity check returns boolean only (never decrypted choice)
- [ ] Audit record notes integrity verification (no choice shown)

### Authentication
- [ ] Passwords are bcrypt-hashed (never plaintext)
- [ ] OTPs are bcrypt-hashed (never plaintext)
- [ ] OTP has 5-minute expiry and is consumed on use (one-time)
- [ ] OTP has 5-attempt limit and becomes invalid after
- [ ] JWT tokens are backed by server-side Session records
- [ ] Sessions are revocable immediately (not just by expiry)

### Authorization
- [ ] All protected routes check role in backend middleware
- [ ] Frontend visibility is UI only, not security boundary
- [ ] Authorization middleware applies before business logic
- [ ] Role snapshot stored in Session (changes don't retroactively grant access)
- [ ] Audit records show who performed which action

### Data Protection
- [ ] Encryption key loaded from environment (never logged)
- [ ] Encryption key validated on load (fail-fast if invalid)
- [ ] Passwords, OTPs, keys never logged
- [ ] Decrypted choices never logged or audited
- [ ] Session tokens never logged (only session ID)

### Rate Limiting
- [ ] OTP issue rate-limited (5 per 15 min per voter)
- [ ] OTP verify rate-limited (5 attempts per challenge)
- [ ] Officer login rate-limited (10 per 15 min per username)
- [ ] Password change rate-limited (5 per 1 hour per officer)

---

## 13.5 References & Further Reading

### Encryption & Security
- NIST SP 800-38D: GCTR-GCM Authentication Encryption
- RFC 5116: AEAD Interface and Algorithms

### Authentication Best Practices
- OWASP: Authentication Cheat Sheet
- RFC 6234: US Secure Hash Algorithms

### Election Security (Concepts)
- "Election Security: What Every Policymaker Should Know" — Academic papers on electoral systems

### Project Documentation
- [README.md](../../README.md) — Project overview and quick start
- [GLOSSARY.md](../../GLOSSARY.md) — Domain vocabulary
- [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma) — Complete database schema
- [API Endpoints](../api/endpoints.md) — API reference

### GitHub Repository
- [Vote Anywhere GitHub](https://github.com/...) — Full source code and issue tracking

---

## 13.6 Conclusion

Vote Anywhere demonstrates a thoughtfully designed remote polling workflow that prioritizes voter enfranchisement, security, and auditability. The system enforces critical invariants at the database schema level (the registered constituency invariant, ballot secrecy separation), uses modern cryptography (AES-256-GCM), and maintains comprehensive audit trails for accountability.

The project is expressly an **academic prototype and workflow simulator**, not production election infrastructure. All electoral data is fictional. The goal is to educate and demonstrate how geographically mobile voters can be accommodated within a secure, auditable voting system.

For developers extending the system, always refer to the domain skills (`.cursor/skills/` or `.github/skills/`) and this documentation. The Core Rule—that a remote polling centre changes WHERE but not WHAT—is enforced at every layer: database schema, service signatures, API responses, and audit records.

---

**End of Documentation**

Generated: 2024  
Version: 1.0  
Status: Complete

