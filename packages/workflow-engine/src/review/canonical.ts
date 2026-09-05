import crypto from 'node:crypto';

/**
 * Deterministically canonicalizes a JavaScript object into sorted-key JSON string.
 * Guarantees identical SHA-256 digest across platforms and execution environments.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJson(item)).join(',') + ']';
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalizeJson(val);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Computes SHA-256 digest of canonicalized data.
 */
export function computePayloadHash(data: unknown): string {
  const canonical = canonicalizeJson(data);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Server HMAC secret for signing authorization tokens.
 * In a production environment this comes from vault/KMS; for local/synthetic it is derived consistently.
 */
export const SERVER_AUTHORIZATION_SECRET =
  process.env.INDRA_AUTH_SECRET || 'indra-statutory-authorization-secret-key-2026-sha256';

export interface TokenClaims {
  sessionId: string;
  workflowRunId: string;
  stepId: string;
  version?: number;
  citizenId: string;
  payloadHash: string;
  authorizedAt: string;
  expiresAt: string;
}

export type ServerIssuedAuthorizationArtifactClaims = TokenClaims;

export function signAuthorizationToken(claims: TokenClaims): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'INDRA_AUTH' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SERVER_AUTHORIZATION_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifyAuthorizationToken(token: string): TokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('INVALID_TOKEN_FORMAT: Malformed authorization token');
  }

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SERVER_AUTHORIZATION_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSig) {
    throw new Error('INVALID_TOKEN_SIGNATURE: Cryptographic signature mismatch');
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as TokenClaims;
    if (new Date(claims.expiresAt).getTime() < Date.now()) {
      throw new Error('TOKEN_EXPIRED: Authorization token has expired');
    }
    return claims;
  } catch (err: any) {
    if (err.message.includes('TOKEN_EXPIRED')) throw err;
    throw new Error('INVALID_TOKEN_PAYLOAD: Could not decode token claims');
  }
}
