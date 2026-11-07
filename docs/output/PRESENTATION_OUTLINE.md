# PRESENTATION OUTLINE

**VOTE ANYWHERE: A Remote Polling System Simulator for Geographically Mobile Voters**

| | |
|---|---|
| **Candidate** | KARPAGA SELVAM S |
| **Register Number** | DC2431006010014 |
| **Degree** | Bachelor of Computer Applications (BCA) |
| **Department** | Computer Applications, Directorate of Distance Education |
| **Institution** | SRM Institute of Science and Technology, Kattankulathur 603 203 |
| **Guide** | Dr. A. Thirumurthi Raja, Assistant Professor |
| **Month and Year** | November 2026 |
| **Report** | `VOTE_ANYWHERE_PROJECT_REPORT.html` — 200 pages |

**Deck design.** 28 slides for a 20-minute viva presentation (about 40 seconds per slide), followed by a demonstration and a question bank. Slide numbers map to report chapters so an examiner can be sent to the page that supports a claim. Slides marked **[LIVE]** are best delivered from the running application; slides marked **[DIAGRAM]** reproduce a figure from the report.

**One-sentence thesis to repeat at least three times.** *A remote polling centre changes where a voter votes, never their registered constituency or their ballot — and this system enforces that with a database schema rather than with a validation check.*

---

## Slide 1 — Title

**Content:** Project title, candidate name, register number, degree, department, institution, guide, November 2026.

**Say:** "Good morning. I am Karpaga Selvam S, register number DC2431006010014. My project is Vote Anywhere, a remote polling system simulator for geographically mobile voters."

**Report:** page i.

---

## Slide 2 — The problem in one picture

**Content:** A map-style sketch: a voter registered in Chennai South, working in Madurai, and a polling centre 460 km away. One sentence: *the voter is enrolled, eligible, and effectively excluded.*

**Say:** "Elections require presence. A citizen who has moved for work, study or treatment cannot always travel back to the constituency where they are registered. They remain eligible, they remain on the roll, and they still do not vote."

**Report:** 1.1–1.3, pages 1–10.

---

## Slide 3 — Why this is not a trivial problem

**Content:** Three bullets, each with a number:
- The voter's ballot must not change because they moved.
- The choice must not be linkable to the voter.
- One person must not be able to vote twice.

**Say:** "Any remote voting scheme has to satisfy three things at once: the ballot stays the same, the vote stays secret, and the person votes once. Each is easy alone. Together they constrain the design."

**Report:** 1.3, pages 7–10.

---

## Slide 4 — Objectives

**Content:** Five numbered objectives, short form.

1. Model the complete administrative workflow of a mobile voter.
2. Enforce the Core Rule structurally.
3. Separate identity from choice at the schema level.
4. Prevent duplicate ballots under concurrency.
5. Record an auditable trail of every state change.

**Say:** "Five objectives. The second and third are the ones that shaped everything else."

**Report:** 1.4, pages 10–12.

---

## Slide 5 — Scope, stated as a boundary

**Content:** Two columns.

| In scope | Out of scope (deliberate) |
|---|---|
| Authentication, eligibility, request workflow | Real electoral roll |
| Approval and assignment | Aadhaar or biometric identity |
| Controlled ballot, sealed submission | SMS gateway |
| Verification at a centre | Blockchain or consensus |
| Reconciliation and aggregate results | Real election data of any kind |
| Audit trail | Cross-border key custody |

**Say:** "The right-hand column is a design decision, not an omission. This is a simulator, and the report says so on every page that could be misread."

**Report:** 1.5, pages 12–15.

---

## Slide 6 — The Core Rule

**Content:** One large sentence, boxed.

> **A remote polling centre changes *where* a voter votes. It never changes the voter's registered constituency, and it never changes the ballot the voter receives.**

**Say:** "This is the sentence the whole project is about. It appears in the specification, in the schema, and in the test that fails if the design drifts."

**Report:** 1.3, 4.6.3, 7.4.2.

---

## Slide 7 — Literature: what already exists

**Content:** Four cards.

- **Estonia i-Voting** — longest-running national system; separates vote collection from eligibility.
- **Swiss Post e-voting** — cryptographic proof of correctness; published for review.
- **NSW iVote** — operational failure modes under load.
- **India ETPBS / RVM** — the closest existing analogue to this workflow.

**Say:** "Every deployed system separates the question *may this person vote* from the question *what did they choose*. That separation is the idea this project borrows."

**Report:** 2.2, pages 22–31.

---

## Slide 8 — Research gaps that shaped the design

**Content:** Six gaps, compressed to three that matter:

1. Systems that claim verifiability rarely show how the identity/choice boundary is enforced in storage.
2. Academic prototypes assume an infrastructure a college project cannot have.
3. Blockchain proposals answer a trust question this project does not ask.

**Say:** "The gap I chose is narrow: can the boundary be enforced by structure alone, in a system a single developer can build and an examiner can attack?"

**Report:** 2.4, pages 34–37.

---

## Slide 9 — Existing system and its limitations

**Content:** Three current processes — A (in-person only), B (postal ballot), C (proxy) — and their limitations: travel cost, postal delay and lost ballots, coercion risk.

**Say:** "Postal balloting already solves reach. What it does not solve is speed, and what proxy voting does not solve is coercion."

**Report:** 3.1–3.2, pages 38–45.

---

## Slide 10 — Proposed system **[DIAGRAM: Figure 3.1]**

**Content:** System boundary: five roles, nine modules, one database. Outside the boundary: electoral roll, identity provider, message gateway.

**Say:** "Five roles, all authorised on the server. Nine modules in one process. One database, which is where the guarantees live."

**Report:** 3.3, pages 45–50; Figure 3.1, page 49.

---

## Slide 11 — Requirements at a glance

**Content:** Counts, not lists.

- 31 functional requirements (FR-01 … FR-31)
- 20 non-functional requirements (NFR-01 … NFR-20)
- 12 business rules (BR-01 … BR-12)
- 4 principal use cases

**Say:** "Sixty-three requirements, each traceable to a test or a manual step. The traceability table is in the report, not in my memory."

**Report:** 3.6, pages 58–69; Table 7.6, page 144.

---

## Slide 12 — Architecture **[DIAGRAM: Figure 4.1]**

**Content:** Three tiers. Presentation: React 19, Vite, Tailwind. Application: Node 22, Express 4, nine modules. Data: PostgreSQL 16, Prisma 6. Middleware chain listed along the request path.

**Say:** "A modular monolith, not microservices — because the approval and the assignment must be one transaction. A distributed transaction there would create exactly the failure the design exists to prevent."

**Report:** 4.2, pages 72–77; Table 4.2, page 72.

---

## Slide 13 — Data flow, and one missing arrow **[DIAGRAM: Figure 4.3]**

**Content:** Level 1 DFD. Highlight the space between the identity store and the choice store where no arrow is drawn.

**Say:** "This is a data flow diagram with an absence in it. Nothing flows between the identity store and the choice store, because a path between them would be a way to link a vote to a voter."

**Report:** 4.3.2, pages 81–83.

---

## Slide 14 — Class diagram: two absences **[DIAGRAM: Figure 4.7]**

**Content:** Class diagram with two callouts:
- `RemotePollingAssignment` — **no constituency attribute**
- `SubmittedBallot` — **no voter attribute**

**Say:** "The two most important facts in this diagram are things that are not there. An assignment names a centre, never a constituency. A ballot names a constituency, never a voter."

**Report:** 4.5, pages 85–88; Table 4.6, page 89.

---

## Slide 15 — The Core Rule, worked through **[DIAGRAM: Table 4.7]**

**Content:** The worked example table.

| Record | Value |
|---|---|
| Voter | VA-0001, registered **Chennai South** |
| Requested centre | **MDU-C-01**, Madurai Central |
| Assignment constituency | **does not exist** |
| Candidates on ballot | Kavin Raj (Lamp), Divya Nair (Book) — both **Chennai South** |
| Ballot counted towards | **Chennai South** |

**Say:** "A voter standing in Madurai receives the Chennai South ballot, and the ballot is counted in Chennai South. Nothing in the journey moved the enrolment."

**Report:** 4.6.4, page 91.

---

## Slide 16 — Database: four constraints that do the work

**Content:** Four call-out rows.

| Invariant | Enforced by |
|---|---|
| One ballot per voter per election | `UNIQUE (voterId, electionId)` |
| One active request per voter per election | **partial unique index** (raw SQL) |
| A candidate stands only where the election runs | composite FK → `ElectionConstituency` |
| An approved request has exactly one assignment | `UNIQUE requestId` + one transaction |

**Say:** "Three of these are PostgreSQL objects, not TypeScript checks. That matters because a check in code is correct only until two requests arrive together."

**Report:** 4.7.8–4.7.9, pages 99–100; Table 4.13, page 99.

---

## Slide 17 — The partial index

**Content:** The SQL, verbatim, and one sentence on why Prisma cannot express it.

```sql
CREATE UNIQUE INDEX "RemotePollingRequest_one_active_per_voter_election"
ON "RemotePollingRequest" ("voterId", "electionId")
WHERE "status" IN ('PENDING', 'UNDER_REVIEW');
```

**Say:** "A plain unique index would also forbid applying again after a rejection. An application check would lose a race. The partial index is the only correct instrument, and it is hand-written because Prisma cannot express a partial unique index."

**Report:** 4.7.9, page 100.

---

## Slide 18 — Algorithms: ballot generation

**Content:** The signature and the one line that matters.

```ts
generateBallot(voterId: string)
```

then

```ts
const constituency = voter.registeredConstituencyId;  // the ONLY source
```

**Say:** "The function takes a voter identifier and nothing else. There is no parameter in which a caller could ask for a different ballot. That is what enforcement by structure means."

**Report:** 6.2.1, page 124; 6.4.1, page 128.

---

## Slide 19 — Algorithms: sealing a choice

**Content:** AES-256-GCM, fresh 12-byte nonce, associated data binding.

```
aad = ballotReference | electionId | constituencyId
```

**Say:** "The associated data is the detail that stops a ciphertext being lifted from one ballot onto another. A transplanted ciphertext fails authentication, and that is tested."

**Report:** 6.2.2, page 125; Appendix D.3, page 184.

---

## Slide 20 — Duplicate prevention under concurrency

**Content:** Compare-and-set inside one transaction.

```ts
const marked = await tx.voterElectionStatus.updateMany({
  where: { voterId, electionId, hasVoted: false },
  data:  { hasVoted: true, votedAt: new Date() },
});
if (marked.count === 0) throw new AlreadyVotedError();
```

**Say:** "Four concurrent submissions, exactly one 201. Not because of a lock in my code, but because the predicate `hasVoted = false` can only succeed once."

**Report:** 6.2.3, page 126; 6.4.3, page 130; attempt A2, page 148.

---

## Slide 21 — Screens **[LIVE: 4 screens]**

**Content:** Four screenshots from the report, or a live walkthrough: sign-in → dashboard → controlled ballot → officer queue.

**Say:** "The ballot screen states the registered constituency above the candidates, because user testing found one participant who assumed the ballot belonged to the centre they attended."

**Report:** 6.5, pages 131–136; Figures 6.1–6.9.

---

## Slide 22 — Integration: one shared transaction

**Content:** The sequence table, compressed to the single exception: the ballot submission writes the identity side, the choice side, and the request status in one transaction.

**Say:** "This is the one place where a module writes another module's table, and it is deliberate: a ballot stored while the permission remains unspent is a worse outcome than a slightly blurred ownership line."

**Report:** 6.6.2, page 137; Table 6.3, page 136.

---

## Slide 23 — Testing: the numbers

**Content:** 49 automated cases in 6 suites; 5 system journeys; 20 adversarial attempts; 4 recovery scenarios; 13 defects, 10 fixed, 2 open, 1 accepted.

**Say:** "All 49 pass. Nineteen of the twenty adversarial attempts were prevented; the one that succeeded is recorded as defect D-3 and is still open."

**Report:** 7.4 and 7.12, pages 143–158; Tables 7.5 (p. 143) and 7.15 (p. 158).

---

## Slide 24 — The test that protects the design

**Content:** The Core Rule test, abridged.

```ts
expect(res.body.constituency.code).toBe('CHN-S');
expect(res.body.remoteAssignment.pollingCentre.code).toBe('MDU-C-01');
for (const c of res.body.candidates)
  expect(c.constituency.id).toBe(res.body.constituency.id);
```

**Say:** "The assignment points elsewhere while every candidate belongs to the voter's own constituency. If a future change passed the centre into ballot generation, this case fails."

**Report:** 7.4.2, page 144.

---

## Slide 25 — Defects: the honest slide

**Content:** Two open defects and one near-miss.

- **D-3** — results route authenticates but declares no role. *Open.*
- **D-9** — audit record written after the commit, so a committed transition can go unlogged. *Open.*
- **D-12** — the first schema draft gave the assignment a constituency column. *Fixed before any code was written.*

**Say:** "D-12 is the most useful entry. My own design review nearly removed the guarantee for the ordinary reason that the approval code would have been shorter."

**Report:** 7.11, pages 155–158; Table 7.14, page 156.

---

## Slide 26 — Limitations, stated plainly

**Content:** Three groups.

- **Excluded by design:** no real roll, no biometrics, no message gateway, no consensus.
- **Not yet implemented:** role on results route, key rotation, shared rate limiter, no frontend tests, no load test.
- **Not established by the evidence:** the system is not secure against an attacker holding both the database and the key; it has not been independently audited.

**Say:** "The third column matters most. What I can show is that the database alone cannot link a vote to a voter. I cannot show that the system is secure, and the report does not claim it."

**Report:** 8.3, pages 163–165; Tables 8.2 and 8.3.

---

## Slide 27 — Future work, ordered by value

**Content:** Eight near-term items with effort estimates, then three substantial ones.

1. Role on the results route (one line, one test).
2. Audit write inside the transaction.
3. Key identifier for rotation.
4. Shared rate-limit store.
5. Expired-row sweeper, cursor pagination, separate test database, end-to-end suite.
6. **Then:** threshold decryption (2-of-3), verifiable receipts, hash-chained audit.

**Say:** "Threshold decryption is the change that would most improve the security story, because it removes the single-key property that Section 8.3.3 identifies as the main weakness."

**Report:** 8.4, pages 165–167; Table 8.4, page 165.

---

## Slide 28 — Conclusion

**Content:** Three lines, no more.

1. The Core Rule is enforced by a signature and two schema absences — not by a check.
2. The identity and the choice are separated by a missing join path, and the separation is visible in four different models.
3. What is claimed is what was measured; what was not measured is written down.

**Say:** "As a college project the deliverable is a working application, a design that can be inspected, and a document that states its own boundaries. Thank you — I am happy to take questions."

**Report:** 8.1, page 159; 8.6, page 169.

---

# Demonstration Script (5 minutes)

Run before the questions, from a machine where the stack is already running.

| # | Action | What to point out |
|---|---|---|
| 1 | Sign in as `VA-0001` | The one-time code appears in the server log, because no gateway is connected. Say so. |
| 2 | Dashboard | Registered constituency and home centre are shown, not requested. |
| 3 | Eligibility check | Four named checks, not one boolean. |
| 4 | Submit a request for `MDU-C-01` | Then repeat it for `CHN-S-01` and show the refusal sentence. |
| 5 | Sign in as `officer.verification` | Claim, then approve. Show the assignment being created in the same action. |
| 6 | Back to the voter: controlled ballot | **The Chennai South candidates appear.** This is the Core Rule, live. |
| 7 | Submit, then reload | The reference is displayed, no choice echoed, reload refused. |
| 8 | As `admin.asha`: close the election | Open requests become EXPIRED; one audit record each. |
| 9 | Reconciliation | Discrepancy zero in both constituencies, with the ballot counted in Chennai South. |
| 10 | As `auditor.dev` | The trail shows actor, action and reference; no candidate identifier anywhere. |

**Fallback if the stack will not start:** use Figures 6.1–6.9 and the transcript of ST-1 in Section 7.5.1. Do not attempt to demonstrate an unrehearsed path.

---

# Question Bank

Grouped by the kind of question an examiner is likely to ask, with the answer and where it is supported.

### Design

**Q: Why did you not use microservices?**
A: Approval and assignment must be one transaction. A distributed transaction would introduce a state where a voter is approved but holds no assignment — the exact state the design prevents. See Table 4.2, page 72.

**Q: Where in the database is the Core Rule enforced?**
A: Three places. `Voter.registeredConstituencyId` is the only enrolment; `RemotePollingAssignment` has no constituency column; `SubmittedBallot.constituencyId` is written from the voter row. See 4.6.3, page 93.

**Q: What stops me linking a vote to a voter?**
A: The absence of a join path. `SubmittedBallot` has no voter column and no relation to any identity model. The only shared column is the election, which every voter shares. See 4.5.2, page 87.

### Security

**Q: Why AES-GCM rather than CBC?**
A: GCM authenticates as well as encrypts, so a modified ciphertext fails to decrypt rather than producing garbage. The associated data binds the reference, election and constituency. See 6.2.2, page 125.

**Q: Is the system secure?**
A: No, and the report does not claim it. An attacker holding both the database and the encryption key can decrypt every ballot. The design requires two distinct compromises rather than one, which is a meaningful reduction and a different claim. See 8.3.3, page 164.

**Q: How do you prevent username enumeration?**
A: A dummy bcrypt hash on the unknown-user path, so both paths take the same time, and an identical error body. Status codes alone would not have been enough. See 6.3.1, page 128.

### Testing

**Q: How do you know two simultaneous submissions cannot both succeed?**
A: A concurrent test issues four submissions and asserts exactly one 201 and one row. The guarantee is the unique index plus a compare-and-set update; the test passes because those are real, not mocked. See 7.3.1, page 142; A2, page 148.

**Q: What is not tested?**
A: The frontend has no automated suite, there is no load test, and the cryptographic implementation has not been independently reviewed. See 7.1.1, page 138; 8.3.3, page 164.

### Implementation

**Q: What happens if the process dies mid-submission?**
A: Nothing is half-written. Both the identity and the ballot are written in one transaction; recovery test R1 confirms the voter can vote again. See 7.10, page 154.

**Q: Why is there one hand-written SQL statement?**
A: Prisma cannot express a partial unique index, and a plain index would forbid re-applying after a rejection. See 4.7.9, page 100.

### Honest weaknesses

**Q: Which part of this would you fix first?**
A: The results route has no role gate (D-3). It is a one-line fix and it is inconsistent with every other route. Then the audit write ordering (D-9).

**Q: If you had another semester, what would you build?**
A: Threshold decryption and verifiable receipts — in that order, because they address the two claims the current system cannot make. See 8.4.2, page 166.

---

# Timing Plan

| Segment | Slides | Minutes |
|---|---|---|
| Problem, objectives, scope | 1–6 | 4 |
| Literature, gaps, existing system | 7–9 | 3 |
| Proposed system and requirements | 10–11 | 2 |
| Design (architecture, DFD, class, ER, database) | 12–17 | 5 |
| Implementation (algorithms, screens, integration) | 18–22 | 3 |
| Testing and defects | 23–25 | 2 |
| Limitations, future work, conclusion | 26–28 | 1 |
| **Presentation total** | | **20** |
| Demonstration | script above | 5 |
| Questions | question bank | 5–10 |

**If cut to 10 minutes:** keep slides 1, 6, 12, 15, 16, 20, 23, 25, 28 and run demonstration steps 4, 6 and 7 only.

---

# Delivery Notes

1. **Repeat the Core Rule.** It is the thesis, the design, the test and the conclusion. An examiner who remembers one sentence should remember that one.
2. **Never claim more than the evidence.** Say "nineteen of twenty attempts were prevented" rather than "the system is secure".
3. **Name the open defects before you are asked.** D-3 and D-9 cost nothing to disclose and everything to be caught concealing.
4. **Use report pages as citations.** Every claim in this outline carries a page number so that an answer can be verified live.
5. **Do not fabricate a screenshot.** If the stack is not running, use the figures in Chapter 6 and say that they are from the report's verified run.

---

*Prepared for the BCA viva examination, November 2026. Page references are to `VOTE_ANYWHERE_PROJECT_REPORT.html` (200 pages).*
