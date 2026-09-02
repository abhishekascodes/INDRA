import crypto from 'node:crypto';
import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';
import { CapabilityRegistry } from './registry.js';
import { SafetyEvaluator, ConsentManager, ProvenanceTracker } from '@indra/policy-engine';
import { EventBus } from '@indra/event-bus';
import type { ExecutionContext, CapabilityContract } from '@indra/contracts';

export interface ExecuteCapabilityOptions {
  capabilityId: string;
  input: unknown;
  context: ExecutionContext;
}

export interface CapabilityExecutionResult<T = unknown> {
  success: boolean;
  capabilityId: string;
  output?: T;
  error?: string;
  idempotencyHit?: boolean;
  auditLogId?: string;
}

export class CapabilityExecutor {
  private registry = CapabilityRegistry.getInstance();
  private safetyEvaluator = new SafetyEvaluator();
  private consentManager = new ConsentManager();
  private provenanceTracker = new ProvenanceTracker();
  private eventBus = EventBus.getInstance();

  async execute<T = unknown>(
    options: ExecuteCapabilityOptions
  ): Promise<CapabilityExecutionResult<T>> {
    const { capabilityId, input, context } = options;
    const capability = this.registry.get(capabilityId);

    if (!capability) {
      return {
        success: false,
        capabilityId,
        error: `Capability '${capabilityId}' is not registered.`,
      };
    }

    // 1. Schema Validation
    const parsedInput = capability.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        success: false,
        capabilityId,
        error: `Input validation failed: ${parsedInput.error.errors.map((e) => e.message).join(', ')}`,
      };
    }

    // 2. Preconditions Check
    if (capability.preconditions) {
      const validation = await capability.preconditions(context, parsedInput.data);
      if (!validation.valid) {
        return {
          success: false,
          capabilityId,
          error: `Preconditions failed: ${validation.errors?.map((e) => e.message).join('; ')}`,
        };
      }
    }

    // 3. Consent Verification
    if (capability.consentRequirement) {
      const hasConsent = await this.consentManager.hasActiveConsent(
        context.citizenId,
        capability.consentRequirement.purpose
      );
      if (!hasConsent && !context.authorizationGranted) {
        return {
          success: false,
          capabilityId,
          error: `Consent required for '${capability.consentRequirement.purpose}': ${capability.consentRequirement.userFriendlyExplanation}`,
        };
      }
    }

    // 4. Side Effect Safety Evaluation
    const safety = this.safetyEvaluator.evaluateSideEffectSafety(
      capability.sideEffectClass,
      context
    );
    if (!safety.safeToExecute) {
      return {
        success: false,
        capabilityId,
        error: safety.reason,
      };
    }

    // 5. Idempotency Check
    const db = await getDb();
    const rawKey = `${context.citizenId}:${capabilityId}:${JSON.stringify(parsedInput.data)}`;
    const idempotencyKey =
      context.idempotencyKey ||
      crypto.createHash('sha256').update(rawKey).digest('hex');

    const existingRun = await db
      .select()
      .from(schema.capabilityRuns)
      .where(eq(schema.capabilityRuns.idempotencyKey, idempotencyKey));

    if (existingRun.length > 0 && existingRun[0].status === 'SUCCESS') {
      return {
        success: true,
        capabilityId,
        output: existingRun[0].outputs as T,
        idempotencyHit: true,
      };
    }

    // 6. Capability Execution
    let output: any;
    try {
      output = await capability.execute(parsedInput.data, context);
    } catch (err: any) {
      console.error(`[CapabilityExecutor] Execution error in ${capabilityId}:`, err);
      return {
        success: false,
        capabilityId,
        error: err?.message || 'Execution failed due to unexpected error.',
      };
    }

    // 7. Persist Capability Run
    await db.insert(schema.capabilityRuns).values({
      workflowRunId: context.workflowRunId as any,
      capabilityId,
      citizenId: context.citizenId,
      idempotencyKey,
      inputs: parsedInput.data as any,
      outputs: (output || {}) as any,
      status: 'SUCCESS',
    });

    // 8. Provenance Attribution
    if (capability.provenanceGenerator) {
      const provenancePayloads = capability.provenanceGenerator(
        parsedInput.data,
        output,
        context
      );
      for (const prov of provenancePayloads) {
        await this.provenanceTracker.recordProvenance(context.citizenId, prov);
      }
    }

    // 9. Immutable Audit Log
    const audit = await db
      .insert(schema.auditLogs)
      .values({
        citizenId: context.citizenId,
        action: `CAPABILITY_EXECUTE:${capabilityId}`,
        actorType: 'CITIZEN',
        actorId: context.citizenId,
        requestPayload: { input: parsedInput.data },
        resultStatus: 'SUCCESS',
      })
      .returning();

    // 10. Emit Domain Event
    await this.eventBus.publish({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'WORKFLOW_STEP_COMPLETED',
      citizenId: context.citizenId,
      aggregateType: 'WORKFLOW',
      aggregateId: context.workflowRunId || capabilityId,
      payload: { capabilityId, output },
      timestamp: new Date().toISOString(),
      provenance: {
        source: 'USER_ACTION',
        correlationId: idempotencyKey,
      },
    });

    return {
      success: true,
      capabilityId,
      output: output as T,
      idempotencyHit: false,
      auditLogId: audit[0]?.id,
    };
  }
}
