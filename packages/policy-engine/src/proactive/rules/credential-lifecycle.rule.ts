import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';

export class CredentialLifecycleRule implements DetectiveRule {
  ruleCode = 'RULE_PASSPORT_EXPIRING';
  ruleVersion = '1.0.0';
  statutoryDomain = 'PASSPORTS_ACT_1967_SECTION_10';
  category = 'CREDENTIAL_LIFECYCLE' as const;
  name = 'Passport Validity & Expiry Rule';
  description = 'Monitors Indian Passport validity against international travel 6-month validity norms.';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const passportCred =
      worldModel.credentials.find((c: any) => c.type === 'PASSPORT') ||
      worldModel.documents.find((d: any) => d.documentType === 'PASSPORT');

    if (!passportCred || !passportCred.expiryDate) {
      return null;
    }

    const expiryDate = new Date(passportCred.expiryDate as string);
    const now = context.simulatedNow;
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining <= 0 || daysRemaining > 365) {
      return null;
    }

    const isCritical = daysRemaining <= 60;
    const urgency = isCritical ? ('CRITICAL' as const) : ('HIGH' as const);
    const docNumber =
      (passportCred as any).identifierMasked ||
      (passportCred as any).documentNumber ||
      'Z198****';

    const priorityScore = calculatePriorityScore({
      urgency,
      daysRemaining,
      isLegalMandate: true,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'CREDENTIAL_EXPIRY',
      triggerEntityId: String(passportCred.id || docNumber),
      urgency,
      priorityScore,
      title: 'Passport Validity Expiring Soon',
      explanation: `Your Indian Passport (${docNumber}) expires on ${passportCred.expiryDate} (${daysRemaining} days remaining). Most international jurisdictions require at least 6 months validity from departure date.`,
      actionableRecommendation:
        'Initiate normal or tatkaal renewal through the Passport Seva Project.',
      structuredExplanation: {
        whatChanged: `Verified passport record expires on ${passportCred.expiryDate} (${daysRemaining} days remaining).`,
        whyItMatters:
          'Under Bureau of Immigration standards, airlines and foreign consular posts reject travelers whose passports have fewer than 180 days validity remaining.',
        whatIndraRecommends:
          'Prepare and submit a Passport Re-Issue Application with the Ministry of External Affairs (Passport Seva Project).',
        whatCitizenMustAuthorize:
          'Statutory consent to submit Form R-1 for Passport Re-issue and schedule biometric verification at the nearest PSK.',
        whatHappensNext:
          'INDRA will pre-fill personal credentials from your verified World Model, track file dispatch, and notify you upon dispatch.',
      },
      actionLink: {
        actionType: 'LAUNCH_WORKFLOW',
        targetCode: 'RENEW_PASSPORT',
        prefilledContext: {
          documentNumber: docNumber,
          expiryDate: passportCred.expiryDate,
          daysRemaining,
        },
        requiresStatutoryAuthorization: true,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Ministry of External Affairs (Passport Seva Project)',
        registryFact: `Passport ${docNumber} issued under Passports Act 1967 with expiry date ${passportCred.expiryDate}`,
        systemObservation: `Current temporal calculation indicates ${daysRemaining} days remaining before expiration`,
        policyDerivation: '6-month international travel restriction policy applies (threshold 180 days)',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: { daysRemaining, expiryDate: passportCred.expiryDate },
      provenanceData: {
        sourceAuthority: 'Ministry of External Affairs (Passport Seva Project)',
        provenanceType: 'SYSTEM_OBSERVATION',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
