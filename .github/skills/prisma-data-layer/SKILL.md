---
name: prisma-data-layer
description: >-
  Governs the Prisma schema shape, migration workflow through Docker, and seed
  rules for Vote Anywhere. Use when changing schema.prisma, writing or applying
  a migration, editing seed.ts, or adding a database constraint.
---

# Prisma Data Layer

PostgreSQL 16 behind Prisma 6. Prisma is reached only from repository files — see the `backend-modules` rule.

## Run through Docker

The backend container holds the development database connection. Running Prisma from the host risks pointing a migration at the wrong database.

```bash
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
docker compose exec backend npx prisma studio
```

The backend reaches PostgreSQL at the Compose service hostname `postgres` on port 5432. Only the browser uses `localhost`.

`prisma db push` is not used in this project. Every schema change produces a migration.

## The schema carries the rules

Invariants that must hold under concurrency belong in the database, not only in service code. A service check has a read-then-write gap; a constraint does not.

```prisma
model VoterElectionStatus {
  voterId    String
  electionId String
  hasVoted   Boolean @default(false)
  @@unique([voterId, electionId])    // one ballot per voter per election
}
```

Constraints this project needs:

- One ballot per voter per election — see `ballot-lifecycle`.
- At most one active remote polling request per voter per election, as a partial unique index over the active statuses — see `remote-polling-workflow`.
- A remote polling assignment is unique per voter and election.
- A candidate belongs to exactly one constituency in one election.

Translate a constraint violation into a domain error in the repository. The constraint name must never reach a response body.

## The secrecy boundary in the schema

The strongest guarantee of ballot secrecy is a schema in which the join does not exist.

```prisma
// identity side — records THAT a voter voted
model VoterElectionStatus { voterId String; electionId String; hasVoted Boolean }

// choice side — records WHAT was chosen; no voter field, no relation
model SubmittedBallot {
  ballotReference String @id
  electionId      String
  constituencyId  String
  nonce           Bytes
  ciphertext      Bytes
  authTag         Bytes
}
```

Never add a `voterId` to a choice-bearing model, and never add a Prisma relation between the two sides. A reviewer should be able to see the separation in the schema alone. See `ballot-secrecy`.

Likewise, `registeredConstituencyId` lives on the voter and nowhere else. An assignment has a `pollingCentreId` and no constituency field — see `constituency-invariant`.

## Migrations

Read the generated SQL before committing. Column drops and table rewrites are visible there and nowhere else, and a destructive migration against a seeded development database is a bad afternoon.

Never edit a migration that has been applied; add a new one. When adding a constraint to a table that already has data, ensure the existing rows satisfy it or the migration fails on apply.

```bash
docker compose down -v   # removes named volumes — deletes local database data
```

Use that only when a full reset is intentional.

## Seeds

`seed.ts` creates fictional demonstration data only: invented voters, constituencies, polling centres, candidates, and elections. No real names, no real electoral data, no production credentials.

Officer passwords in the seed are bcrypt-hashed like any other. Seeds never contain a plaintext password, an OTP, or an encryption key.

Make the seed idempotent with `upsert` so re-running it does not duplicate rows, and seed enough to exercise the Core Rule: at least two constituencies, a polling centre in each, and a voter registered in one with a remote polling request for the other.

## Required tests

Integration tests run against a real PostgreSQL test database. A mocked Prisma client cannot exercise a constraint or a transaction, so it cannot test any of the rules above.

- Each unique constraint rejects a duplicate under concurrent writes.
- A rolled-back transaction leaves no rows on either side of the secrecy boundary.
- The seed runs twice without duplicating rows.
