import { getDb, schema, eq, and, desc } from '@indra/database';
import type { ActionCenterItem } from '@indra/contracts';
import { UniversalStatusService } from './universal-status.js';

export class ActionCenterService {
  private static instance: ActionCenterService | null = null;

  public static getInstance(): ActionCenterService {
    if (!ActionCenterService.instance) {
      ActionCenterService.instance = new ActionCenterService();
    }
    return ActionCenterService.instance;
  }

  /**
   * Aggregates active proactive findings, pending authorizations, live workflows,
   * upcoming obligations, and active consent artifacts into a single unified Action Center feed.
   * Applies deterministic precedence rules to eliminate redundant duplicate representations.
   */
  public async getActionCenterFeed(citizenId: string): Promise<{
    items: ActionCenterItem[];
    summary: {
      totalActionable: number;
      criticalCount: number;
      highCount: number;
      pendingAuthorizationsCount: number;
      activeConsentArtifactsCount: number;
    };
  }> {
    const db = await getDb();
    const items: ActionCenterItem[] = [];

    // Precedence Trackers
    const addressedFindingCodes = new Set<string>();

    // 1. Active Action Plans (Highest Orchestration Precedence)
    const activePlans = await db
      .select()
      .from(schema.actionPlans)
      .where(
        and(
          eq(schema.actionPlans.citizenId, citizenId),
          eq(schema.actionPlans.state, 'IN_PROGRESS')
        )
      );

    for (const plan of activePlans) {
      if (plan.lifeEventCode) {
        addressedFindingCodes.add(plan.lifeEventCode);
      }
      items.push({
        id: `plan-${plan.id}`,
        citizenId: plan.citizenId,
        itemType: 'ACTION_PLAN_STEP',
        title: plan.title,
        subtitle: 'ACTIVE ACTION PLAN',
        description: `${plan.summary} (${plan.completedTasks}/${plan.totalTasks} tasks completed).`,
        canonicalStatus: 'UNDER_REVIEW',
        urgency: 'HIGH',
        priorityScore: 90,
        actionUrl: `/action-plans`,
        actionPayload: {
          actionPlanId: plan.id,
          lifeEventCode: plan.lifeEventCode,
          totalTasks: plan.totalTasks,
          completedTasks: plan.completedTasks,
        },
        requiresAuthorization: true,

        createdAt: plan.createdAt.toISOString(),
      });
    }

    // 2. Proactive Findings (Active & Acknowledged) - Filtered by Precedence Arbiter
    const findings = await db
      .select()
      .from(schema.proactiveFindings)
      .where(
        and(
          eq(schema.proactiveFindings.citizenId, citizenId),
          eq(schema.proactiveFindings.isDismissed, false)
        )
      )
      .orderBy(desc(schema.proactiveFindings.priorityScore));

    for (const f of findings) {
      if (f.status === 'RESOLVED' || f.status === 'OBSOLETE') continue;

      // Precedence Arbiter: Suppress raw finding if already elevated into an active Action Plan
      if (f.recommendedActionPlanCode && addressedFindingCodes.has(f.recommendedActionPlanCode)) {
        continue;
      }

      let canonicalStatus = UniversalStatusService.normalizeStatus(f.status);
      if (f.status === 'ACTIVE') {
        canonicalStatus = f.urgency === 'CRITICAL' ? 'ACTION_REQUIRED' : 'READY_TO_SUBMIT';
      }

      items.push({
        id: `finding-${f.id}`,
        citizenId: f.citizenId,
        itemType: 'PROACTIVE_FINDING',
        title: f.title,
        subtitle: f.category,
        description: f.explanation,
        canonicalStatus,
        urgency: f.urgency as any,
        priorityScore: f.priorityScore,
        actionUrl: `/action-plans`,
        actionPayload: {
          findingId: f.id,
          actionLink: f.actionLink,
          structuredExplanation: f.structuredExplanation,
          recommendedWorkflow: f.recommendedWorkflowCode,
          recommendedActionPlan: f.recommendedActionPlanCode,
        },
        requiresAuthorization: true,
        dueDate: f.snoozedUntil?.toISOString(),
        createdAt: f.createdAt.toISOString(),
      });
    }

    // 3. Pending Obligations (Deadlines)
    const obligations = await db
      .select()
      .from(schema.citizenStatutoryObligations)
      .where(
        and(
          eq(schema.citizenStatutoryObligations.citizenId, citizenId),
          eq(schema.citizenStatutoryObligations.status, 'PENDING')
        )
      );

    for (const ob of obligations) {
      const isOverdue = ob.dueDate ? new Date(ob.dueDate).getTime() < Date.now() : false;
      items.push({
        id: `obligation-${ob.id}`,
        citizenId: ob.citizenId,
        itemType: 'STATUTORY_DEADLINE',
        title: ob.title,
        subtitle: ob.authority,
        description: `Statutory compliance required by ${ob.dueDate || 'N/A'}. Late fee ₹${ob.penaltyInrPerDay}/day if unsatisfied.`,
        canonicalStatus: isOverdue ? 'ACTION_REQUIRED' : 'READY_TO_SUBMIT',
        urgency: isOverdue ? 'CRITICAL' : 'HIGH',
        priorityScore: isOverdue ? 95 : 80,
        actionUrl: `/inbox`,
        actionPayload: {
          obligationId: ob.id,
          obligationType: ob.obligationType,
          authority: ob.authority,
        },
        requiresAuthorization: true,
        dueDate: ob.dueDate || undefined,
        createdAt: ob.createdAt.toISOString(),
      });
    }

    // 4. Active Consent Artifacts (Revocable)
    const consents = await db
      .select()
      .from(schema.consentArtifacts)
      .where(
        and(
          eq(schema.consentArtifacts.citizenId, citizenId),
          eq(schema.consentArtifacts.status, 'ACTIVE')
        )
      );

    for (const c of consents) {
      items.push({
        id: `consent-${c.id}`,
        citizenId: c.citizenId,
        itemType: 'PENDING_CONSENT',
        title: `Active Data Sharing Consent: ${c.ecosystem}`,
        subtitle: `Manager: ${c.consentManagerId}`,
        description: `Active electronic consent for purpose '${c.purposeCode}' granted to ${c.dataConsumerId}. Expires on ${c.expiresAt.toISOString().slice(0, 10)}.`,
        canonicalStatus: 'APPROVED',
        urgency: 'LOW',
        priorityScore: 35,
        actionUrl: `/vault`,
        actionPayload: {
          consentArtifactId: c.id,
          ecosystem: c.ecosystem,
          signatureDigest: c.signatureDigest,
          revocable: true,
        },
        requiresAuthorization: false,
        dueDate: c.expiresAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      });
    }

    // Deterministic Sorting: PriorityScore descending
    items.sort((a, b) => b.priorityScore - a.priorityScore);

    const criticalCount = items.filter((i) => i.urgency === 'CRITICAL').length;
    const highCount = items.filter((i) => i.urgency === 'HIGH').length;
    const pendingAuthorizationsCount = items.filter((i) => i.requiresAuthorization).length;
    const activeConsentArtifactsCount = consents.length;

    return {
      items,
      summary: {
        totalActionable: items.length,
        criticalCount,
        highCount,
        pendingAuthorizationsCount,
        activeConsentArtifactsCount,
      },
    };
  }
}
