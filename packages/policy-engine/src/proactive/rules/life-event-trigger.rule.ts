import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';

export class LifeEventTriggerRule implements DetectiveRule {
  ruleCode = 'RULE_UNCONSOLIDATED_EMPLOYMENT_CHANGE';
  ruleVersion = '1.0.0';
  statutoryDomain = 'PAYMENT_OF_GRATUITY_ACT_1972_AND_EPF_SCHEME';
  category = 'LIFE_EVENT_TRIGGER' as const;
  name = 'Employment Transition & Statutory Portability Rule';
  description = 'Detects job changes requiring multi-statutory updates (EPFO, Gratuity, Form 12B).';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const employments = worldModel.employments || [];
    const currentEmp = employments.find((e) => e.isCurrent);
    const previousEmp = employments.find((e) => !e.isCurrent);

    if (!currentEmp || !previousEmp) {
      return null;
    }

    const priorityScore = calculatePriorityScore({
      urgency: 'MEDIUM',
      isLegalMandate: false,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'JURISDICTIONAL_CASCADE',
      triggerEntityId: `emp_${currentEmp.id}_prev_${previousEmp.id}`,
      urgency: 'MEDIUM',
      priorityScore,
      title: 'Unconsolidated Employment Transition Detected',
      explanation: `You recently joined ${currentEmp.employerName}, leaving ${previousEmp.employerName}. Statutory Provident Fund, income tax declarations (Form 12B), and gratuity service records should be reconciled.`,
      actionableRecommendation:
        'Launch the New Employment Transition cascade to orchestrate all statutory obligations.',
      structuredExplanation: {
        whatChanged: `Employment history records transition from ${previousEmp.employerName} to ${currentEmp.employerName}.`,
        whyItMatters:
          'Failing to declare previous income via Form 12B causes TDS miscalculations and end-of-year tax demand. Unlinked PF ledgers fragment service history needed for statutory pension (EPS-95) eligibility.',
        whatIndraRecommends:
          'Execute the Employment Transition Action Plan to transfer PF balance, submit Form 12B, and update statutory insurance nominees.',
        whatCitizenMustAuthorize:
          'Citizen consent to draft Form 12B TDS consolidation and submit EPFO transfer request.',
        whatHappensNext:
          'INDRA sequences the actions into a dependency-ordered plan, ensuring smooth statutory transition without tax surprises.',
      },
      actionLink: {
        actionType: 'LAUNCH_ACTION_PLAN',
        targetCode: 'NEW_EMPLOYMENT',
        prefilledContext: {
          currentEmployer: currentEmp.employerName,
          previousEmployer: previousEmp.employerName,
        },
        requiresStatutoryAuthorization: true,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Unified Labour & Employment Registry',
        registryFact: `Active employment with ${currentEmp.employerName} alongside previous tenure with ${previousEmp.employerName}`,
        systemObservation: 'Unconsolidated service records and pending Form 12B transition detected',
        policyDerivation: 'Employment transition statutory portability cascade triggered',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        currentEmployer: currentEmp.employerName,
        previousEmployer: previousEmp.employerName,
      },
      provenanceData: {
        sourceAuthority: 'Unified Labour & Employment Registry',
        provenanceType: 'INFERENCE',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
