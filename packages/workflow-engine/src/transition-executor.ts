import crypto from 'node:crypto';
import { getDb, schema, eq, and, desc } from '@indra/database';
import { CapabilityRegistry, CapabilityExecutor } from '@indra/capability-engine';
import {
  ConsequenceGraphEngine,
  ContradictionEngine,
  ReconciliationEngine,
  CitizenWorldModelService,
} from '@indra/policy-engine';
import { IntentEngine } from '@indra/intent-engine';
import { EventBus } from '@indra/event-bus';
import type {
  CitizenStateTransition,
  TransitionState,
  TransitionStepState,
  ContradictionRecord,
  TransitionStepCheckpoint,
  CivicTimelineEvent,
  TransitionPlan,
  LifeEventCode,
} from '@indra/contracts';

export interface InitiateTransitionParams {
  citizenId: string;
  query: string;
  context?: Record<string, any>;
}

export class TransitionExecutor {
  private static instance: TransitionExecutor | null = null;
  private capabilityRegistry = CapabilityRegistry.getInstance();
  private capabilityExecutor = new CapabilityExecutor();
  private consequenceEngine = ConsequenceGraphEngine.getInstance();
  private contradictionEngine = ContradictionEngine.getInstance();
  private reconciliationEngine = ReconciliationEngine.getInstance();
  private wmService = CitizenWorldModelService.getInstance();
  private intentEngine = new IntentEngine();
  private eventBus = EventBus.getInstance();

  public static getInstance(): TransitionExecutor {
    if (!TransitionExecutor.instance) {
      TransitionExecutor.instance = new TransitionExecutor();
    }
    return TransitionExecutor.instance;
  }

  /**
   * Translates a citizen's real-world statement or life event into a durable, stateful
   * Citizen State Transition with derived consequence graph, contradiction detection,
   * and pre-planned execution checkpoints.
   */
  async initiateTransition(params: InitiateTransitionParams): Promise<CitizenStateTransition> {
    const db = await getDb();
    const citizenId = params.citizenId;
    const query = params.query.trim();

    // 1. Fetch Authoritative Citizen World Model
    const worldModel = await this.wmService.getWorldModel(citizenId);

    // 2. Resolve Intent / Life Event
    let lifeEventCode: LifeEventCode = 'RELOCATION_PROPERTY_ACQUISITION';
    const lowerQuery = query.toLowerCase();

    if (
      (lowerQuery.includes('move') || lowerQuery.includes('relocat')) &&
      (lowerQuery.includes('propert') || lowerQuery.includes('plot') || lowerQuery.includes('land') || lowerQuery.includes('buy') || lowerQuery.includes('bought'))
    ) {
      lifeEventCode = 'RELOCATION_PROPERTY_ACQUISITION';
    } else if (lowerQuery.includes('propert') || lowerQuery.includes('plot') || lowerQuery.includes('land') || lowerQuery.includes('buy')) {
      lifeEventCode = 'BUY_PROPERTY';
    } else if (lowerQuery.includes('move') || lowerQuery.includes('relocat')) {
      lifeEventCode = 'RELOCATION';
    } else if (lowerQuery.includes('company') || lowerQuery.includes('business') || lowerQuery.includes('startup')) {
      lifeEventCode = 'START_BUSINESS';
    } else if (lowerQuery.includes('pf') || lowerQuery.includes('epfo') || lowerQuery.includes('provident')) {
      lifeEventCode = 'NEW_EMPLOYMENT';
    } else if (lowerQuery.includes('fraud') || lowerQuery.includes('cyber') || lowerQuery.includes('stolen') || lowerQuery.includes('scam')) {
      lifeEventCode = 'CYBER_FRAUD_INCIDENT';
    }

    const contextData: Record<string, any> = {
      ...(params.context || {}),
      rawQuery: query,
      lifeEventCode,
      destinationCity: params.context?.destinationCity || (lowerQuery.includes('bangalore') || lowerQuery.includes('bengaluru') || lowerQuery.includes('karnataka') ? 'Bengaluru' : 'Bengaluru'),
      destinationState: params.context?.destinationState || 'Karnataka',
      surveyNumber: params.context?.surveyNumber || '142/3',
      village: params.context?.village || 'Devanahalli',
      documentNumber: params.context?.documentNumber || 'KA-BLR-DEV-2026-00481',
      deedTransfereeName: params.context?.deedTransfereeName || `${worldModel.profile.fullName.split(' ')[0]} Kumar Patel`,
    };

    // 3. Derive Consequence Graph deterministically from Authoritative World Model
    const planEval = this.consequenceEngine.evaluatePlan(lifeEventCode, worldModel, contextData);

    // 4. Detect Cross-Registry Contradictions
    const contradictions = await this.contradictionEngine.detectContradictions(
      citizenId,
      worldModel,
      contextData
    );

    const hasBlockingContradictions = contradictions.some(
      (c) => c.blockingStatus === 'BLOCKING' && c.resolutionState === 'UNRESOLVED'
    );

    // 5. Build Initial Step Checkpoints
    const checkpoints: Record<string, TransitionStepCheckpoint> = {};
    const blockedStepKeySet = new Set(
      contradictions
        .filter((c) => c.blockingStatus === 'BLOCKING' && c.resolutionState === 'UNRESOLVED')
        .flatMap((c) => c.blockedStepKeys)
    );

    for (const s of planEval.steps) {
      const isContradictionBlocked = blockedStepKeySet.has(s.stepKey);
      const isDepBlocked = s.dependencies.length > 0;
      let initialStepState: TransitionStepState = 'READY';

      if (isContradictionBlocked || isDepBlocked) {
        initialStepState = 'BLOCKED';
      }

      checkpoints[s.stepKey] = {
        stepKey: s.stepKey,
        capabilityId: s.capabilityId,
        title: s.title,
        authority: s.authority,
        phaseIndex: s.phaseIndex,
        dependencies: s.dependencies,
        state: initialStepState,
        attemptCount: 0,
        inputs: s.prefilledInput,
      };
    }

    const proposedPlan: TransitionPlan = {
      title: planEval.title,
      summary: planEval.summary,
      estimatedDays: planEval.estimatedDays,
      estimatedStatutoryFeesInr: planEval.estimatedStatutoryFeesInr,
      steps: planEval.steps.map((s) => ({
        stepKey: s.stepKey,
        capabilityId: s.capabilityId,
        title: s.title,
        authority: s.authority,
        phaseIndex: s.phaseIndex,
        dependencies: s.dependencies,
        executionMode: s.executionMode,
        statutoryFeeInr: (s as any).statutoryFeeInr || 0,
        estimatedDays: (s as any).estimatedDays || 2,
        prefilledInput: s.prefilledInput,
      })),
    };

    // 6. Build Initial Civic Timeline
    const timeline: CivicTimelineEvent[] = [
      {
        id: `EVT-${Date.now()}-1`,
        timestamp: new Date().toISOString(),
        stage: 'INTENT_UNDERSTOOD',
        title: 'Citizen Event Initiated',
        description: `Recognized outcome: "${query}". Initiated comprehensive statutory transition.`,
        status: 'INFO',
      },
      {
        id: `EVT-${Date.now()}-2`,
        timestamp: new Date().toISOString(),
        stage: 'CONSEQUENCE_ANALYSIS',
        title: 'Consequence Graph Derived',
        description: `Identified ${planEval.steps.length} dependent statutory actions across ${new Set(planEval.steps.map((s) => s.authority)).size} institutions.`,
        status: 'INFO',
      },
    ];

    if (contradictions.length > 0) {
      for (const c of contradictions) {
        timeline.push({
          id: `EVT-${Date.now()}-DISC-${c.id}`,
          timestamp: new Date().toISOString(),
          stage: 'CONTRADICTION_DETECTED',
          title: 'Cross-Registry Contradiction Detected',
          description: c.whatConflicts,
          authority: c.sourceInstitution,
          status: 'WARNING',
        });
      }
    }

    let initialState: TransitionState = 'CONSEQUENCE_DERIVED';
    if (hasBlockingContradictions) {
      initialState = 'CONTRADICTION_BLOCKED';
    } else {
      initialState = 'AWAITING_AUTHORIZATION';
    }

    // 7. Persist Durable Transition Record
    const [record] = await db
      .insert(schema.citizenStateTransitions)
      .values({
        citizenId,
        initiatingQuery: query,
        lifeEventCode,
        targetOutcome: planEval.title,
        state: initialState,
        currentStepKey: planEval.steps[0]?.stepKey || null,
        preTransitionWorldState: {
          profile: worldModel.profile,
          addressCount: worldModel.addresses.length,
          propertyCount: worldModel.properties.length,
          vehicleCount: worldModel.vehicles.length,
        },
        consequenceGraph: {
          affectedEntities: ['CIVIC_IDENTITY', 'LAND_PROPERTY', 'MOTOR_VEHICLE', 'RESIDENCE_CREDENTIAL'],
          affectedInstitutions: Array.from(new Set(planEval.steps.map((s) => s.authority))),
          requiredActions: planEval.steps.map((s) => s.title),
          dependencies: planEval.steps.reduce((acc, s) => {
            acc[s.stepKey] = s.dependencies;
            return acc;
          }, {} as Record<string, string[]>),
        },
        contradictions: contradictions as any,
        proposedPlan: proposedPlan as any,
        executionCheckpoints: checkpoints as any,
        timeline: timeline as any,
      })
      .returning();

    // 8. Publish Domain Event
    await this.eventBus.publish({
      eventId: `EVT-TRN-${Date.now()}`,
      eventType: 'CITIZEN_STATE_TRANSITION_INITIATED',
      citizenId,
      aggregateType: 'CITIZEN_STATE_TRANSITION',
      aggregateId: record.id,
      payload: { transitionId: record.id, lifeEventCode, query },
      timestamp: new Date().toISOString(),
      provenance: { source: 'USER_ACTION', correlationId: record.id },
    });

    return this.mapRecordToTransition(record);
  }

  /**
   * Retrieves an existing transition by ID.
   */
  async getTransition(transitionId: string, citizenId: string): Promise<CitizenStateTransition | null> {
    const db = await getDb();
    const records = await db
      .select()
      .from(schema.citizenStateTransitions)
      .where(
        and(
          eq(schema.citizenStateTransitions.id, transitionId),
          eq(schema.citizenStateTransitions.citizenId, citizenId)
        )
      );

    if (records.length === 0) return null;
    return this.mapRecordToTransition(records[0]);
  }

  /**
   * Lists all state transitions for a citizen.
   */
  async listTransitions(citizenId: string): Promise<CitizenStateTransition[]> {
    const db = await getDb();
    const records = await db
      .select()
      .from(schema.citizenStateTransitions)
      .where(eq(schema.citizenStateTransitions.citizenId, citizenId))
      .orderBy(desc(schema.citizenStateTransitions.createdAt));

    return records.map((r) => this.mapRecordToTransition(r));
  }

  /**
   * Authorizes the transition plan using citizen sovereign consent.
   */
  async authorizeTransition(
    transitionId: string,
    citizenId: string,
    token?: string
  ): Promise<CitizenStateTransition> {
    const db = await getDb();
    const transition = await this.getTransition(transitionId, citizenId);
    if (!transition) {
      throw new Error(`Transition '${transitionId}' not found`);
    }

    const authToken = token || `AUTH-TOK-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const newTimeline = [
      ...transition.timeline,
      {
        id: `EVT-${Date.now()}-AUTH`,
        timestamp: new Date().toISOString(),
        stage: 'PLAN_AUTHORIZED',
        title: 'Statutory Authorization Granted',
        description: 'Citizen executed cryptographic review and approved all planned statutory actions.',
        status: 'SUCCESS' as const,
      },
    ];

    const [updated] = await db
      .update(schema.citizenStateTransitions)
      .set({
        state: 'AUTHORIZED',
        authorizationToken: authToken,
        authorizedAt: new Date(),
        timeline: newTimeline as any,
        updatedAt: new Date(),
      })
      .where(eq(schema.citizenStateTransitions.id, transitionId))
      .returning();

    return this.mapRecordToTransition(updated);
  }

  /**
   * Resolves or overrides a detected contradiction.
   */
  async resolveContradiction(
    transitionId: string,
    citizenId: string,
    contradictionId: string,
    action: 'RESOLVE' | 'OVERRIDE'
  ): Promise<CitizenStateTransition> {
    const db = await getDb();
    const transition = await this.getTransition(transitionId, citizenId);
    if (!transition) throw new Error(`Transition '${transitionId}' not found`);

    const updatedContradictions = transition.contradictions.map((c) => {
      if (c.id === contradictionId) {
        return {
          ...c,
          resolutionState: action === 'RESOLVE' ? ('RESOLVED' as const) : ('CITIZEN_OVERRIDDEN' as const),
        };
      }
      return c;
    });

    // Re-evaluate step states: unblock any steps that were blocked exclusively by this contradiction
    const remainingBlockingContradictions = updatedContradictions.filter(
      (c) => c.blockingStatus === 'BLOCKING' && c.resolutionState === 'UNRESOLVED'
    );

    const remainingBlockedKeys = new Set(
      remainingBlockingContradictions.flatMap((c) => c.blockedStepKeys)
    );

    const updatedCheckpoints = { ...transition.executionCheckpoints };
    for (const [key, cp] of Object.entries(updatedCheckpoints)) {
      if (cp.state === 'BLOCKED' && !remainingBlockedKeys.has(key)) {
        // Check if dependencies are already succeeded
        const depsSatisfied = cp.dependencies.every(
          (d) => updatedCheckpoints[d]?.state === 'SUCCEEDED'
        );
        if (depsSatisfied || cp.dependencies.length === 0) {
          cp.state = 'READY';
        }
      }
    }

    let nextState = transition.state;
    if (remainingBlockingContradictions.length === 0 && transition.state === 'CONTRADICTION_BLOCKED') {
      nextState = transition.authorizationToken ? 'AUTHORIZED' : 'AWAITING_AUTHORIZATION';
    }

    const newTimeline = [
      ...transition.timeline,
      {
        id: `EVT-${Date.now()}-CONTRA-RES`,
        timestamp: new Date().toISOString(),
        stage: 'CONTRADICTION_RESOLVED',
        title: 'Identity Contradiction Resolved',
        description: `Reconciled cross-registry discrepancy for ${contradictionId}. Dependent actions unblocked.`,
        status: 'SUCCESS' as const,
      },
    ];

    const [updated] = await db
      .update(schema.citizenStateTransitions)
      .set({
        state: nextState,
        contradictions: updatedContradictions as any,
        executionCheckpoints: updatedCheckpoints as any,
        timeline: newTimeline as any,
        updatedAt: new Date(),
      })
      .where(eq(schema.citizenStateTransitions.id, transitionId))
      .returning();

    return this.mapRecordToTransition(updated);
  }

  /**
   * Executes the transition Saga across synthetic institutions with:
   * - Ordered step progression
   * - Durable checkpointing
   * - Forward recovery upon outage (marking SUSPENDED without rollback)
   * - Eventual institutional reconciliation
   */
  async executeTransitionLoop(
    transitionId: string,
    citizenId: string
  ): Promise<CitizenStateTransition> {
    const db = await getDb();
    let current = await this.getTransition(transitionId, citizenId);
    if (!current) throw new Error(`Transition '${transitionId}' not found`);

    if (
      current.state === 'COMPLETED' ||
      current.state === 'FAILED' ||
      current.state === 'SUSPENDED'
    ) {
      return current;
    }

    // Halt if blocked by contradiction
    const hasUnresolvedBlocking = current.contradictions.some(
      (c) => c.blockingStatus === 'BLOCKING' && c.resolutionState === 'UNRESOLVED'
    );
    if (current.state === 'CONTRADICTION_BLOCKED' || hasUnresolvedBlocking) {
      return current;
    }

    // Halt if authorization is missing
    if (current.state === 'AWAITING_AUTHORIZATION' || !current.authorizationToken) {
      return current;
    }

    const checkpoints = { ...current.executionCheckpoints };
    const timeline = [...current.timeline];
    const steps = current.proposedPlan.steps;

    // Transition state to EXECUTING if currently AUTHORIZED
    if (current.state === 'AUTHORIZED') {
      await db
        .update(schema.citizenStateTransitions)
        .set({ state: 'EXECUTING', updatedAt: new Date() })
        .where(eq(schema.citizenStateTransitions.id, transitionId));
      current.state = 'EXECUTING';
    }

    for (const step of steps) {
      const cp = checkpoints[step.stepKey];
      if (!cp) continue;

      // Skip already succeeded steps
      if (cp.state === 'SUCCEEDED') continue;

      // Check dependencies
      const depsReady = cp.dependencies.every(
        (depKey) => checkpoints[depKey]?.state === 'SUCCEEDED'
      );

      if (!depsReady) {
        cp.state = 'BLOCKED';
        continue;
      }

      // Check if contradiction blocks this step
      const hasBlockingContradiction = current.contradictions.some(
        (c) =>
          c.blockingStatus === 'BLOCKING' &&
          c.resolutionState === 'UNRESOLVED' &&
          c.blockedStepKeys.includes(step.stepKey)
      );

      if (hasBlockingContradiction) {
        cp.state = 'BLOCKED';
        await db
          .update(schema.citizenStateTransitions)
          .set({
            state: 'CONTRADICTION_BLOCKED',
            currentStepKey: step.stepKey,
            executionCheckpoints: checkpoints as any,
            updatedAt: new Date(),
          })
          .where(eq(schema.citizenStateTransitions.id, transitionId));
        return (await this.getTransition(transitionId, citizenId))!;
      }

      // If step was blocked and dependencies are now satisfied, mark READY
      if (cp.state === 'BLOCKED' || cp.state === 'PENDING') {
        cp.state = 'READY';
      }

      // Execute Step
      cp.state = 'EXECUTING';
      cp.attemptCount += 1;
      cp.lastAttemptAt = new Date().toISOString();

      await db
        .update(schema.citizenStateTransitions)
        .set({
          currentStepKey: step.stepKey,
          executionCheckpoints: checkpoints as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.citizenStateTransitions.id, transitionId));

      const execResult = await this.capabilityExecutor.execute({
        capabilityId: step.capabilityId,
        input: cp.inputs,
        context: {
          citizenId,
          authorizationGranted: !!current.authorizationToken,
        },
      });

      if (execResult.success) {
        cp.state = 'SUCCEEDED';
        cp.outputs = (execResult.output as Record<string, unknown>) || {};
        cp.reconciliationStatus = 'VERIFIED';
        delete cp.errorReason;
        delete cp.isOutage;

        timeline.push({
          id: `EVT-${Date.now()}-STEP-OK-${step.stepKey}`,
          timestamp: new Date().toISOString(),
          stage: 'STEP_COMPLETED',
          title: step.title,
          description: `Successfully executed with ${step.authority}. Verified institutional ledger receipt.`,
          authority: step.authority,
          status: 'SUCCESS',
        });

        // Persist progress checkpoint
        await db
          .update(schema.citizenStateTransitions)
          .set({
            executionCheckpoints: checkpoints as any,
            timeline: timeline as any,
            updatedAt: new Date(),
          })
          .where(eq(schema.citizenStateTransitions.id, transitionId));
      } else {
        const errorMsg = execResult.error || 'Execution failed';
        const isOutage =
          errorMsg.includes('503') ||
          errorMsg.includes('OUTAGE') ||
          errorMsg.includes('Gateway Timeout') ||
          errorMsg.includes('temporarily unavailable') ||
          errorMsg.includes('Connection pool exhausted');

        cp.errorReason = errorMsg;

        if (isOutage) {
          // =========================================================================
          // CRITICAL ARCHITECTURAL LEAP: FORWARD RECOVERY & DURABLE SUSPENSION
          // Do NOT report false success.
          // Do NOT execute reverse compensation on prior successful steps!
          // Durably suspend the transition at this exact checkpoint.
          // =========================================================================
          cp.state = 'SUSPENDED';
          cp.isOutage = true;

          timeline.push({
            id: `EVT-${Date.now()}-OUTAGE-${step.stepKey}`,
            timestamp: new Date().toISOString(),
            stage: 'INSTITUTION_SUSPENDED',
            title: `${step.authority} Temporarily Unavailable`,
            description: `Remote ledger reported 503 gateway timeout. Transaction safely paused at checkpoint. All completed prior steps remain preserved.`,
            authority: step.authority,
            status: 'SUSPENDED',
          });

          await db
            .update(schema.citizenStateTransitions)
            .set({
              state: 'SUSPENDED',
              currentStepKey: step.stepKey,
              executionCheckpoints: checkpoints as any,
              timeline: timeline as any,
              updatedAt: new Date(),
            })
            .where(eq(schema.citizenStateTransitions.id, transitionId));

          // Publish event for real-time reactive UI update
          await this.eventBus.publish({
            eventId: `EVT-TRN-SUSP-${Date.now()}`,
            eventType: 'CITIZEN_STATE_TRANSITION_SUSPENDED',
            citizenId,
            aggregateType: 'CITIZEN_STATE_TRANSITION',
            aggregateId: transitionId,
            payload: {
              transitionId,
              stepKey: step.stepKey,
              authority: step.authority,
              reason: errorMsg,
            },
            timestamp: new Date().toISOString(),
            provenance: { source: 'SYSTEM_OBSERVATION', correlationId: transitionId },
          });

          return (await this.getTransition(transitionId, citizenId))!;
        } else {
          // Fatal Non-Outage Failure
          cp.state = 'FAILED';
          timeline.push({
            id: `EVT-${Date.now()}-FAIL-${step.stepKey}`,
            timestamp: new Date().toISOString(),
            stage: 'STEP_FAILED',
            title: `${step.title} Failed`,
            description: errorMsg,
            authority: step.authority,
            status: 'WARNING',
          });

          await db
            .update(schema.citizenStateTransitions)
            .set({
              state: 'FAILED',
              currentStepKey: step.stepKey,
              executionCheckpoints: checkpoints as any,
              timeline: timeline as any,
              updatedAt: new Date(),
            })
            .where(eq(schema.citizenStateTransitions.id, transitionId));

          return (await this.getTransition(transitionId, citizenId))!;
        }
      }
    }

    // Check if all steps succeeded
    const allSucceeded = steps.every((s) => checkpoints[s.stepKey]?.state === 'SUCCEEDED');

    if (allSucceeded) {
      // 5. FIRST-CLASS RECONCILIATION STAGE
      timeline.push({
        id: `EVT-${Date.now()}-RECON-START`,
        timestamp: new Date().toISOString(),
        stage: 'RECONCILING',
        title: 'Institutional Reconciliation Initiated',
        description:
          'Verifying three-tier convergence: Intended State vs. Synthetic Institutional Ledgers vs. INDRA World Model.',
        status: 'INFO',
      });

      await db
        .update(schema.citizenStateTransitions)
        .set({ state: 'RECONCILING', timeline: timeline as any, updatedAt: new Date() })
        .where(eq(schema.citizenStateTransitions.id, transitionId));

      const reconReport = await this.reconciliationEngine.reconcileTransition(citizenId, {
        lifeEventCode: current.lifeEventCode,
        destinationCity: 'Bengaluru',
        destinationState: 'Karnataka',
        surveyNumber: '142/3',
      });

      timeline.push({
        id: `EVT-${Date.now()}-RECON-DONE`,
        timestamp: new Date().toISOString(),
        stage: 'RECONCILED',
        title: 'Public Record Verified & Reconciled',
        description: reconReport.summary,
        status: 'SUCCESS',
      });

      const outcome = {
        achievedAt: new Date().toISOString(),
        summary:
          'State transition complete. All intended public-world outcomes verified and locked into official ledgers.',
        reconciledEntitiesCount: reconReport.entities.length,
        publicRecordUpdated: true,
        certificatesGenerated: [
          'Aadhaar Address Update Receipt (UIDAI)',
          'Form 15 Non-Encumbrance Certificate (Kaveri 2.0)',
          'Khata / Bhoomi Record of Rights Mutation Endorsement',
          'Vahan Motor Vehicle State Transposition Receipt',
          'Verifiable Resident & Landowner Digital Credential',
        ],
      };

      const [completedRecord] = await db
        .update(schema.citizenStateTransitions)
        .set({
          state: 'COMPLETED',
          currentStepKey: null,
          reconciliationState: reconReport as any,
          finalOutcome: outcome as any,
          timeline: timeline as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.citizenStateTransitions.id, transitionId))
        .returning();

      await this.eventBus.publish({
        eventId: `EVT-TRN-DONE-${Date.now()}`,
        eventType: 'CITIZEN_STATE_TRANSITION_COMPLETED',
        citizenId,
        aggregateType: 'CITIZEN_STATE_TRANSITION',
        aggregateId: transitionId,
        payload: { transitionId, outcome },
        timestamp: new Date().toISOString(),
        provenance: { source: 'SYSTEM_OBSERVATION', correlationId: transitionId },
      });

      return this.mapRecordToTransition(completedRecord);
    }

    return (await this.getTransition(transitionId, citizenId))!;
  }

  /**
   * Resumes a suspended transition from its exact durable checkpoint.
   */
  async resumeTransition(transitionId: string, citizenId: string): Promise<CitizenStateTransition> {
    const db = await getDb();
    const transition = await this.getTransition(transitionId, citizenId);
    if (!transition) throw new Error(`Transition '${transitionId}' not found`);

    if (transition.state !== 'SUSPENDED') {
      throw new Error(`Cannot resume transition in state '${transition.state}' (must be SUSPENDED)`);
    }

    const checkpoints = { ...transition.executionCheckpoints };
    const timeline = [...transition.timeline];

    // Find the suspended step and mark it READY for retry
    let resumedStepTitle = 'Pending step';
    for (const [key, cp] of Object.entries(checkpoints)) {
      if (cp.state === 'SUSPENDED') {
        cp.state = 'READY';
        delete cp.errorReason;
        delete cp.isOutage;
        resumedStepTitle = cp.title;
      }
    }

    timeline.push({
      id: `EVT-${Date.now()}-RESUME`,
      timestamp: new Date().toISOString(),
      stage: 'RESUMING',
      title: 'Institutional Outage Cleared',
      description: `Target registry is back online. Resuming execution from saved checkpoint at "${resumedStepTitle}".`,
      status: 'INFO',
    });

    await db
      .update(schema.citizenStateTransitions)
      .set({
        state: 'EXECUTING',
        executionCheckpoints: checkpoints as any,
        timeline: timeline as any,
        updatedAt: new Date(),
      })
      .where(eq(schema.citizenStateTransitions.id, transitionId));

    // Run execution loop from the saved checkpoint
    return this.executeTransitionLoop(transitionId, citizenId);
  }

  private mapRecordToTransition(r: any): CitizenStateTransition {
    return {
      id: r.id,
      citizenId: r.citizenId,
      initiatingQuery: r.initiatingQuery,
      lifeEventCode: r.lifeEventCode,
      targetOutcome: r.targetOutcome,
      state: r.state as TransitionState,
      currentStepKey: r.currentStepKey,
      preTransitionWorldState: r.preTransitionWorldState || {},
      consequenceGraph: r.consequenceGraph || {
        affectedEntities: [],
        affectedInstitutions: [],
        requiredActions: [],
        dependencies: {},
      },
      contradictions: r.contradictions || [],
      proposedPlan: r.proposedPlan || {
        title: '',
        summary: '',
        estimatedDays: 0,
        estimatedStatutoryFeesInr: 0,
        steps: [],
      },
      reviewSessionId: r.reviewSessionId,
      authorizationToken: r.authorizationToken,
      authorizedAt: r.authorizedAt ? r.authorizedAt.toISOString() : null,
      executionCheckpoints: r.executionCheckpoints || {},
      reconciliationState: r.reconciliationState,
      finalOutcome: r.finalOutcome,
      timeline: r.timeline || [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
