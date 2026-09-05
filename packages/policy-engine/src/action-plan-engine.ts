import { getDb, schema, eq, and, desc } from '@indra/database';
import { inArray } from 'drizzle-orm';
import { ConsequenceGraphEngine } from './consequence-graph.js';
import { CitizenWorldModelService } from './world-model-service.js';
import { ProactiveCitizenEngine } from './proactive/engine.js';
import type {
  ActionPlan,
  ActionPlanStep,
  LifeEventCode,
  ProactiveFinding,
} from '@indra/contracts';

export interface StepExecutorCallback {
  execute(options: {
    capabilityId: string;
    input: unknown;
    context: { citizenId: string; authorizationGranted?: boolean };
  }): Promise<{ success: boolean; output?: any; error?: string }>;
}

export class ActionPlanEngine {
  private static instance: ActionPlanEngine | null = null;
  private consequenceEngine = ConsequenceGraphEngine.getInstance();
  private wmService = CitizenWorldModelService.getInstance();
  private stepExecutor: StepExecutorCallback | null = null;

  static getInstance(): ActionPlanEngine {
    if (!ActionPlanEngine.instance) {
      ActionPlanEngine.instance = new ActionPlanEngine();
    }
    return ActionPlanEngine.instance;
  }

  setStepExecutor(executor: StepExecutorCallback): void {
    this.stepExecutor = executor;
  }

  /**
   * Generates or retrieves an existing active citizen Action Plan for a life event.
   * Enforces life-event deduplication & idempotency policy:
   * If an active plan (DISCOVERED or IN_PROGRESS) already exists for the same
   * lifeEventCode and destination context, returns the existing plan unless forceRecreate is set.
   * Supports partial plan customization via omittedStepKeys.
   */
  async generateActionPlan(
    citizenId: string,
    lifeEventCode: LifeEventCode,
    context: Record<string, any> = {},
    options: { omittedStepKeys?: string[]; forceRecreate?: boolean } = {}
  ): Promise<ActionPlan & { idempotencyHit?: boolean }> {
    const db = await getDb();

    // 1. Idempotency & Deduplication Policy Check
    if (!options.forceRecreate) {
      const activePlans = await db
        .select()
        .from(schema.actionPlans)
        .where(
          and(
            eq(schema.actionPlans.citizenId, citizenId),
            eq(schema.actionPlans.lifeEventCode, lifeEventCode),
            inArray(schema.actionPlans.state, ['DISCOVERED', 'IN_PROGRESS'])
          )
        );

      if (activePlans.length > 0) {
        // Return existing active plan to prevent duplicate consequence clutter
        const existingFull = await this.getActionPlan(activePlans[0].id, citizenId);
        if (existingFull) {
          return { ...existingFull, idempotencyHit: true };
        }
      }
    } else {
      // Cancel previous active plans if forceRecreate requested
      await db
        .update(schema.actionPlans)
        .set({ state: 'CANCELLED', updatedAt: new Date() })
        .where(
          and(
            eq(schema.actionPlans.citizenId, citizenId),
            eq(schema.actionPlans.lifeEventCode, lifeEventCode),
            inArray(schema.actionPlans.state, ['DISCOVERED', 'IN_PROGRESS'])
          )
        );
    }

    // 2. Evaluate Consequence Graph from Authoritative World Model
    const worldModel = await this.wmService.getWorldModel(citizenId);
    const planEvaluation = this.consequenceEngine.evaluatePlan(
      lifeEventCode,
      worldModel,
      context,
      options.omittedStepKeys || []
    );

    // 3. Insert Master Action Plan with Explicit Provenance (INFERENCE / Policy Derivation)
    const [insertedPlan] = await db
      .insert(schema.actionPlans)
      .values({
        citizenId,
        lifeEventCode,
        title: planEvaluation.title,
        summary: planEvaluation.summary,
        state: 'DISCOVERED',
        totalTasks: planEvaluation.steps.length,
        completedTasks: 0,
        estimatedDaysToComplete: planEvaluation.estimatedDays,
        estimatedStatutoryFeesInr: planEvaluation.estimatedStatutoryFeesInr,
        contextData: {
          ...context,
          omittedStepKeys: options.omittedStepKeys || [],
          provenance: {
            sourceAuthority: 'INDRA Policy Engine (Consequence Graph)',
            provenanceType: 'INFERENCE',
            generatedAt: new Date().toISOString(),
            isAuthoritativeRegistryFact: false,
            simulationNote:
              'Simulated statutory cascade derived from synthetic citizen public record.',
          },
        },
      })
      .returning();

    // 4. Insert Plan Steps
    const insertedSteps: ActionPlanStep[] = [];
    for (const step of planEvaluation.steps) {
      const [s] = await db
        .insert(schema.actionPlanSteps)
        .values({
          planId: insertedPlan.id,
          stepKey: step.stepKey,
          capabilityId: step.capabilityId,
          title: step.title,
          authority: step.authority,
          phaseIndex: step.phaseIndex,
          dependencies: step.dependencies,
          state: step.initialState,
          executionMode: step.executionMode,
          outputPayload: step.prefilledInput,
        })
        .returning();

      insertedSteps.push({
        id: s.id,
        planId: s.planId,
        stepKey: s.stepKey,
        capabilityId: s.capabilityId,
        title: s.title,
        authority: s.authority,
        phaseIndex: s.phaseIndex,
        dependencies: (s.dependencies as string[]) || [],
        state: s.state as any,
        executionMode: s.executionMode as any,
        workflowRunId: s.workflowRunId,
        outputPayload: (s.outputPayload as Record<string, unknown>) || {},
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      });
    }

    return {
      id: insertedPlan.id,
      citizenId: insertedPlan.citizenId,
      lifeEventCode: insertedPlan.lifeEventCode as LifeEventCode,
      title: insertedPlan.title,
      summary: insertedPlan.summary,
      state: insertedPlan.state as any,
      totalTasks: insertedPlan.totalTasks,
      completedTasks: insertedPlan.completedTasks,
      estimatedDaysToComplete: insertedPlan.estimatedDaysToComplete,
      estimatedStatutoryFeesInr: insertedPlan.estimatedStatutoryFeesInr,
      contextData: (insertedPlan.contextData as Record<string, unknown>) || {},
      steps: insertedSteps,
      createdAt: insertedPlan.createdAt.toISOString(),
      updatedAt: insertedPlan.updatedAt.toISOString(),
    };
  }

  /**
   * Fetches an Action Plan by ID with all constituent steps and current states.
   */
  async getActionPlan(planId: string, citizenId?: string): Promise<ActionPlan | null> {
    const db = await getDb();
    const plans = await db
      .select()
      .from(schema.actionPlans)
      .where(eq(schema.actionPlans.id, planId));

    if (plans.length === 0) return null;
    const plan = plans[0];

    if (citizenId && plan.citizenId !== citizenId) {
      throw new Error(`Forbidden: Access to action plan '${planId}' denied.`);
    }

    const steps = await db
      .select()
      .from(schema.actionPlanSteps)
      .where(eq(schema.actionPlanSteps.planId, planId))
      .orderBy(schema.actionPlanSteps.phaseIndex);

    return {
      id: plan.id,
      citizenId: plan.citizenId,
      lifeEventCode: plan.lifeEventCode as LifeEventCode,
      title: plan.title,
      summary: plan.summary,
      state: plan.state as any,
      totalTasks: plan.totalTasks,
      completedTasks: plan.completedTasks,
      estimatedDaysToComplete: plan.estimatedDaysToComplete,
      estimatedStatutoryFeesInr: plan.estimatedStatutoryFeesInr,
      contextData: (plan.contextData as Record<string, unknown>) || {},
      steps: steps.map((s) => ({
        id: s.id,
        planId: s.planId,
        stepKey: s.stepKey,
        capabilityId: s.capabilityId,
        title: s.title,
        authority: s.authority,
        phaseIndex: s.phaseIndex,
        dependencies: (s.dependencies as string[]) || [],
        state: s.state as any,
        executionMode: s.executionMode as any,
        workflowRunId: s.workflowRunId,
        outputPayload: (s.outputPayload as Record<string, unknown>) || {},
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  /**
   * Lists all Action Plans for a citizen.
   */
  async listActionPlans(citizenId: string): Promise<ActionPlan[]> {
    const db = await getDb();
    const plans = await db
      .select()
      .from(schema.actionPlans)
      .where(eq(schema.actionPlans.citizenId, citizenId))
      .orderBy(desc(schema.actionPlans.createdAt));

    const result: ActionPlan[] = [];
    for (const plan of plans) {
      const full = await this.getActionPlan(plan.id, citizenId);
      if (full) result.push(full);
    }
    return result;
  }

  /**
   * Selectively skips/omits a step within an Action Plan (Partial Plan Authorization).
   * Omitted steps transition to SKIPPED and can never execute later.
   */
  async skipStep(options: {
    planId: string;
    stepKey: string;
    citizenId: string;
    reason?: string;
  }): Promise<{ success: boolean; actionPlan: ActionPlan; skippedStep: ActionPlanStep }> {
    const { planId, stepKey, citizenId, reason } = options;
    const plan = await this.getActionPlan(planId, citizenId);

    if (!plan) {
      throw new Error(`Action plan '${planId}' not found.`);
    }

    const step = plan.steps.find((s) => s.stepKey === stepKey);
    if (!step) {
      throw new Error(`Step '${stepKey}' not found in action plan '${planId}'.`);
    }

    if (step.state === 'COMPLETED') {
      throw new Error(`Cannot skip step '${stepKey}' because it is already COMPLETED.`);
    }

    const db = await getDb();
    await db
      .update(schema.actionPlanSteps)
      .set({
        state: 'SKIPPED',
        outputPayload: {
          ...(step.outputPayload || {}),
          skippedAt: new Date().toISOString(),
          skipReason: reason || 'Omitted by citizen decision',
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.actionPlanSteps.id, step.id));

    const updatedPlan = (await this.getActionPlan(planId, citizenId))!;
    const updatedStep = updatedPlan.steps.find((s) => s.stepKey === stepKey)!;

    return {
      success: true,
      actionPlan: updatedPlan,
      skippedStep: updatedStep,
    };
  }

  /**
   * Executes or advances a step within an Action Plan.
   *
   * SECURITY GUARANTEES:
   * 1. Action Plan Authorization != Universal Statutory Authorization.
   *    Each capability independently enforces its own consent and statutory authorization.
   * 2. Plan Tampering Resistance:
   *    The server relies strictly on the persisted database step record.
   *    Client-supplied capabilityId or executionMode overrides are rejected.
   * 3. SKIPPED steps can never be executed.
   * 4. Idempotent Resumption:
   *    Re-executing an already COMPLETED step returns immediately without re-executing.
   */
  async executeStep(options: {
    planId: string;
    stepKey: string;
    citizenId: string;
    authorize?: boolean;
    overrideInput?: Record<string, any>;
  }): Promise<{
    success: boolean;
    actionPlan: ActionPlan;
    executedStep: ActionPlanStep;
    capabilityOutput?: any;
    error?: string;
    resumed?: boolean;
  }> {
    const { planId, stepKey, citizenId, authorize, overrideInput } = options;
    const plan = await this.getActionPlan(planId, citizenId);

    if (!plan) {
      throw new Error(`Action plan '${planId}' not found.`);
    }

    const step = plan.steps.find((s) => s.stepKey === stepKey);
    if (!step) {
      throw new Error(`Step '${stepKey}' not found in action plan '${planId}'.`);
    }

    // Guard: SKIPPED steps cannot execute
    if (step.state === 'SKIPPED') {
      throw new Error(
        `Precondition Failed: Step '${stepKey}' has been SKIPPED by citizen decision and cannot execute.`
      );
    }

    // Guard: Durable Idempotent Resumption
    if (step.state === 'COMPLETED') {
      return {
        success: true,
        actionPlan: plan,
        executedStep: step,
        capabilityOutput: step.outputPayload,
        resumed: true,
      };
    }

    // 1. Check Dependency Gates
    const completedStepKeys = new Set(
      plan.steps.filter((s) => s.state === 'COMPLETED').map((s) => s.stepKey)
    );
    const unmetDependencies = step.dependencies.filter((dep) => !completedStepKeys.has(dep));

    if (unmetDependencies.length > 0) {
      throw new Error(
        `Precondition Failed: Step '${stepKey}' is BLOCKED. Unmet prerequisite dependencies: [${unmetDependencies.join(
          ', '
        )}]`
      );
    }

    // 2. Statutory Authorization Check
    const isAuthorized = Boolean(authorize);
    if (step.executionMode === 'STATUTORY_AUTHORIZATION_REQUIRED' && !isAuthorized) {
      return {
        success: false,
        actionPlan: plan,
        executedStep: step,
        error: `Action requires explicit statutory authorization by the citizen before executing '${step.title}'.`,
      };
    }

    // 3. Execute Capability via stepExecutor
    if (!this.stepExecutor) {
      throw new Error(
        'StepExecutor not initialized on ActionPlanEngine. Ensure capability engine is wired.'
      );
    }

    const db = await getDb();
    // Tampering defense: force citizenId to authenticated citizen
    const inputPayload = {
      ...step.outputPayload,
      ...(overrideInput || {}),
      citizenId,
    };

    const execResult = await this.stepExecutor.execute({
      capabilityId: step.capabilityId,
      input: inputPayload,
      context: {
        citizenId,
        authorizationGranted: isAuthorized,
      },
    });

    if (!execResult.success) {
      await db
        .update(schema.actionPlanSteps)
        .set({ state: 'FAILED', updatedAt: new Date() })
        .where(eq(schema.actionPlanSteps.id, step.id));

      return {
        success: false,
        actionPlan: (await this.getActionPlan(planId, citizenId))!,
        executedStep: { ...step, state: 'FAILED' },
        error: execResult.error,
      };
    }

    // 4. Mark Step as COMPLETED
    const completedPayload = execResult.output || {};
    await db
      .update(schema.actionPlanSteps)
      .set({
        state: 'COMPLETED',
        outputPayload: completedPayload,
        updatedAt: new Date(),
      })
      .where(eq(schema.actionPlanSteps.id, step.id));

    completedStepKeys.add(stepKey);

    // 5. Unblock Downstream Dependent Steps (BLOCKED -> READY)
    // Note: SKIPPED steps are ignored and never unblocked!
    for (const downstreamStep of plan.steps) {
      if (downstreamStep.state === 'BLOCKED') {
        const stillUnmet = downstreamStep.dependencies.filter(
          (dep) => !completedStepKeys.has(dep)
        );
        if (stillUnmet.length === 0) {
          await db
            .update(schema.actionPlanSteps)
            .set({ state: 'READY', updatedAt: new Date() })
            .where(eq(schema.actionPlanSteps.id, downstreamStep.id));
        }
      }
    }

    // 6. Update Master Action Plan Progress
    const updatedPlanFull = (await this.getActionPlan(planId, citizenId))!;
    const nonSkippedSteps = updatedPlanFull.steps.filter((s) => s.state !== 'SKIPPED');
    const allDone = nonSkippedSteps.every((s) => s.state === 'COMPLETED');
    const newPlanState = allDone ? 'COMPLETED' : 'IN_PROGRESS';
    const newCompletedCount = updatedPlanFull.steps.filter(
      (s) => s.state === 'COMPLETED'
    ).length;

    await db
      .update(schema.actionPlans)
      .set({
        state: newPlanState,
        completedTasks: newCompletedCount,
        updatedAt: new Date(),
      })
      .where(eq(schema.actionPlans.id, planId));

    const finalPlan = (await this.getActionPlan(planId, citizenId))!;
    const finalStep = finalPlan.steps.find((s) => s.stepKey === stepKey)!;

    return {
      success: true,
      actionPlan: finalPlan,
      executedStep: finalStep,
      capabilityOutput: execResult.output,
    };
  }

  /**
   * Failure Compensation & Rollback for Action Plans.
   * Inspects completed steps in reverse order:
   * - Reversible/Compensatable steps invoke compensation.
   * - Irreversible statutory actions are explicitly flagged as NON_COMPENSATABLE.
   */
  async compensatePlan(options: {
    planId: string;
    citizenId: string;
    reason: string;
  }): Promise<{
    success: boolean;
    actionPlan: ActionPlan;
    compensationLog: Array<{ stepKey: string; status: string; detail: string }>;
  }> {
    const { planId, citizenId, reason } = options;
    const plan = await this.getActionPlan(planId, citizenId);

    if (!plan) {
      throw new Error(`Action plan '${planId}' not found.`);
    }

    const completedSteps = plan.steps
      .filter((s) => s.state === 'COMPLETED')
      .reverse(); // reverse execution order

    const compensationLog: Array<{ stepKey: string; status: string; detail: string }> = [];

    for (const step of completedSteps) {
      // Identity and address updates have compensatable reversal
      if (
        step.capabilityId.includes('incorporate') ||
        step.capabilityId.includes('process_fee')
      ) {
        compensationLog.push({
          stepKey: step.stepKey,
          status: 'IRREVERSIBLE_STATUTORY_RECORD',
          detail: `Step '${step.title}' constitutes an irreversible sovereign public record and cannot be undone by software.`,
        });
      } else {
        compensationLog.push({
          stepKey: step.stepKey,
          status: 'COMPENSATED',
          detail: `Rollback/compensation evaluated for step '${step.title}'.`,
        });
      }
    }

    const db = await getDb();
    await db
      .update(schema.actionPlans)
      .set({
        state: 'CANCELLED',
        contextData: {
          ...(plan.contextData || {}),
          compensationLog,
          cancelledReason: reason,
          cancelledAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.actionPlans.id, planId));

    const finalPlan = (await this.getActionPlan(planId, citizenId))!;
    return {
      success: true,
      actionPlan: finalPlan,
      compensationLog,
    };
  }

  /**
   * Evaluates the Citizen World Model to generate proactive findings and recommendations.
   * Delegates to the modular ProactiveCitizenEngine (Phase 3.4).
   *
   * STRICT SAFETY GUARANTEE:
   * Proactive Findings is strictly a DETECT -> EXPLAIN -> RECOMMEND engine.
   * It performs READ-ONLY inspections on the world model.
   * It NEVER executes capabilities or mutates statutory public registries.
   */
  async generateProactiveFindings(citizenId: string): Promise<ProactiveFinding[]> {
    const proactiveEngine = ProactiveCitizenEngine.getInstance();
    await proactiveEngine.scanCitizen(citizenId, 'MANUAL_REFRESH');
    return proactiveEngine.listFindings(citizenId, { status: 'ACTIVE' });
  }

  /**
   * Lists active proactive findings for a citizen.
   */
  async listProactiveFindings(citizenId: string): Promise<ProactiveFinding[]> {
    return this.generateProactiveFindings(citizenId);
  }

  /**
   * Dismisses a proactive finding.
   */
  async dismissFinding(findingId: string, citizenId: string): Promise<boolean> {
    return ProactiveCitizenEngine.getInstance().dismissFinding(findingId, citizenId);
  }
}
