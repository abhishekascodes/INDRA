import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';

export class EligibilityOpportunityRule implements DetectiveRule {
  ruleCode = 'RULE_PM_KISAN_ELIGIBILITY';
  ruleVersion = '1.0.0';
  statutoryDomain = 'PM_KISAN_OPERATIONAL_GUIDELINES_2019';
  category = 'ELIGIBILITY_OPPORTUNITY' as const;
  name = 'Direct Benefit Transfer Scheme Eligibility Rule';
  description = 'Evaluates landholdings and income thresholds to discover statutory welfare entitlements.';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const properties = worldModel.properties || [];
    const agriLand = properties.find((p) => p.propertyType === 'AGRICULTURAL_LAND');

    if (!agriLand) {
      return null;
    }

    const annualBenefitInr = 6000;
    const priorityScore = calculatePriorityScore({
      urgency: 'MEDIUM',
      financialImpactInr: annualBenefitInr,
      isLegalMandate: false,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'BENEFIT_ELIGIBILITY',
      triggerEntityId: String(agriLand.id || agriLand.identifier),
      urgency: 'MEDIUM',
      priorityScore,
      title: 'Direct Benefit Transfer Eligibility: PM-KISAN',
      explanation: `Based on registered agricultural landholding in ${agriLand.state} (${agriLand.identifier}), you are eligible for ₹6,000 annual statutory direct income support under PM-KISAN Samman Nidhi.`,
      actionableRecommendation:
        'Submit enrollment claim to receive quarterly direct benefit transfer installments.',
      structuredExplanation: {
        whatChanged: `Verified title registry confirms ownership of agricultural land parcel (${agriLand.identifier}).`,
        whyItMatters:
          'Under the PM-KISAN Scheme guidelines, small and marginal landholding farmer families are entitled to ₹6,000 per year paid in three equal four-monthly installments directly into their Aadhaar-seeded bank account.',
        whatIndraRecommends:
          'Enroll your agricultural parcel with the Department of Agriculture & Farmers Welfare portal.',
        whatCitizenMustAuthorize:
          'Statutory consent to share land mutation records and seeded bank account details for direct benefit disbursement.',
        whatHappensNext:
          'State nodal officer verifies land record mutation; national DBT portal activates direct installment disbursement into your primary bank account.',
      },
      actionLink: {
        actionType: 'LAUNCH_ACTION_PLAN',
        targetCode: 'FARMER_SEASONAL_CYCLE',
        prefilledContext: {
          schemeCode: 'PM_KISAN',
          landIdentifier: agriLand.identifier,
          annualBenefitInr,
        },
        requiresStatutoryAuthorization: true,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Department of Agriculture & Farmers Welfare (PM-KISAN Samman Nidhi)',
        registryFact: `Title parcel ${agriLand.identifier} in ${agriLand.state} registered to citizen ${context.citizenId}`,
        systemObservation: 'Property classification AGRICULTURAL_LAND verified in state land mutation ledger',
        policyDerivation: 'Small & marginal landholding direct income support entitlement derived',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        schemeCode: 'PM_KISAN',
        annualBenefitInr,
        landIdentifier: agriLand.identifier,
      },
      provenanceData: {
        sourceAuthority: 'State Revenue & Land Records Registry',
        provenanceType: 'INFERENCE',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
