import { z } from 'zod';

export const StructuredIntentSchema = z.object({
  intentId: z.string(),
  intentCategory: z.string(),
  confidence: z.number().min(0).max(1),
  userQuery: z.string(),
  matchedWorkflowCode: z.string().nullable().optional(),
  suggestedActionTitle: z.string(),
  suggestedActionDescription: z.string(),
  extractedEntities: z.record(z.unknown()).default({}),
  clarificationRequired: z.boolean().default(false),
  clarificationQuestion: z.string().optional(),
});

export type StructuredIntent = z.infer<typeof StructuredIntentSchema>;
