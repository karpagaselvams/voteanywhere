// Test environment, loaded before any test module imports config/env.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://vote_anywhere:vote_anywhere_dev@localhost:5432/vote_anywhere_test';
process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1234';
process.env.SEED_OFFICER_PASSWORD = 'test-officer-password-1';
process.env.BALLOT_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
