import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowRunner,
  WorkflowRegistry,
  registerDefaultWorkflows,
} from '@indra/workflow-engine';
import {
  CapabilityRegistry,
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import { seedDatabase, PRIYA_SHARMA_ID } from '@indra/database';

import { z } from '@indra/contracts';

describe('Audit 3: Side-Effect Safety & Irreversible Action Enforcement', () => {
  let runner: WorkflowRunner;

  beforeEach(async () => {
    registerDefaultCapabilities();
    registerDefaultWorkflows();
    await seedDatabase();
    runner = new WorkflowRunner();
  });

  it('enforces STOP -> VERIFY -> AUTHORIZE gate for irreversible actions (RECOVER_DORMANT_PF)', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    // Step 1: EPFO account inquiry succeeded, now paused for human authorization
    expect(run.state).toBe('AWAITING_AUTHORIZATION');
    expect(run.currentStepId).toBe('step_transfer');

    // Attempting to resume WITHOUT explicit authorize: true must NOT advance the step
    const pausedResume = await runner.resumeWorkflow({
      workflowRunId: run.id,
      input: { note: 'Attempting to advance without statutory authorization' },
      authorize: false,
    });

    expect(pausedResume.state).toBe('AWAITING_AUTHORIZATION');

    // Now grant explicit statutory authorization
    const completed = await runner.resumeWorkflow({
      workflowRunId: run.id,
      authorize: true,
    });

    expect(completed.state).toBe('COMPLETED');
  });

  it('prevents duplicate execution of completed workflows (replay attack / refresh protection)', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    // Advance to completed
    const completed = await runner.resumeWorkflow({
      workflowRunId: run.id,
      authorize: true,
    });
    expect(completed.state).toBe('COMPLETED');

    // Attempting to resume an already completed workflow MUST be rejected!
    await expect(
      runner.resumeWorkflow({
        workflowRunId: run.id,
        authorize: true,
      })
    ).rejects.toThrow(/terminal state 'COMPLETED'/i);
  });

  it('executes reverse-order compensation when a downstream reversible step fails', async () => {
    const capRegistry = CapabilityRegistry.getInstance();
    const wfRegistry = WorkflowRegistry.getInstance();

    let compensationExecuted = false;

    // Register a reversible action
    capRegistry.register({
      id: 'test.reserve_resource',
      humanName: 'Reserve Resource',
      description: 'Temporary reservation',
      domain: 'CIVIC',
      sideEffectClass: 'COMPENSATABLE',
      requiresHumanAuthorization: true,
      inputSchema: z.record(z.unknown()),
      outputSchema: z.record(z.unknown()),
      execute: async () => ({ reservationId: 'RES-999' }),
      compensate: async () => {
        compensationExecuted = true;
      },
    });

    // Register a downstream step that fails
    capRegistry.register({
      id: 'test.downstream_fail',
      humanName: 'Downstream Failure',
      description: 'Failing step',
      domain: 'CIVIC',
      sideEffectClass: 'READ_ONLY',
      requiresHumanAuthorization: false,
      inputSchema: z.record(z.unknown()),
      outputSchema: z.record(z.unknown()),
      execute: async () => {
        throw new Error('Simulated network timeout');
      },
    });

    wfRegistry.register({
      code: 'TEST_COMPENSATION_PIPELINE',
      title: 'Compensation Test Pipeline',
      description: 'Tests reverse compensation',
      domain: 'FINANCIAL',
      version: '1.0.0',
      initialStepId: 'step_1',
      steps: {
        step_1: {
          stepId: 'step_1',
          capabilityId: 'test.reserve_resource',
          inputMapper: (ctx: any) => ctx,
          nextStepId: 'step_2',
        },
        step_2: {
          stepId: 'step_2',
          capabilityId: 'test.downstream_fail',
          inputMapper: (ctx: any) => ctx,
          nextStepId: null,
        },
      },
    });

    const initialRun = await runner.startWorkflow({
      workflowCode: 'TEST_COMPENSATION_PIPELINE',
      citizenId: PRIYA_SHARMA_ID,
    });

    expect(initialRun.state).toBe('AWAITING_AUTHORIZATION');
    expect(initialRun.currentStepId).toBe('step_1');

    const failedRun = await runner.resumeWorkflow({
      workflowRunId: initialRun.id,
      authorize: true,
    });

    expect(failedRun.state).toBe('FAILED');
    expect(compensationExecuted).toBe(true);

    // Terminal failed state cannot be resumed
    await expect(
      runner.resumeWorkflow({
        workflowRunId: failedRun.id,
      })
    ).rejects.toThrow(/terminal state 'FAILED'/i);
  });
});
