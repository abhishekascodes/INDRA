import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, seedDatabase, schema, eq, and, PRIYA_SHARMA_ID, AARAV_PATEL_ID } from '@indra/database';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import { AbdmSpiAdapter, AccountAggregatorSpiAdapter } from '@indra/spi-adapters';

describe('INDRA Phase 3.5: MeitY DEPA & DPDP Act Electronic Consent Artifacts', () => {
  beforeAll(async () => {
    await seedDatabase();
    registerDefaultCapabilities();
  });

  it('1. Creates cryptographically signed electronic consent artifact for ABDM', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const result = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    const db = await getDb();
    const artifact = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, result.consentArtifactId));

    expect(artifact.length).toBe(1);
    expect(artifact[0].ecosystem).toBe('ABDM');
    expect(artifact[0].status).toBe('ACTIVE');
    expect(artifact[0].signatureAlgorithm).toBe('ED25519_SHA256');
    expect(artifact[0].signatureDigest).toBeDefined();
    expect(artifact[0].signatureDigest.length).toBe(64); // SHA-256 hex length
  });

  it('2. Creates cryptographically signed electronic consent artifact for RBI Account Aggregator', async () => {
    const adapter = AccountAggregatorSpiAdapter.getInstance();
    const result = await adapter.requestConsentAndFetchSummary({
      citizenId: PRIYA_SHARMA_ID,
      fipId: 'FIP_HDFC_BANK',
      accountMasked: 'XXXX-4928',
      purposeCode: 'TAX_AUDIT_RECONCILIATION',
      dataTypes: ['TRANSACTIONS', 'SUMMARY'],
      validityDays: 14,
    });

    const db = await getDb();
    const artifact = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, result.consentArtifactId));

    expect(artifact.length).toBe(1);
    expect(artifact[0].ecosystem).toBe('RBI_AA');
    expect(artifact[0].status).toBe('ACTIVE');
    expect(artifact[0].dataProviderId).toBe('FIP_HDFC_BANK');
  });

  it('3. Revokes consent artifact under DPDP Act provisions and marks revokedAt', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const result = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'INSURANCE_CLAIM',
      consentExpiryDays: 7,
    });

    const revoked = await adapter.revokeConsent(result.consentArtifactId, PRIYA_SHARMA_ID);
    expect(revoked).toBe(true);

    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, result.consentArtifactId));

    expect(rows[0].status).toBe('REVOKED');
    expect(rows[0].revokedAt).not.toBeNull();
  });

  it('4. Rejects cross-citizen consent revocation (Aarav cannot revoke Priyas consent)', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const result = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    // Aarav attempts to revoke Priya's artifact
    const revoked = await adapter.revokeConsent(result.consentArtifactId, AARAV_PATEL_ID);
    expect(revoked).toBe(false);

    // Verify status remains ACTIVE
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, result.consentArtifactId));

    expect(rows[0].status).toBe('ACTIVE');
  });

  it('5. Verifies capability compensation automatically revokes generated consent artifact', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('banking.account_aggregator_consent')!;

    // Execute capability
    const output = await capability.execute({
      citizenId: PRIYA_SHARMA_ID,
      fipId: 'FIP_SBI',
      accountMasked: 'XXXX-9912',
      purposeCode: 'PENSION_VERIFICATION',
      dataTypes: ['SUMMARY'],
      validityDays: 10,
    });

    expect(output.consentArtifactId).toBeDefined();

    // Trigger compensation
    await capability.compensate!(
      { citizenId: PRIYA_SHARMA_ID, fipId: 'FIP_SBI', accountMasked: 'XXXX-9912' } as any,
      output,
      {} as any
    );

    // Verify artifact in DB transitioned to REVOKED
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, output.consentArtifactId));

    expect(rows[0].status).toBe('REVOKED');
    expect(rows[0].revokedAt).not.toBeNull();
  });
});
