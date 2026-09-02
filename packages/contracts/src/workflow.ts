import { z } from 'zod';
import type { DynamicWorkspaceContract } from './ui.js';

export const WorkflowStateSchema = z.enum([
  'DRAFT',
  'RUNNING',
  'AWAITING_USER_INPUT',
  'AWAITING_AUTHORIZATION',
  'AWAITING_EXTERNAL_EVENT',
  'COMPENSATING',
  'COMPLETED',
  'FAILED',
]);

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

export interface WorkflowStepDefinition {
  stepId: string;
  title: string;
  capabilityId: string;
  dynamicUI?: (workflowContext: Record<string, unknown>) => DynamicWorkspaceContract;
  inputMapper: (workflowContext: Record<string, unknown>) => Record<string, unknown>;
  onSuccess?: (stepOutput: unknown, workflowContext: Record<string, unknown>) => Record<string, unknown>;
  nextStepId?: string | null | ((stepOutput: unknown, ctx: Record<string, unknown>) => string | null);
  failureRecoveryStepId?: string;
}

export interface WorkflowContract {
  code: string;
  title: string;
  description: string;
  category: string;
  initialStepId: string;
  steps: Record<string, WorkflowStepDefinition>;
}

export interface WorkflowRunSummary {
  id: string;
  workflowCode: string;
  title: string;
  citizenId: string;
  state: WorkflowState;
  currentStepId: string | null;
  contextData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  activeUI?: DynamicWorkspaceContract;
}
