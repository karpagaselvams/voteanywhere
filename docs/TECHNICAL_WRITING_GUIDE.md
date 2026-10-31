# Technical Writing Guide: Vote Anywhere Documentation
## Human Rhythm & Best Practices for Academic Documentation

---

## 1. TECHNICAL WRITING PRINCIPLES

### 1.1 Core Philosophy: Write Like You're Teaching

Technical documentation should read like a conversation between an expert and a learner:
- **Clear before clever** — prefer simple words over complex jargon
- **Show before tell** — use examples and diagrams before abstract descriptions
- **Active voice** — "The system validates the request" not "The request is validated by the system"
- **Specific over general** — "Submits a ballot in <100ms" not "Submits quickly"

### 1.2 The Three-Part Structure (Human Rhythm)

Every section should follow this natural flow:

**Part 1: Why (Context)**
- What problem are we solving?
- Why does this matter?
- When would you use this?

**Part 2: What (Description)**
- What is this component/feature?
- What does it do?
- What are its boundaries?

**Part 3: How (Implementation)**
- How do you use it?
- How is it built?
- How does it connect to other parts?

**Example:**

```
❌ WRONG (Technical, no rhythm):
The Authentication Module implements JWT-based session management
using bcrypt password hashing and server-side session records,
enforcing role-based access control through middleware.

✅ RIGHT (Human rhythm):
When an officer logs in, Vote Anywhere needs to ensure they
are who they claim to be and grant them access to their role's
operations. The Authentication Module handles this by:
- Hashing passwords with bcrypt (never storing plaintext)
- Generating JWT tokens after successful login
- Validating tokens on every protected endpoint
- Revoking sessions when officers log out
This prevents unauthorized access while keeping the workflow fast.
```

---

## 2. WRITING CONVENTIONS

### 2.1 Tone and Voice

**✅ DO:**
- Use "we" for collaborative context ("We designed the system to...")
- Use "you" when addressing the reader directly ("You can submit a ballot...")
- Be honest about limitations ("This is a simulated OTP, not production-grade")
- Use active voice ("The voter submits a request" not "A request is submitted")
- Write as if explaining to a smart 10th-grade student

**❌ DON'T:**
- Use corporate jargon ("Leveraging synergistic methodologies")
- Assume the reader knows domain terms without explaining first
- Use passive voice to sound sophisticated
- Write overly formal or robotic documentation
- Use "obviously" or "simply" (these words hide explanations)

### 2.2 Structure and Flow

**Heading Hierarchy:**
- H1 (#) — Document title or major section
- H2 (##) — Main sections (e.g., "Architecture", "Modules")
- H3 (###) — Subsections (e.g., "Authentication Security")
- H4 (####) — Deep details (rarely needed)

**Never skip levels** — if you have H2, don't jump to H4.

**Table of Contents:**
Every document >1000 words should start with a TOC.

### 2.3 Emphasis Techniques

| Technique | Use For | Example |
|-----------|---------|---------|
| **Bold** | Important terms, UI elements, key concepts | "The **opaque ballot reference** prevents voter tracking" |
| `code` | Commands, file paths, variable names | "Set `JWT_SECRET` in `.env`" |
| > quotes | Definitions, important rules | "> A remote polling centre changes WHERE a voter votes" |
| Lists | Sequential or option choices | "Steps 1-5 below" or "Choose A, B, or C" |
| Code blocks | Commands, JSON, configuration | Fenced with triple backticks |
| Tables | Comparisons, reference data | Role permissions, API endpoints |

---

## 3. DOCUMENTING CODE AND ARCHITECTURE

### 3.1 Explaining Architecture

**❌ DON'T:**
```
The backend is Express.js middleware with Prisma ORM and PostgreSQL.
```

**✅ DO:**
```
Vote Anywhere's backend is built with three layers:

1. **HTTP Layer (Express.js)** — Receives requests from the frontend,
   validates inputs, and sends responses back
2. **Business Logic Layer (TypeScript modules)** — Enforces the rules
   of voting (e.g., "a ballot is always from registered constituency")
3. **Data Layer (Prisma + PostgreSQL)** — Stores voters, ballots,
   elections, and audit logs in a database

When a voter submits a ballot, it flows:
Voter clicks "Submit" → Express receives request → Business logic
checks eligibility → Prisma encrypts and stores → Database confirms
```

### 3.2 Explaining APIs

**Structure for every endpoint:**

```markdown
### GET /api/voters/:voterId/eligibility
Check whether a voter can participate in a specific election.

**Who can call:** Voters (themselves) or Verification Officers

**Request:**
- `voterId` (path): The voter's ID (e.g., "voter-123")
- `electionId` (query): Which election to check (e.g., "election-2026-01")

**Response (200 OK):**
```json
{
  "voterId": "voter-123",
  "electionId": "election-2026-01",
  "is_eligible": true,
  "reasons": ["Active voter", "Election is active", "Not already voted"]
}
```

**When to use:** After a voter logs in, before showing them the ballot

**Error cases:**
- 401 Unauthorized — Not logged in
- 404 Not Found — Voter doesn't exist
```

### 3.3 Explaining Data Models

**Structure for database entities:**

```markdown
## ballot_submissions Table

Stores ballots submitted by voters in specific elections.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| ballot_id | UUID | PRIMARY KEY | Unique identifier for this ballot record |
| voter_id | UUID | FOREIGN KEY | Links to voter; enables eligibility checks |
| election_id | UUID | FOREIGN KEY | Which election this ballot is for |
| ballot_reference | String | UNIQUE | Opaque ref for voters to track their ballot |
| encrypted_choice | BYTEA | NOT NULL | AES-256-GCM encrypted candidate choice |
| created_at | Timestamp | NOT NULL | When the ballot was submitted |
| CONSTRAINT | (voter_id, election_id) | UNIQUE | Prevents duplicate submissions |

**Why this design:**
- Encryption ensures candidate choices are never visible in plaintext logs or backups
- The UNIQUE constraint on (voter_id, election_id) makes duplicate submission impossible
- ballot_reference is opaque so observers can't link ballot to voter
```

---

## 4. COMMON DOCUMENTATION PATTERNS

### 4.1 Explaining a Workflow (Procedural Documentation)

**Pattern: Title → Steps → Diagram → Example**

```markdown
## Remote Polling Request Approval Workflow

When a voter requests permission to vote at a remote polling centre,
the system follows these steps:

1. **Submission** — Voter selects a remote centre and submits request
2. **Validation** — System checks voter is eligible and request is valid
3. **Queue** — Request enters officer review queue
4. **Review** — Officer examines voter details and remoteness
5. **Approval** — Officer approves (creates assignment) or rejects
6. **Notification** — Voter is notified of decision
7. **Usage** — Voter shows assignment at remote centre to vote

**Visual Flow:**
```
Voter Submits → Validation → Officer Reviews → Officer Approves
                     ↓            ↓                      ↓
                   Invalid     Rejected            Assignment Created
                    [STOP]       [STOP]              Voter Can Vote
```
```

### 4.2 Explaining a Constraint (Invariant Documentation)

**Pattern: Statement → Why → Example → Consequences**

```markdown
## The Core Invariant: Ballot Always From Registered Constituency

**Rule:** A voter's ballot is ALWAYS generated from their registered
constituency, never from where they physically vote.

**Why?** This ensures election integrity. A voter's voice is counted
in their home district, even if they vote elsewhere. It prevents
gaming the election by voting in multiple constituencies.

**Example:**
- Voter lives in: Chennai South
- Voter votes at: Madurai (remote centre)
- Ballot shows: Chennai South candidates (NOT Madurai candidates)

**Consequence:** If code generates ballots from remote centre location,
it violates this invariant and must be rejected in code review.

**How we enforce it:**
- Code review checklist includes invariant checks
- Database foreign keys link ballots to registered_constituency_id
- Tests verify ballots match registered, not remote, constituency
```

### 4.3 Explaining a Trade-off (Design Decision Documentation)

**Pattern: Decision → Alternatives → Chosen → Reasoning → Trade-offs**

```markdown
## Why Use Mock OTP Instead of Real SMS?

**Decision:** Voters authenticate using simulated OTP codes, not
actual SMS delivery.

**Alternatives Considered:**
1. Real SMS/email OTP (requires service provider, cost, complexity)
2. Hardcoded passwords (insecure, not realistic)
3. Mock OTP codes (simple, sufficient for learning, obvious it's simulated)

**Chosen:** Mock OTP with simulated 6-digit codes

**Reasoning:**
- This is academic project, not production election
- Real SMS costs money and adds infrastructure complexity
- Mock OTP teaches the authentication flow without infrastructure
- Obviously simulated, so evaluators know it's not production

**Trade-offs:**
- ✅ Simple to implement and test
- ✅ No external service dependencies
- ❌ Not production-ready (clearly marked as mock)
- ❌ Doesn't teach SMS integrations

**Relevant documentation:** See `/docs/MOCK_OTP_GUIDE.md`
```

---

## 5. VISUAL DOCUMENTATION

### 5.1 When to Use Diagrams

Use diagrams when:
- Explaining system architecture (information flows, layers)
- Showing workflows (process steps, decision points)
- Displaying relationships (database ER diagrams)
- Comparing alternatives (side-by-side structures)

**DON'T use diagrams to explain:**
- Simple concepts (use words instead)
- Code logic (use code examples)
- Sequential instructions (use numbered lists)

### 5.2 ASCII Diagrams (When Visual Tools Unavailable)

```markdown
## Database Relationships

┌─────────────┐        ┌──────────────┐        ┌────────────┐
│   Voter     │────→   │  Election    │   ←───│ Candidate  │
│             │        │              │       │            │
└─────────────┘        └──────────────┘       └────────────┘
       │                       │
       │                       │
       ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│ Remote Polling   │    │ Ballot           │
│ Request          │    │ Submission       │
└──────────────────┘    └──────────────────┘
```

### 5.3 Table Usage

Use tables for:
- Comparisons (roles, endpoints, features)
- Reference data (settings, configurations)
- Decision matrices (should we do X or Y?)

```markdown
| Component | Technology | Why | Limitation |
|-----------|------------|-----|-----------|
| Frontend | React | Modern, component-based | Requires Node build |
| Backend | Express.js | Lightweight, well-tested | Not for massive scale |
| Database | PostgreSQL | Reliable, ACID transactions | Costs at scale |
```

---

## 6. VOICE AND TONE FOR ACADEMIC DOCUMENTATION

### 6.1 Language Choices

| Formal | Conversational | Use |
|--------|----------------|-----|
| "Authenticate" | "Log in" | Both (context dependent) |
| "Initiate a session" | "Start a session" | Conversational |
| "Transmit encrypted data" | "Send encrypted data" | Conversational |
| "Leverage encryption" | "Use encryption" | Conversational |
| "Facilitate ballot integrity" | "Ensure ballots aren't changed" | Conversational |

**General rule:** Sound like a good textbook, not a corporate memo.

### 6.2 Sentence Structure

**Too long (hard to scan):**
```
The system, which implements a comprehensive authentication mechanism
including password hashing via bcrypt and JWT token generation,
ensures that only authenticated officers with appropriate role-based
permissions can access protected operations.
```

**Better (scannable):**
```
The system ensures only authenticated officers can access protected
operations. It does this by:
- Hashing passwords with bcrypt
- Generating JWT tokens after login
- Checking user role on every request
```

### 6.3 Paragraph Length

**Guidelines:**
- 3-5 sentences max per paragraph
- Use short paragraphs (80-120 words) for scanning
- Break up with bullet points or subheadings
- One idea per paragraph

---

## 7. ADDRESSING THE READER

### 7.1 "You" Statements (When Appropriate)

✅ **Good use:**
```
"When you implement remote polling, remember that the ballot
comes from the registered constituency, not the remote location."
```

❌ **Overuse:**
```
"You will find that you need to ensure that your code checks
that you are using you registered constituency in your ballot
generation in your implementation." (Too many "you"s)
```

### 7.2 Directed Advice

**For developers:**
```
**If you're implementing ballot encryption**, remember to:
1. Use the encryption key from environment variables
2. Generate a random IV for each ballot
3. Verify the authentication tag on decryption
4. Never log decrypted choices
```

**For evaluators:**
```
**To verify ballot integrity**, you can:
1. Query the audit log for encryption operations
2. Retrieve any submitted ballot by its opaque reference
3. Decrypt and verify the hash matches
4. Confirm no changes since submission
```

---

## 8. HANDLING TECHNICAL TERMS

### 8.1 First Mention Rule

**First time you mention a term:**
```
✅ GOOD:
"The system generates an opaque ballot reference (a random,
non-sequential ID that cannot be used to identify the voter)"

✅ ALSO GOOD (definition in sidebar or glossary):
"...opaque ballot reference (see Glossary: Opaque Ballot Reference)"
```

**Don't assume knowledge:**
```
❌ BAD:
"Ballot secrecy is ensured through AEAD cryptography"
(What's AEAD? Why does it ensure secrecy?)

✅ GOOD:
"Ballot secrecy is ensured using AES-256-GCM encryption.
GCM (Galois/Counter Mode) is a mode that detects if the encrypted
data has been tampered with after encryption."
```

### 8.2 Building a Glossary

Create a glossary (like `GLOSSARY.md`) for domain terms used repeatedly:
- One definition per term
- Use simple language
- Link to glossary from main documents
- Keep alphabetical order

---

## 9. WRITING FOR EVALUATION

### 9.1 What Evaluators Look For

| Aspect | What They Check | How to Excel |
|--------|-----------------|--------------|
| **Clarity** | Can they understand without asking questions? | Short sentences, examples, diagrams |
| **Completeness** | Does it cover the whole system? | Architecture, modules, testing, deployment |
| **Accuracy** | Are technical details correct? | Verify against actual code; get peer review |
| **Professionalism** | Does it read like expert documentation? | Consistent formatting, spell-check, proofreading |
| **Depth** | Does it show deep understanding? | Explain "why", not just "what" |

### 9.2 Document Checklist for Evaluators

```markdown
□ Executive summary (1 page)
□ Project objectives clearly stated
□ Architecture diagram with explanations
□ Each module described with purpose and key features
□ All user roles and permissions documented
□ Database schema with design justification
□ API documentation (endpoints, request/response)
□ Setup and deployment instructions
□ Security considerations addressed
□ Testing strategy and results
□ Known limitations and future work
□ Glossary of terms
□ References and appendices
□ Professional formatting and no spelling errors
```

### 9.3 Writing for Different Evaluators

**For Technical Evaluators:**
- Include architecture diagrams
- Explain design trade-offs
- Show code examples
- Discuss performance and security

**For Non-Technical HOD/Dean:**
- Start with what problem the project solves
- Use everyday language
- Include business value/impact
- Avoid deep technical jargon

**For Subject Matter Expert (SME):**
- Discuss security and integrity in detail
- Compare against best practices
- Acknowledge limitations honestly
- Suggest future research directions

---

## 10. COMMON PITFALLS AND HOW TO AVOID THEM

| Pitfall | Example | How to Avoid |
|---------|---------|--------------|
| **Assuming knowledge** | "Uses JWT tokens" | Explain what JWT is before using term |
| **Too technical** | "Implements RSA-4096 PKCS#1 v1.5 padding" | Explain in plain language why it matters |
| **Inconsistent terms** | Using "voter" and "user" interchangeably | Define terms in glossary, stick to them |
| **Vague explanations** | "The system is secure" | Explain specific security mechanisms |
| **Missing "why"** | "We use PostgreSQL" | "We use PostgreSQL because it's reliable and supports transactions" |
| **Wall of text** | 10 paragraphs with no breaks | Use headings, bullet points, spacing |
| **Outdated info** | References to deleted modules | Keep docs synced with code; date documents |
| **Unexplained acronyms** | "Uses AES-GCM encryption" | Spell it out first: "AES-GCM (Advanced Encryption Standard)" |

---

## 11. DOCUMENTATION MAINTENANCE

### 11.1 Keeping Docs Updated

**When code changes:**
1. Update relevant documentation within 24 hours
2. Update glossary if new terms introduced
3. Update architecture diagrams if structure changes
4. Add note about version/date change

**Checklist before committing code changes:**
```
□ Code changes are documented
□ README updated (if user-facing)
□ API docs updated (if endpoints changed)
□ Database schema doc updated (if schema changed)
□ GLOSSARY.md updated (if new terms)
□ Architecture diagram updated (if structure changed)
□ No references to deleted/renamed files
```

### 11.2 Documentation Review Checklist

Before sending to evaluators, ensure:

```markdown
## Formatting
□ Consistent heading hierarchy
□ No orphaned headings
□ Proper markdown syntax
□ Code blocks properly fenced
□ Links working and correct

## Content
□ No spelling or grammar errors
□ Consistent terminology
□ Definitions before jargon
□ Examples provided for complex concepts
□ All diagrams clear and labeled

## Completeness
□ All modules documented
□ All roles explained
□ All API endpoints listed
□ Setup instructions clear
□ Security discussed

## Professionalism
□ Date and version included
□ Table of contents present
□ Consistent voice/tone
□ Professional formatting
□ Appropriate level for target audience
```

---

## 12. TEMPLATE FOR NEW DOCUMENTATION

### For Modules:

```markdown
## [Module Name]

### Purpose
One sentence explaining what this module does and why it exists.

### Context
Brief explanation of the problem it solves. When would you use this module?

### Key Responsibilities
- Responsibility 1
- Responsibility 2
- Responsibility 3

### Technical Details
How it works, key algorithms, data structures, constraints.

### API / Endpoints
What can external code do with this module?

### Security Considerations
Any security implications of this module?

### Testing
How is this module tested? What's the coverage?

### Examples
Concrete example of using this module.

### Known Limitations
What doesn't it do? What's out of scope?

### Related Documentation
Links to glossary, other modules, external docs.
```

---

## CONCLUSION: The Art of Technical Writing

The best technical documentation reads like:

1. A **Knowledgeable friend** (conversational, not robotic)
2. A **Good textbook** (explanations before jargon)
3. A **Reference guide** (scannable, organized)
4. A **Thorough researcher** (complete, accurate, cited)

Write as if you're teaching someone smart who doesn't yet know this domain. That's the human rhythm.

---

**Remember:** Your documentation is often the first thing evaluators see. Make it count.

