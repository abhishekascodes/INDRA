import { z } from 'zod';

export const UniversalStatusSchema = z.enum([
  'DRAFT',
  'ACTION_REQUIRED',
  'READY',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFICATION',
  'APPOINTMENT_REQUIRED',
  'PAYMENT_REQUIRED',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'EXPIRED',
  'BLOCKED',
  'FAILED',
]);

export type UniversalStatus = z.infer<typeof UniversalStatusSchema>;

export const ProvenanceSourceTypeSchema = z.enum([
  'FACT',
  'SYSTEM_OBSERVATION',
  'USER_ASSERTION',
  'INFERENCE',
  'UNKNOWN',
  'CONTRADICTION',
  'ACTION',
]);

export type ProvenanceSourceType = z.infer<typeof ProvenanceSourceTypeSchema>;

export const GovernmentInboxItemSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  title: z.string(),
  category: z.enum(['NOTICE', 'ACTION_REQUIRED', 'DEADLINE', 'UPDATE', 'PROACTIVE']),
  whatHappened: z.string(),
  whyItMatters: z.string(),
  whatToDo: z.string(),
  byWhen: z.string().nullable().optional(),
  whatHappensNext: z.string(),
  workflowCode: z.string().nullable().optional(),
  actionPayload: z.record(z.unknown()).optional(),
  isRead: z.boolean().default(false),
  isResolved: z.boolean().default(false),
  createdAt: z.string(),
});

export type GovernmentInboxItem = z.infer<typeof GovernmentInboxItemSchema>;

export const CitizenProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string(),
  gender: z.string(),
  primaryMobile: z.string(),
  primaryEmail: z.string(),
  currentCity: z.string(),
  currentState: z.string(),
});

export type CitizenProfile = z.infer<typeof CitizenProfileSchema>;
