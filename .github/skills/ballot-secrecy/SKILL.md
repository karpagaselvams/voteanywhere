---
name: ballot-secrecy
description: >-
  Keeps voter identity separate from candidate choice across API responses,
  logs, database views, and audit records. Use when designing ballot
  endpoints, Prisma models that touch ballots, logging around voting, audit
  entries, or reconciliation and results output.
---

# Ballot Secrecy

The system must not allow anyone — an API consumer, a log reader, a database user, or an auditor — to learn how a given voter voted.

The rule is a separation rule, not an encryption rule. Encrypting a candidate choice that sits in a row next to a voter ID protects nothing once the key is available. See `ballot-integrity` for the encryption itself.

## The separation

Two kinds of data, never joined:

| Identity side | Choice side |
|---|---|
| voter ID, name, registered constituency | encrypted candidate choice |
| eligibility status, has-voted flag | opaque ballot reference |
| remote polling assignment | submission timestamp, constituency |

The identity side records **that** a voter voted. The choice side records **what** was chosen. Nothing links a specific row on one side to a specific row on the other.

```prisma
// ❌ BAD — the join exists in the schema, so it exists forever
model SubmittedBallot {
  id              String @id
  voterId         String
  encryptedChoice Bytes
}

// ✅ GOOD — two models, no foreign key between them
model VoterElectionStatus {
  voterId    String
  electionId String
  hasVoted   Boolean
  @@unique([voterId, electionId])
}

model SubmittedBallot {
  ballotReference String @id   // opaque, random, non-sequential
  electionId      String
  constituencyId  String
  encryptedChoice Bytes
}
```

## Opaque ballot references

A ballot reference is random and carries no information. Never derive it from a voter ID, never make it sequential, never make it a timestamp.

```ts
// ❌ BAD — reversible, or orderable, or both
const ref = hash(voterId + electionId);
const ref = `${electionId}-${submissionCount + 1}`;

// ✅ GOOD
const ref = crypto.randomBytes(16).toString('hex');
```

A sequential reference leaks order of arrival, which combined with a polling centre's queue is enough to identify a voter.

## Forbidden combinations

Never let these appear together in one place.

- **API response** — a voter identifier and a candidate choice, decrypted or not, in the same payload. This includes nested objects and `include` clauses on a Prisma query.
- **Log line** — a voter identifier and a ballot reference. Log the operation, not the linkage.
- **Database view or report query** — a join between the identity side and the choice side. If a view would need it, the feature is wrong, not the view.
- **Audit record** — a ballot reference beside the acting voter, or any decrypted choice. See `audit-trail`.
- **Error message** — a ballot reference in an error raised while a voter's session is identified.

## Results and reconciliation

Aggregate output is safe; per-voter output is not.

```ts
// ✅ GOOD — counts per candidate per constituency
{ constituencyId, candidateId, voteCount }

// ❌ BAD — anything with a cardinality of one voter
{ voterId, ballotReference }
```

Reconciliation compares ballots issued against ballots recorded as counts, per constituency. It never matches individual issuances to individual submissions.

## Review checklist

When reviewing a diff that touches ballots:

- [ ] No Prisma relation connects a voter model to a choice-bearing model.
- [ ] No `include` or `select` pulls choice data into a voter-scoped query, or the reverse.
- [ ] Every ballot reference in the diff is randomly generated.
- [ ] No new log statement receives both a voter identifier and ballot data.
- [ ] Audit calls in the diff pass an operation reference, not a ballot reference tied to an identified voter.
- [ ] Results endpoints return aggregates only.
