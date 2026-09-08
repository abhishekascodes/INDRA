import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransitionExecutor,
  registerDefaultWorkflows,
} from '@indra/workflow-engine';
import {
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import {
  PropertySpiAdapter,
} from '@indra/spi-adapters';
import {
  seedDatabase,
  getDb,
  schema,
  eq,
  AARAV_PATEL_ID,
  PRIYA_SHARMA_ID,
} from '@indra/database';
import { CitizenWorldModelService } from '@indra/policy-engine';

describe('FLAGSHIP CITIZEN STATE-TRANSITION ENGINE (Complete End-to-End Proof: A to T)', () => {
  let transitionExecutor: TransitionExecutor;
  let propertyAdapter: PropertySpiAdapter;
  let wmService: CitizenWorldModelService;

  beforeEach(async () => {
    registerDefaultCapabilities();
    registerDefaultWorkflows();
    await seedDatabase();
    transitionExecutor = TransitionExecutor.getInstance();
    propertyAdapter = PropertySpiAdapter.getInstance();
    wmService = CitizenWorldModelService.getInstance();

    // Reset simulation fault injection to baseline nominal
    propertyAdapter.setSimulationMode({
      failNextRequest: false,
      simulateOutage: false,
      latencyMs: 0,
    });

    const db = await getDb();
    await db.delete(schema.capabilityRuns);
    await db.delete(schema.citizenStateTransitions);
    await db
      .insert(schema.syntheticOutageConfig)
      .values({
        id: 'GLOBAL_SIMULATION_CONFIG',
        failNextPropertyRequest: false,
        simulatePropertyOutage: false,
        injectDeedContradiction: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.syntheticOutageConfig.id,
        set: {
          failNextPropertyRequest: false,
          simulatePropertyOutage: false,
          injectDeedContradiction: true,
        },
      });
  });

  it('Proves the complete Flagship State Transition chain: A through T', async () => {
    const query = 'I moved to Bangalore and bought a plot in Devanahalli.';

    // =========================================================================
    // STEP A: REAL-WORLD INTENT
    // =========================================================================
    const initialTransition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query,
      context: {
        destinationCity: 'Bengaluru',
        destinationState: 'Karnataka',
        surveyNumber: '142/3',
        village: 'Devanahalli',
        documentNumber: 'KA-BLR-DEV-2026-00481',
        deedTransfereeName: 'Aarav Kumar Patel',
      },
    });

    expect(initialTransition).toBeDefined();
    expect(initialTransition.id).toBeDefined();
    expect(initialTransition.citizenId).toBe(AARAV_PATEL_ID);
    expect(initialTransition.initiatingQuery).toBe(query);
    expect(initialTransition.lifeEventCode).toBe('RELOCATION_PROPERTY_ACQUISITION');

    // =========================================================================
    // STEP B: UNDERSTAND CITIZEN WORLD
    // =========================================================================
    const preWorldModel = await wmService.getWorldModel(AARAV_PATEL_ID);
    expect(preWorldModel.profile.fullName).toBe('Aarav Patel');
    expect(preWorldModel.profile.currentCity).toBe('Pune');
    expect(preWorldModel.profile.currentState).toBe('Maharashtra');
    const hasInitialDevanahalli = preWorldModel.properties.some(
      (p) => p.identifier === '142/3'
    );
    expect(hasInitialDevanahalli).toBe(false);

    // =========================================================================
    // STEP C: DERIVE CONSEQUENCES
    // =========================================================================
    expect(initialTransition.proposedPlan.steps.length).toBe(6);
    const stepKeys = initialTransition.proposedPlan.steps.map((s) => s.stepKey);
    expect(stepKeys).toEqual([
      'update_aadhaar_address',
      'resolve_identity_discrepancy',
      'verify_encumbrance',
      'fetch_title_deed',
      'apply_mutation',
      'issue_residence_vc',
    ]);

    const authorities = Array.from(
      new Set(initialTransition.proposedPlan.steps.map((s) => s.authority))
    );
    expect(authorities.some((a) => a.includes('UIDAI'))).toBe(true);
    expect(authorities.some((a) => a.includes('Kaveri'))).toBe(true);
    expect(authorities.some((a) => a.includes('Bhoomi'))).toBe(true);

    // =========================================================================
    // STEP D: DETECT CONTRADICTIONS
    // =========================================================================
    expect(initialTransition.contradictions.length).toBeGreaterThanOrEqual(1);
    const nameMismatch = initialTransition.contradictions.find(
      (c) => c.field === 'transfereeLegalName'
    );
    expect(nameMismatch).toBeDefined();
    expect(nameMismatch?.severity).toBe('CRITICAL');
    expect(nameMismatch?.blockingStatus).toBe('BLOCKING');
    expect(nameMismatch?.resolutionState).toBe('UNRESOLVED');
    expect(nameMismatch?.blockedStepKeys).toContain('apply_mutation');

    // =========================================================================
    // STEP E: CONTRADICTION BLOCKS EXECUTION
    // =========================================================================
    expect(initialTransition.state).toBe('CONTRADICTION_BLOCKED');
    expect(initialTransition.executionCheckpoints['apply_mutation']?.state).toBe('BLOCKED');

    // Attempting to authorize or execute while contradiction is unresolved MUST fail
    await expect(
      transitionExecutor.authorizeTransition(initialTransition.id, AARAV_PATEL_ID)
    ).rejects.toThrow(/blocking contradictions remain unresolved/i);

    // Attempting to run execution loop while contradiction is unresolved must remain BLOCKED
    const blockedExecAttempt = await transitionExecutor.executeTransitionLoop(
      initialTransition.id,
      AARAV_PATEL_ID
    );
    expect(blockedExecAttempt.state).toBe('CONTRADICTION_BLOCKED');

    // =========================================================================
    // STEP F & G: RESOLVE CONTRADICTION -> UNBLOCK DEPENDENCIES
    // =========================================================================
    const unblockedTransition = await transitionExecutor.resolveContradiction(
      initialTransition.id,
      AARAV_PATEL_ID,
      nameMismatch!.id,
      'RESOLVE'
    );

    expect(unblockedTransition.state).toBe('AWAITING_AUTHORIZATION');
    const resolvedDeedContra = unblockedTransition.contradictions.find(
      (c) => c.id === nameMismatch!.id
    );
    expect(resolvedDeedContra?.resolutionState).toBe('RESOLVED');

    // =========================================================================
    // STEP H: AUTHORIZE (SOVEREIGN CRYPTOGRAPHIC CONSENT)
    // =========================================================================
    const authToken = transitionExecutor.generateAuthorizationToken(initialTransition.id);
    expect(authToken).toContain('AUTH-SIG');

    const authorizedTransition = await transitionExecutor.authorizeTransition(
      initialTransition.id,
      AARAV_PATEL_ID,
      authToken
    );

    expect(authorizedTransition.state).toBe('AUTHORIZED');
    expect(authorizedTransition.authorizationToken).toBe(authToken);
    expect(authorizedTransition.authorizedAt).toBeDefined();

    // =========================================================================
    // STEP I & J & K: EXECUTE -> CHECKPOINT PERSISTENCE -> SYNTHETIC FAILURE
    // =========================================================================
    // Induce deterministic outage on Bhoomi Land Records (503 Gateway Timeout)
    propertyAdapter.setSimulationMode({
      simulateOutage: true,
    });

    const suspendedTransition = await transitionExecutor.executeTransitionLoop(
      initialTransition.id,
      AARAV_PATEL_ID
    );

    // =========================================================================
    // STEP L: DURABLE SUSPENSION (FORWARD RECOVERY - NO TOTAL ROLLBACK)
    // =========================================================================
    expect(suspendedTransition.state).toBe('SUSPENDED');

    // Prior steps MUST NOT have been rolled back
    expect(suspendedTransition.executionCheckpoints['update_aadhaar_address']?.state).toBe('SUCCEEDED');
    expect(suspendedTransition.executionCheckpoints['resolve_identity_discrepancy']?.state).toBe('SUCCEEDED');
    expect(suspendedTransition.executionCheckpoints['verify_encumbrance']?.state).toBe('SUCCEEDED');
    expect(suspendedTransition.executionCheckpoints['fetch_title_deed']?.state).toBe('SUCCEEDED');

    // Failing step (apply_mutation) MUST be marked SUSPENDED with outage flag
    const suspendedStep = suspendedTransition.executionCheckpoints['apply_mutation'];
    expect(suspendedStep?.state).toBe('SUSPENDED');
    expect(suspendedStep?.isOutage).toBe(true);
    expect(suspendedStep?.errorReason).toContain('503 Gateway Timeout');

    // Downstream steps remain BLOCKED, not corrupt
    expect(suspendedTransition.executionCheckpoints['issue_residence_vc']?.state).toBe('BLOCKED');

    // =========================================================================
    // STEP M: RESTART PERSISTENCE (SURVIVES BROWSER / PROCESS RELOAD)
    // =========================================================================
    const reloadedTransition = await transitionExecutor.getTransition(
      initialTransition.id,
      AARAV_PATEL_ID
    );
    expect(reloadedTransition).toBeDefined();
    expect(reloadedTransition?.state).toBe('SUSPENDED');
    expect(reloadedTransition?.executionCheckpoints['update_aadhaar_address']?.state).toBe('SUCCEEDED');
    expect(reloadedTransition?.executionCheckpoints['apply_mutation']?.state).toBe('SUSPENDED');

    // =========================================================================
    // STEP N & O: OUTAGE CLEARED -> CHECKPOINT RESUME & IDEMPOTENT RETRY
    // =========================================================================
    propertyAdapter.setSimulationMode({
      simulateOutage: false,
      failNextRequest: false,
    });

    const completedTransition = await transitionExecutor.resumeTransition(
      initialTransition.id,
      AARAV_PATEL_ID
    );

    // =========================================================================
    // STEP P: THREE-TIER RECONCILIATION
    // =========================================================================
    expect(completedTransition.state).toBe('COMPLETED');
    expect(completedTransition.executionCheckpoints['apply_mutation']?.state).toBe('SUCCEEDED');
    expect(completedTransition.executionCheckpoints['issue_residence_vc']?.state).toBe('SUCCEEDED');

    expect(completedTransition.reconciliationState).toBeDefined();
    expect(completedTransition.reconciliationState?.isConverged).toBe(true);
    expect(completedTransition.reconciliationState?.entities.length).toBeGreaterThanOrEqual(2);
    expect(
      completedTransition.reconciliationState?.entities.every((e) => e.status === 'CONVERGED')
    ).toBe(true);

    // =========================================================================
    // STEP Q: UPDATE WORLD MODEL
    // =========================================================================
    const postWorldModel = await wmService.getWorldModel(AARAV_PATEL_ID);
    expect(postWorldModel.profile.currentCity).toBe('Bengaluru');
    expect(postWorldModel.profile.currentState).toBe('Karnataka');

    const devanahalliProperty = postWorldModel.properties.find(
      (p) => p.identifier === '142/3' || p.address.includes('Devanahalli')
    );
    expect(devanahalliProperty).toBeDefined();
    expect(devanahalliProperty?.state).toBe('Karnataka');
    expect(devanahalliProperty?.address).toContain('Devanahalli');

    // =========================================================================
    // STEP R: CIVIC TIMELINE AUDIT TRAIL
    // =========================================================================
    expect(completedTransition.timeline.length).toBeGreaterThanOrEqual(8);
    const stages = completedTransition.timeline.map((t) => t.stage);
    expect(stages).toContain('INTENT_UNDERSTOOD');
    expect(stages).toContain('CONSEQUENCE_ANALYSIS');
    expect(stages).toContain('CONTRADICTION_DETECTED');
    expect(stages).toContain('CONTRADICTION_RESOLVED');
    expect(stages).toContain('PLAN_AUTHORIZED');
    expect(stages).toContain('INSTITUTION_SUSPENDED');
    expect(stages).toContain('RESUMING');
    expect(stages).toContain('RECONCILED');

    // =========================================================================
    // STEP S: CROSS-CITIZEN ISOLATION BOUNDARY
    // =========================================================================
    const priyaAttempt = await transitionExecutor.getTransition(
      initialTransition.id,
      PRIYA_SHARMA_ID
    );
    expect(priyaAttempt).toBeNull();

    await expect(
      transitionExecutor.authorizeTransition(initialTransition.id, PRIYA_SHARMA_ID)
    ).rejects.toThrow(/not found/i);

    await expect(
      transitionExecutor.executeTransitionLoop(initialTransition.id, PRIYA_SHARMA_ID)
    ).rejects.toThrow(/not found/i);

    await expect(
      transitionExecutor.resumeTransition(initialTransition.id, PRIYA_SHARMA_ID)
    ).rejects.toThrow(/not found/i);

    // =========================================================================
    // STEP T: AUTHORIZATION REPLAY & EXPIRY DEFENSE
    // =========================================================================
    // 1. Replay token from another transition
    const anotherTransition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query: 'I relocated for work.',
      context: { overrideDeedContradiction: false },
    });

    await expect(
      transitionExecutor.authorizeTransition(
        anotherTransition.id,
        AARAV_PATEL_ID,
        authToken // Token was issued for initialTransition, not anotherTransition
      )
    ).rejects.toThrow(/Replayed authorization token/i);

    // 2. Expired token
    const expiredToken = `AUTH-SIG.${anotherTransition.id}.${Date.now() - 3600000}.${Date.now() - 1800000}.rand.sig`;
    await expect(
      transitionExecutor.authorizeTransition(
        anotherTransition.id,
        AARAV_PATEL_ID,
        expiredToken
      )
    ).rejects.toThrow(/expired/i);
  });
});
