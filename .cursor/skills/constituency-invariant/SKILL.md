---
name: constituency-invariant
description: >-
  Enforces that a voter's ballot is always built from their registered
  constituency and never from their remote polling centre. Use when touching
  ballot generation, remote polling approval, eligibility checks, candidate
  lookup, or any code that resolves a constituency ID.
---

# The Constituency Invariant

This is the project's single most important rule. Everything else in Vote Anywhere is a workflow around it.

**A remote polling centre changes where a voter votes. It never changes the voter's registered constituency or the ballot they receive.**

| Attribute | Example |
|---|---|
| Registered constituency | Chennai South |
| Approved remote polling centre | Madurai |
| Ballot constituency | Chennai South |

The voter stands in a Madurai polling centre and is handed a Chennai South ballot. That is the whole product.

## The one rule in code

A constituency ID used to build a ballot has exactly one legal source: the voter's own record.

```ts
// ❌ BAD — the remote polling centre's constituency leaks into the ballot
const ballot = await buildBallot(assignment.pollingCentre.constituencyId, electionId);

// ❌ BAD — trusting a client-supplied constituency
const ballot = await buildBallot(req.body.constituencyId, electionId);

// ✅ GOOD — the only legal source
const voter = await voterRepository.findById(voterId);
const ballot = await buildBallot(voter.registeredConstituencyId, electionId);
```

The remote polling assignment answers "may this voter appear here?". It never answers "which ballot?".

## Where the invariant can break

Check each of these whenever you touch the ballot or remote polling modules.

- **Ballot generation** — the constituency argument comes from the voter record, not the assignment, not the request body, not the session.
- **Candidate lookup** — candidates are filtered by the ballot's constituency, which is the registered one. A Madurai candidate must never appear on a Chennai South ballot.
- **Eligibility verification** — eligibility is checked against the registered constituency's election, not the remote centre's.
- **Reconciliation** — a ballot cast at a remote polling centre counts toward the registered constituency's tally, not the centre's.
- **Approval** — approving a remote polling request writes an assignment. It must not write to any constituency field on the voter.
- **API responses** — a response that returns a ballot alongside a polling centre must not let a consumer infer the two are the same constituency.

## Guarding it structurally

Prefer designs where the mistake is hard to make rather than ones where it is merely forbidden.

- Give the ballot service a signature that accepts a `Voter`, not a loose `constituencyId: string`. A caller then cannot pass the wrong ID by accident.
- Keep `registeredConstituencyId` off any update payload type that a remote polling handler can reach.
- Name the two concepts distinctly everywhere: `registeredConstituencyId` on the voter, `pollingCentreId` on the assignment. Never a bare `constituencyId` in the remote polling module.

## The test that must exist

Every change to ballot generation or remote polling keeps this test green. It is the regression test for the Core Rule.

```
A voter registered in constituency A, with an approved remote polling
assignment to a polling centre in constituency B, receives a ballot whose
constituency is A and whose candidates are A's candidates.
```

Assert on both the ballot's constituency and its candidate list. Asserting only the constituency misses a candidate query that filtered by the wrong ID.

Write it through the service seam, following the `tdd` skill's guidance on seams. If the test does not exist when you arrive, write it before changing anything.

## Related

Ballot construction and submission mechanics live in the `ballot-lifecycle` skill. The approval flow that produces an assignment lives in `remote-polling-workflow`.
