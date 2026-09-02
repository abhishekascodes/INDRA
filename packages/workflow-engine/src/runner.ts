import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';
import { WorkflowRegistry } from './registry.js';
import { CapabilityRegistry, CapabilityExecutor } from '@indra/capability-engine';
import { EventBus } from '@indra/event-bus';
import type {
  WorkflowState,
  WorkflowRunSummary,
  DynamicWorkspaceContract,
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

  async startWorkflow(params: {
    workflowCode: string;
    citizenId: string;
    initialContext?: Record<string, unknown>;
  }): Promise<WorkflowRunSummary> {
    const workflow = this.workflowRegistry.get(params.workflowCode);
    if (!workflow) {
      throw new Error(`Workflow '${params.workflowCode}' not registered`);
    }

    const db = await getDb();
    const inserted = await db
      .insert(schema.workflowRuns)
      .values({
        workflowCode: params.workflowCode,
        citizenId: params.citizenId,
        state: 'RUNNING',
        currentStepId: workflow.initialStepId,
        contextData: params.initialContext || {},
      })
      .returning();

    const run = inserted[0];

    await this.eventBus.publish({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'WORKFLOW_STARTED',
      citizenId: params.citizenId,
      aggregateType: 'WORKFLOW',
      aggregateId: run.id,
      payload: { workflowCode: params.workflowCode, runId: run.id },
      timestamp: new Date().toISOString(),
      provenance: {
        source: 'USER_ACTION',
        correlationId: run.id,
      },
    });

    return this.step(run.id);
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
    const currentContext = (currentRun.contextData as Record<string, unknown>) || {};

    const updatedContext = {
      ...currentContext,
      ...(params.input || {}),
    };

    if (params.authorize) {
      updatedContext.authorizationGranted = true;
      updatedContext.authorizedAt = new Date().toISOString();
    }

    await db
      .update(schema.workflowRuns)
      .set({
        contextData: updatedContext,
        state: 'RUNNING',
        updatedAt: new Date(),
      })
      .where(eq(schema.workflowRuns.id, params.workflowRunId));

    return this.step(params.workflowRunId);
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
      return stepDef.dynamicUI(context);
    }
    return undefined;
  }

  private async step(workflowRunId: string): Promise<WorkflowRunSummary> {
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
      // Completed
      await db
        .update(schema.workflowRuns)
        .set({ state: 'COMPLETED', updatedAt: new Date() })
        .where(eq(schema.workflowRuns.id, workflowRunId));

      return (await this.getWorkflowRun(workflowRunId))!;
    }

    const stepDef = workflow.steps[run.currentStepId];
    if (!stepDef) {
      throw new Error(`Step '${run.currentStepId}' not found in workflow ${run.workflowCode}`);
    }

    const currentContext: Record<string, any> = {
      citizenId: run.citizenId,
      ...((run.contextData as Record<string, unknown>) || {}),
    };

    // Check if step provides dynamic UI and required fields are not filled
    if (stepDef.dynamicUI) {
      const uiContract = stepDef.dynamicUI(currentContext);
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

        return (await this.getWorkflowRun(workflowRunId))!;
      }
    }

    // Check if capability requires human authorization
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

      return (await this.getWorkflowRun(workflowRunId))!;
    }

    // Execute Capability
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

    if (!result.success) {
      console.error(`[WorkflowRunner Step Error in ${run.currentStepId}]:`, result.error);
      await db
        .update(schema.workflowRuns)
        .set({
          state: 'FAILED',
          errorDetails: { error: result.error, stepId: run.currentStepId },
          updatedAt: new Date(),
        })
        .where(eq(schema.workflowRuns.id, workflowRunId));

      return (await this.getWorkflowRun(workflowRunId))!;
    }

    // Capability succeeded: merge outputs into workflow context
    let nextContext = { ...currentContext, [`${run.currentStepId}_output`]: result.output };
    if (stepDef.onSuccess) {
      const customUpdates = stepDef.onSuccess(result.output, nextContext);
      nextContext = { ...nextContext, ...customUpdates };
    }

    // Reset authorization flag for subsequent steps to maintain safety
    delete nextContext.authorizationGranted;

    // Determine next step
    let nextStepId: string | null = null;
    if (typeof stepDef.nextStepId === 'function') {
      nextStepId = stepDef.nextStepId(result.output, nextContext);
    } else if (typeof stepDef.nextStepId === 'string') {
      nextStepId = stepDef.nextStepId;
    }

    if (!nextStepId) {
      // Completed workflow!
      await db
        .update(schema.workflowRuns)
        .set({
          state: 'COMPLETED',
          currentStepId: null,
          contextData: nextContext,
          updatedAt: new Date(),
        })
        .where(eq(schema.workflowRuns.id, workflowRunId));

      await this.eventBus.publish({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventType: 'WORKFLOW_COMPLETED',
        citizenId: run.citizenId,
        aggregateType: 'WORKFLOW',
        aggregateId: workflowRunId,
        payload: { workflowCode: run.workflowCode },
        timestamp: new Date().toISOString(),
        provenance: { source: 'SYSTEM_OBSERVATION', correlationId: workflowRunId },
      });

      return (await this.getWorkflowRun(workflowRunId))!;
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

    // Recursively execute next step
    return this.step(workflowRunId);
  }
}
