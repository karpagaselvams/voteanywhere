# Vote Anywhere

A BCA final-year academic project that simulates a remote polling workflow for geographically mobile voters. A voter requests permission to vote at an alternative polling centre while keeping their registered constituency and election eligibility.

Full specification: [README.md](README.md). Domain vocabulary: [GLOSSARY.md](GLOSSARY.md) — use those terms in identifiers, tests, and conversation.

## The Core Rule

**A remote polling centre changes where a voter votes. It never changes the voter's registered constituency or the ballot they receive.**

Every change to ballot generation, remote polling, or eligibility is measured against this. A voter registered in Chennai South who is approved to vote in Madurai receives the Chennai South ballot.

## Ballot secrecy

Voter identity and candidate choice stay separate. Use opaque ballot references. Never place a candidate choice next to a voter identifier in an API response, a log line, a database view, or an audit record. Never write a decrypted choice into an audit record.

## Academic scope guard

This is a workflow simulator built on fictional data. It does not connect to real electoral rolls, the Election Commission of India, Aadhaar, biometric services, or any government API, and it does not run real elections.

Do not write code, comments, documentation, or commit messages that claim the project provides distributed consensus, quorum, production election security, or certified election infrastructure. There is one Election Simulator, not a multi-node network.

## Stack

React + TypeScript + Vite + Tailwind 4 frontend, Node + Express + TypeScript backend, PostgreSQL 16 via Prisma 6, JWT auth, bcrypt password hashing, Docker Compose for development. Modular monolith: the Election Simulator is a backend module, not a separate service.

## Skills

Domain skills live in `.cursor/skills/` for Cursor and `.github/skills/` for GitHub Copilot. Reach for them by name.

| Skill | Use when |
|---|---|
| `constituency-invariant` | Touching ballot generation, remote polling, or anything that resolves a constituency |
| `ballot-secrecy` | Designing API responses, logging, database views, or audit records that involve ballots |
| `ballot-integrity` | Encrypting, storing, or verifying a submitted ballot |
| `ballot-lifecycle` | Generating, referencing, submitting, or deduplicating ballots |
| `remote-polling-workflow` | Building or changing the request, review, approval, or assignment flow |
| `voter-otp-auth` | Working on voter login, OTP issue, OTP verification, or rate limiting |
| `role-authorization` | Adding a protected route or deciding who may call something |
| `audit-trail` | Adding a state-changing operation that must be recorded |
| `election-simulator` | Working inside the simulator module or describing what it demonstrates |
| `prisma-data-layer` | Changing the schema, writing a migration, or editing the seed |

Two skills run only when you name them: `/va-new-module` scaffolds a backend domain module, and `/va-check-invariants` sweeps the codebase for invariant violations.

Generic engineering practice (test-driven development, code review, bug diagnosis) is not duplicated here. Those come from [mattpocock/skills](https://github.com/mattpocock/skills), installed separately.

## Standards

Always-on and file-scoped standards live in `.cursor/rules/`. They cover the core invariants, backend module layering, frontend portal structure, and Prisma discipline.
