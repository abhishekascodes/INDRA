import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildApp, COOKIE_OPTIONS } from '../apps/api/src/server.js';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  hashSessionToken,
  hashPassword,
  verifyPassword,
  eq,
  and,
} from '@indra/database';
import { SESSION_COOKIE_NAME, resetRateLimit } from '../apps/api/src/auth/session.js';

describe('INDRA Citizen Authentication, Session Security & Tenant Scoping Suite', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    resetRateLimit('login:127.0.0.1');
    resetRateLimit('signup:127.0.0.1');
    await resetDatabase();
  });

  describe('1. Cryptographic Storage & Password Hashing Verification', () => {
    it('stores seeded user account passwords using Argon2id memory-hard hashes, never in plaintext', async () => {
      const db = await getDb();
      const accounts = await db.select().from(schema.userAccounts);

      expect(accounts.length).toBeGreaterThanOrEqual(2);
      for (const account of accounts) {
        expect(account.passwordHash).not.toBe('Password123!');
        expect(account.passwordHash).toMatch(/^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[^\$]+\$[^\$]+$/);
        const verified = await verifyPassword('Password123!', account.passwordHash);
        expect(verified).toBe(true);
      }
    });

    it('stores synthetic challenge one-way hashes, never raw digits', async () => {
      const db = await getDb();
      const aarav = await db
        .select()
        .from(schema.userAccounts)
        .where(eq(schema.userAccounts.citizenId, AARAV_PATEL_ID));

      expect(aarav.length).toBe(1);
      expect(aarav[0].syntheticChallengeHash).not.toBe('4567');
      expect(aarav[0].syntheticChallengeHash?.length).toBe(64); // sha-256 hex
    });
  });

  describe('1b. Modern Memory-Hard Password KDF (Argon2id) Verification Suite', () => {
    it('correct password -> verifies successfully', async () => {
      const hash = await hashPassword('CorrectPassword123!');
      const isValid = await verifyPassword('CorrectPassword123!', hash);
      expect(isValid).toBe(true);
    });

    it('incorrect password -> rejected', async () => {
      const hash = await hashPassword('CorrectPassword123!');
      const isValid = await verifyPassword('WrongPassword!', hash);
      expect(isValid).toBe(false);
    });

    it('duplicate account -> rejected on signup with 409', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'AnotherPassword123!',
          fullName: 'Duplicate Aarav',
          syntheticChallenge: '4567',
        },
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('malformed password -> rejected on signup with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'malformed@example.in',
          password: 'tiny',
          fullName: 'Malformed Password User',
          syntheticChallenge: '1234',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('seeded evaluator accounts -> authenticate successfully with Argon2id', async () => {
      const resAarav = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });
      expect(resAarav.statusCode).toBe(200);
      expect(JSON.parse(resAarav.body).citizen.id).toBe(AARAV_PATEL_ID);

      const resPriya = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'priya.sharma@example.in',
          password: 'Password123!',
        },
      });
      expect(resPriya.statusCode).toBe(200);
      expect(JSON.parse(resPriya.body).citizen.id).toBe(PRIYA_SHARMA_ID);
    });

    it('newly created account -> stored with Argon2id and authenticates immediately', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'kdf.eval@example.in',
          password: 'ModernArgon2id123!',
          fullName: 'KDF Evaluator',
          city: 'Pune',
          state: 'Maharashtra',
          syntheticChallenge: '9988',
        },
      });
      expect(res.statusCode).toBe(201);

      const db = await getDb();
      const users = await db
        .select()
        .from(schema.userAccounts)
        .where(eq(schema.userAccounts.email, 'kdf.eval@example.in'));

      expect(users.length).toBe(1);
      expect(users[0].passwordHash).toMatch(/^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[^\$]+\$[^\$]+$/);

      // Verify immediate login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'kdf.eval@example.in',
          password: 'ModernArgon2id123!',
        },
      });
      expect(loginRes.statusCode).toBe(200);
    });

    it('password hash not equal to plaintext for all accounts', async () => {
      const plainPassword = 'PlaintextPassword123!';
      const hash = await hashPassword(plainPassword);
      expect(hash).not.toBe(plainPassword);
      expect(hash).not.toContain(plainPassword);
    });

    it('distinct salts produce distinct stored hashes for identical passwords', async () => {
      const pass = 'IdenticalPassword123!';
      const hashA = await hashPassword(pass);
      const hashB = await hashPassword(pass);

      expect(hashA).not.toBe(hashB);
      // Both verify with the same password
      expect(await verifyPassword(pass, hashA)).toBe(true);
      expect(await verifyPassword(pass, hashB)).toBe(true);
    });
  });

  describe('2. Citizen Signup Flow', () => {
    it('creates new synthetic citizen and user account with valid inputs', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'vikram.singh@example.in',
          password: 'SecurePassword1!',
          fullName: 'Vikram Singh',
          city: 'Mysuru',
          state: 'Karnataka',
          syntheticChallenge: '8899',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.user.email).toBe('vikram.singh@example.in');
      expect(body.user.role).toBe('CITIZEN');
      expect(body.citizen.primaryName).toBe('Vikram Singh');
      expect(body.citizen.currentCity).toBe('Mysuru');

      // Check cookie was set
      const cookies = res.cookies;
      const sessionCookie = cookies.find((c: any) => c.name === SESSION_COOKIE_NAME);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.value).toBeTruthy();

      // Verify DB stores ONLY SHA-256 hash of the session token
      const rawToken = sessionCookie.value;
      const expectedHash = hashSessionToken(rawToken);
      const db = await getDb();
      const sessions = await db
        .select()
        .from(schema.authSessions)
        .where(eq(schema.authSessions.sessionTokenHash, expectedHash));

      expect(sessions.length).toBe(1);
      expect(sessions[0].citizenId).toBe(body.citizen.id);
    });

    it('rejects signup with duplicate email address', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'priya.sharma@example.in',
          password: 'AnotherPassword1!',
          fullName: 'Duplicate Priya',
          syntheticChallenge: '1234',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects weak password (less than 8 chars or missing digits/letters)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'short@example.in',
          password: 'short',
          fullName: 'Short Pwd',
          syntheticChallenge: '1234',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects invalid synthetic challenge format (must be 4 digits)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'badchallenge@example.in',
          password: 'ValidPassword123!',
          fullName: 'Bad Challenge',
          syntheticChallenge: 'abc',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('3. Citizen Authentication & Login Flow', () => {
    it('successfully logs in Aarav Patel and issues HttpOnly session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.user.email).toBe('aarav.patel@example.in');
      expect(body.citizen.id).toBe(AARAV_PATEL_ID);
      expect(body.citizen.primaryName).toBe('Aarav Patel');

      const sessionCookie = res.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.httpOnly).toBe(true);

      // Verify token hash in DB
      const expectedHash = hashSessionToken(sessionCookie.value);
      const db = await getDb();
      const dbSessions = await db
        .select()
        .from(schema.authSessions)
        .where(eq(schema.authSessions.sessionTokenHash, expectedHash));

      expect(dbSessions.length).toBe(1);
      expect(dbSessions[0].isRevoked).toBe(false);
    });

    it('rejects login with incorrect password and records audit failure', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'WrongPassword!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('INVALID_CREDENTIALS');

      // Verify audit log entry
      const db = await getDb();
      const logs = await db
        .select()
        .from(schema.authAuditLogs)
        .where(
          and(
            eq(schema.authAuditLogs.citizenId, AARAV_PATEL_ID),
            eq(schema.authAuditLogs.eventType, 'USER_LOGIN'),
            eq(schema.authAuditLogs.status, 'FAILURE')
          )
        );

      expect(logs.length).toBeGreaterThan(0);
    });

    it('rejects login for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.in',
          password: 'Password123!',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('4. Session Lifecycle: /api/auth/me & Logout Invalidation', () => {
    it('returns citizen identity when active session cookie is provided', async () => {
      // 1. Log in
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'priya.sharma@example.in',
          password: 'Password123!',
        },
      });
      const token = loginRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      // 2. Call /api/auth/me with cookie
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.body);
      expect(meBody.authenticated).toBe(true);
      expect(meBody.citizen.id).toBe(PRIYA_SHARMA_ID);
      expect(meBody.citizen.primaryName).toBe('Priya Sharma');
      expect(meBody.user.email).toBe('priya.sharma@example.in');
    });

    it('returns authenticated: false when no session cookie is provided', async () => {
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.body);
      expect(meBody.authenticated).toBe(false);
      expect(meBody.user).toBeNull();
      expect(meBody.citizen).toBeNull();
    });

    it('logout revokes session in DB and clears session cookie', async () => {
      // 1. Log in
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });
      const token = loginRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      // 2. Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(logoutRes.statusCode).toBe(200);

      // Verify cookie cleared
      const clearedCookie = logoutRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME);
      expect(clearedCookie).toBeDefined();

      // Verify session is revoked in DB
      const tokenHash = hashSessionToken(token);
      const db = await getDb();
      const sessions = await db
        .select()
        .from(schema.authSessions)
        .where(eq(schema.authSessions.sessionTokenHash, tokenHash));

      expect(sessions[0].isRevoked).toBe(true);

      // 3. /api/auth/me with the revoked token returns authenticated: false
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      const meBody = JSON.parse(meRes.body);
      expect(meBody.authenticated).toBe(false);
    });
  });

  describe('5. Strict Tenant Boundary Isolation & Cross-Citizen Protection', () => {
    it('strictly forbids Aarav session from operating with Priya citizenId parameter', async () => {
      // 1. Log in as Aarav
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });
      const aaravToken = loginRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      // 2. Attempt to start workflow specifying Priya's citizenId
      const attackRes = await app.inject({
        method: 'POST',
        url: '/api/workflows/start',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        payload: {
          workflowCode: 'RELOCATE_MUNICIPAL_SERVICES',
          citizenId: PRIYA_SHARMA_ID, // Malicious forged citizenId
        },
      });

      expect(attackRes.statusCode).toBe(403);
      const err = JSON.parse(attackRes.body);
      expect(err.code).toBe('TENANT_BOUNDARY_VIOLATION');

      // Verify security audit log recorded the attack attempt
      const db = await getDb();
      const auditLogs = await db
        .select()
        .from(schema.authAuditLogs)
        .where(eq(schema.authAuditLogs.eventType, 'TENANT_BOUNDARY_VIOLATION_ATTEMPT'));

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].citizenId).toBe(AARAV_PATEL_ID);
    });

    it('strictly scopes GET /api/citizen/me to the authenticated session citizen', async () => {
      // Log in as Aarav
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });
      const token = loginRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.profile.id).toBe(AARAV_PATEL_ID);
      expect(body.profile.primaryName).toBe('Aarav Patel');
      expect(body.profile.id).not.toBe(PRIYA_SHARMA_ID);
    });

    it('strictly scopes GET /api/citizen/inbox to the authenticated session citizen', async () => {
      // Log in as Aarav
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });
      const token = loginRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/inbox',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      for (const item of body.items) {
        expect(item.citizenId).toBe(AARAV_PATEL_ID);
        expect(item.citizenId).not.toBe(PRIYA_SHARMA_ID);
      }
    });

    it('strictly scopes state transitions to the authenticated citizen', async () => {
      // Log in as Aarav
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'aarav.patel@example.in',
          password: 'Password123!',
        },
      });
      const token = loginRes.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/transitions',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      for (const t of body.transitions) {
        expect(t.citizenId).toBe(AARAV_PATEL_ID);
      }
    });
  });

  describe('6. Sliding Window Rate Limiting', () => {
    it('rate limits brute-force login attempts after threshold', async () => {
      const attempts = [];
      for (let i = 0; i < 18; i++) {
        attempts.push(
          await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
              email: 'aarav.patel@example.in',
              password: `WrongPassword${i}!`,
            },
          })
        );
      }

      const rateLimited = attempts.filter((r) => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      const last = attempts[attempts.length - 1];
      expect(last.statusCode).toBe(429);
      const body = JSON.parse(last.body);
      expect(body.code).toBe('RATE_LIMITED');
    });
  });
});
