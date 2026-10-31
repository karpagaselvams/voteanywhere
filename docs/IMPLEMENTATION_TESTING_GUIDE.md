# Implementation & Testing Guide
## Complete Instructions for Vote Anywhere Development

---

## 1. LOCAL DEVELOPMENT SETUP

### 1.1 Prerequisites

Before you begin, ensure you have the following installed:

```bash
# Check Node.js version (need 18.0.0 or higher)
node --version

# Check npm version (6.0.0 or higher)
npm --version

# Check Docker and Docker Compose
docker --version
docker-compose --version
```

If any are missing, install from:
- **Node.js:** https://nodejs.org/ (LTS version)
- **Docker:** https://www.docker.com/products/docker-desktop

### 1.2 Environment Variables

Create a `.env` file in the project root:

```bash
# Backend environment (.env at root)
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vote_anywhere
JWT_SECRET=your-secret-key-change-in-production
BALLOT_ENCRYPTION_KEY=your-encryption-key-32-bytes
PORT=3000

# Frontend environment (frontend/.env)
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Vote Anywhere
```

### 1.3 Step-by-Step Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd vote-anywhere

# 2. Install dependencies for both frontend and backend
npm install --workspaces

# 3. Start PostgreSQL and other services via Docker
docker-compose up -d

# 4. Run database migrations
npm run --workspace=backend prisma:migrate

# 5. Seed the database with test data
npm run --workspace=backend prisma:seed

# 6. Start backend development server
npm run --workspace=backend dev &

# 7. Start frontend development server (in new terminal)
npm run --workspace=frontend dev &

# 8. Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Admin Portal: http://localhost:5173/admin
```

**Verify Setup:**
```bash
# Check backend is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok"}
```

---

## 2. PROJECT STRUCTURE WALKTHROUGH

### 2.1 Backend Structure

```
backend/
├── src/
│   ├── server.ts              # Express app initialization
│   ├── app.ts                 # Express app configuration
│   ├── config/
│   │   ├── env.ts            # Environment variable validation
│   │   └── constants.ts       # Application constants
│   │
│   ├── middleware/
│   │   ├── auth.ts           # JWT validation middleware
│   │   ├── error.ts          # Error handling middleware
│   │   ├── cors.ts           # CORS configuration
│   │   └── rateLimit.ts      # Rate limiting setup
│   │
│   ├── modules/              # Domain-driven modules
│   │   ├── auth/             # Authentication
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── voters/           # Voter management
│   │   ├── elections/        # Election management
│   │   ├── remote-polling/   # Remote polling workflow
│   │   ├── ballots/          # Ballot handling
│   │   ├── audit/            # Audit logging
│   │   └── election-simulator/  # Simulation operations
│   │
│   ├── lib/
│   │   ├── encryption.ts     # Ballot encryption utilities
│   │   ├── jwt.ts            # JWT utilities
│   │   └── validators.ts     # Zod validation schemas
│   │
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   │
│   └── types.d.ts            # Global type definitions
│
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Database seeding script
│
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test data
│
├── jest.config.js
├── tsconfig.json
└── package.json
```

### 2.2 Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   │
│   ├── portals/              # Portal-specific components
│   │   ├── voter/            # Voter portal
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── routes.tsx
│   │   │
│   │   ├── officer/          # Officer portal
│   │   └── admin/            # Admin portal
│   │
│   ├── components/           # Shared components
│   │   ├── auth/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── common/
│   │
│   ├── services/             # API clients
│   │   ├── api.ts            # Base API configuration
│   │   ├── auth.ts           # Auth API
│   │   ├── voters.ts         # Voter API
│   │   ├── elections.ts      # Election API
│   │   └── ...
│   │
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   │
│   ├── styles/               # Global styles
│   │   └── globals.css
│   │
│   └── hooks/                # Custom React hooks
│       ├── useAuth.ts
│       └── ...
│
├── public/                   # Static assets
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
└── package.json
```

---

## 3. RUNNING TESTS

### 3.1 Backend Test Suite

```bash
# Run all backend tests
npm run --workspace=backend test

# Run tests in watch mode (re-run on file changes)
npm run --workspace=backend test -- --watch

# Run specific test file
npm run --workspace=backend test -- auth.test.ts

# Run tests with coverage report
npm run --workspace=backend test -- --coverage

# Run only integration tests
npm run --workspace=backend test -- --testPathPattern=integration
```

### 3.2 Test Structure

Backend tests follow this pattern:

```typescript
describe('Authentication Module', () => {
  describe('Officer Login', () => {
    it('should authenticate officer with valid credentials', async () => {
      // Arrange
      const loginRequest = {
        username: 'officer@example.com',
        password: 'secure-password'
      };

      // Act
      const response = await authService.loginOfficer(loginRequest);

      // Assert
      expect(response.token).toBeDefined();
      expect(response.role).toBe('VERIFICATION_OFFICER');
    });

    it('should reject invalid credentials', async () => {
      // Arrange
      const loginRequest = {
        username: 'officer@example.com',
        password: 'wrong-password'
      };

      // Act & Assert
      await expect(authService.loginOfficer(loginRequest))
        .rejects
        .toThrow('Invalid credentials');
    });
  });
});
```

### 3.3 Test Coverage Goals

| Module | Target Coverage | Current Status |
|--------|-----------------|----------------|
| Authentication | 90% | ✓ Achieved |
| Ballot Encryption | 95% | ✓ Achieved |
| Remote Polling | 85% | ✓ Achieved |
| Authorization | 95% | ✓ Achieved |
| Audit Trail | 85% | ✓ Achieved |

**View coverage report:**
```bash
npm run --workspace=backend test -- --coverage --coverageReporters=html
open backend/coverage/index.html
```

---

## 4. DATABASE OPERATIONS

### 4.1 Database Migrations

Prisma manages schema changes through migrations:

```bash
# Create a new migration
npm run --workspace=backend prisma:migrate
# Follow the prompts, give it a meaningful name like "add_ballot_integrity_check"

# Apply migrations
npm run --workspace=backend prisma:migrate

# Reset database (⚠️ WARNING: Deletes all data)
npm run --workspace=backend prisma:migrate reset

# View migration status
npm run --workspace=backend prisma:migrate status

# Access database directly
npm run --workspace=backend prisma:studio
```

### 4.2 Database Seeding

Test data is created via `prisma/seed.ts`:

```bash
# Run seed script
npm run --workspace=backend prisma:seed

# Seed includes:
# - 3 test officers (Admin, Verification Officer, Polling Officer)
# - 20 fictional voters from various constituencies
# - 2 elections (upcoming and active)
# - Constituencies and candidates
# - Sample remote polling requests
```

**To add more test data**, edit `prisma/seed.ts`:

```typescript
// Example: Add a new voter
const voter = await prisma.voter.create({
  data: {
    voterId: 'voter-' + crypto.randomUUID(),
    name: 'Test Voter',
    registeredConstituencyId: constituency.id,
    isEligible: true
  }
});
```

### 4.3 Database Inspection

```bash
# View database schema
npm run --workspace=backend prisma:studio

# Query database directly
npm run --workspace=backend prisma db execute -- "SELECT * FROM voters LIMIT 5;"

# Export data to JSON
npm run --workspace=backend prisma db execute -- \
  "SELECT * FROM voters;" > voters.json
```

---

## 5. API DEVELOPMENT & TESTING

### 5.1 Adding a New Endpoint

**Step 1: Define the route and handler**

```typescript
// backend/src/modules/voters/voters.routes.ts
router.get('/voters/:voterId', authMiddleware, async (req, res) => {
  const { voterId } = req.params;
  
  // Validation
  if (!voterId) {
    return res.status(400).json({ error: 'voterId required' });
  }

  // Business logic
  const voter = await prisma.voter.findUnique({
    where: { voterId }
  });

  if (!voter) {
    return res.status(404).json({ error: 'Voter not found' });
  }

  res.json(voter);
});
```

**Step 2: Add integration test**

```typescript
// backend/tests/integration/voters.test.ts
describe('GET /api/voters/:voterId', () => {
  it('should return voter by ID', async () => {
    const response = await request(app)
      .get('/api/voters/voter-123')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.voterId).toBe('voter-123');
  });
});
```

**Step 3: Test in development**

```bash
# Start backend in dev mode
npm run --workspace=backend dev

# In another terminal, test the endpoint
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/voters/voter-123
```

### 5.2 Testing API Endpoints

**Using curl:**
```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/officer-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

# Use token in subsequent requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/voters/voter-123
```

**Using Postman:**
1. Import the collection from `/docs/postman_collection.json`
2. Set the `{{token}}` variable after login
3. Run requests from the collection

**Using Jest (recommended for CI/CD):**
```typescript
import request from 'supertest';
import app from '../src/app';

describe('Voter API', () => {
  let token: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/officer-login')
      .send({ username: 'admin', password: 'password' });
    token = loginRes.body.token;
  });

  it('GET /api/voters/:voterId returns voter', async () => {
    const res = await request(app)
      .get('/api/voters/voter-123')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.voterId).toBe('voter-123');
  });
});
```

---

## 6. FRONTEND DEVELOPMENT

### 6.1 Component Development Workflow

**Step 1: Create component file**

```typescript
// frontend/src/components/VoterCard.tsx
import React from 'react';

interface VoterCardProps {
  voterId: string;
  name: string;
  constituency: string;
  isEligible: boolean;
}

export const VoterCard: React.FC<VoterCardProps> = ({
  voterId,
  name,
  constituency,
  isEligible
}) => {
  return (
    <div className="border rounded-lg p-4 shadow">
      <h3 className="font-bold text-lg">{name}</h3>
      <p className="text-sm text-gray-600">ID: {voterId}</p>
      <p className="text-sm">Constituency: {constituency}</p>
      <p className={isEligible ? 'text-green-600' : 'text-red-600'}>
        {isEligible ? 'Eligible' : 'Ineligible'}
      </p>
    </div>
  );
};
```

**Step 2: Use in a page**

```typescript
// frontend/src/portals/officer/pages/VoterSearch.tsx
import { useState, useEffect } from 'react';
import { VoterCard } from '../../../components/VoterCard';
import { voterService } from '../../../services/voters';

export const VoterSearchPage = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    const results = await voterService.search(query);
    setVoters(results);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <input
        type="text"
        placeholder="Search voters..."
        onChange={(e) => handleSearch(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />
      <div className="mt-6 grid grid-cols-3 gap-4">
        {voters.map(voter => (
          <VoterCard key={voter.voterId} {...voter} />
        ))}
      </div>
    </div>
  );
};
```

**Step 3: Add styles**

```typescript
// Use Tailwind classes as shown above, or add custom CSS
// frontend/src/styles/globals.css

.voter-card {
  @apply border rounded-lg p-4 shadow hover:shadow-lg transition;
}

.voter-card h3 {
  @apply font-bold text-lg;
}
```

### 6.2 State Management with useAuth Hook

```typescript
// frontend/src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Usage in component:
import { useAuth } from '../hooks/useAuth';

export const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### 6.3 Styling with Tailwind CSS

```typescript
// All styling done with Tailwind utility classes
// frontend/src/components/Button.tsx

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}) => {
  const baseClasses = 'font-semibold rounded transition';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

---

## 7. BUILD AND DEPLOYMENT

### 7.1 Production Build

```bash
# Build frontend
npm run --workspace=frontend build
# Output in frontend/dist/

# Build backend
npm run --workspace=backend build
# Output in backend/dist/

# Verify builds
ls -la frontend/dist/
ls -la backend/dist/
```

### 7.2 Docker Deployment

```bash
# Build Docker images
docker-compose build

# Run containers
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop containers
docker-compose down
```

### 7.3 Environment Configuration for Production

```bash
# .env.production (DO NOT commit secrets)
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres-host:5432/vote_anywhere
JWT_SECRET=<very-long-random-secret>
BALLOT_ENCRYPTION_KEY=<32-byte-hex-key>
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

---

## 8. DEBUGGING AND TROUBLESHOOTING

### 8.1 Common Issues

**Issue: "Cannot find module" errors**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
npm install --workspaces
```

**Issue: Database connection error**
```bash
# Solution: Check PostgreSQL container
docker ps
docker logs <postgres-container-id>

# Ensure DATABASE_URL is correct
echo $DATABASE_URL
```

**Issue: PORT 3000 already in use**
```bash
# Solution: Use different port
PORT=3001 npm run --workspace=backend dev

# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

**Issue: Frontend can't reach backend**
```bash
# Solution: Check VITE_API_URL in frontend/.env
cat frontend/.env

# Test connectivity
curl http://localhost:3000/health
```

### 8.2 Debug Mode

```bash
# Run backend with debug logging
DEBUG=* npm run --workspace=backend dev

# Run with Node debugger
node --inspect dist/server.js
# Then open chrome://inspect in Chrome
```

### 8.3 Logging Best Practices

```typescript
// backend/src/lib/logger.ts
export const logger = {
  info: (msg: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`, data);
  },
  error: (msg: string, error?: Error) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, error);
  },
  debug: (msg: string, data?: any) => {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${msg}`, data);
    }
  }
};

// Usage
import { logger } from '../lib/logger';

logger.info('Voter authenticated', { voterId: 'voter-123' });
logger.error('Database query failed', error);
logger.debug('Processing remote polling request', requestData);
```

---

## 9. CODE QUALITY AND LINTING

### 9.1 Running Linters

```bash
# Lint backend
npm run --workspace=backend lint

# Lint frontend
npm run --workspace=frontend lint

# Fix linting issues automatically
npm run --workspace=backend lint -- --fix
npm run --workspace=frontend lint -- --fix

# Format code with Prettier
npm run --workspace=backend format
npm run --workspace=frontend format
```

### 9.2 Type Checking

```bash
# Check TypeScript types (no compilation)
npm run --workspace=backend typecheck
npm run --workspace=frontend typecheck

# Full build with type checking
npm run --workspace=backend build
npm run --workspace=frontend build
```

### 9.3 Pre-commit Hooks

```bash
# Install husky for pre-commit hooks
npm install husky --save-dev

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run typecheck"

# Now linting runs automatically before commit
git commit -m "Fix: ballot encryption"
# Linting runs automatically ✓
```

---

## 10. CONTINUOUS INTEGRATION

### 10.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm install --workspaces
      - run: npm run --workspace=backend prisma:migrate
      - run: npm run --workspace=backend test -- --coverage
      - run: npm run --workspace=frontend test
      - run: npm run --workspace=backend lint
      - run: npm run --workspace=frontend lint
```

### 10.2 Running CI Locally

```bash
# Simulate GitHub Actions locally with act
npm install -g act

# Run CI workflow
act

# Run specific job
act --job test
```

---

## 11. RELEASE CHECKLIST

Before deploying to production:

```markdown
## Pre-Release Checklist

### Code Quality
- [ ] All tests passing (npm test)
- [ ] No TypeScript errors (npm run typecheck)
- [ ] Linting passes (npm run lint)
- [ ] Code coverage >80%

### Documentation
- [ ] README.md updated
- [ ] API docs current
- [ ] Database schema documented
- [ ] Deployment instructions clear

### Security
- [ ] No hardcoded secrets in code
- [ ] Environment variables documented
- [ ] Security headers configured
- [ ] Dependencies audit clean (npm audit)

### Database
- [ ] Migrations tested locally
- [ ] Backup strategy defined
- [ ] Migration rollback tested

### Testing
- [ ] Manual testing on staging
- [ ] All user flows tested
- [ ] Edge cases covered
- [ ] Error messages clear

### Deployment
- [ ] Production environment configured
- [ ] Health checks working
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] Rollback plan documented
```

---

## QUICK REFERENCE

### Common Commands

```bash
# Development
npm run --workspace=backend dev          # Start backend server
npm run --workspace=frontend dev         # Start frontend server
npm run --workspace=backend test         # Run backend tests
npm run --workspace=backend prisma:seed  # Seed database

# Building
npm run --workspace=backend build        # Build backend
npm run --workspace=frontend build       # Build frontend

# Database
npm run --workspace=backend prisma:migrate   # Create migration
npm run --workspace=backend prisma:studio    # GUI for database

# Code Quality
npm run lint                             # Lint all projects
npm run format                           # Format all projects
npm run typecheck                        # Check types

# Deployment
docker-compose up -d                     # Start containers
docker-compose logs -f                   # View logs
docker-compose down                      # Stop containers
```

---

**Happy coding! 🚀**

