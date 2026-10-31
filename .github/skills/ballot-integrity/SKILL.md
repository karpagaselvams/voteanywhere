---
name: ballot-integrity
description: >-
  Encrypts submitted ballots with AES-256-GCM and verifies they have not been
  altered since submission. Use when encrypting or decrypting a candidate
  choice, storing a submitted ballot, designing integrity verification, or
  handling the ballot encryption key.
---

# Ballot Integrity

Integrity is the property that a submitted ballot can be shown not to have been altered since it was submitted. It is separate from secrecy, which is about who can see a choice — that is the `ballot-secrecy` skill.

## Why a hash alone is not integrity

The obvious design is to store the ballot and a hash of it, then recompute the hash to verify.

This establishes nothing. An attacker who can modify the stored ballot can almost always modify the stored hash in the same write, and the recomputed hash will match the tampered ballot. The check passes and reports healthy.

A hash detects accidental corruption. It does not detect tampering. Integrity requires something the attacker cannot forge without a key.

## Use AES-256-GCM

GCM is authenticated encryption: it produces an authentication tag alongside the ciphertext, and decryption fails if either the ciphertext or the associated data was altered. The tamper check is the decryption, not a separate comparison.

```ts
import crypto from 'node:crypto';

const key = Buffer.from(process.env.BALLOT_ENCRYPTION_KEY!, 'hex'); // 32 bytes

function sealChoice(choice: CandidateChoice, aad: Buffer) {
  const nonce = crypto.randomBytes(12);               // fresh, per ballot
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(choice), 'utf8'),
    cipher.final(),
  ]);
  return { nonce, ciphertext, tag: cipher.getAuthTag() };
}
```

Store the nonce and the authentication tag beside the ciphertext. They are not secret. Without them the ballot cannot be opened at all.

Bind the ballot's context into the associated data so a ciphertext cannot be moved between rows:

```ts
const aad = Buffer.from(`${ballotReference}|${electionId}|${constituencyId}`);
```

Now a ballot copied into another election or relabelled with a different constituency fails to authenticate, even though its ciphertext is untouched.

## Verification is a decryption attempt

```ts
// ❌ BAD — attacker rewrites ballot and storedHash together, check passes
const ok = sha256(stored.ciphertext) === stored.storedHash;

// ✅ GOOD — tag cannot be recomputed without the key
function verify(stored: StoredBallot): boolean {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, stored.nonce);
  decipher.setAAD(buildAad(stored));
  decipher.setAuthTag(stored.tag);
  try {
    decipher.update(stored.ciphertext);
    decipher.final();                  // throws on any tampering
    return true;
  } catch {
    return false;
  }
}
```

Verification returns a boolean. It must not return, log, or surface the decrypted choice — that is a secrecy violation. Keep decryption-for-verification and decryption-for-counting as separate functions so the verification path has no way to leak a choice.

## The key

Read it from `BALLOT_ENCRYPTION_KEY` as 64 hex characters, decoded to 32 bytes. Generate with `openssl rand -hex 32`.

Never hardcode it, never commit it, never default it, never log it, never return it from an endpoint, and never write it into an audit record. Fail fast at startup if it is missing or not 32 bytes — a silently truncated or zero-filled key is worse than a crash.

## Rules

- Never implement a cryptographic primitive by hand. Use `node:crypto`.
- A nonce is used exactly once per key. Generate with `crypto.randomBytes(12)`; never a counter, timestamp, or ballot reference.
- Never use AES-CBC or AES-ECB for ballots. They provide no authentication.
- Never compare secrets with `===`. Use `crypto.timingSafeEqual`.

Detailed rules and the required test cases: [crypto-rules.md](crypto-rules.md).
