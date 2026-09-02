import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { seedDatabase, resetDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import { registerDefaultCapabilities } from '@indra/capability-engine';
import {
  WorkflowRunner,
  registerDefaultWorkflows,
} from '@indra/workflow-engine';

describe('Workflow Engine State Machine & DAG Durability', () => {
  const runner = new WorkflowRunner();

  beforeAll(async () => {
    registerDefaultCapabilities();
    registerDefaultWorkflows();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('runs RECOVER_DORMANT_PF with authorization gating', async () => {
    // 1. Start workflow
    const initialRun = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    // Step 1 executes automatically (read-only scan).
    // Step 2 requires authorization, so runner MUST pause in AWAITING_AUTHORIZATION state!
    expect(initialRun.state).toBe('AWAITING_AUTHORIZATION');
    expect(initialRun.currentStepId).toBe('step_transfer');

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

    // Requires user confirmation of incident location
    expect(initialRun.state).toBe('AWAITING_USER_INPUT');

    // Submit location -> transitions to authorization for CEIR blacklisting
    const runAfterInput = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      input: { incidentLocation: 'MG Road Metro Station' },
    });

    expect(runAfterInput.state).toBe('AWAITING_AUTHORIZATION');

    // Authorize blacklist
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
});
