import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getDb, schema, eq, resetDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import {
  CapabilityRegistry,
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import {
  WorkflowRegistry,
  WorkflowRunner,
  registerDefaultWorkflows,
} from '@indra/workflow-engine';
import { z, type CapabilityContract, type WorkflowContract } from '@indra/contracts';

describe('Workflow Engine State Machine & DAG Durability', () => {
  const runner = new WorkflowRunner();

  beforeAll(async () => {
    registerDefaultCapabilities();
    registerDefaultWorkflows();

    // Register a mock failing capability for compensation testing
    const TestFailingCapability: CapabilityContract<any, any> = {
      id: 'test.failing_step',
      version: '1.0.0',
      domain: 'CIVIC',
      humanName: 'Failing Step for Compensation Testing',
      description: 'Injects failure to verify reverse-order compensation execution',
      sideEffectClass: 'READ_ONLY',
      requiresHumanAuthorization: false,
      inputSchema: z.object({ citizenId: z.string() }),
      outputSchema: z.any(),
      execute: async () => {
        throw new Error('Simulated statutory service outage for rollback verification');
      },
    };
    CapabilityRegistry.getInstance().register(TestFailingCapability);

    // Register test workflow with compensatable step followed by failing step
    const TestCompensationWorkflow: WorkflowContract = {
      code: 'TEST_COMPENSATION_WORKFLOW',
      title: 'Compensation Verification Workflow',
      description: 'Tests multi-step rollback and reverse compensation',
      category: 'BUSINESS',
      initialStepId: 'step_pay',
      steps: {
        step_pay: {
          stepId: 'step_pay',
          title: 'Pay Processing Fee',
          capabilityId: 'payments.process_fee',
          inputMapper: (ctx) => ({
            citizenId: ctx.citizenId,
            amountInr: 500,
            purpose: 'Compensation Test Payment',
            paymentMethod: 'UPI_BHARAT',
          }),
          nextStepId: 'step_fail',
        },
        step_fail: {
          stepId: 'step_fail',
          title: 'Failing Step',
          capabilityId: 'test.failing_step',
          inputMapper: (ctx) => ({
            citizenId: ctx.citizenId,
          }),
          nextStepId: null,
        },
      },
    };
    WorkflowRegistry.getInstance().register(TestCompensationWorkflow);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('runs RECOVER_DORMANT_PF with authorization gating, consent ledger & application lifecycle', async () => {
    const db = await getDb();

    // 1. Start workflow
    const initialRun = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    // Step 1 executes automatically (read-only scan).
    // Step 2 requires authorization, so runner MUST pause in AWAITING_AUTHORIZATION state!
    expect(initialRun.state).toBe('AWAITING_AUTHORIZATION');
    expect(initialRun.currentStepId).toBe('step_transfer');

    // Verify application lifecycle record was created in IN_PROGRESS state
    const initialApps = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.workflowRunId, initialRun.id));
    expect(initialApps.length).toBe(1);
    expect(initialApps[0].universalStatus).toBe('IN_PROGRESS');

    // 2. Resume workflow with explicit citizen authorization
    const resumedRun = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      authorize: true,
    });

    expect(resumedRun.state).toBe('COMPLETED');
    expect(resumedRun.currentStepId).toBeNull();
    expect(resumedRun.contextData.step_transfer_output).toBeDefined();
    const output = resumedRun.contextData.step_transfer_output as any;
    expect(output.transferredAmountInr).toBe(142500);

    // Verify durable consent was persisted into consents table
    const consents = await db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.citizenId, PRIYA_SHARMA_ID));
    expect(consents.length).toBeGreaterThanOrEqual(1);
    const epfoConsent = consents.find((c) => c.purpose.includes('EPFO account transfer'));
    expect(epfoConsent).toBeDefined();
    expect(epfoConsent?.authorizedAction).toContain('Form 13');

    // Verify application lifecycle transitioned to COMPLETED
    const completedApps = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.workflowRunId, initialRun.id));
    expect(completedApps[0].universalStatus).toBe('COMPLETED');
    expect(completedApps[0].completedAt).toBeDefined();
  });

  it('runs START_BUSINESS with dynamic UI and authorization gates', async () => {
    // 1. Start workflow - initial step requires user input
    const initialRun = await runner.startWorkflow({
      workflowCode: 'START_BUSINESS',
      citizenId: PRIYA_SHARMA_ID,
    });

    expect(initialRun.state).toBe('AWAITING_USER_INPUT');
    expect(initialRun.currentStepId).toBe('step_details');
    expect(initialRun.activeUI).toBeDefined();
    expect(initialRun.activeUI?.workspaceTitle).toBe('Set Up Your Enterprise');

    // 2. Submit user details
    const runAfterDetails = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      input: {
        companyName: 'Bhasha AI Systems Private Limited',
        entityType: 'PRIVATE_LIMITED',
      },
    });

    // Next step is payment (payments.process_fee), which requires human authorization
    expect(runAfterDetails.state).toBe('AWAITING_AUTHORIZATION');
    expect(runAfterDetails.currentStepId).toBe('step_payment');

    // 3. Authorize payment fee
    const runAfterPayment = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      authorize: true,
    });

    // Next step is incorporation (business.incorporate), which requires human authorization
    expect(runAfterPayment.state).toBe('AWAITING_AUTHORIZATION');
    expect(runAfterPayment.currentStepId).toBe('step_incorporate');

    // 4. Authorize company incorporation
    const finalRun = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      authorize: true,
    });

    expect(finalRun.state).toBe('COMPLETED');
    const incorpOutput = finalRun.contextData.step_incorporate_output as any;
    expect(incorpOutput.legalName).toBe('Bhasha AI Systems Private Limited');
    expect(incorpOutput.pan).toBeDefined();
    expect(incorpOutput.gstin).toBeDefined();
    expect(incorpOutput.udyamNumber).toBeDefined();
  });

  it('executes LOST_DEVICE_PROTECTION emergency workflow', async () => {
    const initialRun = await runner.startWorkflow({
      workflowCode: 'LOST_DEVICE_PROTECTION',
      citizenId: PRIYA_SHARMA_ID,
    });

    expect(initialRun.state).toBe('AWAITING_USER_INPUT');

    const runAfterInput = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      input: { incidentLocation: 'MG Road Metro Station' },
    });

    expect(runAfterInput.state).toBe('AWAITING_AUTHORIZATION');

    const completedRun = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      authorize: true,
    });

    expect(completedRun.state).toBe('COMPLETED');
    const output = completedRun.contextData.step_confirm_output as any;
    expect(output.deviceBlocked).toBe(true);
    expect(output.simBlocked).toBe(true);
    expect(output.policeAcknowledgmentReceipt).toBeDefined();
  });

  it('EXECUTES reverse-order compensation when a downstream step fails', async () => {
    const db = await getDb();

    // 1. Start test workflow
    const run = await runner.startWorkflow({
      workflowCode: 'TEST_COMPENSATION_WORKFLOW',
      citizenId: PRIYA_SHARMA_ID,
    });

    expect(run.state).toBe('AWAITING_AUTHORIZATION');
    expect(run.currentStepId).toBe('step_pay');

    // 2. Authorize step 1 (payment fee 500)
    // When resumed, step 1 succeeds, advancing to step 2 which throws an error!
    const failedRun = await runner.resumeWorkflow({
      workflowRunId: run.id,
      authorize: true,
    });

    // Workflow must be marked FAILED with compensated = true
    expect(failedRun.state).toBe('FAILED');
    expect(failedRun.contextData.compensated).toBe(true);

    // Verify reverse compensation: payment should have been refunded in database!
    const payments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.citizenId, PRIYA_SHARMA_ID));

    const testPayment = payments.find((p) => p.amountInr === 500);
    expect(testPayment).toBeDefined();
    expect(testPayment?.status).toBe('REFUNDED');

    // Verify audit log record for compensation
    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.citizenId, PRIYA_SHARMA_ID));

    const compensationLog = auditLogs.find((l) =>
      l.action.includes('WORKFLOW_STEP_COMPENSATED:step_pay')
    );
    expect(compensationLog).toBeDefined();
    expect(compensationLog?.resultStatus).toBe('COMPENSATED');

    // Verify application lifecycle reflects failure
    const apps = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.workflowRunId, run.id));
    expect(apps[0].universalStatus).toBe('FAILED');
  });
});
