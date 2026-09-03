import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';
import { WorkflowRegistry } from './registry.js';
import { CapabilityRegistry, CapabilityExecutor } from '@indra/capability-engine';
import { EventBus } from '@indra/event-bus';
import { ConsentManager } from '@indra/policy-engine';
import {
  type WorkflowState,
  type WorkflowRunSummary,
  type DynamicWorkspaceContract,
  DynamicWorkspaceContractSchema,
} from '@indra/contracts';

export interface StartWorkflowParams {
  workflowCode: string;
  citizenId: string;
  initialContext?: Record<string, unknown>;
}

export interface ResumeWorkflowParams {
  workflowRunId: string;
  input?: Record<string, unknown>;
  authorize?: boolean;
}

export class WorkflowRunner {
  private workflowRegistry = WorkflowRegistry.getInstance();
  private capabilityRegistry = CapabilityRegistry.getInstance();
  private capabilityExecutor = new CapabilityExecutor();
  private eventBus = EventBus.getInstance();
  private consentManager = new ConsentManager();

  async startWorkflow(params: StartWorkflowParams): Promise<WorkflowRunSummary> {
    const workflow = this.workflowRegistry.get(params.workflowCode);
    if (!workflow) {
      throw new Error(`Workflow '${params.workflowCode}' not registered`);
    }

    const db = await getDb();

    // 1. Enrich initial context dynamically from synthetic citizen ground truth
    const enrichedContext = await this.enrichCitizenContext(
      params.citizenId,
      params.initialContext
    );

    // 2. Insert durable workflow run record
    const inserted = await db
      .insert(schema.workflowRuns)
      .values({
        workflowCode: params.workflowCode,
        citizenId: params.citizenId,
        state: 'RUNNING',
        currentStepId: workflow.initialStepId,
        contextData: enrichedContext,
      })
      .returning();

    const run = inserted[0];

    // 3. Register citizen application in applications table
    const refCode = `APP-${workflow.category ? workflow.category.slice(0, 3) : 'SRV'}-${Date.now().toString().slice(-6)}`;
    await db.insert(schema.applications).values({
      citizenId: params.citizenId,
      workflowRunId: run.id,
      serviceCategory: workflow.category || 'CITIZEN_SERVICE',
      title: workflow.title,
      referenceCode: refCode,
      universalStatus: 'IN_PROGRESS',
      timeline: [
        {
          stage: 'INITIATED',
          timestamp: new Date().toISOString(),
          note: `Application for '${workflow.title}' initiated via INDRA Universal Interface`,
        },
      ],
    });

    // 4. Publish domain event
    await this.eventBus.publish({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'WORKFLOW_STARTED',
      citizenId: params.citizenId,
      aggregateType: 'WORKFLOW',
      aggregateId: run.id,
      payload: { workflowCode: params.workflowCode, runId: run.id, referenceCode: refCode },
      timestamp: new Date().toISOString(),
      provenance: {
        source: 'USER_ACTION',
        correlationId: run.id,
      },
    });

    // 5. Execute workflow via iterative execution loop
    return this.executeWorkflowLoop(run.id);
  }

  async resumeWorkflow(params: ResumeWorkflowParams): Promise<WorkflowRunSummary> {
    const db = await getDb();
    const runs = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, params.workflowRunId));

    if (runs.length === 0) {
      throw new Error(`Workflow run '${params.workflowRunId}' not found`);
    }

    const currentRun = runs[0];
    if (currentRun.state === 'COMPLETED' || currentRun.state === 'FAILED') {
      throw new Error(
        `Cannot resume workflow run '${params.workflowRunId}' because it is already in terminal state '${currentRun.state}'`
      );
    }
    const currentContext = (currentRun.contextData as Record<string, unknown>) || {};

    const updatedContext: Record<string, unknown> = {
      ...currentContext,
      ...(params.input || {}),
    };

    if (params.authorize) {
      updatedContext.authorizationGranted = true;
      updatedContext.authorizedAt = new Date().toISOString();

      // Persist durable consent if capability specifies consentRequirement
      const workflow = this.workflowRegistry.get(currentRun.workflowCode);
      const currentStep = workflow?.steps[currentRun.currentStepId || ''];
      if (currentStep) {
        const capability = this.capabilityRegistry.get(currentStep.capabilityId);
        if (capability?.consentRequirement) {
          await this.consentManager.recordConsent({
            citizenId: currentRun.citizenId,
            purpose: capability.consentRequirement.purpose,
            scope: capability.consentRequirement.dataElements,
            authorizedAction: capability.consentRequirement.userFriendlyExplanation,
            expiresInHours: 24 * 365,
          });
        }
      }
    }

    await db
      .update(schema.workflowRuns)
      .set({
        contextData: updatedContext,
        state: 'RUNNING',
        updatedAt: new Date(),
      })
      .where(eq(schema.workflowRuns.id, params.workflowRunId));

    return this.executeWorkflowLoop(params.workflowRunId);
  }

  async getWorkflowRun(workflowRunId: string): Promise<WorkflowRunSummary | null> {
    const db = await getDb();
    const runs = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, workflowRunId));

    if (runs.length === 0) return null;
    const r = runs[0];
    const workflow = this.workflowRegistry.get(r.workflowCode);

    return {
      id: r.id,
      workflowCode: r.workflowCode,
      title: workflow?.title || r.workflowCode,
      citizenId: r.citizenId,
      state: r.state as WorkflowState,
      currentStepId: r.currentStepId,
      contextData: (r.contextData as Record<string, unknown>) || {},
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      activeUI: this.resolveActiveUI(workflow, r.currentStepId, r.contextData as Record<string, unknown>),
    };
  }

  private resolveActiveUI(
    workflow: any,
    currentStepId: string | null,
    context: Record<string, unknown>
  ): DynamicWorkspaceContract | undefined {
    if (!workflow || !currentStepId) return undefined;
    const stepDef = workflow.steps[currentStepId];
    if (!stepDef) return undefined;
    if (stepDef.dynamicUI) {
      const rawUI = stepDef.dynamicUI(context);
      // Validate schema runtime
      const parsed = DynamicWorkspaceContractSchema.safeParse(rawUI);
      if (!parsed.success) {
        console.error('[WorkflowRunner] Dynamic UI validation failed:', parsed.error);
        return rawUI;
      }
      return parsed.data;
    }
    return undefined;
  }

  /**
   * Iterative workflow stepping loop (avoids recursive call stack growth).
   */
  private async executeWorkflowLoop(workflowRunId: string): Promise<WorkflowRunSummary> {
    while (true) {
      const run = await this.getWorkflowRun(workflowRunId);
      if (!run) {
        throw new Error(`Workflow run '${workflowRunId}' not found`);
      }

      // If paused for user input/authorization or terminated, stop iterative loop
      if (
        run.state === 'AWAITING_USER_INPUT' ||
        run.state === 'AWAITING_AUTHORIZATION' ||
        run.state === 'COMPLETED' ||
        run.state === 'FAILED'
      ) {
        return run;
      }

      // Execute a single step
      const advanced = await this.stepOnce(workflowRunId);
      if (!advanced) {
        return (await this.getWorkflowRun(workflowRunId))!;
      }
    }
  }

  /**
   * Executes a single step of the workflow DAG.
   * Returns true if step succeeded and advanced; false if workflow paused or completed.
   */
  private async stepOnce(workflowRunId: string): Promise<boolean> {
    const db = await getDb();
    const runs = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, workflowRunId));

    if (runs.length === 0) throw new Error(`Workflow run ${workflowRunId} not found`);
    const run = runs[0];

    const workflow = this.workflowRegistry.get(run.workflowCode);
    if (!workflow) throw new Error(`Workflow ${run.workflowCode} not found in registry`);

    if (!run.currentStepId) {
      // Completed workflow
      await this.markWorkflowCompleted(run.id, run.citizenId, workflow);
      return false;
    }

    const stepDef = workflow.steps[run.currentStepId];
    if (!stepDef) {
      throw new Error(`Step '${run.currentStepId}' not found in workflow ${run.workflowCode}`);
    }

    const currentContext: Record<string, any> = {
      citizenId: run.citizenId,
      ...((run.contextData as Record<string, unknown>) || {}),
    };

    // 1. Dynamic UI Validation & Required Fields Check
    if (stepDef.dynamicUI) {
      const uiContract = stepDef.dynamicUI(currentContext);
      const parsedUI = DynamicWorkspaceContractSchema.safeParse(uiContract);
      if (!parsedUI.success) {
        console.error('[WorkflowRunner] Dynamic UI schema error:', parsedUI.error);
      }

      const missingFields = uiContract.requiredFields.filter(
        (f) => f.required && currentContext[f.fieldId] === undefined
      );

      if (missingFields.length > 0) {
        await db
          .update(schema.workflowRuns)
          .set({ state: 'AWAITING_USER_INPUT', updatedAt: new Date() })
          .where(eq(schema.workflowRuns.id, workflowRunId));

        await this.eventBus.publish({
          eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventType: 'WORKFLOW_AWAITING_INPUT',
          citizenId: run.citizenId,
          aggregateType: 'WORKFLOW',
          aggregateId: workflowRunId,
          payload: { stepId: run.currentStepId, uiContract },
          timestamp: new Date().toISOString(),
          provenance: { source: 'SYSTEM_OBSERVATION', correlationId: workflowRunId },
        });

        return false;
      }
    }

    // 2. Human Authorization Check
    const capability = this.capabilityRegistry.get(stepDef.capabilityId);
    if (capability?.requiresHumanAuthorization && !currentContext.authorizationGranted) {
      await db
        .update(schema.workflowRuns)
        .set({ state: 'AWAITING_AUTHORIZATION', updatedAt: new Date() })
        .where(eq(schema.workflowRuns.id, workflowRunId));

      await this.eventBus.publish({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventType: 'WORKFLOW_AWAITING_AUTHORIZATION',
        citizenId: run.citizenId,
        aggregateType: 'WORKFLOW',
        aggregateId: workflowRunId,
        payload: {
          stepId: run.currentStepId,
          prompt: capability.humanAuthorizationPrompt,
        },
        timestamp: new Date().toISOString(),
        provenance: { source: 'SYSTEM_OBSERVATION', correlationId: workflowRunId },
      });

      return false;
    }

    // 3. Execute Capability
    const input = stepDef.inputMapper(currentContext);
    const result = await this.capabilityExecutor.execute({
      capabilityId: stepDef.capabilityId,
      input,
      context: {
        citizenId: run.citizenId,
        workflowRunId: run.id,
        authorizationGranted: !!currentContext.authorizationGranted,
      },
    });

    // 4. Handle Failure & Trigger Reverse Compensation
    if (!result.success) {
      console.error(`[WorkflowRunner Step Failure in ${run.currentStepId}]:`, result.error);

      // Execute reverse compensation of completed steps
      await this.executeCompensation(workflow, run, currentContext, result.error);

      await db
        .update(schema.workflowRuns)
        .set({
          state: 'FAILED',
          contextData: { ...currentContext, compensated: true },
          errorDetails: { error: result.error, stepId: run.currentStepId },
          updatedAt: new Date(),
        })
        .where(eq(schema.workflowRuns.id, workflowRunId));

      // Update application lifecycle
      await db
        .update(schema.applications)
        .set({
          universalStatus: 'FAILED',
          completedAt: new Date(),
        })
        .where(eq(schema.applications.workflowRunId, workflowRunId));

      await this.eventBus.publish({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventType: 'WORKFLOW_FAILED',
        citizenId: run.citizenId,
        aggregateType: 'WORKFLOW',
        aggregateId: workflowRunId,
        payload: { stepId: run.currentStepId, error: result.error },
        timestamp: new Date().toISOString(),
        provenance: { source: 'AUTOMATED_RULE', correlationId: workflowRunId },
      });

      return false;
    }

    // 5. Success: Merge outputs and advance
    let nextContext = { ...currentContext, [`${run.currentStepId}_output`]: result.output };
    if (stepDef.onSuccess) {
      const customUpdates = stepDef.onSuccess(result.output, nextContext);
      nextContext = { ...nextContext, ...customUpdates };
    }

    // Reset authorization flag for next step
    delete nextContext.authorizationGranted;

    let nextStepId: string | null = null;
    if (typeof stepDef.nextStepId === 'function') {
      nextStepId = stepDef.nextStepId(result.output, nextContext);
    } else if (typeof stepDef.nextStepId === 'string') {
      nextStepId = stepDef.nextStepId;
    }

    if (!nextStepId) {
      await db
        .update(schema.workflowRuns)
        .set({
          state: 'COMPLETED',
          currentStepId: null,
          contextData: nextContext,
          updatedAt: new Date(),
        })
        .where(eq(schema.workflowRuns.id, workflowRunId));

      await this.markWorkflowCompleted(run.id, run.citizenId, workflow);
      return false;
    }

    // Advance to next step
    await db
      .update(schema.workflowRuns)
      .set({
        currentStepId: nextStepId,
        contextData: nextContext,
        updatedAt: new Date(),
      })
      .where(eq(schema.workflowRuns.id, workflowRunId));

    return true; // continue loop
  }

  /**
   * Reverse-order compensation of completed reversible/compensatable steps.
   */
  private async executeCompensation(
    workflow: any,
    run: any,
    context: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    const db = await getDb();
    const completedStepIds = Object.keys(context)
      .filter((k) => k.endsWith('_output'))
      .map((k) => k.replace('_output', ''));

    // Iterate backward through completed steps
    for (const stepId of completedStepIds.reverse()) {
      const stepDef = workflow.steps[stepId];
      if (!stepDef) continue;

      const capability = this.capabilityRegistry.get(stepDef.capabilityId);
      if (capability && capability.compensate) {
        try {
          const stepInput = stepDef.inputMapper(context);
          const stepOutput = context[`${stepId}_output`];
          await capability.compensate(stepInput, stepOutput, {
            citizenId: run.citizenId,
            workflowRunId: run.id,
            authorizationGranted: true,
          });

          await db.insert(schema.auditLogs).values({
            citizenId: run.citizenId,
            action: `WORKFLOW_STEP_COMPENSATED:${stepId}`,
            actorType: 'SYSTEM',
            actorId: 'workflow-runner',
            requestPayload: { workflowCode: run.workflowCode, stepId, capabilityId: stepDef.capabilityId },
            resultStatus: 'COMPENSATED',
          });
        } catch (compErr) {
          console.error(`[Compensation Failure in step ${stepId}]:`, compErr);
        }
      }
    }

    await this.eventBus.publish({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'WORKFLOW_COMPENSATED',
      citizenId: run.citizenId,
      aggregateType: 'WORKFLOW',
      aggregateId: run.id,
      payload: {
        workflowCode: run.workflowCode,
        runId: run.id,
        failedStepId: run.currentStepId,
        error: errorMessage,
        compensatedSteps: completedStepIds,
      },
      timestamp: new Date().toISOString(),
      provenance: { source: 'AUTOMATED_RULE', correlationId: run.id },
    });
  }

  private async markWorkflowCompleted(
    workflowRunId: string,
    citizenId: string,
    workflow: any
  ): Promise<void> {
    const db = await getDb();

    // 1. Update applications status to COMPLETED
    await db
      .update(schema.applications)
      .set({
        universalStatus: 'COMPLETED',
        completedAt: new Date(),
      })
      .where(eq(schema.applications.workflowRunId, workflowRunId));

    // 2. Publish domain event
    await this.eventBus.publish({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'WORKFLOW_COMPLETED',
      citizenId,
      aggregateType: 'WORKFLOW',
      aggregateId: workflowRunId,
      payload: { workflowCode: workflow.code, title: workflow.title },
      timestamp: new Date().toISOString(),
      provenance: { source: 'SYSTEM_OBSERVATION', correlationId: workflowRunId },
    });
  }

  private async enrichCitizenContext(
    citizenId: string,
    initialContext?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const db = await getDb();
    let enriched: Record<string, unknown> = {
      citizenId,
      ...(initialContext || {}),
    };

    if (!citizenId) return enriched;

    const [citizen] = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, citizenId))
      .limit(1);

    if (citizen) {
      const creds = await db
        .select()
        .from(schema.citizenCredentials)
        .where(eq(schema.citizenCredentials.citizenId, citizenId));

      const addresses = await db
        .select()
        .from(schema.citizenAddresses)
        .where(eq(schema.citizenAddresses.citizenId, citizenId));

      const telecoms = await db
        .select()
        .from(schema.spiTelecomRecords)
        .where(eq(schema.spiTelecomRecords.citizenId, citizenId));

      const aadhaar = creds.find((c) => c.type === 'AADHAAR');
      const pan = creds.find((c) => c.type === 'PAN');
      const dl = creds.find((c) => c.type === 'DRIVING_LICENCE');
      const passport = creds.find((c) => c.type === 'PASSPORT');
      const uan = creds.find((c) => c.type === 'UAN');

      const addr = addresses[0];
      const telecom = telecoms[0];

      enriched = {
        ...enriched,
        citizenName: citizen.primaryName,
        dateOfBirth: citizen.dateOfBirth,
        gender: citizen.gender,
        primaryMobile: citizen.primaryMobile,
        primaryEmail: citizen.primaryEmail,
        currentCity: citizen.currentCity,
        currentState: citizen.currentState,
        aadhaarNumber: aadhaar?.identifierMasked,
        panNumber: pan?.identifierMasked,
        panHolderName: (pan?.metadata as any)?.holderName || citizen.primaryName,
        dlNumber: dl?.identifierMasked,
        passportNumber: passport?.identifierMasked,
        uanNumber: uan?.identifierMasked,
        registeredAddress: addr
          ? {
              line1: addr.line1,
              city: addr.city,
              state: addr.state,
              pincode: addr.pincode,
            }
          : {
              line1: `${citizen.currentCity} Central`,
              city: citizen.currentCity,
              state: citizen.currentState,
              pincode: '560001',
            },
        telecomImei: telecom?.imei,
        telecomMobile: telecom?.mobileNumber || citizen.primaryMobile,
        telecomDeviceModel: telecom?.deviceModel,
        telecomOperator: telecom?.operator,
      };
    }

    return enriched;
  }
}
