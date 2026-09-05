import { z } from 'zod';

export const LifeEventCodeSchema = z.enum([
  'RELOCATION',
  'MARRIAGE',
  'DIVORCE',
  'BIRTH_OF_CHILD',
  'NEW_EMPLOYMENT',
  'JOB_LOSS',
  'START_BUSINESS',
  'BUY_VEHICLE',
  'SELL_VEHICLE',
  'BUY_PROPERTY',
  'INTERNATIONAL_TRAVEL',
  'LOST_PHONE',
  'IDENTITY_UPDATE',
  'CYBER_FRAUD_INCIDENT',
  'FARMER_SEASONAL_CYCLE',
  'DISASTER_EMERGENCY',
  'HEALTH_EVENT',
  'RELOCATION_PROPERTY_ACQUISITION',
]);

export type LifeEventCode = z.infer<typeof LifeEventCodeSchema>;

export const ActionPlanStepExecutionModeSchema = z.enum([
  'AUTOMATED_SAFE_READ',
  'CITIZEN_REVIEW_REQUIRED',
  'STATUTORY_AUTHORIZATION_REQUIRED',
]);

export type ActionPlanStepExecutionMode = z.infer<typeof ActionPlanStepExecutionModeSchema>;

export const ActionPlanStepStateSchema = z.enum([
  'BLOCKED',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
  'FAILED',
]);

export type ActionPlanStepState = z.infer<typeof ActionPlanStepStateSchema>;

export const ActionPlanStepSchema = z.object({
  id: z.string(),
  planId: z.string(),
  stepKey: z.string(),
  capabilityId: z.string(),
  title: z.string(),
  authority: z.string(),
  phaseIndex: z.number().default(1),
  dependencies: z.array(z.string()).default([]),
  state: ActionPlanStepStateSchema.default('BLOCKED'),
  executionMode: ActionPlanStepExecutionModeSchema.default('CITIZEN_REVIEW_REQUIRED'),
  workflowRunId: z.string().nullable().optional(),
  outputPayload: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ActionPlanStep = z.infer<typeof ActionPlanStepSchema>;

export const ActionPlanStateSchema = z.enum([
  'DISCOVERED',
  'AWAITING_CITIZEN_REVIEW',
  'IN_PROGRESS',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'CANCELLED',
]);

export type ActionPlanState = z.infer<typeof ActionPlanStateSchema>;

export const ActionPlanSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  lifeEventCode: LifeEventCodeSchema,
  title: z.string(),
  summary: z.string(),
  state: ActionPlanStateSchema.default('DISCOVERED'),
  totalTasks: z.number().default(0),
  completedTasks: z.number().default(0),
  estimatedDaysToComplete: z.number().default(14),
  estimatedStatutoryFeesInr: z.number().default(0),
  contextData: z.record(z.unknown()).default({}),
  steps: z.array(ActionPlanStepSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export const ProactiveFindingCategorySchema = z.enum([
  'OBLIGATION_DEADLINE',
  'ELIGIBILITY_OPPORTUNITY',
  'ANOMALY_CONTRADICTION',
  'DORMANT_ASSET',
  'CREDENTIAL_LIFECYCLE',
  'LIFE_EVENT_TRIGGER',
]);

export type ProactiveFindingCategory = z.infer<typeof ProactiveFindingCategorySchema>;

export const ProactiveFindingStatusSchema = z.enum([
  'ACTIVE',
  'ACKNOWLEDGED',
  'SNOOZED',
  'IN_PROGRESS',
  'RESOLVED',
  'DISMISSED',
  'OBSOLETE',
]);

export type ProactiveFindingStatus = z.infer<typeof ProactiveFindingStatusSchema>;

export const StructuredExplanationSchema = z.object({
  whatChanged: z.string(),
  whyItMatters: z.string(),
  whatIndraRecommends: z.string(),
  whatCitizenMustAuthorize: z.string(),
  whatHappensNext: z.string(),
});

export type StructuredExplanation = z.infer<typeof StructuredExplanationSchema>;

export const FindingActionLinkSchema = z.object({
  actionType: z.enum([
    'LAUNCH_ACTION_PLAN',
    'LAUNCH_WORKFLOW',
    'EXECUTE_SAFE_READ',
    'EXTERNAL_DIRECTIVE',
  ]),
  targetCode: z.string(),
  prefilledContext: z.record(z.unknown()).default({}),
  requiresStatutoryAuthorization: z.boolean().default(false),
});

export type FindingActionLink = z.infer<typeof FindingActionLinkSchema>;

export const PolicyProvenanceSchema = z.object({
  ruleCode: z.string(),
  ruleVersion: z.string(), // e.g. "1.0.0"
  statutoryDomain: z.string(), // e.g. "PASSPORT_ACT_1967_S10"
  sourceAuthority: z.string(),
  registryFact: z.string(),
  systemObservation: z.string(),
  policyDerivation: z.string(),
  isSimulationAssumption: z.literal(true).default(true),
  simulationDisclaimer: z.string().default('Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.'),
  evaluatedAt: z.string(),
});

export type PolicyProvenance = z.infer<typeof PolicyProvenanceSchema>;

export const ProactiveFindingSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  fingerprint: z.string().default(''),
  category: ProactiveFindingCategorySchema.default('OBLIGATION_DEADLINE'),
  findingType: z.enum([
    'CREDENTIAL_EXPIRY',
    'DORMANT_ASSET',
    'IDENTITY_DISCREPANCY',
    'DEADLINE',
    'BENEFIT_ELIGIBILITY',
    'JURISDICTIONAL_CASCADE',
  ]),
  ruleCode: z.string().default('RULE_GENERIC'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priorityScore: z.number().default(50),
  status: ProactiveFindingStatusSchema.default('ACTIVE'),
  title: z.string(),
  explanation: z.string(),
  actionableRecommendation: z.string(),
  structuredExplanation: StructuredExplanationSchema.optional(),
  policyProvenance: PolicyProvenanceSchema.optional(),
  actionLink: FindingActionLinkSchema.optional(),
  recommendedWorkflowCode: z.string().nullable().optional(),
  recommendedActionPlanCode: z.string().nullable().optional(),
  actionPayload: z.record(z.unknown()).default({}),
  provenanceData: z.record(z.unknown()).default({}),
  snoozedUntil: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolvedByWorkflowRunId: z.string().nullable().optional(),
  resolvedByActionPlanId: z.string().nullable().optional(),
  isDismissed: z.boolean().default(false),
  lastScannedAt: z.string().optional(),
  createdAt: z.string(),
});

export type ProactiveFinding = z.infer<typeof ProactiveFindingSchema>;

