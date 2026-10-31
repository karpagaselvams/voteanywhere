---
description: Module layering, validation, and authorization conventions for the Express backend
applyTo: "**/backend/**/*.ts"
---

# Backend Module Conventions

One directory per domain module under `src/modules/`: `auth`, `voters`, `elections`, `remote-polling`, `ballots`, `simulator`, `audit`.

## Layering

```
routes.ts      → paths, middleware chain, nothing else
schema.ts      → Zod schemas for body, params, query
controller.ts  → parse request, call service, shape response
service.ts     → all business rules; the seam tests target
repository.ts  → Prisma access
```

Controllers hold no business rules. Services never read `req` or write `res`. Prisma is only imported by repositories.

## Validation at the edge

Parse every body, param, and query with Zod in the route middleware. A service receives typed, validated input and never re-parses raw request data.

## Authorization in middleware

```ts
// ❌ BAD — role check buried in the handler
if (req.user.role !== 'VERIFICATION_OFFICER') return res.status(403).end();

// ✅ GOOD — declared on the route, visible in review
router.post('/requests/:id/approve', requireRole('VERIFICATION_OFFICER'), approve);
```

Every route under `/api` except health and login declares either `requireRole(...)` or `requireVoter()`.

## Responses and errors

Return domain errors as typed results from services; translate them to status codes in one error middleware, not with scattered `res.status` calls. Never include a stack trace, a Prisma error, or a database constraint name in a response body.

## Logging

Log the actor and the operation, never the payload. No password, OTP, token, encryption key, or candidate choice reaches a log line.