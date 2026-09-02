import { getDb, schema } from '@indra/database';
import type { IndraDomainEvent, EventType } from '@indra/contracts';

export type EventHandler<T = Record<string, unknown>> = (event: IndraDomainEvent<T>) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe<T = Record<string, unknown>>(eventType: EventType | '*', handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    set.add(handler as EventHandler);

    return () => {
      set.delete(handler as EventHandler);
    };
  }

  async publish<T extends Record<string, unknown>>(event: IndraDomainEvent<T>): Promise<void> {
    // 1. Persist domain event to PostgreSQL database
    try {
      const db = await getDb();
      await db.insert(schema.systemEvents).values({
        eventType: event.eventType,
        citizenId: event.citizenId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: new Date(event.timestamp),
      });
    } catch (err) {
      console.error('[EventBus] Failed to persist system event:', err);
    }

    // 2. Dispatch to specific listeners
    const specificHandlers = this.listeners.get(event.eventType);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event.eventType}:`, err);
        }
      }
    }

    // 3. Dispatch to wildcard listeners
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[EventBus] Error in wildcard handler:`, err);
        }
      }
    }
  }
}
