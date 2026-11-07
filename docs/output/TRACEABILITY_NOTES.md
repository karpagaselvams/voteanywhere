# TRACEABILITY NOTES

**VOTE ANYWHERE: A Remote Polling System Simulator for Geographically Mobile Voters**

| | |
|---|---|
| **Candidate** | KARPAGA SELVAM S |
| **Register Number** | DC2431006010014 |
| **Degree** | Bachelor of Computer Applications (BCA) |
| **Report** | `docs/VOTE_ANYWHERE_PROJECT_REPORT.html` — 200 pages |
| **Repository** | `backend/` (TypeScript, Node 22, Express 4, Prisma 6) · `frontend/` (React 19, Vite 6) |

**Purpose.** This document maps every substantive technical claim in the report to the file, line or database object that supports it, so that an examiner can verify a statement rather than accept it. It also records the claims that were **corrected** during this traceability pass, because a report whose errors are silently fixed is less useful than one that shows where it was wrong.

**How to use it.** For any sentence in the report that seems too strong, look it up in the tables below. Every row gives the report location, the claim, and the artefact. Where the artefact is a file, the path is relative to the repository root.

---

## 1. Verification summary

| Check | Result | Method |
|---|---|---|
| Report page count | **200** (16 roman + 184 arabic) | `build.py` output |
| `<div class="page">` blocks emitted | **200** | `grep -o '<div class="page[ "]' \| wc -l` |
| Layout overflow | **0** pages | `fitcheck.py` — 152 fit, 48 tight, 0 overflow |
| Unsplittable atomic blocks | **0** | `flow.py` report during `build.py` |
| Figures indexed | **24** | Table of Contents snapshot |
| Tables indexed | **72**, numbered continuously 2.1 → 8.4 | Table of Contents snapshot |
| Automated tests present | **49** across 6 suites — matches §7.4 | `grep -c "it(" backend/tests/*.test.ts` |
| HTTP routes in source | **34** — matches Appendix B (corrected from "36") | `grep -ho "Router\.(get\|post\|delete\|patch)(" backend/src/modules/*/routes.ts \| wc -l` |
| Prisma models / enums | **14 / 4** — matches §4.7.2 | `grep -c "^model "`, `grep -c "^enum "` |
| Frontend pages / components | **14 / 12** — matches Chapter 5 | `ls frontend/src/pages` and `components` |
| HTML `<div>` balance | balanced in all three HTML files | open vs close count |
| Stray build placeholders | none (`{{PN}}`, `{{TOC}}`, `{{LOF}}`, `{{LOT}}`) | string search |
| Identity fields in all five deliverables | KARPAGA SELVAM S · DC2431006010014 · NOVEMBER 2026 · guide | string search per file |

**On the distinction between estimated and rendered layout.** The 200-page count is a *build-time* fact: 200 page blocks were emitted. The *fit* of each block inside A4 is an **analytic estimate** produced by `fitcheck.py`, calibrated against the two known-good reference documents in `sample_docs/`. No browser, print engine or PDF renderer was used anywhere in this process, because none is available in the build environment. A real print may paginate slightly differently. The estimate is a layout assurance, not a rendering proof.

---

## 2. Corrections made during this pass

Five claims were found to disagree with the source and were corrected in the report before submission. They are listed here rather than removed, because the discrepancy is itself evidence about how the report was verified.

| # | Where | Claim as first written | What the source actually shows | Correction applied |
|---|---|---|---|---|
| C-1 | §6.4.1, p. 128 | `generateBallot(voterId: string)` and a reconstructed body | `generateBallot(voter: Voter)` in `backend/src/modules/ballots/service.ts:21` | Listing replaced with the actual signature and body; §5.3.1 updated to explain why a whole `Voter` is stronger than an id |
| C-2 | §8.2.1, p. 161 | "thirty-six documented endpoints" | 34 route handlers across 9 `routes.ts` files | Changed to "thirty-four documented routes" |
| C-3 | Appendix B, p. 179 | `GET /elections` — any authenticated user | All five election routes require `ELECTION_ADMINISTRATOR` and are mounted at `/admin` | Row replaced with `/admin/elections`, and three missing administrator routes added (`/candidates`, `/centres`, `/reports`) |
| C-4 | §6.4.4, p. 130 | `// backend/src/middleware/requireRole.ts` | The file is `backend/src/middleware/authorize.ts` | Path corrected; `requireVoter` noted |
| C-5 | §6.2.2, p. 125 | `verifyBallot()` | The exported function is `verifyBallotIntegrity()` in `ballots/crypto.ts:81` | Name corrected |
| C-6 | §5.5.3, p. 121 | module files named `router.ts` | Files are `routes.ts` (and `controller.ts` in `auth/`) | Corrected |

**A note on C-1.** The correction strengthens rather than weakens the report's central argument. `generateBallot(voter: Voter)` is a stronger guarantee than `generateBallot(voterId: string)`: the function receives the voter record itself, so the registered constituency is read from an object the caller cannot construct differently, and there is no identifier parameter through which an alternative constituency could travel. The comment in the source states this explicitly.

---

## 3. Core Rule claims → source

The Core Rule is asserted in four places in the report. Each is traceable to a schema fact or a code fact.

| Report location | Claim | Artefact | How to verify |
|---|---|---|---|
| §4.6.3, p. 93 | `Voter.registeredConstituencyId` is the only enrolment | `backend/prisma/schema.prisma` → `model Voter` | Field is non-nullable; no other model stores a voter–constituency enrolment |
| §4.6.3, p. 93 | The assignment has **no** constituency column | `schema.prisma` → `model RemotePollingAssignment` | Model contains `requestId, voterId, electionId, pollingCentreId, assignedById` only |
| §4.6.4, p. 91 | Ballot constituency is written from the voter record | `ballots/service.ts` `submitBallot` | The write uses `voter.registeredConstituencyId`; no request parameter supplies it |
| §6.2.1, p. 124 | The ballot function cannot accept a constituency | `ballots/service.ts:21` | Signature is `generateBallot(voter: Voter)` |
| §6.4.1, p. 128 | Candidates are filtered by the registered constituency | `ballots/repository.ts` `findCandidates(electionId, constituencyId)` | The second argument comes from `voter.registeredConstituencyId` |
| §7.4.2, p. 144 | A test asserts the Core Rule | `backend/tests/ballots.test.ts` | The case named for the registered constituency; asserts every candidate shares the ballot's constituency |
| §6.5.9, p. 135 | A remote-cast ballot is counted in the home constituency | `simulator/service.ts` `reconcile` / `results` | Grouping is by `SubmittedBallot.constituencyId`, written from the voter record |

---

## 4. Ballot secrecy claims → source

| Report location | Claim | Artefact | How to verify |
|---|---|---|---|
| §4.5.2, p. 87 | `SubmittedBallot` has no voter attribute | `schema.prisma` → `model SubmittedBallot` | Fields: `ballotReference, electionId, constituencyId, nonce, ciphertext, authTag, submittedAt` |
| §4.5.2, p. 87 | No relation joins ballot to identity | `schema.prisma` | No `@relation` from `SubmittedBallot` to `Voter` or `VoterElectionStatus` |
| §6.2.2, p. 125 | AES-256-GCM with associated data | `ballots/crypto.ts` `sealChoice` | `createCipheriv('aes-256-gcm', …)`, `setAAD(...)`, 12-byte `randomBytes` nonce |
| §6.2.2, p. 125 | AAD binds reference, election, constituency | `ballots/crypto.ts` | Single `AAD()` helper used by seal, verify and open — one construction, not three |
| §6.2.2, p. 125 | Verification cannot disclose a choice | `ballots/crypto.ts:81` `verifyBallotIntegrity` | Returns `boolean`; plaintext is returned only by `openBallotForCounting` |
| §6.5.8, p. 134 | No response echoes the choice | `ballots/service.ts` `submitBallot` return | Returns the reference and timestamp only |
| §7.6, A10–A11, p. 148 | No choice in any response or audit record | `audit/service.ts`, all `routes.ts` | No candidate identifier is passed to the audit writer |

---

## 5. Concurrency and duplicate-ballot claims → source

| Report location | Claim | Artefact |
|---|---|---|
| §4.7.8, p. 99 | `UNIQUE (voterId, electionId)` on voting status | `schema.prisma` → `VoterElectionStatus` `@@unique([voterId, electionId])` |
| §4.7.9, p. 100 | Partial unique index limits active requests | `migrations/20261030175226_init/migration.sql`, lines ~284–288 |
| §6.2.3, p. 126 | Duplicate prevented by compare-and-set | `ballots/service.ts` — `updateMany` with `hasVoted: false` predicate, `count === 0` → `AlreadyVotedError` |
| §6.2.3, p. 126 | Identity, ballot and request status written in one transaction | `ballots/service.ts` — single `prisma.$transaction` |
| §7.3.1, p. 142 | Concurrent submissions yield exactly one ballot | `backend/tests/ballots.test.ts` — parallel submission case |
| §7.10, R1, p. 154 | A killed process leaves no half-state | Consequence of the transaction boundary; no separate test file |

**Caveat stated in the report.** The `Promise.all` concurrency test is described in §7.3.1 as an "illustrative form". The suite contains the case, but the exact code in the report is a redrawn illustration of it, not a line-for-line copy of `ballots.test.ts`. Where the report shows code, the distinction between *listing* (§6.4, §C) and *illustration* (§7.3.1) is stated in the text.

---

## 6. Authorization claims → source

| Report location | Claim | Artefact |
|---|---|---|
| §4.2.4, p. 75 | Deny-by-default allow-list | `middleware/authorize.ts` — `requireRole(...roles)` returns 403 when the role is absent from the list |
| §6.4.4, p. 130 | One route per action, explicit roles | `remote-polling/routes.ts` — claim/release/approve/reject are `VERIFICATION_OFFICER` only; the queue adds `POLLING_CENTRE_OFFICER` |
| Appendix B, p. 179 | Reconciliation restricted to two roles | `simulator/routes.ts` — `requireRole('ELECTION_ADMINISTRATOR','SYSTEM_AUDITOR')` |
| **§7.6, A20 / D-3, pp. 148, 156** | **Results route has no role gate** | `simulator/routes.ts` — the `GET /elections/:id/results` handler declares `authenticate` and `validate` but **no `requireRole`**. The comment above it reads "every role may read them." **Confirmed: the defect is real and the report describes it accurately.** |
| §7.6, A4, p. 148 | Another voter's record returns 404, not 403 | `remote-polling/service.ts` — ownership failure maps to not-found |

**On D-3.** The defect is documented in two places (the adversarial table and the defect register) and in §8.3.2 and §8.4.1. It is a deliberate omission from the fix list, not an oversight: the route is functional and the exposure is bounded (aggregates only, after closure). If the examiner asks why it was not fixed, the honest answer is that it was found late, recorded, and left rather than fixed without a re-run of the suite.

---

## 7. Authentication claims → source

| Report location | Claim | Artefact |
|---|---|---|
| §4.2.4, p. 75 | JWT verified **and** session row re-read | `middleware/authenticate.ts:12,30` — the file comment states "Verifies the JWT AND the server-side session record, so a revoked session …"; `findActiveSession(payload.jti)` runs on every request |
| §6.3.1, p. 128 | Uniform failure via a dummy hash | `auth/service.ts:38` — `DUMMY_HASH = bcrypt.hashSync('dummy-value-for-uniform-timing', 12)`, used at lines 55 (officer) and 100 (voter number) |
| §6.3.1, p. 128 | OTP single use, five-minute expiry, five attempts | `auth/service.ts`, `schema.prisma` → `OtpChallenge` |
| §5.1.4, p. 111 | Six-digit code from `crypto.randomInt` | `auth/service.ts:105` — `crypto.randomInt(100_000, 1_000_000).toString()` |
| §4.2.4, p. 75 | Rate limits 10/5/10/10 per 15 min | `middleware/rateLimit.ts` — four limiters, each `windowMs: 15 * 60_000`; `limit` values 10, 5, 10, 10; keys `username:<v>:<ip>`, `voterNumber:<v>:<ip>`, `challengeId:<v>:<ip>`, `password:<officerId>:<ip>` |
| §6.3.1, p. 128 | bcrypt at cost 12 | `config/env.ts:24` — `BCRYPT_COST: z.coerce.number().int().min(12).default(12)`; hashing calls use `env.BCRYPT_COST`, and the schema **rejects** a value below 12 at start-up |

---

## 8. Database claims → source

| Report location | Claim | Artefact |
|---|---|---|
| §4.7.2, p. 94 | 14 models, 4 enums | `grep -c '^model ' backend/prisma/schema.prisma` → 14; `grep -c '^enum '` → 4 |
| §4.7.10, p. 100 | Migration sizes 11 kB / 479 B | `wc -c` → `20261030175226_init/migration.sql` = **11,109 bytes**; `20261030191353_request_terminal_states/migration.sql` = **479 bytes** |
| §4.7.10, p. 100 | Second migration adds two enum values and `reviewNote`, in separate statements | `20261030191353_request_terminal_states/migration.sql` — two `ALTER TYPE` statements then `ADD COLUMN "reviewNote"`; the file carries Prisma's comment about PostgreSQL ≤ 11 |
| §4.7.1, p. 93 | Seven request statuses | `schema.prisma` → `enum RemotePollingRequestStatus` after both migrations |
| §4.6.2, p. 89 | Candidate composite FK to `ElectionConstituency` | `schema.prisma` → `Candidate` `@@unique` and relation fields |
| §4.6.3, p. 93 | Registered constituency never written by the workflow | No `update` on `registeredConstituencyId` exists in any repository; a property of the code, asserted by a test |

---

## 9. Test claims → source

| Report location | Claim | Artefact |
|---|---|---|
| §7.4.1, p. 143 | 15 / 11 / 8 / 6 / 5 / 4 = 49 cases | `grep -c "^\s*it(" backend/tests/*.test.ts` → exactly these counts |
| §7.2.1, p. 139 | Supertest against the imported app, no port bound | `app.ts` exports `createApp()`; `server.ts` calls `listen` |
| §7.2.1, p. 139 | Real PostgreSQL, no mocked Prisma | `tests/helpers.ts` — uses the real client and real login/OTP flows |
| §7.12, p. 158 | 13 defects, 10 fixed, 2 open, 1 accepted | Table 7.14 — D-1…D-13, with D-3 and D-9 marked open and D-13 accepted |

**What is *not* traceable, and is labelled as such in the report.** The timings in §7.7 (p. 151) were taken on the development machine and no log file is committed; they are reported as observations, and §8.3.3 states that they describe one user. The usability observations in §7.8 (p. 152) are a record of five sessions without instrumented data. Neither is presented as reproducible measurement.

---

## 10. Frontend and stack claims → source

| Report location | Claim | Artefact |
|---|---|---|
| §5.4.1, p. 116 | Dependency versions | `backend/package.json` |
| §5.4.2, p. 117 | Frontend dependency versions | `frontend/package.json` |
| §5.3.1, p. 114 | TypeScript 5.7 across both workspaces | both `package.json` files |
| §4.2.5, p. 76 | Vite proxy `/api` → 4000 | `frontend/vite.config.ts` |
| §5.5.1, p. 119 | 14 pages, 12 components | `frontend/src/pages` (5 + 4 + 4 + 1) and `frontend/src/components` (12 `.tsx`) |
| §6.5, pp. 131–136 | Nine screens | Figures 6.1–6.9. **These are layout mock-ups drawn in HTML inside the report, not captured images of a running browser.** See §11 below. |
| §5.2.1, p. 113 | Development machine specification | The machine on which the project was written; stated as specification, not measured |

---

## 11. Statement on screenshots

**No screenshot in this report is a captured image of a running application.** The nine screens in §6.5 are HTML layout reconstructions drawn with the report's own stylesheet — navbar, sidebar, cards, badges, stepper and tables — and each is labelled in the text as a layout with its data. They reproduce the data and structure of the verified run recorded in §7.5 (ST-1 to ST-5), but they are not photographs of a browser window.

This was a deliberate choice with three reasons, and it is stated here so that no examiner is misled:

1. **The rendering environment used to build this report has no browser.** No Chromium, Firefox or WebKit binary is present, and PDF/HTML rendering libraries could not be installed because the sandbox has no package network. Capturing a screenshot was therefore impossible in the environment where the report was assembled.
2. **A fabricated screenshot is worse than none.** Drawing a convincing browser window and presenting it as a capture would be a misrepresentation of evidence. A labelled layout reconstruction is honest about what it is.
3. **The underlying behaviour is verified elsewhere.** Section 7.5 records five end-to-end journeys with the observed outcome at each step, and Section 7.4 records 49 automated cases. The evidence for behaviour is the test record, not the picture.

**To replace the mock-ups with real captures**, run the stack and use the following procedure; the nine figures map one-to-one to routes.

```bash
# terminal 1
docker compose up -d
cd backend && npx prisma migrate dev && npx prisma db seed && npm run dev
# terminal 2
cd frontend && npm run dev     # http://localhost:5173
```

| Figure | Route | Sign in as | Action to capture |
|---|---|---|---|
| 6.1 Voter sign-in | `/login` | — | Voter tab, `VA-0001` typed |
| 6.2 Code entry | `/login` | — | The six-digit code screen |
| 6.3 Voter dashboard | `/voter` | `VA-0001` | After approval, so the stepper shows APPROVED |
| 6.4 Eligibility | `/voter/eligibility` | `VA-0001` | Four checks, all passing |
| 6.5 Request form | `/voter/request` | `VA-0001` | Centre list showing the constituency of each centre |
| 6.6 Review queue | `/officer` | `officer.verification` | One PENDING and one UNDER_REVIEW row |
| 6.7 Verification | `/officer/verification` | `officer.polling` | `VA-0001` looked up with a valid assignment |
| 6.8 Administration | `/admin` | `admin.asha` | Counts and the ACTIVE election row |
| 6.9 Reconciliation | `/admin/reports` | `admin.asha` | After closure: zero discrepancy, one ballot in Chennai South |

The development OTP is printed in the backend log, because no message gateway is connected; §8.3.1 records that as a deliberate exclusion.

---

## 12. Cross-document consistency

| Item | Main report | Project index | Front pages | Presentation | This file |
|---|---|---|---|---|---|
| Title | `VOTE ANYWHERE: A Remote Polling System Simulator for Geographically Mobile Voters` | same | same | same | same |
| Candidate | KARPAGA SELVAM S | same | same | same | same |
| Register number | DC2431006010014 | same | same | same | same |
| Guide | Dr. A. Thirumurthi Raja | same | same | same | same |
| Month and year | NOVEMBER 2026 | same | same | same | same |
| Chapter count | 8 + references + 4 appendices | 8 + references + 4 appendices | n/a | 8 | 8 |
| Page count | 200 | 200 | 6 extracted (i–vi) | cites 200 | 200 |
| Figures / tables | 24 / 72 | 24 / 72 | n/a | 4 figure and 8 table references, all valid | 24 / 72 |
| Chapter start pages | 1, 21, 38, 70, 109, 123, 138, 159 | identical | n/a | identical where cited | identical |

**Chapter start pages, verified against the generated Table of Contents:**

| Chapter | Start page | End page |
|---|---|---|
| 1 Introduction | 1 | 20 |
| 2 Literature Review | 21 | 37 |
| 3 System Analysis | 38 | 69 |
| 4 System Design | 70 | 108 |
| 5 Software and Hardware Requirements | 109 | 122 |
| 6 Implementation | 123 | 137 |
| 7 Testing | 138 | 158 |
| 8 Conclusion | 159 | 169 |
| References | 170 | 173 |
| Appendices A–D | 174 | 186 |

---

## 13. What this traceability pass cannot certify

1. **That the application runs in this environment.** The report describes a system whose dependencies (PostgreSQL, a Node runtime with the installed packages) are not started during document assembly. The claims about behaviour are traceable to source and to the test suite, not to a fresh execution performed while writing this file.
2. **That the layout renders as measured.** Page fit is estimated analytically by `fitcheck.py`, calibrated against the reference document, and enforced by `flow.py` during assembly. **No browser or PDF engine was used.** A real print may paginate slightly differently; the estimate is a layout assurance, not a rendering proof. This distinction is stated wherever the page count is asserted.
3. **That the timings are reproducible.** §7.7 reports observations from one machine, sequentially. No load generator was used and no log is committed.
4. **That the report is free of every error.** Six discrepancies were found and corrected in this pass (Section 2). The method was to compare each quantitative claim against its artefact; a claim with no artefact was either removed or restated as an observation. Claims of this kind that remain are listed in §9 and §13.

---

## 14. Reproduction commands

Run from the repository root.

```bash
# rebuild the report from its parts (200 pages)
cd docs/report_build && python3 build.py

# layout fit check: expect "OVERFLOW : 0"
python3 fitcheck.py ../VOTE_ANYWHERE_PROJECT_REPORT.html

# verify route count (expect 34)
grep -ho "Router\.\(get\|post\|delete\|patch\)(" backend/src/modules/*/routes.ts | wc -l

# verify test count (expect 49)
grep -h "^\s*it(" backend/tests/*.test.ts | wc -l

# verify the partial index exists in the migration
grep -n "one_active_per_voter_election" backend/prisma/migrations/*/migration.sql

# verify the assignment model has no constituency column
sed -n '/model RemotePollingAssignment/,/^}/p' backend/prisma/schema.prisma

# verify the results route has no role gate (defect D-3)
sed -n '/elections\/:id\/results/,/^);/p' backend/src/modules/simulator/routes.ts
```

---

## 15. Report build pipeline

The report is assembled from parts rather than hand-edited, so that page numbers, the Table of Contents, the List of Figures and the List of Tables are always consistent with the body.

| File | Role |
|---|---|
| `docs/report_build/style.css` | A4 page geometry, Times 12 pt body, certificate and front-page layout, figure boxes, screenshot chrome, print rules |
| `docs/report_build/head.html` | Document head and `<title>` |
| `docs/report_build/parts/*.html` | Source pages, one `<div class="page">` per authored page, with `<!--TOC:…-->`, `<!--FIG:n:title-->` and `<!--TAB:n:title-->` directives |
| `docs/report_build/flow.py` | Automatic paginator: splits authored pages at block boundaries to a measured budget, keeps tables and code listings atomic, splits over-tall tables and lists at row or item boundaries, re-packs content onto the tail of a split |
| `docs/report_build/build.py` | Assembles parts, collects directives, solves roman and arabic numbering to a fixed point, fills the generated lists, writes the report |
| `docs/report_build/fitcheck.py` | Estimates page fill and reports tight or overflowing pages |
| `docs/report_build/toc_snapshot.json` | Machine-readable snapshot of the final Table of Contents, used to keep this file and the project index in step |

**Why a fixed-point numbering loop.** Page numbers depend on how many pages the contents list itself occupies, which depends on how many entries there are, which depends on the content, which depends on the page numbers. The build iterates until the numbering stops changing, which is what makes the printed page numbers in the Table of Contents correct rather than approximately correct.

---

*Prepared November 2026 for the BCA viva examination. Every claim in this file is intended to be checked; where a check fails, the report is wrong and should be corrected rather than the note.*
