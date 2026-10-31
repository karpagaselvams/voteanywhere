---
name: va-new-module
description: >-
  Scaffolds a backend domain module for Vote Anywhere in the project's layered
  structure, wiring in the domain skills that apply and handing off to
  test-driven development at the service seam.
disable-model-invocation: true
---

# New Backend Module

Creates one domain module under `backend/src/modules/<name>/` following the project's layering. Run it when adding a module, not when adding a route to an existing one.

## Step 1: Agree the module

Before writing a file, settle these with the user. Ask; do not assume.

- **Name.** Singular or plural matching the existing modules (`auth`, `voters`, `elections`, `remote-polling`, `ballots`, `simulator`, `audit`). Use a term from [GLOSSARY.md](../../../GLOSSARY.md) — if the concept has no glossary entry, add one first.
- **Responsibility.** One sentence. If it needs two, it is two modules.
- **Operations.** The routes, and for each one which roles may call it.
- **Persistence.** Which Prisma models it owns, and which it only reads.
- **Seam.** Where tests attach. Default is the service interface.

State the operations and roles back to the user and get confirmation before continuing. Getting the role matrix wrong here is expensive to unpick later.

## Step 2: Load the applicable skills

Read the ones that apply before writing code, not after.

| If the module touches | Read |
|---|---|
| Ballots, constituencies, candidate lookup | `constituency-invariant` |
| Ballot storage, API responses, logs, views | `ballot-secrecy` |
| Encryption or integrity verification | `ballot-integrity` |
| Ballot generation, submission, duplicates | `ballot-lifecycle` |
| Requests, review, approval, assignments | `remote-polling-workflow` |
| Login, OTP, sessions | `voter-otp-auth` |
| Any protected route | `role-authorization` |
| Any state-changing operation | `audit-trail` |
| New or changed Prisma models | `prisma-data-layer` |

`role-authorization` and `audit-trail` apply to essentially every module.

## Step 3: Scaffold

```
backend/src/modules/<name>/
├── routes.ts        paths, middleware chain, nothing else
├── schema.ts        Zod schemas for body, params, query
├── controller.ts    parse request, call service, shape response
├── service.ts       all business rules — the test seam
├── repository.ts    Prisma access
├── errors.ts        typed domain errors
└── types.ts         module-local types
```

Create files with real signatures and `throw new Error('not implemented')` bodies. Do not write working logic yet — that is step 5, and it happens test-first.

Each route carries `requireRole(...)` or `requireVoter()` from the start. A placeholder route with no guard tends to survive into the merge.

## Step 4: Update the permission matrix

Add every new operation to `permissions.md` in the `role-authorization` skill, with its row filled in for all five roles. The matrix and the routes change in the same commit.

If an operation is voter-scoped, mark it `own` and resolve the voter from the session in the controller.

## Step 5: Implement test-first

Hand off to the `tdd` skill at the service seam agreed in step 1. One vertical slice at a time: one failing test, one minimal implementation, repeat.

Before the first slice, confirm the seam with the user as `tdd` requires.

The authorization tests are table-driven across all five roles — see `role-authorization`. Tests that touch a constraint or a transaction run against a real PostgreSQL test database, not a mock.

## Step 6: Close out

- Every route has a guard.
- `permissions.md` matches the routes.
- Every state-changing operation writes an audit record inside its transaction.
- No new Prisma relation crosses the secrecy boundary.
- Terminology matches [GLOSSARY.md](../../../GLOSSARY.md).

Then run the `code-review` skill before committing.
