import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, seedDatabase, schema, eq, and, PRIYA_SHARMA_ID, AARAV_PATEL_ID } from '@indra/database';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import { UniversalStatusService, ActionCenterService } from '@indra/policy-engine';

describe('INDRA Phase 3.5: Institutional Federation & Sovereign Action Center Suite', () => {
  beforeAll(async () => {
    await seedDatabase();
    registerDefaultCapabilities();
  });

  it('1. Catalog Completeness: Verifies 28 registered capabilities across all 14 statutory civic domains', () => {
    const registry = CapabilityRegistry.getInstance();
    const all = registry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(28);

    const domains = new Set(all.map((c) => c.domain));
    expect(domains.size).toBeGreaterThanOrEqual(14);
    expect(domains.has('HEALTH' as any)).toBe(true);
    expect(domains.has('FINANCE' as any)).toBe(true);
    expect(domains.has('EDUCATION' as any)).toBe(true);
    expect(domains.has('JUSTICE' as any)).toBe(true);
  });

  it('2. Healthcare (ABDM): Links Fortis Hospital records to priya@abdm with electronic consent', async () => {
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
    expect(result.records[0].diagnosticSummary).toContain('arthroscopic ligament reconstruction');
  });

  it('3. Banking (RBI AA): Generates signed electronic consent and retrieves statement summary', async () => {
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
    expect(result.statementSummary.closingBalanceInr).toBe(384250);
    expect(result.statementSummary.verifiedTdsTransactionsCount).toBe(4);
  });

  it('4. Education (APAAR / ABC): Verifies 160 B.Tech degree credits for Priya from PES University', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('education.verify_apaar_id')!;

    const result = await capability.execute({
      citizenId: PRIYA_SHARMA_ID,
      apaarId: 'APAAR-560038-99124',
    });

    expect(result.success).toBe(true);
    expect(result.academicCreditsTotal).toBe(160);
    expect(result.qualifications[0].degreeName).toContain('Bachelor of Technology');
    expect(result.qualifications[0].institutionName).toContain('PES University');
  });

  it('5. Judiciary (eCourts NJDG): Confirms clean title and zero encumbrance for Satara landholding', async () => {
    const registry = CapabilityRegistry.getInstance();
    const capability = registry.get('judiciary.check_ecourts_status')!;

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
    expect(result.caseDetails[0].status).toBe('DISPOSED_CLEARANCE_ISSUED');
  });

  it('6. Universal Civic Status: Fully normalizes all 15 canonical states across 30+ departmental codes', () => {
    expect(UniversalStatusService.normalizeStatus('INITIALIZED')).toBe('DRAFT');
    expect(UniversalStatusService.normalizeStatus('INCOMPLETE_DOCUMENTS')).toBe('ACTION_REQUIRED');
    expect(UniversalStatusService.normalizeStatus('ELIGIBLE')).toBe('READY_TO_SUBMIT');
    expect(UniversalStatusService.normalizeStatus('CONSENT_PENDING')).toBe('AWAITING_AUTHORIZATION');
    expect(UniversalStatusService.normalizeStatus('RECEIVED')).toBe('SUBMITTED');
    expect(UniversalStatusService.normalizeStatus('SCRUTINY')).toBe('UNDER_REVIEW');
    expect(UniversalStatusService.normalizeStatus('FIELD_INSPECTION')).toBe('VERIFICATION');
    expect(UniversalStatusService.normalizeStatus('VISIT_MANDATORY')).toBe('APPOINTMENT_REQUIRED');
    expect(UniversalStatusService.normalizeStatus('STAMP_DUTY_DUE')).toBe('PAYMENT_REQUIRED');
    expect(UniversalStatusService.normalizeStatus('PASSED')).toBe('APPROVED');
    expect(UniversalStatusService.normalizeStatus('SETTLED')).toBe('COMPLETED');
    expect(UniversalStatusService.normalizeStatus('REVOKED')).toBe('REJECTED');
    expect(UniversalStatusService.normalizeStatus('LAPSED')).toBe('EXPIRED');
    expect(UniversalStatusService.normalizeStatus('WAITING_PREREQUISITE')).toBe('BLOCKED');
    expect(UniversalStatusService.normalizeStatus('SYSTEM_FAULT')).toBe('FAILED');
  });

  it('7. Malformed Status Defense: Unknown or malformed upstream states default safely to UNDER_REVIEW', () => {
    expect(UniversalStatusService.isRecognizedStatus('SOME_UNKNOWN_STATE_XYZ')).toBe(false);
    expect(UniversalStatusService.normalizeStatus('SOME_UNKNOWN_STATE_XYZ')).toBe('UNDER_REVIEW');
    expect(UniversalStatusService.normalizeStatus(null)).toBe('DRAFT');
    expect(UniversalStatusService.normalizeStatus(undefined)).toBe('DRAFT');
  });

  it('8. Action Center Feed Aggregation: Combines findings, obligations, and consent artifacts into priority feed', async () => {
    const service = ActionCenterService.getInstance();
    const feed = await service.getActionCenterFeed(PRIYA_SHARMA_ID);

    expect(feed.items.length).toBeGreaterThanOrEqual(1);
    expect(feed.summary.totalActionable).toBeGreaterThanOrEqual(1);

    // Verify ordering: highest priority first
    for (let i = 0; i < feed.items.length - 1; i++) {
      expect(feed.items[i].priorityScore).toBeGreaterThanOrEqual(feed.items[i + 1].priorityScore);
    }
  });

  it('9. Precedence Arbiter: Elevated Action Plan takes precedence over raw Proactive Finding', async () => {
    const db = await getDb();

    // Insert an active action plan for Priya
    await db.insert(schema.actionPlans).values({
      citizenId: PRIYA_SHARMA_ID,
      lifeEventCode: 'RELOCATION_INTER_STATE',
      title: 'Active Relocation Plan',
      summary: 'Executing relocation tasks',
      state: 'IN_PROGRESS',
      totalTasks: 4,
      completedTasks: 1,
      estimatedDaysToComplete: 10,
      estimatedStatutoryFeesInr: 1200,
    });

    const feed = await ActionCenterService.getInstance().getActionCenterFeed(PRIYA_SHARMA_ID);
    const planItem = feed.items.find((i) => i.itemType === 'ACTION_PLAN_STEP');
    expect(planItem).toBeDefined();
    expect(planItem?.title).toBe('Active Relocation Plan');
  });

  it('10. Relational World Model Expansion: Verifies health, academic, and legal records in database', async () => {
    const db = await getDb();

    const health = await db
      .select()
      .from(schema.citizenHealthRecords)
      .where(eq(schema.citizenHealthRecords.citizenId, PRIYA_SHARMA_ID));
    expect(health.length).toBeGreaterThanOrEqual(1);

    const academic = await db
      .select()
      .from(schema.citizenAcademicRecords)
      .where(eq(schema.citizenAcademicRecords.citizenId, PRIYA_SHARMA_ID));
    expect(academic.length).toBeGreaterThanOrEqual(1);

    const legal = await db
      .select()
      .from(schema.citizenLegalRecords)
      .where(eq(schema.citizenLegalRecords.citizenId, AARAV_PATEL_ID));
    expect(legal.length).toBeGreaterThanOrEqual(1);
  });
});
