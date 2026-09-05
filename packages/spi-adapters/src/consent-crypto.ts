import crypto from 'crypto';

export interface CanonicalConsentParams {
  version?: string;
  citizenId: string;
  ecosystem: 'ABDM' | 'RBI_AA' | 'DIGILOCKER';
  consentManagerId: string;
  dataProviderId: string;
  dataConsumerId: string;
  purposeCode: string;
  dataTypes: string[];
  expiresAt: string | Date;
}

/**
 * Constructs the canonical serialization string for an electronic consent artifact.
 * Format: V1::citizenId::ecosystem::consentManagerId::dataProviderId::dataConsumerId::purposeCode::sortedDataTypes::expiresAtISO
 */
export function buildCanonicalConsentPayload(params: CanonicalConsentParams): string {
  const version = params.version || 'V1';
  const sortedTypes = [...params.dataTypes].sort().join(',');
  const expiresAtISO =
    typeof params.expiresAt === 'string'
      ? new Date(params.expiresAt).toISOString()
      : params.expiresAt.toISOString();

  return [
    version,
    params.citizenId,
    params.ecosystem,
    params.consentManagerId,
    params.dataProviderId,
    params.dataConsumerId,
    params.purposeCode,
    sortedTypes,
    expiresAtISO,
  ].join('::');
}

/**
 * Computes the cryptographic signature digest for a canonical consent payload.
 */
export function computeConsentSignatureDigest(params: CanonicalConsentParams): string {
  const payload = buildCanonicalConsentPayload(params);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Verifies that a consent artifact's signatureDigest exactly matches its canonical payload.
 */
export function verifyConsentArtifactIntegrity(
  params: CanonicalConsentParams,
  signatureDigest: string
): boolean {
  try {
    const expectedDigest = computeConsentSignatureDigest(params);
    const expectedBuf = Buffer.from(expectedDigest, 'hex');
    const actualBuf = Buffer.from(signatureDigest, 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
