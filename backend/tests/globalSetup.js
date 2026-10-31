// Creates the test database (if missing) and applies all migrations.
// Integration tests run against real PostgreSQL — a mocked Prisma client
// cannot exercise a constraint or a transaction.
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.resolve(__dirname, '..');
const TEST_DATABASE_URL =
  'postgresql://vote_anywhere:vote_anywhere_dev@localhost:5432/vote_anywhere_test';

module.exports = async () => {
  try {
    execSync(
      'docker-compose exec -T postgres psql -U vote_anywhere -d vote_anywhere -c "CREATE DATABASE vote_anywhere_test"',
      { cwd: ROOT, stdio: 'pipe' },
    );
  } catch {
    // Database already exists.
  }
  execSync('npx prisma migrate deploy', {
    cwd: BACKEND,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
};
