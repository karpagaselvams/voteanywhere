# Security & Audit Trail Guide
## Comprehensive Security Implementation and Compliance

---

## 1. SECURITY ARCHITECTURE

### 1.1 Security Layers

Vote Anywhere implements multiple security layers to protect against common threats:

```
Layer 1: Network Security
├─ HTTPS/TLS encryption for all communication
├─ CORS policy enforcing same-origin requests
└─ Rate limiting on authentication endpoints

Layer 2: Authentication & Authorization
├─ Officer: Username/password with bcrypt hashing
├─ Voter: Mock OTP with expiry and attempt limits
├─ JWT token validation on every request
└─ Session management with revocation capability

Layer 3: Data Protection
├─ Password hashing with bcrypt (10 salt rounds)
├─ Ballot encryption with AES-256-GCM
├─ Sensitive fields encrypted at rest
└─ Database connection pooling with encryption

Layer 4: Application Security
├─ Input validation with Zod schemas
├─ SQL injection prevention via Prisma ORM
├─ XSS prevention via React escaping
└─ CSRF protection via token validation

Layer 5: Audit & Monitoring
├─ All state changes logged to audit trail
├─ Immutable audit records
├─ Timestamp verification
└─ Comprehensive logging without sensitive data
```

---

## 2. AUTHENTICATION SECURITY

### 2.1 Officer Authentication (Username/Password)

**Flow:**
```
Officer enters credentials → Backend validates → 
Password compared with bcrypt hash → 
JWT token generated if valid → 
Session record created in database
```

**Implementation:**

```typescript
// backend/src/modules/auth/auth.service.ts
async function loginOfficer(username: string, password: string) {
  // 1. Find officer by username
  const officer = await prisma.user.findUnique({
    where: { username }
  });

  if (!officer) {
    throw new Error('Invalid credentials');
  }

  // 2. Verify password (never store plaintext)
  const passwordMatch = await bcrypt.compare(password, officer.hashedPassword);

  if (!passwordMatch) {
    throw new Error('Invalid credentials');
  }

  // 3. Generate JWT token (includes role, expires in 30 mins)
  const token = jwt.sign(
    { 
      userId: officer.id, 
      role: officer.role, 
      username: officer.username 
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  // 4. Create server-side session record
  const session = await prisma.session.create({
    data: {
      userId: officer.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }
  });

  return { token, expiresIn: 1800 };
}
```

**Security Measures:**
- Passwords never logged or displayed
- bcrypt with 10 rounds (deliberate slowness prevents brute force)
- JWT tokens include expiry
- Server-side session record enables revocation
- Failed attempts are logged and rate-limited

### 2.2 Voter Authentication (Mock OTP)

**Flow:**
```
Voter requests OTP → Backend generates random 6-digit code →
Code stored in database with expiry (5 mins) →
Voter enters code → Verified against database entry →
JWT token generated if valid
```

**Implementation:**

```typescript
// backend/src/modules/auth/auth.service.ts
async function requestOTP(voterId: string): Promise<{ expiresIn: number }> {
  // 1. Verify voter exists
  const voter = await prisma.voter.findUnique({
    where: { voterId }
  });

  if (!voter || !voter.isEligible) {
    throw new Error('Voter not found or ineligible');
  }

  // 2. Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Store OTP with expiry (5 minutes)
  const otpRecord = await prisma.otpRecord.create({
    data: {
      voterId,
      otp: hashOTP(otp), // Hash OTP before storing
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      maxAttempts: 3
    }
  });

  // In mock environment, log for testing only
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MOCK OTP for ${voterId}]: ${otp}`);
  }

  return { expiresIn: 300 }; // 5 minutes in seconds
}

async function verifyOTP(voterId: string, otp: string): Promise<{ token: string }> {
  // 1. Find active OTP record
  const otpRecord = await prisma.otpRecord.findFirst({
    where: {
      voterId,
      expiresAt: { gt: new Date() } // Not expired
    }
  });

  if (!otpRecord) {
    throw new Error('OTP expired or not found');
  }

  // 2. Check attempts limit
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await prisma.otpRecord.delete({ where: { id: otpRecord.id } });
    throw new Error('Maximum OTP attempts exceeded');
  }

  // 3. Verify OTP (compare with hash)
  const otpMatch = await bcrypt.compare(otp, otpRecord.otp);

  if (!otpMatch) {
    // Increment attempts
    await prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    });
    throw new Error('Invalid OTP');
  }

  // 4. OTP verified, generate JWT
  const token = jwt.sign(
    { voterId, role: 'VOTER' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 5. Delete used OTP
  await prisma.otpRecord.delete({ where: { id: otpRecord.id } });

  return { token };
}
```

**Security Measures:**
- OTP stored as hash, not plaintext
- 5-minute expiry prevents replay attacks
- 3-attempt limit prevents brute force
- Rate limiting on OTP request endpoint
- Used OTP deleted immediately

### 2.3 Rate Limiting

```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to routes
router.post('/auth/officer-login', authLimiter, loginOfficerHandler);
router.post('/auth/request-otp', authLimiter, requestOTPHandler);
router.post('/auth/verify-otp', authLimiter, verifyOTPHandler);
```

---

## 3. AUTHORIZATION ENFORCEMENT

### 3.1 Role-Based Access Control (RBAC)

Every API endpoint checks the user's role before proceeding:

```typescript
// backend/src/middleware/auth.ts
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // 2. Verify and decode JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

      // 3. Check if user's role is allowed
      if (!roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // 4. Attach user info to request
      req.user = { id: decoded.userId, role: decoded.role };
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Usage on routes
router.get('/api/elections', requireRole('ADMIN', 'VERIFICATION_OFFICER'), 
  getElectionsHandler);

router.post('/api/elections', requireRole('ADMIN'), 
  createElectionHandler);

router.post('/api/ballots/submit', requireRole('VOTER'), 
  submitBallotHandler);
```

### 3.2 Role Permission Matrix

| Operation | Admin | Verification Officer | Polling Officer | Auditor | Voter |
|-----------|-------|----------------------|-----------------|---------|-------|
| Create Election | ✓ | ✗ | ✗ | ✗ | ✗ |
| Activate Election | ✓ | ✗ | ✗ | ✗ | ✗ |
| Close Election | ✓ | ✗ | ✗ | ✗ | ✗ |
| Review Remote Requests | ✗ | ✓ | ✗ | ✗ | ✗ |
| Approve Remote Request | ✗ | ✓ | ✗ | ✗ | ✗ |
| Verify Voter at Centre | ✗ | ✗ | ✓ | ✗ | ✗ |
| Submit Remote Request | ✗ | ✗ | ✗ | ✗ | ✓ |
| Submit Ballot | ✗ | ✗ | ✗ | ✗ | ✓ |
| Query Audit Trail | ✗ | ✗ | ✗ | ✓ | ✗ |
| Verify Ballot Integrity | ✗ | ✗ | ✗ | ✓ | ✗ |

---

## 4. DATA PROTECTION

### 4.1 Password Hashing

```typescript
// backend/src/lib/crypto.ts
import bcrypt from 'bcrypt';

// Hash password before storing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10; // More rounds = slower = more secure
  return await bcrypt.hash(password, saltRounds);
}

// Compare password during login
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Never do this:
// ❌ store plaintext password
// ❌ use simple hashing like MD5 or SHA1
// ❌ store password in logs

// Always do this:
// ✓ Use bcrypt with high salt rounds
// ✓ Verify password during login
// ✓ Log authentication events without password
```

### 4.2 Ballot Encryption

Ballots are encrypted using AES-256-GCM to ensure only authorized systems can read choices:

```typescript
// backend/src/lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.BALLOT_ENCRYPTION_KEY, 'hex');

export interface EncryptedBallot {
  iv: string;
  ciphertext: string;
  authTag: string;
}

// Encrypt ballot before storage
export function encryptBallot(
  candidateChoice: string
): EncryptedBallot {
  // 1. Generate random IV (Initialization Vector)
  const iv = crypto.randomBytes(16);

  // 2. Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // 3. Encrypt the candidate choice
  let ciphertext = cipher.update(candidateChoice, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  // 4. Get authentication tag (detects tampering)
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    ciphertext,
    authTag: authTag.toString('hex')
  };
}

// Decrypt ballot (only by Auditor)
export function decryptBallot(
  encrypted: EncryptedBallot
): string | null {
  try {
    // 1. Recreate decipher with same IV
    const iv = Buffer.from(encrypted.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // 2. Set authentication tag for verification
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    // 3. Decrypt
    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Authentication failed - ballot was tampered with
    console.error('Ballot integrity check failed:', error);
    return null;
  }
}

// Usage
const choice = 'Candidate A';
const encrypted = encryptBallot(choice);
// Store encrypted in database

// Later, when auditor verifies:
const decrypted = decryptBallot(encrypted);
if (decrypted !== choice) {
  console.error('BALLOT TAMPERING DETECTED');
}
```

**Key Points:**
- AES-256-GCM is authenticated encryption (detects tampering)
- Random IV for each encryption prevents pattern detection
- Authentication tag proves tampering if decryption fails
- Encryption key stored in environment variable (not source code)
- Never log decrypted choices

### 4.3 Environment Variables (Secrets Management)

```bash
# .env (never commit to git)
# ✓ DO: Store sensitive values here
JWT_SECRET=long-random-string-at-least-32-chars
BALLOT_ENCRYPTION_KEY=32-byte-hex-key-for-aes-256
DATABASE_PASSWORD=strong-password

# .gitignore
.env
.env.local
.env.*.local

# .env.example (safe to commit)
JWT_SECRET=example-value-change-in-production
BALLOT_ENCRYPTION_KEY=example-key-change-in-production
DATABASE_PASSWORD=example-password-change-in-production
```

---

## 5. INPUT VALIDATION

### 5.1 Request Validation with Zod

```typescript
// backend/src/lib/validators.ts
import { z } from 'zod';

// Validate officer login request
export const officerLoginSchema = z.object({
  username: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

// Validate ballot submission
export const ballotSubmissionSchema = z.object({
  voterId: z.string().uuid('Invalid voter ID'),
  electionId: z.string().uuid('Invalid election ID'),
  candidateChoice: z.string().min(1, 'Must select a candidate'),
  remotePollingAssignmentId: z.string().uuid().optional() // Optional if home voting
});

// Validate remote polling request
export const remotePollingRequestSchema = z.object({
  voterId: z.string().uuid(),
  electionId: z.string().uuid(),
  requestedPollingCentreId: z.string().uuid(),
  reason: z.string().min(10, 'Reason must be at least 10 characters')
});

// Usage in route handler
router.post('/api/auth/officer-login', async (req, res) => {
  try {
    // Validate request body
    const validated = officerLoginSchema.parse(req.body);

    // Process validated data
    const result = await authService.loginOfficer(
      validated.username,
      validated.password
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 5.2 Preventing SQL Injection

Prisma ORM prevents SQL injection through parameterized queries:

```typescript
// ✓ SAFE: Prisma uses parameterized queries
const voter = await prisma.voter.findUnique({
  where: { voterId: req.query.voterId } // Safe
});

// ❌ NEVER: Build SQL strings manually
const query = `SELECT * FROM voters WHERE voterId = '${req.query.voterId}'`;
// Attacker could pass: ' OR '1'='1
// Resulting query: SELECT * FROM voters WHERE voterId = '' OR '1'='1'
// This returns ALL voters!

// Always use Prisma or prepared statements
```

### 5.3 Preventing XSS (Cross-Site Scripting)

React automatically escapes content:

```typescript
// ✓ SAFE: React escapes all content by default
const VoterProfile = ({ voterData }) => {
  return (
    <div>
      <p>Name: {voterData.name}</p> {/* Safely escaped */}
    </div>
  );
};

// If attacker tries: voterData.name = '<img src=x onerror="alert(1)" />'
// React renders: &lt;img src=x onerror="alert(1)" /&gt;
// The HTML is displayed as text, not executed

// ❌ NEVER: Use dangerouslySetInnerHTML
// <div dangerouslySetInnerHTML={{ __html: userInput }} />
// Only use when you fully trust the content
```

---

## 6. AUDIT TRAIL & LOGGING

### 6.1 Audit Trail Design

The audit trail records all state-changing operations:

```typescript
// backend/src/modules/audit/audit.service.ts
export interface AuditLog {
  id: string;
  timestamp: Date;
  actorId: string;
  actorRole: string;
  operation: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Create audit log entry
export async function logOperation(
  actorId: string,
  actorRole: string,
  operation: string,
  entityType: string,
  entityId: string,
  changes: Record<string, any>,
  req?: Request
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      timestamp: new Date(),
      actorId,
      actorRole,
      operation,
      entityType,
      entityId,
      changes, // Stored as JSON in database
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    }
  });
}

// Log before operations
async function approveRemotePollingRequest(
  requestId: string,
  officerId: string,
  req: Request
) {
  // Get current state before update
  const currentRequest = await prisma.remotPollingRequest.findUnique({
    where: { id: requestId }
  });

  // Perform the operation
  const updated = await prisma.remotPollingRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED', approvedAt: new Date() }
  });

  // Log the change
  await logOperation(
    officerId,
    'VERIFICATION_OFFICER',
    'REMOTE_POLLING_REQUEST_APPROVED',
    'REMOTE_POLLING_REQUEST',
    requestId,
    {
      statusBefore: currentRequest.status,
      statusAfter: 'APPROVED',
      approvedBy: officerId
    },
    req
  );
}
```

### 6.2 What to Log

**✓ DO Log:**
- Officer login/logout
- Remote polling request submission, approval, rejection
- Ballot generation (without choice)
- Ballot submission (without choice)
- Eligibility status changes
- Election state changes (activate, close)
- Password changes
- Session termination
- Failed authentication attempts
- Authorization failures (who tried to access what)

**❌ DON'T Log:**
- Passwords or password hashes
- OTP codes or hashed OTPs
- JWT tokens or session secrets
- Decrypted ballot choices
- Voter ID paired with ballot reference
- Officer usernames paired with actions (use ID instead)

### 6.3 Audit Log Queries

```typescript
// Query recent actions by a user
export async function getUserAuditLog(
  userId: string,
  limit: number = 100
) {
  return await prisma.auditLog.findMany({
    where: { actorId: userId },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

// Query all operations of a type
export async function getOperationLog(
  operation: string,
  startDate: Date,
  endDate: Date
) {
  return await prisma.auditLog.findMany({
    where: {
      operation,
      timestamp: { gte: startDate, lte: endDate }
    },
    orderBy: { timestamp: 'desc' }
  });
}

// Query changes to a specific entity
export async function getEntityChangeLog(
  entityType: string,
  entityId: string
) {
  return await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { timestamp: 'asc' }
  });
}

// Get summary by actor role
export async function getOperationSummaryByRole(
  startDate: Date,
  endDate: Date
) {
  return await prisma.auditLog.groupBy({
    by: ['actorRole', 'operation'],
    where: {
      timestamp: { gte: startDate, lte: endDate }
    },
    _count: true
  });
}
```

### 6.4 Audit Log API Endpoints

```typescript
// backend/src/modules/audit/audit.routes.ts

// Get audit logs (Auditor only)
router.get('/api/audit/logs', requireRole('AUDITOR'), async (req, res) => {
  const { actor, operation, startDate, endDate, limit = 100 } = req.query;

  let where: any = {};
  if (actor) where.actorId = actor;
  if (operation) where.operation = operation;
  if (startDate && endDate) {
    where.timestamp = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit as string)
  });

  res.json(logs);
});

// Get specific log details
router.get('/api/audit/logs/:logId', requireRole('AUDITOR'), async (req, res) => {
  const log = await prisma.auditLog.findUnique({
    where: { id: req.params.logId }
  });

  if (!log) {
    return res.status(404).json({ error: 'Audit log not found' });
  }

  res.json(log);
});

// Generate audit report
router.get('/api/audit/reports/operations', requireRole('AUDITOR'), async (req, res) => {
  const { startDate, endDate } = req.query;

  const summary = await prisma.auditLog.groupBy({
    by: ['actorRole', 'operation'],
    where: {
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    _count: true
  });

  res.json({
    period: { startDate, endDate },
    summary,
    totalOperations: summary.reduce((sum, item) => sum + item._count, 0)
  });
});
```

---

## 7. COMPLIANCE AND BEST PRACTICES

### 7.1 Security Checklist

```markdown
## Security Implementation Checklist

### Authentication
- [x] Passwords hashed with bcrypt (not plaintext)
- [x] JWT tokens with expiry
- [x] Server-side session management
- [x] Rate limiting on login endpoints
- [x] OTP expiry and attempt limits
- [x] Session revocation on logout

### Authorization
- [x] Role-based access control
- [x] Authorization check on every endpoint
- [x] Permission matrix documented
- [x] Frontend UI reflects permissions (not relying on it)

### Data Protection
- [x] Ballot encryption (AES-256-GCM)
- [x] Password hashing (bcrypt with salt 10)
- [x] Sensitive data not logged
- [x] Secrets in environment variables (not source code)

### Input Validation
- [x] All inputs validated with Zod
- [x] Request body schema defined
- [x] Error messages don't leak info
- [x] SQL injection prevention (ORM)
- [x] XSS prevention (React escaping)

### Audit Trail
- [x] All state changes logged
- [x] Audit logs immutable
- [x] Sensitive data excluded
- [x] Audit log queries available to Auditor
- [x] Timestamp verification possible

### Infrastructure
- [x] HTTPS/TLS for all communication
- [x] CORS policy configured
- [x] Security headers set (Helmet)
- [x] Database connection encrypted
- [x] Regular backups configured

### Deployment
- [x] Secrets not in source code
- [x] .env file in .gitignore
- [x] Environment-specific configs
- [x] Security headers in production
- [x] Regular security updates

### Testing
- [x] Unit tests for security functions
- [x] Integration tests for auth flow
- [x] Manual penetration testing
- [x] Security linting tools running
```

### 7.2 Regular Security Maintenance

```bash
# Weekly
npm audit # Check for dependency vulnerabilities
git log --oneline -20 # Review recent changes

# Monthly
npm update # Update dependencies
npm audit fix # Apply security patches
Review audit logs for suspicious activity

# Quarterly
Security code review
Penetration testing
Update security documentation

# Annually
Full security audit
Disaster recovery testing
Update threat model
```

---

## 8. INCIDENT RESPONSE

### 8.1 Suspected Data Breach

**Immediate Actions:**
1. Isolate affected systems
2. Preserve audit logs (don't delete)
3. Notify stakeholders
4. Begin investigation

**Investigation Steps:**
```bash
# 1. Check audit logs for unauthorized access
docker exec <postgres-container> psql -U postgres -d vote_anywhere \
  -c "SELECT * FROM audit_logs WHERE operation='UNAUTHORIZED_ACCESS' \
  ORDER BY timestamp DESC LIMIT 100;"

# 2. Check failed login attempts
SELECT * FROM audit_logs 
WHERE operation='LOGIN_FAILED' 
AND timestamp > NOW() - INTERVAL '24 hours';

# 3. Check who accessed sensitive data
SELECT * FROM audit_logs 
WHERE operation IN ('BALLOT_VIEWED', 'VOTER_DATA_ACCESSED')
ORDER BY timestamp DESC;

# 4. Check for privilege escalation
SELECT * FROM audit_logs 
WHERE operation LIKE '%ROLE%' OR operation LIKE '%PERMISSION%'
ORDER BY timestamp DESC;
```

### 8.2 Remediation

```bash
# 1. Revoke compromised sessions
UPDATE sessions SET revoked=true 
WHERE user_id='<compromised-user>';

# 2. Force password reset
UPDATE users SET password_reset_required=true 
WHERE id='<affected-user>';

# 3. Audit encryption keys rotation (if compromised)
# - Generate new BALLOT_ENCRYPTION_KEY
# - Re-encrypt all ballots with new key
# - Update .env with new key
# - Restart services

# 4. Review and strengthen controls
# - Add additional rate limiting
# - Increase monitoring
# - Add new detection rules
```

---

## 9. SECURITY DOCUMENTATION FOR EVALUATORS

### 9.1 Security Assessment Report

```markdown
## Vote Anywhere Security Assessment

### Authentication Mechanisms
- Officer authentication: Username/password with bcrypt hashing
- Voter authentication: Mock OTP with 5-minute expiry, 3-attempt limit
- Session management: JWT tokens with 30-minute expiry for officers, 1-hour for voters
- Rate limiting: 10 attempts per 15 minutes per IP on login

### Authorization
- Role-based access control enforced at backend
- Five roles with distinct permissions
- Permission matrix attached
- Authorization checks on every protected endpoint

### Data Protection
- Passwords: Bcrypt with 10 salt rounds
- Ballot choices: AES-256-GCM encryption
- Encryption keys: Stored in environment variables, never in source code
- Sensitive data: Never logged in plaintext

### Audit Trail
- All state-changing operations logged
- Audit logs immutable and timestamped
- Accessible only to System Auditor role
- Includes actor ID, operation type, entity ID, and changes
- Excludes passwords, OTPs, encryption keys, and decrypted choices

### Known Limitations
- Mock OTP is simulated (not production-ready SMS)
- Single Elections Simulator (not distributed system)
- Fictional voter data only
- No real government system integrations
```

### 9.2 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Brute force password attack | Medium | High | Rate limiting, bcrypt slowness |
| OTP interception | Low | High | Server-side validation, not SMS |
| SQL injection | Low | Critical | Prisma ORM, parameterized queries |
| Ballot tampering | Low | Critical | AES-256-GCM with auth tag |
| Unauthorized access | Medium | High | JWT validation, role checks |
| Privilege escalation | Low | High | Role enforcement, audit logs |

---

## CONCLUSION

Vote Anywhere implements comprehensive security measures appropriate for an academic project demonstrating security principles in a voting system. The multi-layered approach combines authentication, authorization, encryption, validation, and audit logging to protect the integrity of the system.

**Key Security Achievements:**
✓ Separation of voter identity from ballot choices
✓ Encrypted ballot storage with integrity verification
✓ Comprehensive audit trail of all operations
✓ Role-based authorization enforced at backend
✓ Password hashing and OTP validation
✓ Input validation and SQL injection prevention
✓ Immutable audit records

---

