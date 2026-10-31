---
name: voter-otp-auth
description: >-
  Governs the mock OTP authentication flow for voters, including expiry, single
  use, attempt caps, rate limiting, and officer password login. Use when
  building or changing voter login, OTP issue or verification, session
  issuance, or authentication rate limits.
---

# Voter OTP Authentication

Two login paths. Officers use a username and bcrypt-hashed password. Voters use a mock OTP.

The OTP is simulated — no SMS, no email, no government service. It is still built with real discipline, because the point of the project is demonstrating the controls.

## Mock, honestly

In development the OTP is returned through a clearly marked development channel: a server log line guarded by `NODE_ENV === 'development'`, or a response field named so no one mistakes it for production behaviour.

```ts
// ❌ BAD — ships to any environment, and now the OTP is the response
return res.json({ otp });

// ✅ GOOD
if (env.NODE_ENV === 'development') logger.info('[DEV ONLY] mock OTP issued', { voterId, otp });
return res.json({ challengeId, expiresAt });
```

Never return an OTP from a production code path. Never log one outside the development guard.

## Storage

Store the OTP hashed, like a password. A development database dump should not hand over live credentials.

```ts
const otp = crypto.randomInt(100_000, 1_000_000).toString(); // 6 digits, CSPRNG
const record = {
  challengeId: crypto.randomBytes(16).toString('hex'),
  voterId,
  otpHash: await bcrypt.hash(otp, 12),
  expiresAt: new Date(Date.now() + 5 * 60_000),
  attemptCount: 0,
  consumedAt: null,
};
```

Never generate an OTP with `Math.random`. Never store it in plaintext, in a JWT, in a cookie, or in client-visible state.

## The four controls

**Expiry.** Five minutes. Check `expiresAt > now` on every verification. An expired challenge is rejected and deleted — do not merely mark it.

**Single use.** A successful verification sets `consumedAt` in the same transaction that issues the session. A consumed challenge is rejected on every later attempt, including a replay of the correct OTP.

**Attempt cap.** Five wrong attempts invalidate the challenge entirely. Increment `attemptCount` on every failure, including attempts against an already-invalid challenge, so an attacker learns nothing from timing or counting.

**Rate limit.** Cap OTP issue per voter and per IP, and cap verification attempts per challenge and per IP. Without an issue limit, an attacker requests challenges until one lands on a guessable value.

## Identical responses

Every failure — unknown voter, expired, consumed, wrong OTP, attempts exhausted — returns the same status and the same message.

```ts
// ❌ BAD — enumerates valid voter IDs, and tells an attacker when to stop
if (!voter) return res.status(404).json({ error: 'No such voter' });
if (expired) return res.status(400).json({ error: 'OTP expired, request a new one' });

// ✅ GOOD
return res.status(401).json({ error: 'Invalid or expired code' });
```

Compare the submitted OTP with `bcrypt.compare`, and run the comparison even when no challenge was found, against a dummy hash, so the response time does not reveal whether the voter exists.

## Officer login

bcrypt at cost 12 or higher. Same uniform failure response for an unknown username and a wrong password, with a dummy comparison on the unknown-username path. Rate limit per username and per IP. Never log the submitted password, not even on failure.

## Sessions

On success issue a JWT carrying the subject and role, with a short expiry. Never put an OTP, a password hash, a voter's personal data, or anything ballot-related in the token. Sessions must be revocable — keep a server-side record the middleware checks, so an officer's session can be ended without waiting for expiry.

## Audit

Record login success, login failure, OTP issued, and OTP verification failure, with the actor and timestamp. Never record the OTP itself, the hash, the password, or the token. See `audit-trail`.

## Required tests

- A correct OTP within the window authenticates and returns a session.
- The same correct OTP replayed is rejected.
- An OTP submitted after expiry is rejected.
- The sixth attempt is rejected even when the OTP is correct.
- Unknown voter, wrong OTP, expired, and consumed all produce an identical status and body.
- Exceeding the issue rate limit is refused.
- No test log or response in the suite contains a plaintext OTP or password.
