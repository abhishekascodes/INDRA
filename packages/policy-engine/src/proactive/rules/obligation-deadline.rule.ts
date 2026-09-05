import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';

export class ObligationDeadlineRule implements DetectiveRule {
  ruleCode = 'RULE_ITR_FILING_DEADLINE';
  ruleVersion = '1.0.0';
  statutoryDomain = 'INCOME_TAX_ACT_1961_SECTION_139_1';
  category = 'OBLIGATION_DEADLINE' as const;
  name = 'Statutory Income Tax Return Due Date Rule';
  description = 'Monitors pending tax return obligations and statutory penalty windows.';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const obligations = worldModel.obligations || [];
    const pendingItr = obligations.find(
      (o) => o.obligationType === 'ITR_FILING' && o.status === 'PENDING'
    );

    if (!pendingItr) {
      return null;
    }

    const priorityScore = calculatePriorityScore({
      urgency: 'HIGH',
      isLegalMandate: true,
      daysRemaining: 15, // approaching statutory window
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'DEADLINE',
      triggerEntityId: String(pendingItr.id || 'itr_ay2026_27'),
      urgency: 'HIGH',
      priorityScore,
      title: 'Statutory Income Tax Return Due',
      explanation: `Income Tax Return (ITR-2) for Assessment Year 2026-27 is pending verification. Statutory due date: ${
        pendingItr.dueDate || '31 July'
      }. Non-compliance attracts statutory fee under Section 234F.`,
      actionableRecommendation:
        'Review TRACES Form 26AS tax credits and complete electronic return filing.',
      structuredExplanation: {
        whatChanged: `Statutory obligation record '${pendingItr.title}' is currently PENDING.`,
        whyItMatters:
          'Under Section 139(1) of the Income-tax Act, 1961, failure to file before the statutory due date incurs late fees up to ₹5,000 under Section 234F and interest on unpaid tax under Section 234A.',
        whatIndraRecommends:
          'Reconcile multi-employer TDS statements via TRACES Form 26AS and execute e-filing verification.',
        whatCitizenMustAuthorize:
          'Statutory consent to query TRACES portal, compute net tax liability/refund, and draft electronic ITR payload.',
        whatHappensNext:
          'INDRA verifies pre-filled tax deductions, generates an ITR summary sheet, and queues the return for your final review.',
      },
      actionLink: {
        actionType: 'LAUNCH_WORKFLOW',
        targetCode: 'CHECK_ITR_STATUS',
        prefilledContext: {
          assessmentYear: '2026-27',
          dueDate: pendingItr.dueDate,
        },
        requiresStatutoryAuthorization: false,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Centralized Processing Centre (CPC Bengaluru, Income Tax)',
        registryFact: `Statutory obligation ITR-2 AY 2026-27 for citizen ${context.citizenId} with due date ${pendingItr.dueDate}`,
        systemObservation: 'Obligation status is PENDING with filing window active',
        policyDerivation: 'Section 139(1) compliance window and Section 234F late fee avoidance rule applies',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        assessmentYear: '2026-27',
        dueDate: pendingItr.dueDate,
      },
      provenanceData: {
        sourceAuthority: 'Centralized Processing Centre (CPC Bengaluru, Income Tax)',
        provenanceType: 'SYSTEM_OBSERVATION',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
