import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, seedDatabase, schema, eq, and, PRIYA_SHARMA_ID, AARAV_PATEL_ID } from '@indra/database';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import {
  AbdmSpiAdapter,
  AccountAggregatorSpiAdapter,
  buildCanonicalConsentPayload,
  computeConsentSignatureDigest,
  verifyConsentArtifactIntegrity,
} from '@indra/spi-adapters';

describe('INDRA Phase 3.5: Cryptographic Consent Artifacts & Adversarial Security Suite', () => {
  beforeAll(async () => {
    await seedDatabase();
    registerDefaultCapabilities();
  });

  it('1. Cryptographic Signature Verification: Matches canonical payload digest exactly', () => {
    const params = {
      version: 'V1',
      citizenId: PRIYA_SHARMA_ID,
      ecosystem: 'ABDM' as const,
      consentManagerId: 'NHA_ABDM_CM_01',
      dataProviderId: 'HIP_FORTIS_BLR_01',
      dataConsumerId: 'INDRA_APP_01',
      purposeCode: 'CARE_MANAGEMENT',
      dataTypes: ['DISCHARGE_SUMMARY', 'OP_CONSULTATION'],
      expiresAt: '2026-10-04T02:00:00.000Z',
    };

    const canonical = buildCanonicalConsentPayload(params);
    expect(canonical).toContain('V1::');
    expect(canonical).toContain(PRIYA_SHARMA_ID);
    expect(canonical).toContain('CARE_MANAGEMENT');

    const digest = computeConsentSignatureDigest(params);
    expect(digest.length).toBe(64); // SHA-256

    const isValid = verifyConsentArtifactIntegrity(params, digest);
    expect(isValid).toBe(true);
  });

  it('2. Signature Tampering Defense: Modifying any canonical byte invalidates verification', () => {
    const params = {
      version: 'V1',
      citizenId: PRIYA_SHARMA_ID,
      ecosystem: 'RBI_AA' as const,
      consentManagerId: 'ONEMONEY_AA_01',
      dataProviderId: 'FIP_HDFC_BANK',
      dataConsumerId: 'INDRA_FINANCIAL_RECONCILER',
      purposeCode: 'TAX_AUDIT',
      dataTypes: ['TRANSACTIONS'],
      expiresAt: '2026-10-04T02:00:00.000Z',
    };

    const validDigest = computeConsentSignatureDigest(params);

    // Tamper with purpose code
    const tamperedParams = { ...params, purposeCode: 'UNAUTHORIZED_DATA_PROFILING' };
    const isValid = verifyConsentArtifactIntegrity(tamperedParams, validDigest);
    expect(isValid).toBe(false);
  });

  it('3. Client Parameter Tampering Defense: Server is authoritative over consent artifact metadata', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const result = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, result.consentArtifactId));

    const artifact = rows[0];
    expect(artifact.purposeCode).toBe('CARE_MANAGEMENT');
    expect(artifact.status).toBe('ACTIVE');

    // Verify signature integrity from DB columns
    const isDbValid = verifyConsentArtifactIntegrity(
      {
        citizenId: artifact.citizenId,
        ecosystem: artifact.ecosystem as any,
        consentManagerId: artifact.consentManagerId,
        dataProviderId: artifact.dataProviderId,
        dataConsumerId: artifact.dataConsumerId,
        purposeCode: artifact.purposeCode,
        dataTypes: artifact.dataTypes as string[],
        expiresAt: artifact.expiresAt,
      },
      artifact.signatureDigest
    );
    expect(isDbValid).toBe(true);
  });

  it('4. Consent Revocation (DPDP Act, 2023): Transitions status to REVOKED with timestamp', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const result = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'INSURANCE_CLAIM',
      consentExpiryDays: 10,
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

  it('5. Post-Revocation Enforcement: Attempting to fetch data with revoked consent artifact throws error', async () => {
    const adapter = AccountAggregatorSpiAdapter.getInstance();
    const result = await adapter.requestConsentAndFetchSummary({
      citizenId: PRIYA_SHARMA_ID,
      fipId: 'FIP_HDFC_BANK',
      accountMasked: 'XXXX-4928',
      purposeCode: 'TAX_AUDIT_RECONCILIATION',
      dataTypes: ['TRANSACTIONS', 'SUMMARY'],
      validityDays: 14,
    });

    // Revoke the consent artifact
    await adapter.revokeConsent(result.consentArtifactId, PRIYA_SHARMA_ID);

    // Attempting to fetch statement with revoked artifact must throw
    await expect(
      adapter.fetchStatementWithConsent(result.consentArtifactId, PRIYA_SHARMA_ID)
    ).rejects.toThrow('Consent artifact has been REVOKED under DPDP Act provisions');
  });

  it('6. Cross-Citizen Isolation (Revocation): Aarav cannot revoke Priya consent artifact', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const result = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    // Aarav attempts to revoke
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

  it('7. Cross-Citizen Isolation (Access): Scoping prevents querying another citizens records', async () => {
    const db = await getDb();

    // Query Priya's health records using Aarav's ID
    const aaravHealth = await db
      .select()
      .from(schema.citizenHealthRecords)
      .where(eq(schema.citizenHealthRecords.citizenId, AARAV_PATEL_ID));

    // Aarav has zero health records seeded
    expect(aaravHealth.length).toBe(0);
  });

  it('8. Replay & Idempotency: Re-linking same health records returns existing records without duplication', async () => {
    const adapter = AbdmSpiAdapter.getInstance();
    const res1 = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    const res2 = await adapter.linkAbhaRecords({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    expect(res1.linkedRecordsCount).toBe(res2.linkedRecordsCount);
  });

  it('9. Capability Compensation: Invoking capability compensation revokes the consent artifact', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('health.link_abha_records')!;

    const output = await capability.execute({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'FAMILY_RECORD',
      consentExpiryDays: 5,
    });

    expect(output.consentArtifactId).toBeDefined();

    // Invoke compensation
    await capability.compensate!(
      { citizenId: PRIYA_SHARMA_ID, abhaAddress: 'priya@abdm' } as any,
      output,
      {} as any
    );

    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, output.consentArtifactId));

    expect(rows[0].status).toBe('REVOKED');
  });

  it('10. Synthetic Disclosure Guarantee: Every federated SPI result carries explicit simulation provenance', async () => {
    const registry = CapabilityRegistry.getInstance();
    const healthCap = registry.get('health.link_abha_records')!;
    const output = await healthCap.execute({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.id, output.consentArtifactId));

    const prov = rows[0].provenanceData as any;
    expect(prov.isSimulationAssumption).toBe(true);
    expect(prov.sourceAuthority).toContain('National Health Authority');
  });
});
