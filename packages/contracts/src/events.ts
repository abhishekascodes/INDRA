import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'INTENT_MATCHED',
  'WORKFLOW_STARTED',
  'WORKFLOW_STEP_COMPLETED',
  'WORKFLOW_AWAITING_INPUT',
  'WORKFLOW_AWAITING_AUTHORIZATION',
  'WORKFLOW_COMPLETED',
  'WORKFLOW_FAILED',
  'WORKFLOW_COMPENSATED',
  'APPLICATION_SUBMITTED',
  'APPLICATION_STATUS_UPDATED',
  'PAYMENT_RECORDED',
  'DOCUMENT_ISSUED',
  'PROACTIVE_DISCOVERY_FOUND',
  'INCONSISTENCY_FLAGGED',
  'GOVERNMENT_INBOX_UPDATED',
  'CITIZEN_STATE_TRANSITION_INITIATED',
  'CITIZEN_STATE_TRANSITION_SUSPENDED',
  'CITIZEN_STATE_TRANSITION_COMPLETED',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const IndraDomainEventSchema = z.object({
  eventId: z.string(),
  eventType: EventTypeSchema,
  citizenId: z.string(),
  aggregateType: z.enum(['WORKFLOW', 'APPLICATION', 'CITIZEN', 'PAYMENT', 'DOCUMENT', 'SPI', 'CITIZEN_STATE_TRANSITION']),
  aggregateId: z.string(),
  payload: z.record(z.unknown()),
  timestamp: z.string(),
  provenance: z.object({
    source: z.enum(['SYSTEM_OBSERVATION', 'EXTERNAL_SPI', 'USER_ACTION', 'AUTOMATED_RULE']),
    correlationId: z.string(),
  }),
});

export type IndraDomainEvent<T = Record<string, unknown>> = Omit<
  z.infer<typeof IndraDomainEventSchema>,
  'payload'
> & {
  payload: T;
};
