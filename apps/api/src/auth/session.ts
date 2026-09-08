import crypto from 'node:crypto';
import { getDb, schema, hashSessionToken, eq, and, gt } from '@indra/database';

export const SESSION_COOKIE_NAME = 'indra_session';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthenticatedContext {
  valid: boolean;
  userId?: string;
  citizenId?: string;
  user?: any;
  citizen?: any;
  session?: any;
  reason?: string;
}

/**
 * Creates a cryptographically secure session.
 * Raw token is returned to be set ONLY in the HttpOnly browser cookie.
 * DB stores ONLY the SHA-256 session_token_hash.
 */
export async function createSession(
  userId: string,
  citizenId: string,
  ipAddress: string = '127.0.0.1',
  userAgent: string = 'unknown'
): Promise<{ rawToken: string; sessionId: string; expiresAt: Date }> {
  const db = await getDb();
  // 32 random bytes = 256 bits entropy
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(schema.authSessions)
    .values({
      sessionTokenHash: tokenHash,
      userId,
      citizenId,
      ipAddress: ipAddress.slice(0, 100),
      userAgent: userAgent.slice(0, 500),
      expiresAt,
      isRevoked: false,
    })
    .returning();

  // Log audit event
  await logAuthEvent('SESSION_CREATED', 'SUCCESS', userId, citizenId, ipAddress, {
    sessionId: session.id,
    userAgent: userAgent.slice(0, 100),
  });

  return {
    rawToken,
    sessionId: session.id,
    expiresAt,
  };
}

/**
 * Validates a session by hashing the received raw token and checking db.
 * Returns authenticated user and citizen.
 */
export async function validateSession(rawToken: string): Promise<AuthenticatedContext> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16) {
    return { valid: false, reason: 'INVALID_TOKEN_FORMAT' };
  }

  const tokenHash = hashSessionToken(rawToken);
  const db = await getDb();

  const sessions = await db
    .select()
    .from(schema.authSessions)
    .where(
      and(
        eq(schema.authSessions.sessionTokenHash, tokenHash),
        eq(schema.authSessions.isRevoked, false),
        gt(schema.authSessions.expiresAt, new Date())
      )
    );

  if (sessions.length === 0) {
    return { valid: false, reason: 'SESSION_NOT_FOUND_OR_EXPIRED' };
  }

  const session = sessions[0];

  // Fetch linked user account
  const users = await db
    .select()
    .from(schema.userAccounts)
    .where(eq(schema.userAccounts.id, session.userId));

  if (users.length === 0) {
    return { valid: false, reason: 'USER_NOT_FOUND' };
  }

  const user = users[0];
  if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'REVOKED') {
    return { valid: false, reason: `ACCOUNT_${user.accountStatus}` };
  }

  // Fetch linked citizen profile
  const citizens = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, session.citizenId));

  if (citizens.length === 0) {
    return { valid: false, reason: 'CITIZEN_NOT_FOUND' };
  }

  const citizen = citizens[0];

  // Remove passwordHash from user object before returning to context
  const { passwordHash: _, ...safeUser } = user;

  return {
    valid: true,
    userId: session.userId,
    citizenId: session.citizenId,
    user: safeUser,
    citizen,
    session,
  };
}

/**
 * Revokes a session upon logout.
 */
export async function revokeSession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashSessionToken(rawToken);
  const db = await getDb();

  const sessions = await db
    .select()
    .from(schema.authSessions)
    .where(eq(schema.authSessions.sessionTokenHash, tokenHash));

  if (sessions.length === 0) return false;

  const session = sessions[0];
  await db
    .update(schema.authSessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(eq(schema.authSessions.id, session.id));

  await logAuthEvent('LOGOUT', 'SUCCESS', session.userId, session.citizenId, session.ipAddress || '127.0.0.1', {
    sessionId: session.id,
  });

  return true;
}

/**
 * Revokes all active sessions for a user (e.g. password change, security lockdown).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const db = await getDb();
  const updated = await db
    .update(schema.authSessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(and(eq(schema.authSessions.userId, userId), eq(schema.authSessions.isRevoked, false)))
    .returning();

  return updated.length;
}

/**
 * Append-only security audit logger.
 * Never logs passwords, raw tokens, or sensitive identification numbers.
 */
export async function logAuthEvent(
  eventType: string,
  status: 'SUCCESS' | 'FAILURE',
  userId?: string,
  citizenId?: string,
  ipAddress: string = '127.0.0.1',
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const db = await getDb();
    // Sanitize details: strip password, secret, token keys
    const sanitizedDetails: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(details)) {
      if (/password|secret|token|challenge|credential/i.test(k)) {
        sanitizedDetails[k] = '[REDACTED]';
      } else {
        sanitizedDetails[k] = v;
      }
    }

    await db.insert(schema.authAuditLogs).values({
      userId: userId || null,
      citizenId: citizenId || null,
      eventType,
      status,
      ipAddress: ipAddress.slice(0, 100),
      details: sanitizedDetails,
    });
  } catch (err) {
    console.error('[AuthAuditLog Error]', err);
  }
}

/**
 * In-memory sliding rate limiter for authentication endpoints.
 * Resilient against brute-force password guessing and rapid credential stuffing.
 */
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateBucket>();
const MAX_ATTEMPTS = 15; // 15 attempts per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  rateLimitBuckets.delete(key);
}
