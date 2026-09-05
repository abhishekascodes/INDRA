import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, seedDatabase, schema, eq, PRIYA_SHARMA_ID, AARAV_PATEL_ID } from '@indra/database';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import { UniversalStatusService, ActionCenterService } from '@indra/policy-engine';

describe('INDRA Phase 3.5: Cross-Domain Institutional Federation & Sovereign Action Center', () => {
  beforeAll(async () => {
    await seedDatabase();
    registerDefaultCapabilities();
  });

  it('1. Verifies Capability Universe expansion to all 28 registered capabilities across 14 civic domains', () => {
    const registry = CapabilityRegistry.getInstance();
    const all = registry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(28);

    // Verify presence of all 4 Phase 3.5 capabilities
    expect(registry.get('health.link_abha_records')).toBeDefined();
    expect(registry.get('banking.account_aggregator_consent')).toBeDefined();
    expect(registry.get('education.verify_apaar_id')).toBeDefined();
    expect(registry.get('judiciary.check_ecourts_status')).toBeDefined();
  });

  it('2. Health Capability: Links ABHA records and creates signed ABDM electronic consent artifact', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('health.link_abha_records')!;

    const result = await capability.execute({
      citizenId: PRIYA_SHARMA_ID,
      abhaAddress: 'priya@abdm',
      purpose: 'CARE_MANAGEMENT',
      consentExpiryDays: 30,
    });

    expect(result.success).toBe(true);
    expect(result.abhaAddress).toBe('priya@abdm');
    expect(result.consentArtifactId).toBeDefined();
    expect(result.linkedRecordsCount).toBeGreaterThanOrEqual(1);
    expect(result.records[0].recordType).toBe('DISCHARGE_SUMMARY');
  });

  it('3. Banking Capability: Issues RBI AA electronic consent artifact and retrieves financial statement summary', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('banking.account_aggregator_consent')!;

    const result = await capability.execute({
      citizenId: PRIYA_SHARMA_ID,
      fipId: 'FIP_HDFC_BANK',
      accountMasked: 'XXXX-XXXX-4928',
      purposeCode: 'TAX_AUDIT_RECONCILIATION',
      dataTypes: ['TRANSACTIONS', 'SUMMARY'],
      validityDays: 14,
    });

    expect(result.success).toBe(true);
    expect(result.fipId).toBe('FIP_HDFC_BANK');
    expect(result.consentArtifactId).toBeDefined();
    expect(result.statementSummary.closingBalanceInr).toBe(384250);
    expect(result.statementSummary.verifiedTdsTransactionsCount).toBe(4);
  });

  it('4. Education Capability: Verifies APAAR ID against Academic Bank of Credits (ABC) repository', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('education.verify_apaar_id')!;

    const result = await capability.execute({
      citizenId: PRIYA_SHARMA_ID,
      apaarId: 'APAAR-560038-99124',
    });

    expect(result.success).toBe(true);
    expect(result.apaarId).toBe('APAAR-560038-99124');
    expect(result.academicCreditsTotal).toBe(160);
    expect(result.qualifications.length).toBeGreaterThanOrEqual(1);
    expect(result.qualifications[0].degreeName).toContain('Bachelor of Technology');
  });

  it('5. Judiciary Capability: Queries National Judicial Data Grid (NJDG) for civil litigation & title clearance', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('judiciary.check_ecourts_status')!;

    // Query for Aarav's agricultural land parcel in Satara
    const result = await capability.execute({
      citizenId: AARAV_PATEL_ID,
      queryType: 'PROPERTY_ENCUMBRANCE',
      queryValue: 'SURVEY-142/B-SATARA',
      state: 'Maharashtra',
      district: 'Satara',
    });

    expect(result.success).toBe(true);
    expect(result.encumbranceFound).toBe(false);
    expect(result.clearanceCertificateIssued).toBe(true);
    expect(result.caseDetails.length).toBeGreaterThanOrEqual(1);
    expect(result.caseDetails[0].status).toBe('DISPOSED_CLEARANCE_ISSUED');
  });

  it('6. Universal Status Service: Normalizes disparate statutory states to 15 canonical states', () => {
    expect(UniversalStatusService.normalizeStatus('INITIALIZED')).toBe('DRAFT');
    expect(UniversalStatusService.normalizeStatus('DISCREPANCY_DETECTED')).toBe('ACTION_REQUIRED');
    expect(UniversalStatusService.normalizeStatus('AWAITING_CONSENT')).toBe('AWAITING_AUTHORIZATION');
    expect(UniversalStatusService.normalizeStatus('PENDING_RTO')).toBe('UNDER_REVIEW');
    expect(UniversalStatusService.normalizeStatus('BIOMETRIC_PENDING')).toBe('VERIFICATION');
    expect(UniversalStatusService.normalizeStatus('CHALLAN_PENDING')).toBe('PAYMENT_REQUIRED');
    expect(UniversalStatusService.normalizeStatus('DISPOSED_CLEARANCE_ISSUED')).toBe('APPROVED');
    expect(UniversalStatusService.normalizeStatus('SETTLED')).toBe('COMPLETED');
    expect(UniversalStatusService.normalizeStatus('DEPENDENCY_BLOCKED')).toBe('BLOCKED');
    expect(UniversalStatusService.normalizeStatus('DORMANT')).toBe('EXPIRED');
    expect(UniversalStatusService.normalizeStatus('ROLLED_BACK')).toBe('FAILED');
  });

  it('7. Action Center Service: Aggregates active findings, obligations, and consent artifacts', async () => {
    const service = ActionCenterService.getInstance();
    const feed = await service.getActionCenterFeed(PRIYA_SHARMA_ID);

    expect(feed.items).toBeDefined();
    expect(feed.summary).toBeDefined();
    expect(feed.summary.totalActionable).toBeGreaterThanOrEqual(1);

    // Verify all items have valid canonical status and urgency
    for (const item of feed.items) {
      expect(item.canonicalStatus).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(item.urgency);
      expect(item.priorityScore).toBeGreaterThanOrEqual(0);
    }
  });
});
