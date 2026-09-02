import { z } from 'zod';

export const UIComponentPrimitiveSchema = z.enum([
  'TEXT_INPUT',
  'NUMERIC_INPUT',
  'DATE_PICKER',
  'SELECT_CHOICE',
  'ADDRESS_BLOCK',
  'DOCUMENT_PICKER',
  'IDENTITY_CONFIRMATION',
  'EVIDENCE_COMPARISON',
  'ACTION_AUTHORIZATION',
  'PAYMENT_CONFIRMATION',
  'APPOINTMENT_SELECTOR',
  'STATUS_TIMELINE',
  'COMPLETION_SUMMARY',
]);

export type UIComponentPrimitive = z.infer<typeof UIComponentPrimitiveSchema>;

export const UIFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  hint: z.string().optional(),
});

export const UIFieldDefinitionSchema = z.object({
  fieldId: z.string(),
  type: UIComponentPrimitiveSchema,
  label: z.string(),
  helperText: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  options: z.array(UIFieldOptionSchema).optional(),
  props: z.record(z.any()).optional(),
});

export type UIFieldDefinition = z.infer<typeof UIFieldDefinitionSchema>;

export const DynamicWorkspaceContractSchema = z.object({
  workspaceTitle: z.string(),
  workspaceSubtitle: z.string(),
  currentStepIndex: z.number(),
  totalSteps: z.number(),
  knownInformation: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      source: z.string(),
    })
  ).default([]),
  requiredFields: z.array(UIFieldDefinitionSchema).default([]),
  submitButtonText: z.string().default('Continue').optional(),
  cancelButtonText: z.string().optional(),
  requiresAuthorization: z.boolean().default(false).optional(),
  authorizationNotice: z.string().optional(),
});

export type DynamicWorkspaceContract = z.infer<typeof DynamicWorkspaceContractSchema>;
