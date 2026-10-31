# Vote Anywhere - Diagrams Specification for pen.dev

This document specifies all diagrams needed for Chapter 4: System Design.

---

## 📐 DIAGRAM 1: System Architecture Diagram
**Section**: 4.2 System Architecture  
**Type**: Layered Architecture Diagram  
**Tool**: pen.dev (or draw.io)

### Description:
6-layer system architecture showing data flow from frontend to database.

### Layers (top to bottom):
```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: PRESENTATION LAYER (Frontend)                 │
│ ┌──────────────┬──────────────┬──────────────┐          │
│ │ Voter Portal │ Officer      │ Admin        │          │
│ │              │ Portal       │ Portal       │          │
│ └──────────────┴──────────────┴──────────────┘          │
└─────────────────────────────────────────────────────────┘
         │ REST API / JSON
         ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: API LAYER                                      │
│ ├─ Express.js Routes                                    │
│ ├─ Request/Response Handlers                            │
│ └─ JSON Serialization                                   │
└─────────────────────────────────────────────────────────┘
         │ Route Handling
         ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: MIDDLEWARE LAYER                              │
│ ├─ Authentication (JWT Verification)                   │
│ ├─ Authorization (Role-based Access Control)           │
│ ├─ Rate Limiting                                        │
│ └─ Error Handling                                       │
└─────────────────────────────────────────────────────────┘
         │ Request Processing
         ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 4: BUSINESS LOGIC LAYER                          │
│ ├─ Auth Module                                          │
│ ├─ Voter Module                                         │
│ ├─ Election Module                                      │
│ ├─ Remote Polling Module                               │
│ ├─ Ballot Module                                        │
│ └─ Audit Module                                         │
└─────────────────────────────────────────────────────────┘
         │ ORM Queries
         ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 5: DATA ACCESS LAYER                             │
│ ├─ Prisma ORM                                           │
│ ├─ Query Builder                                        │
│ ├─ Transaction Management                              │
│ └─ Connection Pooling                                   │
└─────────────────────────────────────────────────────────┘
         │ SQL Queries
         ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 6: DATABASE LAYER                                │
│ ├─ PostgreSQL Database                                  │
│ ├─ Tables & Constraints                                 │
│ ├─ Indexes                                              │
│ └─ Encrypted Storage                                    │
└─────────────────────────────────────────────────────────┘
```

### Key Elements to Include:
- Clear layer separation
- Bidirectional arrows showing data flow
- Technology names in each layer
- Color coding (Frontend: Blue, Middleware: Orange, Business: Green, Data: Purple, DB: Red)

---

## 📐 DIAGRAM 2: Data Flow Diagram - Authentication Flow
**Section**: 4.3 Data Flow Diagrams  
**Type**: Sequential Flow Diagram  
**Subsection**: 4.3.1 Authentication & Login Flow

### Process Steps:
```
START
  │
  ▼
┌─────────────────────┐
│ Voter Enters        │
│ Voter Number        │
│ (VA-XXXX)          │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ System Validates    │
│ Voter Number        │
│ in Database         │
└─────────────────────┘
  │ Valid?
  ├─ YES → ▼
  │     ┌──────────────┐
  │     │ Generate OTP │
  │     │ (6 digits)   │
  │     └──────────────┘
  │            │
  │            ▼
  │     ┌──────────────┐
  │     │ Send OTP to  │
  │     │ Contact      │
  │     │ (SMS/Email)  │
  │     └──────────────┘
  │            │
  │            ▼
  │     ┌──────────────┐
  │     │ Voter Enters │
  │     │ OTP Code     │
  │     └──────────────┘
  │            │
  │            ▼
  │     ┌──────────────┐
  │     │ Verify OTP   │
  │     │ (Time-bound) │
  │     └──────────────┘
  │            │ Valid?
  │            ├─ YES → ▼
  │            │     ┌──────────────┐
  │            │     │ Create JWT   │
  │            │     │ Token        │
  │            │     └──────────────┘
  │            │            │
  │            │            ▼
  │            │     ┌──────────────┐
  │            │     │ Return Token │
  │            │     │ to Voter     │
  │            │     │ (Session)    │
  │            │     └──────────────┘
  │            │            │
  │            │            ▼
  │            │     ┌──────────────┐
  │            │     │ Log Auth     │
  │            │     │ Event (Audit)│
  │            │     └──────────────┘
  │            │
  │            └─ NO → Display Error
  │
  └─ NO → Display Error
```

### Key Elements:
- Start → End flow
- Decision points (diamonds)
- Process boxes
- Error handling paths

---

## 📐 DIAGRAM 3: Data Flow Diagram - Ballot Submission
**Section**: 4.3 Data Flow Diagrams  
**Type**: Sequential Flow Diagram  
**Subsection**: 4.3.2 Ballot Encryption & Submission

### Process Steps:
```
START
  │
  ▼
┌──────────────────────────┐
│ Voter Selects Candidate  │
│ (Button Click)           │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ Display Confirmation     │
│ Dialog                   │
└──────────────────────────┘
  │ Confirm?
  ├─ YES → ▼
  │     ┌──────────────────────┐
  │     │ Prepare Ballot JSON  │
  │     │ {voterId, choice,    │
  │     │  electionId, ...}    │
  │     └──────────────────────┘
  │            │
  │            ▼
  │     ┌──────────────────────┐
  │     │ Encrypt Ballot       │
  │     │ AES-256-GCM          │
  │     │ + Generate IV/Tag    │
  │     └──────────────────────┘
  │            │
  │            ▼
  │     ┌──────────────────────┐
  │     │ Generate Ballot Ref  │
  │     │ (Opaque ID)          │
  │     └──────────────────────┘
  │            │
  │            ▼
  │     ┌──────────────────────┐
  │     │ Store Encrypted      │
  │     │ Ballot in Database   │
  │     │ + Integrity Hash     │
  │     └──────────────────────┘
  │            │ Transaction
  │            ├─ Success → ▼
  │            │       ┌──────────────────────┐
  │            │       │ Create Audit Entry   │
  │            │       │ (No ballot details)  │
  │            │       └──────────────────────┘
  │            │                │
  │            │                ▼
  │            │       ┌──────────────────────┐
  │            │       │ Return Ballot Ref    │
  │            │       │ to Voter             │
  │            │       │ (Confirmation)       │
  │            │       └──────────────────────┘
  │            │                │
  │            │                ▼
  │            │       ┌──────────────────────┐
  │            │       │ Display Success      │
  │            │       │ Message + Ref       │
  │            │       └──────────────────────┘
  │            │
  │            └─ Error → Rollback
  │
  └─ NO → Cancel (Return to Ballot)
```

### Key Elements:
- Encryption step highlighted
- Database transaction shown
- Audit logging (no ballot choice shown)
- Error handling

---

## 📐 DIAGRAM 4: Data Flow Diagram - Remote Polling Workflow
**Section**: 4.3 Data Flow Diagrams  
**Type**: Sequential Flow Diagram  
**Subsection**: 4.3.3 Remote Polling Request Workflow

### Process Steps:
```
START: VOTER SUBMITS REQUEST
  │
  ▼
┌──────────────────────────────┐
│ Voter Fills Remote Request   │
│ - Reason (work, travel, etc) │
│ - Preferred Centre           │
│ - Supporting docs (optional) │
└──────────────────────────────┘
  │
  ▼
┌──────────────────────────────┐
│ System Validates Request     │
│ - Check voter status         │
│ - Check centre availability  │
└──────────────────────────────┘
  │ Valid?
  ├─ YES → ▼
  │     ┌──────────────────────────┐
  │     │ Store Request in Queue   │
  │     │ Status: PENDING_REVIEW   │
  │     └──────────────────────────┘
  │              │
  │              ▼
  │     ┌──────────────────────────┐
  │     │ Notify Officer (Queue)   │
  │     │ About New Request        │
  │     └──────────────────────────┘
  │              │
  │              ▼
  │     ┌──────────────────────────┐
  │     │ OFFICER REVIEW STAGE     │
  │     │ Officer Views Request    │
  │     │ - Voter info             │
  │     │ - Eligibility check      │
  │     │ - Centre assignment      │
  │     └──────────────────────────┘
  │              │
  │              ├─ APPROVE → ▼
  │              │        ┌──────────────────┐
  │              │        │ Create Assignment│
  │              │        │ Voter → Centre   │
  │              │        │ Status: APPROVED │
  │              │        └──────────────────┘
  │              │                 │
  │              │                 ▼
  │              │        ┌──────────────────┐
  │              │        │ Notify Voter     │
  │              │        │ Send Details     │
  │              │        │ (Time, Location) │
  │              │        └──────────────────┘
  │              │
  │              └─ REJECT → ▼
  │                      ┌──────────────────┐
  │                      │ Send Rejection   │
  │                      │ with Reason      │
  │                      │ Status: REJECTED │
  │                      └──────────────────┘
  │
  └─ NO → Invalid
          Request Error


SUBSEQUENT: VOTER CHECKS IN
  │
  ▼
┌──────────────────────────────┐
│ Voter Arrives at Centre      │
│ On Scheduled Date/Time       │
└──────────────────────────────┘
  │
  ▼
┌──────────────────────────────┐
│ Polling Officer Verifies     │
│ - Identity check             │
│ - Eligibility confirmation   │
│ - Assignment verification    │
└──────────────────────────────┘
  │ Verified?
  ├─ YES → ▼
  │     ┌──────────────────────────┐
  │     │ Enable Ballot for Voter  │
  │     │ Generate Ballot          │
  │     │ Status: ENABLED_TO_VOTE  │
  │     └──────────────────────────┘
  │              │
  │              ▼
  │     ┌──────────────────────────┐
  │     │ Voter Casts Vote         │
  │     │ (Same as normal voting)  │
  │     └──────────────────────────┘
  │
  └─ NO → Deny Voting
          Status: CHECKOFF_FAILED
```

### Key Elements:
- Multi-stage workflow
- Decision points (Approve/Reject/Verify)
- Status transitions
- Notification flow

---

## 📐 DIAGRAM 5: Use Case Diagram
**Section**: 4.4 Use Case Diagram  
**Type**: UML Use Case Diagram

### Actors & Use Cases:
```
┌─────────────────────────────────────────────┐
│          VOTE ANYWHERE SYSTEM               │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │                                      │   │
│  │  Manage Elections (Admin)    ○       │   │
│  │  - Create Election                   │   │
│  │  - Add Candidates                    │   │
│  │  - Define Constituencies             │   │
│  │                                      │   │
│  │  Review Requests (Officer)   ○       │   │
│  │  - View Pending Requests             │   │
│  │  - Approve/Reject                    │   │
│  │  - Create Assignments                │   │
│  │                                      │   │
│  │  Check In Voters (Polling)   ○       │   │
│  │  - Verify Voter Identity             │   │
│  │  - Enable Ballot                     │   │
│  │                                      │   │
│  │  Cast Vote (Voter)           ○       │   │
│  │  - Login with OTP                    │   │
│  │  - Select Candidate                  │   │
│  │  - Submit Encrypted Ballot           │   │
│  │  - Request Remote Polling            │   │
│  │                                      │   │
│  │  View Audit Logs (Auditor)   ○       │   │
│  │  - Access Immutable Trail            │   │
│  │  - Generate Reports                  │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Actors (outside):                          │
│  ☐ Admin                                    │
│  ☐ Verification Officer                    │
│  ☐ Polling Centre Officer                  │
│  ☐ Voter                                    │
│  ☐ System Auditor                          │
│                                             │
└─────────────────────────────────────────────┘
```

### Connections:
- Admin ────→ Manage Elections, View Audit Logs
- Officer ───→ Review Requests, Approve/Reject
- Polling ───→ Check In Voters, Enable Ballot
- Voter ─────→ Cast Vote, Request Remote
- Auditor ───→ View Audit Logs

---

## 📐 DIAGRAM 6: Class Diagram
**Section**: 4.5 Class Diagram  
**Type**: UML Class Diagram

### Main Classes:
```
┌─────────────────┐
│     User        │
├─────────────────┤
│ - id            │
│ - username      │
│ - email         │
│ - passwordHash  │
│ - role          │
│ - createdAt     │
├─────────────────┤
│ + login()       │
│ + logout()      │
│ + updateProfile()
└─────────────────┘
      △
      │
      ├─┬───────────────────────────┐
      │ │                           │
┌─────┴──────┐            ┌────────┴────────┐
│  Voter     │            │  Administrator  │
├────────────┤            ├─────────────────┤
│ - voterId  │            │ - adminId       │
│ - constit │            │ - permissions   │
├────────────┤            ├─────────────────┤
│ + castVote()│            │ + createElection│
│ + requestRM()│           │ + manageVoters  │
└────────────┘            └─────────────────┘

┌──────────────────┐
│   Election       │
├──────────────────┤
│ - electionId     │
│ - name           │
│ - status         │
│ - startDate      │
│ - endDate        │
├──────────────────┤
│ + getCandidates()│
│ + getConstituencies│
└──────────────────┘
      △
      │ has many
      │
┌──────┴────────────┐
│   Candidate       │
├───────────────────┤
│ - candidateId     │
│ - name            │
│ - party           │
│ - constituency    │
├───────────────────┤
│ + getVoteCount()  │
└───────────────────┘

┌──────────────────────┐
│  Ballot              │
├──────────────────────┤
│ - ballotId           │
│ - electionId         │
│ - voterId (nullable) │
│ - encryptedChoice    │
│ - integrityHash      │
│ - createdAt          │
├──────────────────────┤
│ + verify()           │
│ + decrypt() [admin]  │
└──────────────────────┘
      △
      │ submitted by
      │
┌──────┴──────────────────────┐
│  RemotePollingRequest        │
├──────────────────────────────┤
│ - requestId                  │
│ - voterId                    │
│ - requestedCentre            │
│ - reason                     │
│ - status (PENDING/APPROVED)  │
│ - createdAt                  │
├──────────────────────────────┤
│ + submit()                   │
│ + approve()                  │
│ + reject()                   │
└──────────────────────────────┘

┌──────────────────────┐
│  AuditTrail          │
├──────────────────────┤
│ - auditId            │
│ - eventType          │
│ - actor              │
│ - timestamp          │
│ - details            │
│ - immutable          │
├──────────────────────┤
│ + log()              │
│ + getHistory()       │
└──────────────────────┘
```

### Relationships:
- User ──1──→ N ── Ballot (voter can cast multiple ballots in different elections)
- User ──1──→ N ── RemotePollingRequest
- Election ──1──→ N ── Candidate
- Ballot ──1──→ 1 ── Election
- All events logged to AuditTrail

---

## 📐 DIAGRAM 7: Entity Relationship Diagram (ERD)
**Section**: 4.6 Entity Relationship Diagram  
**Type**: ER Database Diagram

### Tables & Relationships:
```
users
├── id (PK)
├── username (UNIQUE)
├── email
├── passwordHash
├── role (ENUM: admin, officer, polling, auditor, voter)
├── createdAt
└── updatedAt

        │
        ├──→ voters
             ├── id (PK)
             ├── userId (FK)
             ├── voterId (UNIQUE)
             ├── name
             ├── registeredConstituencyId (FK)
             ├── status
             └── createdAt
             
                  │
                  ├──→ constituencies
                       ├── id (PK)
                       ├── name
                       ├── code
                       └── pollingCentres (1→N)

        ├──→ elections
             ├── id (PK)
             ├── name
             ├── description
             ├── status (ENUM: draft, active, closed, results_published)
             ├── startDate
             ├── endDate
             │
             ├──→ candidates (1→N)
             │    ├── id (PK)
             │    ├── electionId (FK)
             │    ├── name
             │    ├── party
             │    ├── constituencyId (FK)
             │    └── position
             │
             └──→ ballots (1→N)
                  ├── id (PK)
                  ├── electionId (FK)
                  ├── voterId (FK, nullable)
                  ├── encryptedChoice
                  ├── integrityHash
                  ├── createdAt
                  └── constraints:
                      └── UNIQUE(voterId, electionId) DEFERRABLE

        ├──→ remote_polling_requests (1→N)
             ├── id (PK)
             ├── voterId (FK)
             ├── requestedCentreId (FK)
             ├── reason
             ├── status
             ├── approvedAt
             ├── approvedBy (FK → users)
             ├── assignedCentreId (FK)
             └── createdAt

        ├──→ assignments
             ├── id (PK)
             ├── voterId (FK)
             ├── centreId (FK)
             ├── requestId (FK)
             ├── status
             └── createdAt

        └──→ audit_trail (1→N)
             ├── id (PK)
             ├── userId (FK, nullable)
             ├── eventType (ENUM)
             ├── resourceType
             ├── resourceId
             ├── changes (JSON)
             ├── timestamp
             └── immutable: true

polling_centres
├── id (PK)
├── name
├── address
├── constituencyId (FK)
└── officers (N→N with users)
```

### Key Constraints:
- `UNIQUE(voterId, electionId)` on ballots → Prevent duplicate votes
- `UNIQUE(username)` on users → Prevent duplicate accounts
- Foreign keys → Referential integrity
- Timestamps → Audit trail
- Nullable voterId in ballots → Ballot secrecy

---

## 🎨 STYLING GUIDELINES

### Colors:
- **Frontend/UI**: Blue (#3B82F6)
- **API/Middleware**: Orange (#F97316)
- **Business Logic**: Green (#10B981)
- **Data Access**: Purple (#8B5CF6)
- **Database**: Red (#EF4444)
- **External**: Gray (#6B7280)

### Line Types:
- Solid arrows: Data flow
- Dashed arrows: Optional/conditional
- Double arrows: Bidirectional

### Text:
- Bold: Important steps or components
- Italics: Optional elements
- Monospace: Code/database names

---

## 📋 DELIVERY CHECKLIST

Diagrams to Create (in order):
- [ ] System Architecture Diagram (4.2)
- [ ] Data Flow: Authentication (4.3.1)
- [ ] Data Flow: Ballot Submission (4.3.2)
- [ ] Data Flow: Remote Polling (4.3.3)
- [ ] Use Case Diagram (4.4)
- [ ] Class Diagram (4.5)
- [ ] Entity Relationship Diagram (4.6)

Format:
- [ ] PNG images (high resolution, 300 DPI for print)
- [ ] Embedded in HTML document
- [ ] Caption and explanation for each diagram
- [ ] Alternative text for accessibility

---

**Next Step**: Use pen.dev or draw.io to create these diagrams, then convert to PNG and embed in the new documentation structure.
