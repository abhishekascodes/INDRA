import { getDb, schema } from '@indra/database';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  SideEffectClassification,
  ProvenanceRecordPayload,
  ExecutionContext,
} from '@indra/contracts';

export * from './life-events.js';
export * from './world-model-service.js';
export * from './consequence-graph.js';
export * from './action-plan-engine.js';
export * from './proactive/index.js';
export * from './universal-status.js';
export * from './action-center.js';


export class ConsentManager {
  async recordConsent(params: {
    citizenId: string;
    purpose: string;
    scope: string[];
    authorizedAction: string;
    expiresInHours?: number;
  }) {
    const db = await getDb();
    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 3600 * 1000)
      : null;

    const inserted = await db
      .insert(schema.consents)
      .values({
        citizenId: params.citizenId,
        purpose: params.purpose,
        scope: params.scope,
        authorizedAction: params.authorizedAction,
        expiresAt,
      })
      .returning();

    return inserted[0];
  }

  async hasActiveConsent(citizenId: string, purpose: string): Promise<boolean> {
    const db = await getDb();
    const records = await db
      .select()
      .from(schema.consents)
      .where(
        and(
          eq(schema.consents.citizenId, citizenId),
          eq(schema.consents.purpose, purpose),
          isNull(schema.consents.revokedAt)
        )
      );

    if (records.length === 0) return false;
    const consent = records[0];
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      return false;
    }
    return true;
  }

  async revokeConsent(consentId: string) {
    const db = await getDb();
    await db
      .update(schema.consents)
      .set({ revokedAt: new Date() })
      .where(eq(schema.consents.id, consentId));
  }
}

export class SafetyEvaluator {
  /**
   * Enforces side-effect policy.
   * Actions marked IRREVERSIBLE, COMPENSATABLE, or NON_COMPENSATABLE require explicit human authorization.
   */
  evaluateSideEffectSafety(
    sideEffectClass: SideEffectClassification,
    ctx: ExecutionContext
  ): { safeToExecute: boolean; reason?: string } {
    if (sideEffectClass === 'READ_ONLY' || sideEffectClass === 'REVERSIBLE') {
      return { safeToExecute: true };
    }

    if (!ctx.authorizationGranted) {
      return {
        safeToExecute: false,
        reason: `Action with side-effect '${sideEffectClass}' requires explicit citizen authorization before execution.`,
      };
    }

    return { safeToExecute: true };
  }
}

export class ProvenanceTracker {
  async recordProvenance(citizenId: string, payload: ProvenanceRecordPayload) {
    const db = await getDb();
    const inserted = await db
      .insert(schema.provenanceRecords)
      .values({
        citizenId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        sourceType: payload.sourceType,
        sourceAuthority: payload.sourceAuthority,
        confidence: payload.confidence,
        metadata: payload.metadata || {},
      })
      .returning();

    return inserted[0];
  }

  async getProvenanceForEntity(entityId: string) {
    const db = await getDb();
    return db
      .select()
      .from(schema.provenanceRecords)
      .where(eq(schema.provenanceRecords.entityId, entityId));
  }
}
