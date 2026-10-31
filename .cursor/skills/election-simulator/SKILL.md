---
name: election-simulator
description: >-
  Defines the scope, scenarios, and language boundaries of the single Election
  Simulator backend module. Use when working inside the simulator module,
  adding a failure or recovery scenario, building reconciliation or counting,
  or writing documentation about what the simulator demonstrates.
---

# Election Simulator

One simulator. It is a module inside the backend — `src/modules/simulator/` — not a service, not a node, not a network. A separate deployment is listed in the README as a possible future extension, and until that happens the module boundary is the design.

Its job is to demonstrate the remote polling workflow end to end, including what happens when things go wrong.

## What it demonstrates

- Mock polling-centre operations.
- Voter and remote polling assignment verification.
- Ballot generation and submission.
- Simulated ballot processing.
- Integrity verification.
- Controlled failure and recovery scenarios.
- Election reconciliation.

## Language boundaries

This is the part of the project most likely to be oversold. The simulator does not provide and must never be described as providing:

| Do not write | Reason |
|---|---|
| Node, peer, cluster, network | There is one module |
| Consensus, quorum, Byzantine fault tolerance | No consensus algorithm exists here |
| Distributed, replicated, high-availability | Nothing is distributed |
| Tamper-proof, unhackable, production-grade | An academic prototype proves none of this |
| Blockchain, immutable ledger | Not used |

This applies to code, identifiers, comments, commit messages, API docs, and the project report. Name things for what they are: `simulatePollingCentre`, not `pollingNode`.

A simulation passing does not establish that a real system would behave the same way. When reporting results, say what was simulated and under what assumptions.

## Scenarios

Each scenario is a named, reproducible function with a fixed seed, so a run can be repeated and compared.

**Happy path.** A voter with an approved remote polling assignment appears at the remote polling centre, is verified, receives a ballot built from their registered constituency, and submits it.

**Failure scenarios.** Each asserts the system refuses cleanly, leaves no partial state, and writes an audit record:

- Voter with no remote polling assignment appears at a remote polling centre.
- Voter with an assignment to a different polling centre.
- Voter who has already voted.
- Submission to an election that is not active.
- Database failure partway through a submission transaction.
- Two concurrent submissions for the same voter.
- Tampered ciphertext detected by integrity verification.

**Recovery scenarios.** After an interrupted submission, the system is consistent: either the ballot and the has-voted record both exist, or neither does. Never one without the other.

## Counting and reconciliation

Counting runs only after an election is closed, only inside this module, and only through `openBallotForCounting`. Results are aggregates per candidate per constituency, never per voter.

Reconciliation compares ballots issued against ballots recorded, as counts, per constituency. It never matches an individual issuance to an individual submission — that match is exactly what `ballot-secrecy` forbids.

A reconciliation report states both counts and the discrepancy. Report a discrepancy as a discrepancy; do not reconcile it away.

A ballot cast at a remote polling centre counts toward the voter's **registered** constituency. See `constituency-invariant`.

## Boundaries with other modules

The simulator orchestrates existing services. It does not reimplement them, and it does not reach past them into Prisma directly.

```ts
// ❌ BAD — bypasses every rule the services enforce
await prisma.submittedBallot.create({ data: { ... } });

// ✅ GOOD — exercises the real path, which is the point of simulating
await ballotService.submit({ voterId, electionId, pollingCentreId, choice });
```

A simulator that writes its own rows proves nothing about the system it is meant to demonstrate.

## Required tests

- Every scenario above runs to completion and asserts its expected outcome.
- Each failure scenario leaves the database in the state it started in, apart from the audit record.
- The recovery scenario asserts both tables agree.
- Reconciliation on a clean run reports zero discrepancy; on a seeded discrepancy it reports the true number.
- No simulator output contains a voter identifier beside a candidate choice.
