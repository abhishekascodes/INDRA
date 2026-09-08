import crypto from 'node:crypto';

/**
 * Memory-hard password hashing using Node.js native scrypt.
 * Generates a 16-byte random salt and 64-byte key.
 * Formatted as: `${saltHex}:${hashHex}`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Timing-safe password verification.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hash of a raw session token before saving to database.
 * Raw session token is sent ONLY to browser via HttpOnly cookie.
 * DB holds ONLY the SHA-256 hash (sessionTokenHash).
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(`indra-session:${rawToken}`).digest('hex');
}

/**
 * One-way hash of demo identity verification challenge (e.g., last 4 digits).
 * Keeps raw challenge value out of plain storage.
 */
export function hashChallenge(challenge: string): string {
  const normalized = challenge.trim();
  return crypto.createHash('sha256').update(`indra-synthetic-challenge:${normalized}`).digest('hex');
}

/**
 * Verify submitted challenge against stored one-way hash.
 */
export function verifyChallenge(challenge: string, storedHash: string): boolean {
  if (!challenge || !storedHash) return false;
  const computed = hashChallenge(challenge);
  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
