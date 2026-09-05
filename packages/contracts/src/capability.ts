import { z } from 'zod';

export const SideEffectClassificationSchema = z.enum([
  'READ_ONLY',
  'REVERSIBLE',
  'COMPENSATABLE',
  'IRREVERSIBLE',
  'NON_COMPENSATABLE',
]);

export type SideEffectClassification = z.infer<typeof SideEffectClassificationSchema>;

export const CapabilityDomainSchema = z.enum([
  'IDENTITY',
  'DOCUMENTS',
  'PAYMENTS',
  'TAX',
  'EMPLOYMENT',
  'EDUCATION',
  'HEALTH',
  'TRANSPORT',
  'TRAVEL',
  'BUSINESS',
  'AGRICULTURE',
  'BENEFITS',
  'PROPERTY',
  'CIVIC',
  'JUSTICE',
  'TELECOM',
  'EMERGENCY',
  'SECURITY',
  'COMMUNICATION',
  'FINANCE',
  'BANKING',
  'FAMILY',
  'ACCESSIBILITY',
]);

export type CapabilityDomain = z.infer<typeof CapabilityDomainSchema>;

export interface ExecutionContext {
  citizenId: string;
  workflowRunId?: string;
  idempotencyKey?: string;
  authorizationGranted?: boolean;
  authorizationDetails?: {
    authorizedAt: string;
    purpose: string;
    actionSummary: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field?: string;
    code: string;
    message: string;
  }>;
}

export interface ProvenanceRecordPayload {
  entityType: string;
  entityId: string;
  sourceType:
    | 'FACT'
    | 'SYSTEM_OBSERVATION'
    | 'USER_ASSERTION'
    | 'INFERENCE'
    | 'CONTRADICTION'
    | 'ACTION'
    | 'UNKNOWN';
  sourceAuthority: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface ConsentRequirement {
  purpose: string;
  dataElements: string[];
  retentionDuration: string;
  userFriendlyExplanation: string;
}

export interface HumanAuthorizationPrompt {
  title: string;
  summary: string;
  consequencesNotice: string;
  confirmationLabel: string;
}

export interface CapabilityFailurePolicy {
  retryable: boolean;
  maxRetries: number;
  compensationSupported: boolean;
  userRecoveryGuidance?: string;
}

export interface ExternalEventTrigger {
  awaitsExternalEvent: boolean;
  externalEventType?: string;
  timeoutSeconds?: number;
}

export interface CapabilityDependencies {
  prerequisiteCapabilityIds?: string[];
  requiredCredentials?: string[];
  dataDependencies?: string[];
}

/**
 * Foundational, versioned, extensible Capability Contract.
 * Models atomic public actions with full safety boundaries, consent ledger,
 * side-effect classification, and provenance attribution.
 */
export interface CapabilityContract<TInput = unknown, TOutput = unknown> {
  id: string; // e.g. "epfo.transfer_claim"
  version: string; // Semantic versioning, e.g. "1.0.0"
  domain: CapabilityDomain;
  humanName: string;
  description: string;
  sideEffectClass: SideEffectClassification;
  requiresHumanAuthorization: boolean;
  humanAuthorizationPrompt?: HumanAuthorizationPrompt;

  // Consent & Permissions
  consentRequirement?: ConsentRequirement;
  requiredPermissions?: string[];

  // Schemas
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;

  // Dependencies & Preconditions
  dependencies?: CapabilityDependencies;
  preconditions?: (ctx: ExecutionContext, input: TInput) => Promise<ValidationResult>;

  // Idempotency & Events
  idempotencyStrategy?: 'ARGUMENT_HASH' | 'CITIZEN_TIMESTAMP' | 'CUSTOM';
  eventsEmitted?: string[];
  externalEventTrigger?: ExternalEventTrigger;

  // Failure & Recovery
  failurePolicy?: CapabilityFailurePolicy;

  // Execution & Rollback
  execute: (input: TInput, ctx: ExecutionContext) => Promise<TOutput>;
  compensate?: (input: TInput, output: TOutput, ctx: ExecutionContext) => Promise<void>;

  // Provenance Generation
  provenanceGenerator?: (input: TInput, output: TOutput, ctx: ExecutionContext) => ProvenanceRecordPayload[];

  // Universal Citizen Review Metadata (Platform Review Primitive)
  reviewMetadata?: import('./review.js').CapabilityReviewMetadata<TInput>;
}
