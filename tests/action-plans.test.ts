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
  registerDefaultCapabilities,
  CapabilityExecutor,
} from '@indra/capability-engine';
import {
  ActionPlanEngine,
  ConsequenceGraphEngine,
  validateGraphDefinition,
  type ConsequenceGraphDefinition,
} from '@indra/policy-engine';

describe('Phase 3.3 Forensic Security & Architectural Certification Suite', () => {
  let engine: ActionPlanEngine;
  let capabilityExecutor: CapabilityExecutor;

  beforeAll(() => {
    registerDefaultCapabilities();
    capabilityExecutor = new CapabilityExecutor();
    engine = ActionPlanEngine.getInstance();
    engine.setStepExecutor(capabilityExecutor);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // =========================================================================
  // 1. ACTION PLAN AUTHORIZATION VS STATUTORY AUTHORIZATION (AUDIT 1)
  // =========================================================================
  describe('Audit 1: Action Plan Authorization vs Statutory Authorization', () => {
    it('proves Action Plan approval DOES NOT grant blanket statutory capability authorization', async () => {
      const plan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        {
          destinationCity: 'Pune',
          destinationState: 'Maharashtra',
        },
        { forceRecreate: true }
      );

      // Plan is in DISCOVERED / active state
      expect(plan.state).toBe('DISCOVERED');

      // Attempting to execute sensitive statutory step (Aadhaar address update)
      // WITHOUT explicit capability authorization (authorize: false) MUST be rejected!
      const unauthResult = await engine.executeStep({
        planId: plan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: false, // NO statutory authorization
      });

      expect(unauthResult.success).toBe(false);
      expect(unauthResult.error).toMatch(/requires explicit statutory authorization/);
      expect(unauthResult.executedStep.state).toBe('READY'); // Must remain READY, not COMPLETED!

      // When explicit human authorization is granted (authorize: true), capability executes
      const authResult = await engine.executeStep({
        planId: plan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true, // EXPLICIT STATUTORY AUTHORIZATION
      });

      expect(authResult.success).toBe(true);
      expect(authResult.executedStep.state).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // 2. PARTIAL PLAN AUTHORIZATION & SKIPPED STEPS (AUDIT 2)
  // =========================================================================
  describe('Audit 2: Partial Plan Authorization & Step Skipping', () => {
    it('allows citizen to selectively omit optional consequences during plan generation', async () => {
      // Citizen omits voter registration and vehicle RC
      const partialPlan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        {
          destinationCity: 'Pune',
          destinationState: 'Maharashtra',
        },
        {
          omittedStepKeys: ['transfer_voter_constituency', 'transfer_vehicle_rc'],
          forceRecreate: true,
        }
      );

      const voterStep = partialPlan.steps.find(
        (s) => s.stepKey === 'transfer_voter_constituency'
      )!;
      expect(voterStep.state).toBe('SKIPPED');

      const vehicleStep = partialPlan.steps.find(
        (s) => s.stepKey === 'transfer_vehicle_rc'
      )!;
      expect(vehicleStep.state).toBe('SKIPPED');

      // Execute Step 1 (Aadhaar)
      const res1 = await engine.executeStep({
        planId: partialPlan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
      });

      // Verify that completed Step 1 DOES NOT transition SKIPPED steps to READY!
      const voterAfter = res1.actionPlan.steps.find(
        (s) => s.stepKey === 'transfer_voter_constituency'
      )!;
      expect(voterAfter.state).toBe('SKIPPED'); // Remains strictly SKIPPED

      // Non-omitted dependent step (DL endorsement) successfully transitioned to READY
      const dlAfter = res1.actionPlan.steps.find(
        (s) => s.stepKey === 'endorse_dl_address'
      )!;
      expect(dlAfter.state).toBe('READY');

      // Attempting to execute a SKIPPED step directly is rejected
      await expect(
        engine.executeStep({
          planId: partialPlan.id,
          stepKey: 'transfer_voter_constituency',
          citizenId: PRIYA_SHARMA_ID,
          authorize: true,
        })
      ).rejects.toThrow(/has been SKIPPED by citizen decision and cannot execute/);
    });

    it('allows citizen to skip an existing READY or BLOCKED step via skipStep API', async () => {
      const plan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        {
          destinationCity: 'Pune',
        },
        { forceRecreate: true }
      );

      const skipRes = await engine.skipStep({
        planId: plan.id,
        stepKey: 'endorse_dl_address',
        citizenId: PRIYA_SHARMA_ID,
        reason: 'Citizen does not plan to drive in destination jurisdiction',
      });

      expect(skipRes.success).toBe(true);
      expect(skipRes.skippedStep.state).toBe('SKIPPED');

      // Cannot skip an already completed step
      await engine.executeStep({
        planId: plan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
      });

      await expect(
        engine.skipStep({
          planId: plan.id,
          stepKey: 'update_aadhaar_address',
          citizenId: PRIYA_SHARMA_ID,
        })
      ).rejects.toThrow(/already COMPLETED/);
    });
  });

  // =========================================================================
  // 3. DEPENDENCY GRAPH INTEGRITY & MALFORMED GRAPH DEFENSES (AUDIT 3)
  // =========================================================================
  describe('Audit 3: Dependency Graph Integrity & Malformed Graph Rejections', () => {
    it('rejects circular dependencies in consequence graphs', () => {
      const cyclicalGraph: ConsequenceGraphDefinition = {
        lifeEventCode: 'RELOCATION',
        title: 'Cyclical Malformed Graph',
        summaryTemplate: () => 'Test',
        estimatedDays: 5,
        stepTemplates: [
          {
            stepKey: 'step_a',
            capabilityId: 'identity.update_aadhaar_address',
            title: 'Step A',
            authority: 'UIDAI',
            phaseIndex: 1,
            dependencies: ['step_b'], // A depends on B
            executionMode: 'AUTOMATED_SAFE_READ',
            estimatedDays: 1,
            statutoryFeeInr: 0,
            isApplicable: () => true,
            deriveInput: () => ({}),
          },
          {
            stepKey: 'step_b',
            capabilityId: 'transport.endorse_dl_address',
            title: 'Step B',
            authority: 'MoRTH',
            phaseIndex: 1,
            dependencies: ['step_a'], // B depends on A -> CYCLE!
            executionMode: 'AUTOMATED_SAFE_READ',
            estimatedDays: 1,
            statutoryFeeInr: 0,
            isApplicable: () => true,
            deriveInput: () => ({}),
          },
        ],
      };

      expect(() => validateGraphDefinition(cyclicalGraph)).toThrow(
        /Cycle detected in dependency graph/
      );
    });

    it('rejects self-dependencies in consequence graphs', () => {
      const selfDepGraph: ConsequenceGraphDefinition = {
        lifeEventCode: 'RELOCATION',
        title: 'Self Dep Graph',
        summaryTemplate: () => 'Test',
        estimatedDays: 5,
        stepTemplates: [
          {
            stepKey: 'step_self',
            capabilityId: 'identity.update_aadhaar_address',
            title: 'Self Step',
            authority: 'UIDAI',
            phaseIndex: 1,
            dependencies: ['step_self'], // Self-dependency!
            executionMode: 'AUTOMATED_SAFE_READ',
            estimatedDays: 1,
            statutoryFeeInr: 0,
            isApplicable: () => true,
            deriveInput: () => ({}),
          },
        ],
      };

      expect(() => validateGraphDefinition(selfDepGraph)).toThrow(
        /Self-dependency detected in step 'step_self'/
      );
    });

    it('rejects unknown dependency references', () => {
      const unknownDepGraph: ConsequenceGraphDefinition = {
        lifeEventCode: 'RELOCATION',
        title: 'Unknown Dep Graph',
        summaryTemplate: () => 'Test',
        estimatedDays: 5,
        stepTemplates: [
          {
            stepKey: 'step_normal',
            capabilityId: 'identity.update_aadhaar_address',
            title: 'Normal Step',
            authority: 'UIDAI',
            phaseIndex: 1,
            dependencies: ['phantom_nonexistent_step'], // Unknown dep!
            executionMode: 'AUTOMATED_SAFE_READ',
            estimatedDays: 1,
            statutoryFeeInr: 0,
            isApplicable: () => true,
            deriveInput: () => ({}),
          },
        ],
      };

      expect(() => validateGraphDefinition(unknownDepGraph)).toThrow(
        /Unknown dependency 'phantom_nonexistent_step'/
      );
    });

    it('rejects duplicate step keys', () => {
      const duplicateStepGraph: ConsequenceGraphDefinition = {
        lifeEventCode: 'RELOCATION',
        title: 'Duplicate Step Graph',
        summaryTemplate: () => 'Test',
        estimatedDays: 5,
        stepTemplates: [
          {
            stepKey: 'duplicate_key',
            capabilityId: 'identity.update_aadhaar_address',
            title: 'Step 1',
            authority: 'UIDAI',
            phaseIndex: 1,
            dependencies: [],
            executionMode: 'AUTOMATED_SAFE_READ',
            estimatedDays: 1,
            statutoryFeeInr: 0,
            isApplicable: () => true,
            deriveInput: () => ({}),
          },
          {
            stepKey: 'duplicate_key', // DUPLICATE!
            capabilityId: 'transport.endorse_dl_address',
            title: 'Step 2',
            authority: 'MoRTH',
            phaseIndex: 1,
            dependencies: [],
            executionMode: 'AUTOMATED_SAFE_READ',
            estimatedDays: 1,
            statutoryFeeInr: 0,
            isApplicable: () => true,
            deriveInput: () => ({}),
          },
        ],
      };

      expect(() => validateGraphDefinition(duplicateStepGraph)).toThrow(
        /Duplicate stepKey 'duplicate_key'/
      );
    });
  });

  // =========================================================================
  // 4. PLAN TAMPERING DEFENSE (AUDIT 4)
  // =========================================================================
  describe('Audit 4: Plan Tampering Defense', () => {
    it('prevents caller from spoofing citizenId in step execution input', async () => {
      const plan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        { destinationCity: 'Hyderabad' },
        { forceRecreate: true }
      );

      // Attempt to tamper with citizenId in overrideInput
      const res = await engine.executeStep({
        planId: plan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
        overrideInput: { citizenId: AARAV_PATEL_ID }, // Malicious spoof attempt
      });

      expect(res.success).toBe(true);
      // Verify the executed capability received Priya's authenticated citizenId, not Aarav's
      const db = await getDb();
      const addresses = await db
        .select()
        .from(schema.citizenAddresses)
        .where(eq(schema.citizenAddresses.citizenId, PRIYA_SHARMA_ID));
      expect(addresses.some((a) => a.city === 'Hyderabad')).toBe(true);

      // Aarav's address must NOT have changed
      const aaravAddresses = await db
        .select()
        .from(schema.citizenAddresses)
        .where(eq(schema.citizenAddresses.citizenId, AARAV_PATEL_ID));
      expect(aaravAddresses.some((a) => a.city === 'Hyderabad')).toBe(false);
    });
  });

  // =========================================================================
  // 5. CITIZEN ISOLATION & ACCESS CONTROL (AUDIT 5)
  // =========================================================================
  describe('Audit 5: Citizen Isolation & Security Boundary', () => {
    it('prevents cross-citizen plan inspection, execution, skipping, and dismissal', async () => {
      const priyaPlan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        { destinationCity: 'Pune' },
        { forceRecreate: true }
      );

      // 1. Aarav cannot get Priya's plan
      await expect(
        engine.getActionPlan(priyaPlan.id, AARAV_PATEL_ID)
      ).rejects.toThrow(/Forbidden: Access to action plan/);

      // 2. Aarav cannot execute Priya's plan step
      await expect(
        engine.executeStep({
          planId: priyaPlan.id,
          stepKey: 'update_aadhaar_address',
          citizenId: AARAV_PATEL_ID, // Unauthorized
          authorize: true,
        })
      ).rejects.toThrow(/Forbidden: Access to action plan/);

      // 3. Aarav cannot skip Priya's plan step
      await expect(
        engine.skipStep({
          planId: priyaPlan.id,
          stepKey: 'endorse_dl_address',
          citizenId: AARAV_PATEL_ID,
        })
      ).rejects.toThrow(/Forbidden: Access to action plan/);

      // 4. Aarav cannot dismiss Priya's proactive finding
      const priyaFindings = await engine.listProactiveFindings(PRIYA_SHARMA_ID);
      const priyaFindingId = priyaFindings[0].id;
      const dismissedByAarav = await engine.dismissFinding(
        priyaFindingId,
        AARAV_PATEL_ID
      );
      expect(dismissedByAarav).toBe(false); // Returns false, cannot touch other citizen's finding!
    });
  });

  // =========================================================================
  // 6. PROACTIVE FINDINGS READ-ONLY SAFETY (AUDIT 6)
  // =========================================================================
  describe('Audit 6: Proactive Findings Read-Only Safety', () => {
    it('proves proactive findings generation DOES NOT mutate statutory database state', async () => {
      const db = await getDb();

      // Snapshot statutory registry counts before findings generation
      const docsBefore = await db.select().from(schema.citizenDocuments);
      const addrsBefore = await db.select().from(schema.citizenAddresses);
      const vehsBefore = await db.select().from(schema.citizenVehicles);
      const epfoBefore = await db.select().from(schema.spiEpfoAccounts);

      // Execute proactive findings scan
      const findings = await engine.generateProactiveFindings(PRIYA_SHARMA_ID);
      expect(findings.length).toBeGreaterThan(0);

      // Snapshot after
      const docsAfter = await db.select().from(schema.citizenDocuments);
      const addrsAfter = await db.select().from(schema.citizenAddresses);
      const vehsAfter = await db.select().from(schema.citizenVehicles);
      const epfoAfter = await db.select().from(schema.spiEpfoAccounts);

      expect(docsAfter.length).toBe(docsBefore.length);
      expect(addrsAfter.length).toBe(addrsBefore.length);
      expect(vehsAfter.length).toBe(vehsBefore.length);
      expect(epfoAfter.length).toBe(epfoBefore.length);
    });
  });

  // =========================================================================
  // 7. PROACTIVE FINDINGS DERIVATION CORRECTNESS (AUDIT 7)
  // =========================================================================
  describe('Audit 7: Dynamic Proactive Finding Correctness under State Mutation', () => {
    it('dynamically adapts proactive findings when underlying world state mutates', async () => {
      const db = await getDb();

      // Initial state: Priya has expiring passport
      const initial = await engine.generateProactiveFindings(PRIYA_SHARMA_ID);
      expect(initial.some((f) => f.findingType === 'CREDENTIAL_EXPIRY')).toBe(true);

      // Mutation 1: Extend Priya's passport expiry to 2038 (12 years in future)
      await db
        .update(schema.citizenCredentials)
        .set({ expiryDate: '2038-09-14' })
        .where(
          and(
            eq(schema.citizenCredentials.citizenId, PRIYA_SHARMA_ID),
            eq(schema.citizenCredentials.type, 'PASSPORT')
          )
        );

      // Regenerate findings
      const afterPassportRenew = await engine.generateProactiveFindings(PRIYA_SHARMA_ID);
      expect(
        afterPassportRenew.some((f) => f.findingType === 'CREDENTIAL_EXPIRY')
      ).toBe(false); // Finding vanished because passport is now valid for 12 years!

      // Mutation 2: Give Priya an agricultural land parcel in Maharashtra
      await db.insert(schema.citizenProperties).values({
        citizenId: PRIYA_SHARMA_ID,
        propertyType: 'AGRICULTURAL_LAND',
        identifier: 'SUR-PUN-7712',
        municipalBody: 'Satara Zilla Parishad',
        address: 'Gat No. 42, Karad, Satara, Maharashtra',
        state: 'Maharashtra',
        annualTaxInr: 1200,
        taxPaymentStatus: 'PAID',
      });

      // Regenerate findings
      const afterLandGrant = await engine.generateProactiveFindings(PRIYA_SHARMA_ID);
      expect(
        afterLandGrant.some((f) => f.findingType === 'BENEFIT_ELIGIBILITY')
      ).toBe(true); // PM-KISAN eligibility finding immediately detected!
    });
  });

  // =========================================================================
  // 8. PROVENANCE OF CONSEQUENCE DISCOVERY (AUDIT 8)
  // =========================================================================
  describe('Audit 8: Provenance Distinction for Discovered Consequences', () => {
    it('records consequence plans as INFERENCE / policy derivation rather than registry FACT', async () => {
      const plan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        { destinationCity: 'Pune' },
        { forceRecreate: true }
      );

      const prov = (plan.contextData as any)?.provenance;
      expect(prov).toBeDefined();
      expect(prov.provenanceType).toBe('INFERENCE');
      expect(prov.isAuthoritativeRegistryFact).toBe(false);
      expect(prov.sourceAuthority).toContain('Policy Engine');
    });
  });

  // =========================================================================
  // 9. LIFE EVENT DEDUPLICATION & IDEMPOTENCY POLICY (AUDIT 9)
  // =========================================================================
  describe('Audit 9: Life Event Deduplication & Idempotency', () => {
    it('returns existing active action plan when called repeatedly without forceRecreate', async () => {
      const plan1 = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        { destinationCity: 'Pune' },
        { forceRecreate: true }
      );

      // Call generate again for the same citizen and life event
      const plan2 = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        { destinationCity: 'Pune' }
      );

      // Must return existing plan with idempotency hit!
      expect(plan2.id).toBe(plan1.id);
      expect(plan2.idempotencyHit).toBe(true);

      const db = await getDb();
      const allPriyaPlans = await db
        .select()
        .from(schema.actionPlans)
        .where(
          and(
            eq(schema.actionPlans.citizenId, PRIYA_SHARMA_ID),
            eq(schema.actionPlans.lifeEventCode, 'RELOCATION')
          )
        );
      expect(allPriyaPlans.length).toBe(1); // No duplicate rows created!
    });
  });

  // =========================================================================
  // 10. DURABLE RESUMPTION ACROSS RESTARTS (AUDIT 10)
  // =========================================================================
  describe('Audit 10: Durable Plan Resumption', () => {
    it('safely resumes plan execution without re-executing already completed steps', async () => {
      const plan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'RELOCATION',
        { destinationCity: 'Pune' },
        { forceRecreate: true }
      );

      // Execute Step 1
      const exec1 = await engine.executeStep({
        planId: plan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
      });
      expect(exec1.executedStep.state).toBe('COMPLETED');

      // Re-invoke Step 1 (simulating duplicate request or browser refresh)
      const exec1Duplicate = await engine.executeStep({
        planId: plan.id,
        stepKey: 'update_aadhaar_address',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
      });

      expect(exec1Duplicate.success).toBe(true);
      expect(exec1Duplicate.resumed).toBe(true); // Resumed without redundant capability mutation!
    });
  });

  // =========================================================================
  // 11. FAILURE & COMPENSATION LOGGING (AUDIT 11)
  // =========================================================================
  describe('Audit 11: Failure & Multi-Step Compensation', () => {
    it('evaluates plan compensation in reverse order and distinguishes irreversible operations', async () => {
      const plan = await engine.generateActionPlan(
        PRIYA_SHARMA_ID,
        'START_BUSINESS',
        { companyName: 'CyberNova Systems Private Limited' },
        { forceRecreate: true }
      );

      // Execute Step 1: reserve_company_name (READ_ONLY)
      await engine.executeStep({
        planId: plan.id,
        stepKey: 'reserve_company_name',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
      });

      // Execute Step 2: incorporate_company (IRREVERSIBLE)
      await engine.executeStep({
        planId: plan.id,
        stepKey: 'incorporate_company',
        citizenId: PRIYA_SHARMA_ID,
        authorize: true,
      });

      // Citizen cancels plan / triggers rollback
      const compResult = await engine.compensatePlan({
        planId: plan.id,
        citizenId: PRIYA_SHARMA_ID,
        reason: 'Statutory filing dispute',
      });

      expect(compResult.success).toBe(true);
      expect(compResult.actionPlan.state).toBe('CANCELLED');

      // Irreversible incorporation MUST be recorded as IRREVERSIBLE_STATUTORY_RECORD, not falsely claimed as undone!
      const compLog = compResult.compensationLog;
      const incorpLog = compLog.find((l) => l.stepKey === 'incorporate_company');
      expect(incorpLog?.status).toBe('IRREVERSIBLE_STATUTORY_RECORD');
      expect(incorpLog?.detail).toContain('irreversible sovereign public record');
    });
  });
});
