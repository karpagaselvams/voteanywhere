---
name: va-check-invariants
description: >-
  Sweeps the Vote Anywhere codebase against its four hard invariants —
  constituency, ballot secrecy, one ballot per voter, and audit completeness —
  and reports every violation with file and line.
disable-model-invocation: true
---

# Check Invariants

A read-only sweep. It finds and reports; it does not fix. Run it before a merge, after a large change, and before submitting the project.

Report findings only. If the user asks for fixes afterwards, treat each one as its own change with its own test.

## How to run it

Work through the four sections below in order. Grep is the starting point in each, but a grep hit is a candidate, not a finding — open the file and read the surrounding code before recording anything.

Search `backend/src/`, `backend/prisma/`, and `frontend/src/`, wherever those live in the repo.

## 1. The constituency invariant

A ballot's constituency comes only from the voter's registered constituency. Reference: `constituency-invariant`.

Look for:

- Any constituency value reaching ballot generation from a remote polling assignment, a polling centre, a request body, a query parameter, or a session claim.
- A `constituencyId` field on a remote polling assignment model or type.
- Any write to `registeredConstituencyId` outside the seed.
- A candidate query filtered by a constituency that did not come from the voter record.
- A bare `constituencyId` parameter in the remote polling module.

Start from `registeredConstituencyId`, `constituencyId`, `pollingCentre`, `assignment`, and `buildBallot`. Then read every call site of the ballot generation function and trace its constituency argument back to its source.

**Also check the regression test exists**: a voter registered in A with an assignment to a centre in B receives A's ballot, asserting both the constituency and the candidate list.

## 2. Ballot secrecy

No voter identity ever sits beside a candidate choice. Reference: `ballot-secrecy`.

Look for:

- A `voterId` field or Prisma relation on any model that holds a choice, ciphertext, or ballot reference.
- A Prisma `include` or `select` pulling choice data into a voter-scoped query, or the reverse.
- A ballot reference derived from voter data, sequential, or timestamp-based rather than `crypto.randomBytes`.
- A log statement receiving both a voter identifier and ballot data.
- An API response, results endpoint, or report query exposing anything at single-voter cardinality.
- A verification function returning or logging a decrypted choice.

Start from `schema.prisma` and read the ballot models directly — the schema is where this invariant is won or lost. Then search `ballotReference`, `encryptedChoice`, `ciphertext`, `logger.`, and `console.`.

## 3. One ballot per voter per election

Enforced by a database constraint inside a transaction. Reference: `ballot-lifecycle`.

Look for:

- A missing `@@unique([voterId, electionId])` on the has-voted model.
- A submission path whose writes are not inside `prisma.$transaction`.
- A service-level has-voted check with no constraint behind it.
- A unique constraint name leaking into a response body.
- **A missing concurrency test.** Two submissions fired in parallel for the same voter and election, against a real PostgreSQL test database, expecting exactly one success. A mocked Prisma client cannot exercise this, so a test using one does not count.

## 4. Audit completeness

Every state-changing operation records who did what, when. Reference: `audit-trail`.

Look for:

- A service function that writes state with no audit call.
- An audit write outside the transaction that performs the change.
- A swallowed audit failure — a try/catch around the audit write that lets the operation continue.
- An audit record carrying a password, OTP, token, key, decrypted choice, or full request body.
- An audit record carrying both an identified voter and a ballot reference.
- Any update or delete path on the audit model, or an API route that writes one.

Enumerate every `prisma.$transaction` and every mutating repository function, then check each has a corresponding audit write. Working from the audit calls backwards finds only the operations that already have one.

## Reporting

Group by invariant, most severe first. One line per finding:

```
[1-CONSTITUENCY] backend/src/modules/ballots/service.ts:42
  Ballot built from assignment.pollingCentre.constituencyId.
  Must be voter.registeredConstituencyId.
```

Close with a one-line verdict per invariant — clean, or N findings — and list any required test that is missing entirely. A missing test is a finding in its own right, not a footnote.
