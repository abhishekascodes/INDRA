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

describe('INDRA: Citizen State-Transition Engine (Flagship Leap)', () => {
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
  });

  it('A. Derives dynamic consequence graph from real-world citizen life event', async () => {
    const query = 'I moved to Bangalore and bought a plot in Devanahalli.';
    const transition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query,
    });

    expect(transition).toBeDefined();
    expect(transition.citizenId).toBe(AARAV_PATEL_ID);
    expect(transition.lifeEventCode).toBe('RELOCATION_PROPERTY_ACQUISITION');
    expect(transition.proposedPlan.steps.length).toBeGreaterThanOrEqual(5);

    // Verify key institutional steps derived in topological order
    const stepKeys = transition.proposedPlan.steps.map((s) => s.stepKey);
    expect(stepKeys).toContain('update_aadhaar_address');
    expect(stepKeys).toContain('resolve_identity_discrepancy');
    expect(stepKeys).toContain('verify_encumbrance');
    expect(stepKeys).toContain('fetch_title_deed');
    expect(stepKeys).toContain('apply_mutation');
  });

  it('B & C. First-class Contradiction Engine flags name discrepancy and blocks unsafe mutation', async () => {
    const query = 'I moved to Bangalore and bought a plot in Devanahalli.';
    const transition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query,
      context: {
        deedTransfereeName: 'Aarav Kumar Patel', // Intentionally mismatched with Aadhaar "Aarav Patel"
        overrideDeedContradiction: true,
      },
    });

    // Contradiction detected
    expect(transition.contradictions.length).toBeGreaterThan(0);
    const deedContra = transition.contradictions.find(
      (c) => c.field === 'transfereeLegalName'
    );
    expect(deedContra).toBeDefined();
    expect(deedContra?.severity).toBe('CRITICAL');
    expect(deedContra?.blockingStatus).toBe('BLOCKING');
    expect(deedContra?.blockedStepKeys).toContain('apply_mutation');
    expect(transition.state).toBe('CONTRADICTION_BLOCKED');

    // Execution checkpoints: apply_mutation must be marked BLOCKED
    expect(transition.executionCheckpoints['apply_mutation']?.state).toBe('BLOCKED');
  });

  it('D & E. Halts execution when contradiction is unresolved or authorization missing', async () => {
    const query = 'I moved to Bangalore and bought a plot in Devanahalli.';
    const transition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query,
      context: {
        deedTransfereeName: 'Aarav Kumar Patel',
        overrideDeedContradiction: true,
      },
    });

    // Attempting to execute directly while blocked by contradiction
    const attemptResult = await transitionExecutor.executeTransitionLoop(
      transition.id,
      AARAV_PATEL_ID
    );

    // Engine must not bypass contradiction
    expect(attemptResult.state).toBe('CONTRADICTION_BLOCKED');
    expect(attemptResult.executionCheckpoints['apply_mutation']?.state).toBe('BLOCKED');
  });

  it('F, G, H, I & J. Flagship End-to-End: Outage -> Durable Suspension -> Recovery -> Reconciliation', async () => {
    // 1. Initiate Transition
    const query = 'I moved to Bangalore and bought a plot in Devanahalli.';
    const transition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query,
      context: {
        deedTransfereeName: 'Aarav Kumar Patel',
        overrideDeedContradiction: true,
        destinationCity: 'Bengaluru',
        destinationState: 'Karnataka',
        surveyNumber: '142/3',
      },
    });

    expect(transition.state).toBe('CONTRADICTION_BLOCKED');

    // 2. Resolve the Contradiction by authorizing demographic identity harmonization
    const deedContra = transition.contradictions.find((c) => c.field === 'transfereeLegalName')!;
    const unblockedTransition = await transitionExecutor.resolveContradiction(
      transition.id,
      AARAV_PATEL_ID,
      deedContra.id,
      'RESOLVE'
    );

    expect(unblockedTransition.state).toBe('AWAITING_AUTHORIZATION');

    // 3. Citizen reviews and authorizes the statutory transition plan
    const authorizedTransition = await transitionExecutor.authorizeTransition(
      transition.id,
      AARAV_PATEL_ID,
      'AUTH-TOKEN-AARAV-FLAGSHIP-2026'
    );

    expect(authorizedTransition.state).toBe('AUTHORIZED');

    // 4. INDUCE DETERMINISTIC OUTAGE on Revenue Land Records (Bhoomi 503)
    propertyAdapter.setSimulationMode({
      simulateOutage: true,
    });

    // 5. Execute Transition Loop
    const suspendedTransition = await transitionExecutor.executeTransitionLoop(
      transition.id,
      AARAV_PATEL_ID
    );

    // 6. Verify FORWARD RECOVERY & DURABLE SUSPENSION semantics:
    // Engine must NOT report success.
    // Engine must NOT rollback completed steps!
    expect(suspendedTransition.state).toBe('SUSPENDED');
    expect(suspendedTransition.executionCheckpoints['update_aadhaar_address']?.state).toBe('SUCCEEDED');
    expect(suspendedTransition.executionCheckpoints['resolve_identity_discrepancy']?.state).toBe('SUCCEEDED');
    expect(suspendedTransition.executionCheckpoints['verify_encumbrance']?.state).toBe('SUCCEEDED');
    expect(suspendedTransition.executionCheckpoints['fetch_title_deed']?.state).toBe('SUCCEEDED');

    // The failing step (apply_mutation) must be durably SUSPENDED with outage details
    const mutationCp = suspendedTransition.executionCheckpoints['apply_mutation'];
    expect(mutationCp?.state).toBe('SUSPENDED');
    expect(mutationCp?.isOutage).toBe(true);
    expect(mutationCp?.errorReason).toContain('503 Gateway Timeout');

    // 7. SIMULATE BROWSER RELOAD / SERVER RESTART
    // Load fresh from database
    const reloaded = await transitionExecutor.getTransition(transition.id, AARAV_PATEL_ID);
    expect(reloaded).toBeDefined();
    expect(reloaded?.state).toBe('SUSPENDED');
    expect(reloaded?.executionCheckpoints['apply_mutation']?.state).toBe('SUSPENDED');
    expect(reloaded?.executionCheckpoints['update_aadhaar_address']?.state).toBe('SUCCEEDED');

    // 8. RESTORE INSTITUTION (Outage Cleared)
    propertyAdapter.setSimulationMode({
      simulateOutage: false,
      failNextRequest: false,
    });

    // 9. RESUME TRANSITION FROM SAVED CHECKPOINT
    const resumedTransition = await transitionExecutor.resumeTransition(
      transition.id,
      AARAV_PATEL_ID
    );

    // 10. RECONCILIATION & COMPLETION
    expect(resumedTransition.state).toBe('COMPLETED');
    expect(resumedTransition.executionCheckpoints['apply_mutation']?.state).toBe('SUCCEEDED');
    expect(resumedTransition.executionCheckpoints['issue_residence_vc']?.state).toBe('SUCCEEDED');

    // Verify 3-Tier Reconciliation Report
    expect(resumedTransition.reconciliationState).toBeDefined();
    expect(resumedTransition.reconciliationState?.isConverged).toBe(true);
    expect(resumedTransition.finalOutcome?.publicRecordUpdated).toBe(true);

    // 11. WORLD MODEL CONVERGENCE: Check updated public records for Aarav Patel
    const updatedWorldModel = await wmService.getWorldModel(AARAV_PATEL_ID);
    expect(updatedWorldModel.profile.currentCity).toBe('Bengaluru');
    expect(updatedWorldModel.profile.currentState).toBe('Karnataka');

    // Devanahalli property confirmed in authoritative world model
    const hasDevanahalliProperty = updatedWorldModel.properties.some(
      (p) => p.identifier === '142/3' || p.address.includes('Devanahalli')
    );
    expect(hasDevanahalliProperty).toBe(true);

    // Civic timeline complete and tamper-evident
    expect(resumedTransition.timeline.length).toBeGreaterThanOrEqual(8);
    const timelineStages = resumedTransition.timeline.map((t) => t.stage);
    expect(timelineStages).toContain('INSTITUTION_SUSPENDED');
    expect(timelineStages).toContain('RESUMING');
    expect(timelineStages).toContain('RECONCILED');
  });

  it('Q. Cross-citizen isolation: Denies access to another citizen\'s state transition', async () => {
    const transition = await transitionExecutor.initiateTransition({
      citizenId: AARAV_PATEL_ID,
      query: 'I moved to Bangalore and bought a plot.',
    });

    // Priya Sharma attempting to access Aarav Patel's transition
    const foreignAccess = await transitionExecutor.getTransition(
      transition.id,
      PRIYA_SHARMA_ID
    );

    expect(foreignAccess).toBeNull();
  });
});
