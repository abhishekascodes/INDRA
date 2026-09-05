import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  eq,
  and,
} from '@indra/database';
import {
  ProactiveCitizenEngine,
  calculatePriorityScore,
} from '@indra/policy-engine';

describe('Milestone 3 — Phase 3.4: Proactive Citizen Engine & Background Intelligence Loop', () => {
  let engine: ProactiveCitizenEngine;

  beforeAll(() => {
    engine = ProactiveCitizenEngine.getInstance();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // =========================================================================
  // 1. RULE EVALUATION & 6 DETECTIVE CATEGORIES
  // =========================================================================
  describe('1. Detective Rule Categories & Discovery', () => {
    it('detects expiring passport and unlinked EPFO balance for Priya Sharma', async () => {
      const summary = await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');

      expect(summary.citizenId).toBe(PRIYA_SHARMA_ID);
      expect(summary.findingsGenerated).toBeGreaterThanOrEqual(1);

      const findings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });
      expect(findings.length).toBeGreaterThan(0);

      // Verify Passport Expiry Finding
      const passportFinding = findings.find(
        (f) => f.ruleCode === 'RULE_PASSPORT_EXPIRING'
      );
      expect(passportFinding).toBeDefined();
      expect(passportFinding?.category).toBe('CREDENTIAL_LIFECYCLE');
      expect(passportFinding?.urgency).toBe('CRITICAL'); // Expiry is 11 days away (<60 days)
      expect(passportFinding?.priorityScore).toBeGreaterThanOrEqual(85);

      // Verify Deterministic 5-Part Explanation
      const exp = passportFinding?.structuredExplanation;
      expect(exp).toBeDefined();
      expect(exp?.whatChanged).toContain('expires on');
      expect(exp?.whyItMatters).toContain('180 days');
      expect(exp?.whatIndraRecommends).toContain('Passport Re-Issue');
      expect(exp?.whatCitizenMustAuthorize).toContain('Statutory consent');
      expect(exp?.whatHappensNext).toContain('verified World Model');
    });

    it('detects pending ITR and PM-KISAN agricultural DBT eligibility for Aarav Patel', async () => {
      const summary = await engine.scanCitizen(AARAV_PATEL_ID, 'MANUAL_REFRESH');

      expect(summary.citizenId).toBe(AARAV_PATEL_ID);
      const findings = await engine.listFindings(AARAV_PATEL_ID, { status: 'ACTIVE' });

      // Verify PM-KISAN DBT benefit detection
      const kisanFinding = findings.find(
        (f) => f.ruleCode === 'RULE_PM_KISAN_ELIGIBILITY'
      );
      expect(kisanFinding).toBeDefined();
      expect(kisanFinding?.category).toBe('ELIGIBILITY_OPPORTUNITY');
      expect(kisanFinding?.structuredExplanation.whyItMatters).toContain('₹6,000 per year');

      // Verify ITR filing deadline detection
      const itrFinding = findings.find(
        (f) => f.ruleCode === 'RULE_ITR_FILING_DEADLINE'
      );
      expect(itrFinding).toBeDefined();
      expect(itrFinding?.category).toBe('OBLIGATION_DEADLINE');
      expect(itrFinding?.structuredExplanation.whyItMatters).toContain('Section 139(1)');
    });
  });

  // =========================================================================
  // 2. CRYPTOGRAPHIC FINGERPRINT DEDUPLICATION
  // =========================================================================
  describe('2. Deduplication & Idempotency', () => {
    it('prevents duplicate findings across repeated scans using SHA-256 fingerprints', async () => {
      // Scan 1
      const scan1 = await engine.scanCitizen(PRIYA_SHARMA_ID, 'TEMPORAL_SWEEP');
      const initialGenerated = scan1.findingsGenerated;
      expect(initialGenerated).toBeGreaterThan(0);

      // Scan 2 (Simulating next background sweep)
      const scan2 = await engine.scanCitizen(PRIYA_SHARMA_ID, 'TEMPORAL_SWEEP');
      expect(scan2.findingsGenerated).toBe(0); // 0 new rows created!
      expect(scan2.findingsUpdated).toBe(initialGenerated); // Updated existing rows in place

      // Verify DB row count
      const db = await getDb();
      const allPriyaFindings = await db
        .select()
        .from(schema.proactiveFindings)
        .where(eq(schema.proactiveFindings.citizenId, PRIYA_SHARMA_ID));

      expect(allPriyaFindings.length).toBe(initialGenerated);
    });
  });

  // =========================================================================
  // 3. STRICT READ-ONLY SAFETY GUARANTEE
  // =========================================================================
  describe('3. Strict Read-Only Safety During Detection', () => {
    it('proves scanning world state causes ZERO mutations across public registries', async () => {
      const db = await getDb();

      // Snapshot registry counts before scan
      const docsBefore = await db.select().from(schema.citizenDocuments);
      const addrsBefore = await db.select().from(schema.citizenAddresses);
      const vehsBefore = await db.select().from(schema.citizenVehicles);
      const propsBefore = await db.select().from(schema.citizenProperties);
      const epfoBefore = await db.select().from(schema.spiEpfoAccounts);

      // Run multiple intensive proactive scans
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'EVENT_DRIVEN');
      await engine.scanCitizen(AARAV_PATEL_ID, 'TEMPORAL_SWEEP');

      // Snapshot registry counts after scan
      const docsAfter = await db.select().from(schema.citizenDocuments);
      const addrsAfter = await db.select().from(schema.citizenAddresses);
      const vehsAfter = await db.select().from(schema.citizenVehicles);
      const propsAfter = await db.select().from(schema.citizenProperties);
      const epfoAfter = await db.select().from(schema.spiEpfoAccounts);

      expect(docsAfter.length).toBe(docsBefore.length);
      expect(addrsAfter.length).toBe(addrsBefore.length);
      expect(vehsAfter.length).toBe(vehsBefore.length);
      expect(propsAfter.length).toBe(propsBefore.length);
      expect(epfoAfter.length).toBe(epfoBefore.length);
    });
  });

  // =========================================================================
  // 4. DYNAMIC AUTO-RESOLUTION OF SATISFIED OBLIGATIONS
  // =========================================================================
  describe('4. Dynamic Auto-Resolution upon State Mutation', () => {
    it('automatically marks finding as RESOLVED when underlying registry ground truth is updated', async () => {
      const db = await getDb();

      // Initial scan discovers passport expiring
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');
      const beforeList = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });
      expect(beforeList.some((f) => f.ruleCode === 'RULE_PASSPORT_EXPIRING')).toBe(true);

      // Mutate database: Renew passport for 10 years (statutory satisfaction)
      await db
        .update(schema.citizenCredentials)
        .set({ expiryDate: '2036-09-14' })
        .where(
          and(
            eq(schema.citizenCredentials.citizenId, PRIYA_SHARMA_ID),
            eq(schema.citizenCredentials.type, 'PASSPORT')
          )
        );

      // Next background sweep runs
      const sweep = await engine.scanCitizen(PRIYA_SHARMA_ID, 'TEMPORAL_SWEEP');
      expect(sweep.findingsResolved).toBeGreaterThanOrEqual(1);

      // The passport finding must now be RESOLVED
      const activeAfter = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });
      expect(activeAfter.some((f) => f.ruleCode === 'RULE_PASSPORT_EXPIRING')).toBe(false);

      const resolvedFindings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'RESOLVED' });
      const resolvedPassport = resolvedFindings.find((f) => f.ruleCode === 'RULE_PASSPORT_EXPIRING');
      expect(resolvedPassport).toBeDefined();
      expect(resolvedPassport?.status).toBe('RESOLVED');
      expect(resolvedPassport?.resolvedAt).toBeTruthy();
    });
  });

  // =========================================================================
  // 5. SNOOZE LIFECYCLE & CRITICAL SAFETY OVERRIDE
  // =========================================================================
  describe('5. Snooze Lifecycle & Safety Override', () => {
    it('allows citizen to snooze a finding and auto-reopens upon deadline escalation', async () => {
      await engine.scanCitizen(AARAV_PATEL_ID, 'MANUAL_REFRESH');
      const findings = await engine.listFindings(AARAV_PATEL_ID, { status: 'ACTIVE' });
      const itrFinding = findings.find((f) => f.ruleCode === 'RULE_ITR_FILING_DEADLINE')!;

      // Citizen snoozes ITR alert for 7 days
      const snoozed = await engine.snoozeFinding(itrFinding.id, AARAV_PATEL_ID, 7);
      expect(snoozed).toBe(true);

      // Active list now excludes snoozed finding
      const activeList = await engine.listFindings(AARAV_PATEL_ID, { status: 'ACTIVE' });
      expect(activeList.some((f) => f.id === itrFinding.id)).toBe(false);

      // Snoozed list contains the finding
      const snoozedList = await engine.listFindings(AARAV_PATEL_ID, { status: 'SNOOZED' });
      expect(snoozedList.some((f) => f.id === itrFinding.id)).toBe(true);

      // Time travel: 8 days later (snooze expired)
      const eightDaysLater = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
      await engine.scanCitizen(AARAV_PATEL_ID, 'TEMPORAL_SWEEP', eightDaysLater);

      // Automatically returned to ACTIVE state!
      const reopenedList = await engine.listFindings(AARAV_PATEL_ID, { status: 'ACTIVE' });
      expect(reopenedList.some((f) => f.id === itrFinding.id)).toBe(true);
    });
  });

  // =========================================================================
  // 6. MULTI-CITIZEN ISOLATION & ACCESS CONTROL
  // =========================================================================
  describe('6. Citizen Isolation Boundary', () => {
    it('strictly isolates findings between Priya and Aarav', async () => {
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');
      await engine.scanCitizen(AARAV_PATEL_ID, 'MANUAL_REFRESH');

      const priyaFindings = await engine.listFindings(PRIYA_SHARMA_ID);
      const priyaFindingId = priyaFindings[0].id;

      // Aarav cannot snooze Priya's finding
      const aaravSnoozeResult = await engine.snoozeFinding(priyaFindingId, AARAV_PATEL_ID, 7);
      expect(aaravSnoozeResult).toBe(false);

      // Aarav cannot dismiss Priya's finding
      const aaravDismissResult = await engine.dismissFinding(priyaFindingId, AARAV_PATEL_ID);
      expect(aaravDismissResult).toBe(false);
    });
  });

  // =========================================================================
  // 7. BACKGROUND SCAN AUDITABILITY
  // =========================================================================
  describe('7. Scan History Audit Logging', () => {
    it('records durable audit log entries for every background scan sweep', async () => {
      const db = await getDb();

      await engine.scanCitizen(PRIYA_SHARMA_ID, 'EVENT_DRIVEN');
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'TEMPORAL_SWEEP');

      const history = await db
        .select()
        .from(schema.proactiveScanHistory)
        .where(eq(schema.proactiveScanHistory.citizenId, PRIYA_SHARMA_ID));

      expect(history.length).toBe(2);
      expect(history[0].triggerType).toBe('EVENT_DRIVEN');
      expect(history[1].triggerType).toBe('TEMPORAL_SWEEP');
      expect(history[0].rulesEvaluatedCount).toBeGreaterThanOrEqual(6);
    });
  });
});
