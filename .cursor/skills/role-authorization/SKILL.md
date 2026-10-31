---
name: role-authorization
description: >-
  Enforces the five Vote Anywhere roles on backend routes, with the
  role-to-operation matrix as the single source of truth. Use when adding or
  changing a protected API route, deciding who may call an operation, or
  reviewing an authorization check.
---

# Role Authorization

Five roles: Election Administrator, Verification Officer, Polling Centre Officer, System Auditor, and Voter. The first four are collectively the officers.

Who may do what: [permissions.md](permissions.md). That matrix is the single source of truth. When code and matrix disagree, one of them is a bug — decide which, then fix it there rather than working around it at the call site.

## Backend enforcement, always

> Role permissions must be enforced by the backend, not only by hiding frontend pages or controls.

A hidden button is a usability choice. The endpoint behind it is the security boundary, and it is reachable with curl.

## Declare it on the route

```ts
// ❌ BAD — invisible in a route listing, easy to forget, hard to audit
router.post('/requests/:id/approve', async (req, res) => {
  if (req.user.role !== 'VERIFICATION_OFFICER') return res.status(403).end();
  ...
});

// ✅ GOOD
router.post('/requests/:id/approve', requireRole('VERIFICATION_OFFICER'), approveRequest);
```

Every route under `/api` except health and the login endpoints carries `requireRole(...)` or `requireVoter()`. A route with neither is a bug, whether or not it currently exposes anything sensitive.

## Ownership is not a role

A voter passing the role check still must not touch another voter's data. Resolve ownership from the authenticated session, never from input.

```ts
// ❌ BAD — any authenticated voter reads any voter's requests
const requests = await service.listRequests(req.params.voterId);

// ✅ GOOD
const requests = await service.listRequests(req.user.voterId);
```

Where a route genuinely takes a resource ID, the service verifies the resource belongs to the caller before returning or mutating it, and returns the same not-found response for "does not exist" and "not yours".

## Deny by default

`requireRole` takes an explicit allow-list. There is no wildcard, no "any officer" shortcut that silently includes a role added later, and no negative check.

```ts
// ❌ BAD — a new role automatically gains access
if (req.user.role !== 'VOTER') return next();

// ✅ GOOD
requireRole('ELECTION_ADMINISTRATOR', 'VERIFICATION_OFFICER')
```

## Separation of duties

The matrix encodes real separations. Preserve them.

- The System Auditor reads the audit trail and integrity results. It has no write access anywhere, and no ability to read ballots or voter personal data.
- The Election Administrator configures and closes elections but does not approve remote polling requests.
- The Verification Officer approves remote polling requests but does not configure elections.
- An officer who also holds a voter record may not act on their own request.

## Required tests

For each protected route:

- The permitted roles succeed.
- **Every other role receives 403.** Table-driven across all five roles, so adding a role to the matrix surfaces the gap.
- An unauthenticated request receives 401.
- A voter-scoped route with another voter's resource ID is refused.
- The 403 body reveals nothing about the resource's existence or contents.
