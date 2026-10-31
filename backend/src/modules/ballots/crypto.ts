import crypto from 'node:crypto';
import { env } from '../../config/env';

// AES-256-GCM for ballot sealing. A hash alone is not integrity: an attacker
// who can rewrite a stored ballot can rewrite a stored hash in the same
// write. GCM's authentication tag cannot be recomputed without the key, so
// the tamper check is the decryption attempt itself.

let cachedKey: Buffer | null = null;

// Fail fast if the key is missing or malformed — a silently truncated or
// zero-filled key is worse than a crash. Never logged, never defaulted.
function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = env.BALLOT_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(
      'BALLOT_ENCRYPTION_KEY must be set to 64 hexadecimal characters (openssl rand -hex 32)',
    );
  }
  cachedKey = Buffer.from(hex, 'hex');
  return cachedKey;
}

export interface CandidateChoice {
  candidateId: string;
}

export interface SealedChoice {
  nonce: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
  authTag: Uint8Array<ArrayBuffer>;
}

// Bind the ballot's context into the associated data so a ciphertext cannot
// be moved between rows: relabelling election or constituency fails the tag.
function buildAad(ballotReference: string, electionId: string, constituencyId: string): Buffer {
  return Buffer.from(`${ballotReference}|${electionId}|${constituencyId}`);
}

export function sealChoice(
  choice: CandidateChoice,
  context: { ballotReference: string; electionId: string; constituencyId: string },
): SealedChoice {
  const nonce = crypto.randomBytes(12); // fresh per ballot, never reused
  const cipher = crypto.createCipheriv('aes-256-gcm', loadKey(), nonce);
  cipher.setAAD(buildAad(context.ballotReference, context.electionId, context.constituencyId));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(choice), 'utf8'),
    cipher.final(),
  ]);
  return {
    nonce: new Uint8Array(nonce),
    ciphertext: new Uint8Array(ciphertext),
    authTag: new Uint8Array(cipher.getAuthTag()),
  };
}

export interface StoredBallot {
  ballotReference: string;
  electionId: string;
  constituencyId: string;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  authTag: Uint8Array;
}

function open(stored: StoredBallot): CandidateChoice {
  const decipher = crypto.createDecipheriv('aes-256-gcm', loadKey(), Buffer.from(stored.nonce));
  decipher.setAAD(buildAad(stored.ballotReference, stored.electionId, stored.constituencyId));
  decipher.setAuthTag(Buffer.from(stored.authTag));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(stored.ciphertext)),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString('utf8')) as CandidateChoice;
}

// Verification is a decryption attempt that returns only a boolean. It never
// returns, logs, or surfaces the decrypted choice.
export function verifyBallotIntegrity(stored: StoredBallot): boolean {
  try {
    open(stored);
    return true;
  } catch {
    return false;
  }
}

// Counting happens only inside the Election Simulator, only after the
// election is closed. Kept separate from verification so the verification
// path has no way to leak a choice.
export function openBallotForCounting(stored: StoredBallot): CandidateChoice {
  return open(stored);
}
