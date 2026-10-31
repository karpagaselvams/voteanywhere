import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

const tooMany = { error: 'Too many attempts, try again later' };

function bodyKey(field: string) {
  return (req: Request): string => {
    const value = (req.body as Record<string, unknown> | undefined)?.[field];
    return `${field}:${typeof value === 'string' ? value : ''}:${req.ip}`;
  };
}

// Officer login: capped per username and per IP.
export const officerLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: bodyKey('username'),
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// OTP issue: capped per voter number and per IP. Without an issue limit an
// attacker requests challenges until one lands on a guessable value.
export const otpIssueLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  keyGenerator: bodyKey('voterNumber'),
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// OTP verification: capped per challenge and per IP. The per-challenge
// attempt cap in the service remains the primary control.
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: bodyKey('challengeId'),
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// Password change verifies the current password, so it is a credential
// check: cap it per officer and per IP like login.
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: (req) => `password:${req.auth?.officerId ?? ''}:${req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});
