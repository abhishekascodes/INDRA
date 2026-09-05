import { z } from 'zod';

export type TransitionState =
  | 'ANALYZING'
  | 'CONSEQUENCE_DERIVED'
  | 'CONTRADICTION_BLOCKED'
  | 'AWAITING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'SUSPENDED'
  | 'RETRYING'
  | 'RECONCILING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TransitionStepState =
  | 'PENDING'
  | 'READY'
  | 'EXECUTING'
  | 'SUCCEEDED'
  | 'WAITING'
  | 'BLOCKED'
  | 'FAILED'
  | 'SUSPENDED'
  | 'RETRYING'
  | 'COMPENSATING'
  | 'RECONCILING'
  | 'RECONCILED'
  | 'CANCELLED';

export interface ContradictionRecord {
  id: string;
  sourceInstitution: string;
  entity: string;
  field: string;
  observedValues: Record<string, unknown>;
  timestampsOrVersions?: Record<string, unknown>;
  evidenceOrProvenance: Record<string, unknown>;
  candidateAuthoritativeSource: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blockingStatus: 'BLOCKING' | 'NON_BLOCKING';
  blockedStepKeys: string[];
  whatConflicts: string;
  whyItMatters: string;
  whatEvidenceNeeded: string;
  resolutionStrategy: string;
  resolutionActions: string[];
  resolutionState: 'UNRESOLVED' | 'CITIZEN_OVERRIDDEN' | 'RESOLVED';
}

export interface TransitionStepCheckpoint {
  stepKey: string;
  capabilityId: string;
  title: string;
  authority: string;
  phaseIndex: number;
  dependencies: string[];
  state: TransitionStepState;
  attemptCount: number;
  lastAttemptAt?: string;
  errorReason?: string;
  isOutage?: boolean;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  reconciliationStatus?: 'PENDING' | 'VERIFIED' | 'MISMATCH';
}

export interface CivicTimelineEvent {
  id: string;
  timestamp: string;
  stage: string;
  title: string;
  description: string;
  authority?: string;
  status: 'INFO' | 'ACTION_REQUIRED' | 'WARNING' | 'SUCCESS' | 'SUSPENDED';
}

export interface ReconciliationEntityReport {
  entityType: string;
  identifier: string;
  intendedState: Record<string, unknown>;
  institutionalState: Record<string, unknown>;
  worldModelState: Record<string, unknown>;
  status: 'CONVERGED' | 'DIVERGENT' | 'PENDING';
  details?: string;
}

export interface ReconciliationReport {
  reconciledAt: string;
  isConverged: boolean;
  entities: ReconciliationEntityReport[];
  summary: string;
}

export interface TransitionOutcome {
  achievedAt: string;
  summary: string;
  reconciledEntitiesCount: number;
  publicRecordUpdated: boolean;
  certificatesGenerated: string[];
}

export interface TransitionPlanStep {
  stepKey: string;
  capabilityId: string;
  title: string;
  authority: string;
  phaseIndex: number;
  dependencies: string[];
  executionMode: 'AUTOMATED_SAFE_READ' | 'CITIZEN_REVIEW_REQUIRED' | 'STATUTORY_AUTHORIZATION_REQUIRED';
  statutoryFeeInr: number;
  estimatedDays: number;
  prefilledInput: Record<string, unknown>;
}

export interface TransitionPlan {
  title: string;
  summary: string;
  estimatedDays: number;
  estimatedStatutoryFeesInr: number;
  steps: TransitionPlanStep[];
}

export interface CitizenStateTransition {
  id: string;
  citizenId: string;
  initiatingQuery: string;
  lifeEventCode: string;
  targetOutcome: string;
  state: TransitionState;
  currentStepKey: string | null;
  preTransitionWorldState: Record<string, unknown>;
  consequenceGraph: {
    affectedEntities: string[];
    affectedInstitutions: string[];
    requiredActions: string[];
    dependencies: Record<string, string[]>;
  };
  contradictions: ContradictionRecord[];
  proposedPlan: TransitionPlan;
  reviewSessionId: string | null;
  authorizationToken: string | null;
  authorizedAt: string | null;
  executionCheckpoints: Record<string, TransitionStepCheckpoint>;
  reconciliationState: ReconciliationReport | null;
  finalOutcome: TransitionOutcome | null;
  timeline: CivicTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface SimulationConfig {
  failNextPropertyRequest: boolean;
  simulatePropertyOutage: boolean;
  injectDeedContradiction: boolean;
  latencyMs: number;
}
