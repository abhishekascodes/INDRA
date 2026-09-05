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
  InvalidStateTransitionError,
} from '@indra/policy-engine';

describe('Phase 3.4 Adversarial Robustness & Architectural Invariants Suite', () => {
  let engine: ProactiveCitizenEngine;

  beforeAll(() => {
    engine = ProactiveCitizenEngine.getInstance();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // =========================================================================
  // 1. CONCURRENT SCANS & TRANSACTIONAL IDEMPOTENCY
  // =========================================================================
  describe('1. Concurrency & Transactional Idempotency', () => {
    it('safely handles simultaneous concurrent scans for the same citizen without duplicate rows', async () => {
      // Fire 5 concurrent scans simultaneously
      const scanPromises = [
        engine.scanCitizen(PRIYA_SHARMA_ID, 'EVENT_DRIVEN'),
        engine.scanCitizen(PRIYA_SHARMA_ID, 'TEMPORAL_SWEEP'),
        engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH'),
        engine.scanCitizen(PRIYA_SHARMA_ID, 'EVENT_DRIVEN'),
        engine.scanCitizen(PRIYA_SHARMA_ID, 'TEMPORAL_SWEEP'),
      ];

      const results = await Promise.all(scanPromises);
      expect(results.length).toBe(5);

      // Verify DB row count has no duplicate fingerprints
      const db = await getDb();
      const findings = await db
        .select()
        .from(schema.proactiveFindings)
        .where(eq(schema.proactiveFindings.citizenId, PRIYA_SHARMA_ID));

      const fingerprints = findings.map((f) => f.fingerprint);
      const uniqueFingerprints = new Set(fingerprints);
      expect(fingerprints.length).toBe(uniqueFingerprints.size); // Zero duplicate rows!
    });

    it('idempotently handles duplicate domain events without state corruption', async () => {
      // Deliver the same domain event 3 times
      const event = {
        type: 'CREDENTIAL_UPDATED',
        citizenId: PRIYA_SHARMA_ID,
      };

      await Promise.all([
        engine.handleDomainEvent(event),
        engine.handleDomainEvent(event),
        engine.handleDomainEvent(event),
      ]);

      const activeFindings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });
      expect(activeFindings.length).toBeGreaterThan(0);

      const db = await getDb();
      const findingsInDb = await db
        .select()
        .from(schema.proactiveFindings)
        .where(eq(schema.proactiveFindings.citizenId, PRIYA_SHARMA_ID));

      const fingerprints = findingsInDb.map((f) => f.fingerprint);
      expect(fingerprints.length).toBe(new Set(fingerprints).size);
    });

    it('rejects duplicate fingerprint insertion at database constraint level', async () => {
      const db = await getDb();
      const fingerprint = 'test_fingerprint_unique_collision_123';

      // Insert first row
      await db.insert(schema.proactiveFindings).values({
        citizenId: PRIYA_SHARMA_ID,
        fingerprint,
        category: 'OBLIGATION_DEADLINE',
        findingType: 'DEADLINE',
        ruleCode: 'RULE_TEST',
        urgency: 'HIGH',
        priorityScore: 80,
        status: 'ACTIVE',
        title: 'Test Finding 1',
        explanation: 'Test',
        actionableRecommendation: 'Test',
        structuredExplanation: {
          whatChanged: 'a',
          whyItMatters: 'b',
          whatIndraRecommends: 'c',
          whatCitizenMustAuthorize: 'd',
          whatHappensNext: 'e',
        },
        actionLink: {
          actionType: 'LAUNCH_WORKFLOW',
          targetCode: 'TEST',
          prefilledContext: {},
          requiresStatutoryAuthorization: false,
        },
      });

      // Attempt second insert with identical citizenId and fingerprint MUST violate unique index
      await expect(
        db.insert(schema.proactiveFindings).values({
          citizenId: PRIYA_SHARMA_ID,
          fingerprint,
          category: 'OBLIGATION_DEADLINE',
          findingType: 'DEADLINE',
          ruleCode: 'RULE_TEST',
          urgency: 'HIGH',
          priorityScore: 80,
          status: 'ACTIVE',
          title: 'Test Finding 2 (Duplicate)',
          explanation: 'Test',
          actionableRecommendation: 'Test',
          structuredExplanation: {
            whatChanged: 'a',
            whyItMatters: 'b',
            whatIndraRecommends: 'c',
            whatCitizenMustAuthorize: 'd',
            whatHappensNext: 'e',
          },
          actionLink: {
            actionType: 'LAUNCH_WORKFLOW',
            targetCode: 'TEST',
            prefilledContext: {},
            requiresStatutoryAuthorization: false,
          },
        })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 2. FINDING STATE MACHINE & ILLEGAL TRANSITIONS
  // =========================================================================
  describe('2. State Machine Transition Guardrails', () => {
    it('enforces legal lifecycle transitions and rejects illegal jumps', async () => {
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');
      const findings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });
      const finding = findings[0];

      // Legal: ACTIVE -> SNOOZED
      const snoozed = await engine.snoozeFinding(finding.id, PRIYA_SHARMA_ID, 7);
      expect(snoozed).toBe(true);

      // Illegal: RESOLVED -> SNOOZED
      const db = await getDb();
      await db
        .update(schema.proactiveFindings)
        .set({ status: 'RESOLVED' })
        .where(eq(schema.proactiveFindings.id, finding.id));

      await expect(
        engine.snoozeFinding(finding.id, PRIYA_SHARMA_ID, 7)
      ).rejects.toThrow(InvalidStateTransitionError);

      // Illegal: OBSOLETE -> IN_PROGRESS
      await db
        .update(schema.proactiveFindings)
        .set({ status: 'OBSOLETE' })
        .where(eq(schema.proactiveFindings.id, finding.id));

      await expect(
        engine.launchFindingAction(finding.id, PRIYA_SHARMA_ID)
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  // =========================================================================
  // 3. ACTION LINK INTEGRITY & CROSS-CITIZEN ISOLATION
  // =========================================================================
  describe('3. Action Link Integrity & Scoping', () => {
    it('launches finding action from server-authoritative state and denies cross-citizen access', async () => {
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');
      const priyaFindings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });
      const finding = priyaFindings[0];

      // Aarav attempts to launch Priya's finding action
      await expect(
        engine.launchFindingAction(finding.id, AARAV_PATEL_ID)
      ).rejects.toThrow(/access denied/);

      // Priya launches her own finding action
      const launchResult = await engine.launchFindingAction(finding.id, PRIYA_SHARMA_ID);
      expect(launchResult.finding.status).toBe('IN_PROGRESS');
      expect(launchResult.actionLink).toBeDefined();
      expect(launchResult.actionLink.targetCode).toBeTruthy();

      // Verify that the client cannot tamper with server-authoritative actionLink
      expect(launchResult.actionLink).toEqual(finding.actionLink);
    });
  });

  // =========================================================================
  // 4. POLICY / VERSIONED EXPLANATION PROVENANCE
  // =========================================================================
  describe('4. Policy Version & Provenance Audit', () => {
    it('verifies that every finding contains full policy-version provenance and simulation notice', async () => {
      await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');
      const findings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ACTIVE' });

      for (const finding of findings) {
        const prov = finding.policyProvenance;
        expect(prov).toBeDefined();
        expect(prov?.ruleCode).toBeTruthy();
        expect(prov?.ruleVersion).toBe('1.0.0');
        expect(prov?.statutoryDomain).toBeTruthy();
        expect(prov?.registryFact).toBeTruthy();
        expect(prov?.systemObservation).toBeTruthy();
        expect(prov?.policyDerivation).toBeTruthy();
        expect(prov?.isSimulationAssumption).toBe(true);
        expect(prov?.simulationDisclaimer).toContain('Simulated statutory policy derivation');
      }
    });
  });

  // =========================================================================
  // 5. PROACTIVE ENGINE SIDE-EFFECT BOUNDARY
  // =========================================================================
  describe('5. Side-Effect Safety Boundary', () => {
    it('proves the proactive engine cannot execute mutating capabilities or bypass citizen authorization', async () => {
      // Introspect the ProactiveCitizenEngine class
      const engineProto = Object.getPrototypeOf(engine);
      const methodNames = Object.getOwnPropertyNames(engineProto);

      // Verify NO capability execution methods exist on the engine
      expect(methodNames).not.toContain('executeCapability');
      expect(methodNames).not.toContain('executeWorkflow');
      expect(methodNames).not.toContain('mutateRegistry');

      // Run multiple sweeps
      await engine.runTemporalSweep([PRIYA_SHARMA_ID, AARAV_PATEL_ID]);

      // Verify that no workflow runs were created merely because a proactive finding was discovered
      const db = await getDb();
      const workflows = await db.select().from(schema.workflowRuns);
      expect(workflows.length).toBe(0); // ZERO workflows launched without citizen decision!
    });
  });

  // =========================================================================
  // 6. BACKGROUND SWEEPER BOUNDED CONCURRENCY & TIMEOUT SAFETY
  // =========================================================================
  describe('6. Background Sweeper Bounded Concurrency & Isolation', () => {
    it('isolates failures so one citizen failure never blocks or corrupts other citizens', async () => {
      // Pass a non-existent citizen UUID alongside valid citizen IDs
      const fakeCitizenId = '00000000-0000-0000-0000-000000000000';
      const summaries = await engine.runTemporalSweep([
        PRIYA_SHARMA_ID,
        fakeCitizenId,
        AARAV_PATEL_ID,
      ]);

      expect(summaries.length).toBe(3);

      const priyaSummary = summaries.find((s) => s.citizenId === PRIYA_SHARMA_ID);
      const aaravSummary = summaries.find((s) => s.citizenId === AARAV_PATEL_ID);
      const fakeSummary = summaries.find((s) => s.citizenId === fakeCitizenId);

      expect(priyaSummary?.status).toBe('SUCCESS');
      expect(aaravSummary?.status).toBe('SUCCESS');
      expect(fakeSummary?.status).toBe('FAILED');
      expect(fakeSummary?.errorDetails).toBeTruthy();
    });
  });
});
