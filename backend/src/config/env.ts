import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Root .env first, then backend/.env may override for local tweaks.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // 64 hex chars (32 bytes) for AES-256-GCM. Validated where used by the
  // ballot module — not at boot, so an unset placeholder does not block
  // unrelated work.
  BALLOT_ENCRYPTION_KEY: z.string().optional(),
  // Plaintext officer password consumed only by the seed. Never logged,
  // never stored — the seed stores the bcrypt hash.
  SEED_OFFICER_PASSWORD: z.string().min(8).optional(),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(120),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  BCRYPT_COST: z.coerce.number().int().min(12).default(12),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
