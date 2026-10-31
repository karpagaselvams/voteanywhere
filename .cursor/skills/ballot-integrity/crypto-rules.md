# Cryptographic Rules and Required Tests

Reference for the `ballot-integrity` skill.

## Algorithm choices

| Purpose | Use | Never use |
|---|---|---|
| Ballot encryption | AES-256-GCM | AES-CBC, AES-ECB, any unauthenticated mode |
| Officer passwords | bcrypt, cost 12 or higher | SHA-256, MD5, a bare hash of any kind |
| Random values | `crypto.randomBytes` | `Math.random`, `Date.now`, incrementing counters |
| Secret comparison | `crypto.timingSafeEqual` | `===`, `==`, `Buffer.equals` on secrets |
| Tokens and references | `crypto.randomBytes(16).toString('hex')` | UUID v1, sequential IDs, derived hashes |

Never write a cipher, a hash, a padding scheme, a key derivation, or a random generator by hand. Use `node:crypto`.

## Key handling

- `BALLOT_ENCRYPTION_KEY` is 64 hexadecimal characters, decoded to 32 bytes.
- Generate with `openssl rand -hex 32`.
- Validate at startup: present, hex, exactly 32 bytes after decoding. Throw and refuse to boot otherwise.
- The key is read in one module. Nothing else reads `process.env.BALLOT_ENCRYPTION_KEY`.
- The key never appears in a log, an error message, an API response, an audit record, a test fixture committed to the repo, or `.env.example`.
- `JWT_SECRET` follows the same handling rules.
- Development and production keys are different values. Rotating a key makes previously sealed ballots unreadable, which is expected and documented rather than worked around.

## Nonce handling

- 12 bytes, from `crypto.randomBytes(12)`, generated fresh for every seal operation.
- Never reuse a nonce under the same key. Nonce reuse in GCM is catastrophic: it leaks the XOR of two plaintexts and allows forgery of the authentication tag.
- Never derive a nonce from the ballot reference, the voter ID, a timestamp, or a counter.
- The nonce is stored in plaintext beside the ciphertext. That is correct; it is not a secret.

## Associated data

Bind each sealed ballot to its context so a ciphertext cannot be relocated:

```
aad = `${ballotReference}|${electionId}|${constituencyId}`
```

Build the associated data from one shared function used by both seal and open. If the two sides construct it differently, every verification fails.

## Separation of decryption paths

Two distinct functions, with distinct return types:

- `verifyBallot(stored): boolean` — used by integrity checks and the System Auditor flow. Returns only a boolean. It must be impossible for a choice to escape this path.
- `openBallotForCounting(stored): CandidateChoice` — used only by the counting routine inside the Election Simulator, and only after an election is closed.

Never let the verification path return, log, or otherwise expose the plaintext.

## Required tests

Each of these must exist and pass before an integrity feature is considered done.

| Test | Expected |
|---|---|
| Seal then open round-trip | Recovered choice equals the original |
| Flip one byte of ciphertext, then verify | `false` — decryption throws |
| Flip one byte of the authentication tag, then verify | `false` |
| Replace the nonce with a different valid nonce | `false` |
| Change `electionId` in the associated data | `false` |
| Change `constituencyId` in the associated data | `false` |
| Move a ciphertext onto a different ballot reference | `false` |
| Seal the same choice twice | Two different ciphertexts and two different nonces |
| Verify with a different key | `false`, and no key material in the thrown error |
| Startup with a missing or malformed key | Process throws; no default key is used |

The byte-flip tests are the ones that would catch a regression to hash-based verification. They are not optional.

## What integrity does not cover

Authenticated encryption protects a ballot's contents. It does not prove the ballot was submitted by an eligible voter, does not prevent a duplicate submission, and does not make the audit trail tamper-evident. Those are handled by `remote-polling-workflow`, `ballot-lifecycle`, and `audit-trail` respectively.

This is an academic prototype. Do not describe it as providing production election security.
