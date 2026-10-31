---
description: Schema, migration, and seed discipline for the Prisma data layer
applyTo: "**/prisma/**"
---

# Prisma Data Conventions

## Run everything through Docker

The backend container owns the development database connection. Running Prisma on the host risks pointing a migration at an unintended database.

```bash
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
```

## Migrations

Every schema change ships with a checked-in migration. Never edit an applied migration; add a new one. Review the generated SQL before committing — silent column drops and table rewrites show up there and nowhere else.

`prisma db push` is not used in this project.

## Constraints carry the rules

Invariants that must hold under concurrency live in the schema, not only in service code.

```prisma
model Ballot {
  // ✅ one ballot per voter per election, enforced by the database
  @@unique([voterId, electionId])
}
```

## Separation in the schema

A model that stores a candidate choice must not carry a voter foreign key. Link submitted ballots by their opaque ballot reference instead.

## Seeds

`seed.ts` creates fictional demonstration data only — invented voters, constituencies, polling centres, candidates, and elections. No real names, no real electoral data, no production credentials. Officer passwords in the seed are bcrypt-hashed like any other.