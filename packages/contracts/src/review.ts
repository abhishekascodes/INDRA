import { z } from 'zod';

export const ReviewModeSchema = z.enum([
  'READ_ONLY',
  'REVERSIBLE',
  'FEDERATED_CONSENT',
  'IRREVERSIBLE',
]);

export type ReviewMode = z.infer<typeof ReviewModeSchema>;

export const ReviewStatusSchema = z.enum([
  'PREPARED',
  'VALIDATED',
  'REVIEWED',
  'AUTHORIZED',
  'EXECUTED',
  'SUPERSEDED',
  'EXPIRED',
]);

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const DataSensitivitySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export type DataSensitivity = z.infer<typeof DataSensitivitySchema>;

export const DataProvenanceSourceSchema = z.enum([
  'VAULT',
  'UIDAI_GROUND_TRUTH',
  'CITIZEN_INPUT',
  'SYSTEM_INFERENCE',
  'OFFICIAL_REGISTRY',
]);

export type DataProvenanceSource = z.infer<typeof DataProvenanceSourceSchema>;

export const ValidationRuleSchema = z.object({
  type: z.string().optional(),
  placeholder: z.string().optional(),
  regex: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

export const DataProvenanceFieldSchema = z.object({
  fieldKey: z.string(),
  label: z.string(),
  value: z.any(),
  source: DataProvenanceSourceSchema,
  sourceLabel: z.string(),
  sensitivity: DataSensitivitySchema,
  editable: z.boolean(),
  validationRules: ValidationRuleSchema.optional(),
});

export type DataProvenanceField = z.infer<typeof DataProvenanceFieldSchema>;

export const InstitutionalDisclosureSchema = z.object({
  recipient: z.string(),
  role: z.string(),
  categories: z.array(z.string()),
  purpose: z.string(),
  retention: z.string().optional(),
  consentArtifactId: z.string().optional(),
});

export type InstitutionalDisclosure = z.infer<typeof InstitutionalDisclosureSchema>;

export const StatutoryDeclarationSchema = z.object({
  id: z.string(),
  text: z.string(),
  required: z.boolean(),
  accepted: z.boolean(),
});

export type StatutoryDeclaration = z.infer<typeof StatutoryDeclarationSchema>;

export const PreconditionStatusSchema = z.object({
  code: z.string(),
  label: z.string(),
  passed: z.boolean(),
  details: z.string().optional(),
});

export type PreconditionStatus = z.infer<typeof PreconditionStatusSchema>;

export const ConsequenceSummarySchema = z.object({
  isIrreversible: z.boolean(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  warning: z.string(),
  downstreamUpdates: z.array(z.string()),
  compensationAvailable: z.boolean(),
});

export type ConsequenceSummary = z.infer<typeof ConsequenceSummarySchema>;

export const FeeBreakdownSchema = z.object({
  statutoryFeeInr: z.number(),
  convenienceFeeInr: z.number(),
  totalInr: z.number(),
  paymentRequired: z.boolean(),
  paymentMethod: z.string().optional(),
});

export type FeeBreakdown = z.infer<typeof FeeBreakdownSchema>;

export const OperationPreviewSchema = z.object({
  title: z.string(),
  summary: z.string(),
  authority: z.string(),
  category: z.string().optional(),
});

export type OperationPreview = z.infer<typeof OperationPreviewSchema>;

export const ReviewSessionContractSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  stepId: z.string(),
  citizenId: z.string().uuid(),
  capabilityId: z.string(),
  version: z.number().int().positive().default(1),
  supersededBySessionId: z.string().uuid().optional().nullable(),
  supersededAt: z.string().optional().nullable(),
  reviewMode: ReviewModeSchema,
  status: ReviewStatusSchema,
  payloadHash: z.string(),
  operationPreview: OperationPreviewSchema,
  dataProvenanceMatrix: z.array(DataProvenanceFieldSchema),
  disclosures: z.array(InstitutionalDisclosureSchema),
  statutoryDeclarations: z.array(StatutoryDeclarationSchema),
  preconditions: z.array(PreconditionStatusSchema),
  consequences: ConsequenceSummarySchema,
  feeBreakdown: FeeBreakdownSchema,
  authorizationToken: z.string().optional(),
  authorizedAt: z.string().optional(),
  expiresAt: z.string(),
  executedAt: z.string().optional(),
  reconciliationSummary: z.record(z.any()).optional(),
});

export type ReviewSessionContract = z.infer<typeof ReviewSessionContractSchema>;

/**
 * Server-Issued Authorization Artifact Payload.
 * Represents a tamper-evident server authorization binding (not a citizen digital signature).
 */
export interface AuthorizationArtifactPayload {
  sessionId: string;
  workflowRunId: string;
  stepId: string;
  version: number;
  citizenId: string;
  payloadHash: string;
  authorizedAt: string;
  expiresAt: string;
}

// Backward-compatibility alias
export type AuthorizationTokenPayload = AuthorizationArtifactPayload;

/**
 * Declarative review contract metadata for capabilities to decouple review behavior from specific IDs.
 */
export interface CapabilityReviewMetadata<TInput = any> {
  disclosures?: InstitutionalDisclosure[];
  statutoryDeclarations?: StatutoryDeclaration[];
  feeCalculator?: (input: TInput, context: Record<string, any>) => FeeBreakdown;
  consequences?: ConsequenceSummary;
  preconditions?: Array<{
    code: string;
    label: string;
    evaluator: (input: TInput, context: Record<string, any>) => Promise<boolean> | boolean;
  }>;
  fieldProvenanceMap?: Record<string, {
    source: DataProvenanceSource;
    sourceLabel: string;
    sensitivity: DataSensitivity;
    editable: boolean;
  }>;
}
