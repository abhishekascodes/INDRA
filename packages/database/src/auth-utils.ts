import crypto from 'node:crypto';
import { argon2id } from 'hash-wasm';

/**
 * Modern memory-hard password KDF using Argon2id (RFC 9106 / OWASP recommendation).
 * Uses a unique cryptographically random 16-byte salt per password.
 * Formatted in standard PHC encoded string:
 * `$argon2id$v=19$m=19456,t=2,p=1$<salt_base64>$<hash_base64>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456, // 19 MiB memory-hard parameter
    hashLength: 32,
    outputType: 'encoded',
  });
}

/**
 * Timing-safe password verification.
 * Supports modern Argon2id PHC encoded format with backward compatibility
 * for legacy scrypt (salt:hash) or test hashes.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  // 1. Modern Argon2id PHC format
  if (storedHash.startsWith('$argon2id$')) {
    try {
      const parts = storedHash.split('$');
      // Format: ['', 'argon2id', 'v=19', 'm=19456,t=2,p=1', saltB64, hashB64]
      if (parts.length < 6) return false;
      const paramsPart = parts[3];
      const saltB64 = parts[4];

      const mMatch = paramsPart.match(/m=(\d+)/);
      const tMatch = paramsPart.match(/t=(\d+)/);
      const pMatch = paramsPart.match(/p=(\d+)/);

      const memorySize = mMatch ? parseInt(mMatch[1], 10) : 19456;
      const iterations = tMatch ? parseInt(tMatch[1], 10) : 2;
      const parallelism = pMatch ? parseInt(pMatch[1], 10) : 1;

      const saltBuf = Buffer.from(saltB64, 'base64');
      const computed = await argon2id({
        password,
        salt: saltBuf,
        parallelism,
        iterations,
        memorySize,
        hashLength: 32,
        outputType: 'encoded',
      });

      const computedBuf = Buffer.from(computed);
      const storedBuf = Buffer.from(storedHash);
      if (computedBuf.length !== storedBuf.length) return false;
      return crypto.timingSafeEqual(computedBuf, storedBuf);
    } catch {
      return false;
    }
  }

  // 2. Legacy scrypt format (salt:hash) backward compatibility
  if (storedHash.includes(':')) {
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

  // 3. Fallback 64-char hex format
  if (storedHash.length === 64) {
    try {
      const legacyPepper = 'indra-prototype-static-pepper-2026';
      const legacyComputed = crypto.createHash('sha256').update(`${password}:${legacyPepper}`).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(legacyComputed), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }

  return false;
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
