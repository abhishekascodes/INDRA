import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';
import { CitizenWorldModelService } from '../../world-model-service.js';

export class AnomalyContradictionRule implements DetectiveRule {
  ruleCode = 'RULE_IDENTITY_NAME_MISMATCH';
  ruleVersion = '1.0.0';
  statutoryDomain = 'INCOME_TAX_RULES_1962_RULE_114';
  category = 'ANOMALY_CONTRADICTION' as const;
  name = 'Cross-Registry Identity Discrepancy Rule';
  description = 'Detects contradictory names or dates across sovereign registries (UIDAI, Income Tax, EPFO).';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const wmService = CitizenWorldModelService.getInstance();
    const discrepancies = await wmService.getDiscrepancies(context.citizenId);

    if (discrepancies.length === 0) {
      return null;
    }

    const disc = discrepancies[0];
    const priorityScore = calculatePriorityScore({
      urgency: 'CRITICAL',
      isLegalMandate: true,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'IDENTITY_DISCREPANCY',
      triggerEntityId: `disc_${disc.type}`,
      urgency: 'CRITICAL',
      priorityScore,
      title: 'Mismatched Legal Name Across Sovereign Registries',
      explanation: `Discrepancy detected: ${disc.details}. This mismatch will cause automatic statutory rejection during bank e-KYC, consular visa processing, or property conveyance.`,
      actionableRecommendation:
        'Synchronize PAN legal name with verified Aadhaar demographic ground truth.',
      structuredExplanation: {
        whatChanged: `Comparative registry inspection identified a conflict: ${disc.details}.`,
        whyItMatters:
          'Under Rule 114 of the Income-tax Rules and PMLA guidelines, banking entities and registrar offices freeze accounts when PAN and Aadhaar identity strings fail deterministic matching.',
        whatIndraRecommends:
          'Submit a PAN demographic correction application through NSDL/UTIITSL citing verified Aadhaar biometric e-KYC.',
        whatCitizenMustAuthorize:
          'Statutory authorization to transmit verified Aadhaar identity data to the Income Tax Department for PAN database harmonization.',
        whatHappensNext:
          'Income Tax PAN master record will be corrected from the abbreviated initial to your full legal name, restoring complete e-KYC compliance.',
      },
      actionLink: {
        actionType: 'LAUNCH_WORKFLOW',
        targetCode: 'PAN_NAME_CORRECTION',
        prefilledContext: {
          discrepancyType: disc.type,
          details: disc.details,
        },
        requiresStatutoryAuthorization: true,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Cross-Registry Institutional Inspector (UIDAI vs. Income Tax)',
        registryFact: `Aadhaar CIDR record vs Income Tax PAN master record for citizen ${context.citizenId}`,
        systemObservation: disc.details,
        policyDerivation: 'Rule 114 demographic identity harmonization mandate applies',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        discrepancyType: disc.type,
        details: disc.details,
      },
      provenanceData: {
        sourceAuthority: 'Cross-Registry Institutional Inspector (UIDAI vs. Income Tax)',
        provenanceType: 'INFERENCE',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
