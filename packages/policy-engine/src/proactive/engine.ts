import crypto from 'crypto';
import { getDb, schema, eq, and, desc } from '@indra/database';
import { inArray } from 'drizzle-orm';
import type {
  ProactiveFinding,
  ProactiveFindingCategory,
  ProactiveFindingStatus,
  FindingActionLink,
} from '@indra/contracts';
import { CitizenWorldModelService } from '../world-model-service.js';
import type { DetectiveRule, ProactiveEvaluationResult, RuleEvaluationContext } from './types.js';
import { CredentialLifecycleRule } from './rules/credential-lifecycle.rule.js';
import { DormantAssetRule } from './rules/dormant-asset.rule.js';
import { AnomalyContradictionRule } from './rules/anomaly-contradiction.rule.js';
import { ObligationDeadlineRule } from './rules/obligation-deadline.rule.js';
import { EligibilityOpportunityRule } from './rules/eligibility-opportunity.rule.js';
import { LifeEventTriggerRule } from './rules/life-event-trigger.rule.js';
import { TrafficChallanRule } from './rules/traffic-challan.rule.js';
import { CropInsuranceWindowRule } from './rules/crop-insurance-window.rule.js';

export const VALID_FINDING_STATE_TRANSITIONS: Record<
  ProactiveFindingStatus,
  ProactiveFindingStatus[]
> = {
  ACTIVE: ['ACKNOWLEDGED', 'SNOOZED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'OBSOLETE'],
  ACKNOWLEDGED: ['SNOOZED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'OBSOLETE'],
  SNOOZED: ['ACTIVE', 'RESOLVED', 'DISMISSED', 'OBSOLETE'],
  IN_PROGRESS: ['ACTIVE', 'RESOLVED', 'OBSOLETE'],
  RESOLVED: [], // terminal
  DISMISSED: ['ACTIVE'], // only active via critical safety override
  OBSOLETE: [], // terminal
};

export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string, findingId: string) {
    super(
      `Invalid finding state transition: Cannot transition finding '${findingId}' from '${from}' to '${to}'.`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export interface ScanResultSummary {
  citizenId: string;
  triggerType: string;
  status: 'SUCCESS' | 'FAILED';
  rulesEvaluated: number;
  findingsGenerated: number;
  findingsUpdated: number;
  findingsResolved: number;
  durationMs: number;
  errorDetails?: string;
  activeFindings: ProactiveFinding[];
}

export class ProactiveCitizenEngine {
  private static instance: ProactiveCitizenEngine | null = null;
  private rules: DetectiveRule[] = [];
  private activeScans = new Map<string, Promise<ScanResultSummary>>();

  private constructor() {
    this.registerDefaultRules();
  }

  public static getInstance(): ProactiveCitizenEngine {
    if (!ProactiveCitizenEngine.instance) {
      ProactiveCitizenEngine.instance = new ProactiveCitizenEngine();
    }
    return ProactiveCitizenEngine.instance;
  }

  public registerRule(rule: DetectiveRule): void {
    this.rules.push(rule);
  }

  private registerDefaultRules(): void {
    this.rules = [
      new CredentialLifecycleRule(),
      new DormantAssetRule(),
      new AnomalyContradictionRule(),
      new ObligationDeadlineRule(),
      new EligibilityOpportunityRule(),
      new LifeEventTriggerRule(),
      new TrafficChallanRule(),
      new CropInsuranceWindowRule(),
    ];
  }

  public calculateFingerprint(
    citizenId: string,
    ruleCode: string,
    triggerEntityId: string
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${citizenId}::${ruleCode}::${triggerEntityId}`)
      .digest('hex');
  }

  public validateStateTransition(
    currentStatus: ProactiveFindingStatus,
    targetStatus: ProactiveFindingStatus,
    findingId: string
  ): void {
    if (currentStatus === targetStatus) return;
    const allowed = VALID_FINDING_STATE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new InvalidStateTransitionError(currentStatus, targetStatus, findingId);
    }
  }

  /**
   * Scans a citizen's public world state.
   * Enforces in-memory concurrency mutex so simultaneous calls coalesce onto the same in-flight scan.
   */
  public async scanCitizen(
    citizenId: string,
    triggerType: 'EVENT_DRIVEN' | 'TEMPORAL_SWEEP' | 'MANUAL_REFRESH' = 'MANUAL_REFRESH',
    simulatedNow: Date = new Date()
  ): Promise<ScanResultSummary> {
    if (this.activeScans.has(citizenId)) {
      return this.activeScans.get(citizenId)!;
    }

    const scanPromise = this.executeScanInternal(citizenId, triggerType, simulatedNow);
    this.activeScans.set(citizenId, scanPromise);

    try {
      return await scanPromise;
    } finally {
      this.activeScans.delete(citizenId);
    }
  }

  private async executeScanInternal(
    citizenId: string,
    triggerType: 'EVENT_DRIVEN' | 'TEMPORAL_SWEEP' | 'MANUAL_REFRESH',
    simulatedNow: Date
  ): Promise<ScanResultSummary> {
    const startTime = Date.now();
    const db = await getDb();

    try {
      const wmService = CitizenWorldModelService.getInstance();
      const worldModel = await wmService.getWorldModel(citizenId);

      const context: RuleEvaluationContext = {
        citizenId,
        simulatedNow,
        triggerType,
      };

      const evaluationResults: ProactiveEvaluationResult[] = [];

      for (const rule of this.rules) {
        try {
          const res = await rule.evaluate(worldModel, context);
          if (res) {
            evaluationResults.push(res);
          }
        } catch (err) {
          console.error(`[ProactiveEngine] Error evaluating rule ${rule.ruleCode}:`, err);
        }
      }

      let generatedCount = 0;
      let updatedCount = 0;
      let resolvedCount = 0;

      const currentFingerprints = new Set<string>();

      for (const res of evaluationResults) {
        const fingerprint = this.calculateFingerprint(
          citizenId,
          res.ruleCode,
          res.triggerEntityId
        );
        currentFingerprints.add(fingerprint);

        const existing = await db
          .select()
          .from(schema.proactiveFindings)
          .where(
            and(
              eq(schema.proactiveFindings.citizenId, citizenId),
              eq(schema.proactiveFindings.fingerprint, fingerprint)
            )
          );

        if (existing.length > 0) {
          const current = existing[0];
          let nextStatus: ProactiveFindingStatus = current.status as ProactiveFindingStatus;

          // Auto-reopen snoozed finding if snooze expired
          if (
            current.status === 'SNOOZED' &&
            current.snoozedUntil &&
            new Date(current.snoozedUntil) <= simulatedNow
          ) {
            this.validateStateTransition('SNOOZED', 'ACTIVE', current.id);
            nextStatus = 'ACTIVE';
          }

          // Safety override: if urgency escalated to CRITICAL, un-snooze and un-dismiss!
          if (res.urgency === 'CRITICAL' && current.urgency !== 'CRITICAL') {
            if (current.status === 'SNOOZED' || current.status === 'DISMISSED') {
              this.validateStateTransition(current.status as any, 'ACTIVE', current.id);
              nextStatus = 'ACTIVE';
            }
          }

          const recWorkflow = res.actionLink?.actionType === 'LAUNCH_WORKFLOW' ? res.actionLink.targetCode : null;
          const recActionPlan = res.actionLink?.actionType === 'LAUNCH_ACTION_PLAN' ? res.actionLink.targetCode : null;

          await db
            .update(schema.proactiveFindings)
            .set({
              urgency: res.urgency,
              priorityScore: res.priorityScore,
              status: nextStatus,
              title: res.title,
              explanation: res.explanation,
              actionableRecommendation: res.actionableRecommendation,
              structuredExplanation: res.structuredExplanation,
              actionLink: res.actionLink,
              recommendedWorkflowCode: recWorkflow,
              recommendedActionPlanCode: recActionPlan,
              policyProvenance: res.policyProvenance || {},
              actionPayload: res.actionPayload || {},
              provenanceData: res.provenanceData || {},
              lastScannedAt: simulatedNow,
            })
            .where(eq(schema.proactiveFindings.id, current.id));

          updatedCount++;
        } else {
          try {
            const recWorkflow = res.actionLink?.actionType === 'LAUNCH_WORKFLOW' ? res.actionLink.targetCode : null;
            const recActionPlan = res.actionLink?.actionType === 'LAUNCH_ACTION_PLAN' ? res.actionLink.targetCode : null;

            await db.insert(schema.proactiveFindings).values({
              citizenId,
              fingerprint,
              category: res.category,
              findingType: res.findingType,
              ruleCode: res.ruleCode,
              urgency: res.urgency,
              priorityScore: res.priorityScore,
              status: 'ACTIVE',
              title: res.title,
              explanation: res.explanation,
              actionableRecommendation: res.actionableRecommendation,
              structuredExplanation: res.structuredExplanation,
              actionLink: res.actionLink,
              recommendedWorkflowCode: recWorkflow,
              recommendedActionPlanCode: recActionPlan,
              policyProvenance: res.policyProvenance || {},
              actionPayload: res.actionPayload || {},
              provenanceData: res.provenanceData || {},
              isDismissed: false,
              lastScannedAt: simulatedNow,
              createdAt: simulatedNow,
            });
            generatedCount++;
          } catch (insertErr: any) {
            // If another process inserted with the same fingerprint concurrently, update instead
            if (String(insertErr).includes('unique') || String(insertErr).includes('duplicate')) {
              updatedCount++;
            } else {
              throw insertErr;
            }
          }
        }
      }

      // Auto-resolve findings that were ACTIVE, ACKNOWLEDGED, or SNOOZED but are no longer produced
      const allActiveDbFindings = await db
        .select()
        .from(schema.proactiveFindings)
        .where(
          and(
            eq(schema.proactiveFindings.citizenId, citizenId),
            inArray(schema.proactiveFindings.status, [
              'ACTIVE',
              'ACKNOWLEDGED',
              'SNOOZED',
              'IN_PROGRESS',
            ])
          )
        );

      for (const f of allActiveDbFindings) {
        if (f.fingerprint && !currentFingerprints.has(f.fingerprint)) {
          this.validateStateTransition(f.status as any, 'RESOLVED', f.id);
          await db
            .update(schema.proactiveFindings)
            .set({
              status: 'RESOLVED',
              resolvedAt: simulatedNow,
            })
            .where(eq(schema.proactiveFindings.id, f.id));

          resolvedCount++;
        }
      }

      const durationMs = Date.now() - startTime;

      await db.insert(schema.proactiveScanHistory).values({
        citizenId,
        triggerType,
        rulesEvaluatedCount: this.rules.length,
        findingsGeneratedCount: generatedCount,
        findingsUpdatedCount: updatedCount,
        findingsResolvedCount: resolvedCount,
        scanDurationMs: durationMs,
        scannedAt: simulatedNow,
      });

      const activeFindings = await this.listFindings(citizenId, { status: 'ACTIVE' });

      return {
        citizenId,
        triggerType,
        status: 'SUCCESS',
        rulesEvaluated: this.rules.length,
        findingsGenerated: generatedCount,
        findingsUpdated: updatedCount,
        findingsResolved: resolvedCount,
        durationMs,
        activeFindings,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await db.insert(schema.proactiveScanHistory).values({
        citizenId,
        triggerType,
        rulesEvaluatedCount: this.rules.length,
        findingsGeneratedCount: 0,
        findingsUpdatedCount: 0,
        findingsResolvedCount: 0,
        scanDurationMs: durationMs,
        scannedAt: simulatedNow,
      });

      return {
        citizenId,
        triggerType,
        status: 'FAILED',
        rulesEvaluated: this.rules.length,
        findingsGenerated: 0,
        findingsUpdated: 0,
        findingsResolved: 0,
        durationMs,
        errorDetails: error?.message || String(error),
        activeFindings: [],
      };
    }
  }

  /**
   * Lists findings for a citizen with optional filtering.
   */
  public async listFindings(
    citizenId: string,
    options?: {
      status?: ProactiveFindingStatus | 'ALL';
      category?: ProactiveFindingCategory;
    }
  ): Promise<ProactiveFinding[]> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.proactiveFindings)
      .where(eq(schema.proactiveFindings.citizenId, citizenId))
      .orderBy(
        desc(schema.proactiveFindings.priorityScore),
        desc(schema.proactiveFindings.createdAt)
      );

    let filtered = rows;

    if (options?.status && options.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === options.status);
    } else if (!options?.status) {
      filtered = filtered.filter((r) => r.status === 'ACTIVE' || r.status === 'ACKNOWLEDGED');
    }

    if (options?.category) {
      filtered = filtered.filter((r) => r.category === options.category);
    }

    return filtered.map((r) => ({
      id: r.id,
      citizenId: r.citizenId,
      fingerprint: r.fingerprint,
      category: r.category as ProactiveFindingCategory,
      findingType: r.findingType as any,
      ruleCode: r.ruleCode,
      urgency: r.urgency as any,
      priorityScore: r.priorityScore,
      status: r.status as ProactiveFindingStatus,
      title: r.title,
      explanation: r.explanation,
      actionableRecommendation: r.actionableRecommendation,
      structuredExplanation: r.structuredExplanation as any,
      policyProvenance: r.policyProvenance as any,
      actionLink: r.actionLink as any,
      recommendedWorkflowCode:
        r.recommendedWorkflowCode ||
        ((r.actionLink as any)?.actionType === 'LAUNCH_WORKFLOW'
          ? (r.actionLink as any)?.targetCode
          : null),
      recommendedActionPlanCode:
        r.recommendedActionPlanCode ||
        ((r.actionLink as any)?.actionType === 'LAUNCH_ACTION_PLAN'
          ? (r.actionLink as any)?.targetCode
          : null),
      actionPayload: r.actionPayload as Record<string, unknown>,
      provenanceData: r.provenanceData as Record<string, unknown>,
      snoozedUntil: r.snoozedUntil ? r.snoozedUntil.toISOString() : null,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      resolvedByWorkflowRunId: r.resolvedByWorkflowRunId,
      resolvedByActionPlanId: r.resolvedByActionPlanId,
      isDismissed: r.isDismissed,
      lastScannedAt: r.lastScannedAt ? r.lastScannedAt.toISOString() : undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Snoozes a finding with state machine validation.
   */
  public async snoozeFinding(
    findingId: string,
    citizenId: string,
    days: number = 7
  ): Promise<boolean> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.proactiveFindings)
      .where(
        and(
          eq(schema.proactiveFindings.id, findingId),
          eq(schema.proactiveFindings.citizenId, citizenId)
        )
      );

    if (rows.length === 0) {
      return false;
    }

    const finding = rows[0];
    this.validateStateTransition(finding.status as any, 'SNOOZED', findingId);

    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db
      .update(schema.proactiveFindings)
      .set({
        status: 'SNOOZED',
        snoozedUntil,
      })
      .where(eq(schema.proactiveFindings.id, findingId));

    return true;
  }

  /**
   * Dismisses a finding with state machine validation.
   */
  public async dismissFinding(
    findingId: string,
    citizenId: string,
    reason?: string
  ): Promise<boolean> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.proactiveFindings)
      .where(
        and(
          eq(schema.proactiveFindings.id, findingId),
          eq(schema.proactiveFindings.citizenId, citizenId)
        )
      );

    if (rows.length === 0) {
      return false;
    }

    const finding = rows[0];
    this.validateStateTransition(finding.status as any, 'DISMISSED', findingId);

    await db
      .update(schema.proactiveFindings)
      .set({
        status: 'DISMISSED',
        isDismissed: true,
      })
      .where(eq(schema.proactiveFindings.id, findingId));

    return true;
  }

  /**
   * Launches action plan or workflow from server-authoritative actionLink.
   * Guarantees that client cannot tamper with prefilled parameters or bypass authorization.
   */
  public async launchFindingAction(
    findingId: string,
    citizenId: string
  ): Promise<{ actionLink: FindingActionLink; finding: ProactiveFinding }> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.proactiveFindings)
      .where(
        and(
          eq(schema.proactiveFindings.id, findingId),
          eq(schema.proactiveFindings.citizenId, citizenId)
        )
      );

    if (rows.length === 0) {
      throw new Error(`Finding '${findingId}' not found or access denied for citizen '${citizenId}'.`);
    }

    const findingRow = rows[0];
    this.validateStateTransition(findingRow.status as any, 'IN_PROGRESS', findingId);

    await db
      .update(schema.proactiveFindings)
      .set({ status: 'IN_PROGRESS' })
      .where(eq(schema.proactiveFindings.id, findingId));

    const findings = await this.listFindings(citizenId, { status: 'ALL' });
    const updatedFinding = findings.find((f) => f.id === findingId)!;

    return {
      actionLink: updatedFinding.actionLink!,
      finding: updatedFinding,
    };
  }

  /**
   * Reacts to domain events emitted on the EventBus.
   */
  public async handleDomainEvent(event: { type: string; citizenId?: string }): Promise<void> {
    if (event.citizenId) {
      await this.scanCitizen(event.citizenId, 'EVENT_DRIVEN');
    }
  }

  /**
   * Runs periodic temporal sweep across citizens with bounded concurrency and timeout protection.
   */
  public async runTemporalSweep(
    citizenIds: string[],
    simulatedNow: Date = new Date(),
    timeoutMs: number = 5000
  ): Promise<ScanResultSummary[]> {
    const summaries: ScanResultSummary[] = [];

    // Bounded concurrency (2 at a time)
    const BATCH_SIZE = 2;
    for (let i = 0; i < citizenIds.length; i += BATCH_SIZE) {
      const batch = citizenIds.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (id) => {
        try {
          const timeoutPromise = new Promise<ScanResultSummary>((_, reject) =>
            setTimeout(() => reject(new Error(`Scan timed out after ${timeoutMs}ms`)), timeoutMs)
          );
          return await Promise.race([
            this.scanCitizen(id, 'TEMPORAL_SWEEP', simulatedNow),
            timeoutPromise,
          ]);
        } catch (err: any) {
          return {
            citizenId: id,
            triggerType: 'TEMPORAL_SWEEP',
            status: 'FAILED' as const,
            rulesEvaluated: this.rules.length,
            findingsGenerated: 0,
            findingsUpdated: 0,
            findingsResolved: 0,
            durationMs: timeoutMs,
            errorDetails: err?.message || String(err),
            activeFindings: [],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      summaries.push(...batchResults);
    }

    return summaries;
  }
}
