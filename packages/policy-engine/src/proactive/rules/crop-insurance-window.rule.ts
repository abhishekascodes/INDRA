import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';
import { getDb, schema, eq } from '@indra/database';

export class CropInsuranceWindowRule implements DetectiveRule {
  ruleCode = 'RULE_CROP_INSURANCE_SEASONAL_WINDOW';
  ruleVersion = '1.0.0';
  statutoryDomain = 'PMFBY_OPERATIONAL_GUIDELINES_SECTION_4';
  category = 'ELIGIBILITY_OPPORTUNITY' as const;
  name = 'PMFBY Seasonal Crop Insurance Window Rule';
  description = 'Detects active agricultural land holdings eligible for seasonal crop weather index coverage.';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const db = await getDb();
    const policies = await db
      .select()
      .from(schema.spiCropInsurances)
      .where(eq(schema.spiCropInsurances.citizenId, context.citizenId));

    if (policies.length === 0) {
      return null;
    }

    const policy = policies[0];
    const priorityScore = calculatePriorityScore({
      urgency: 'HIGH',
      financialImpactInr: policy.sumInsuredInr,
      isLegalMandate: false,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'BENEFIT_ELIGIBILITY',
      triggerEntityId: String(policy.policyNumber || policy.id),
      urgency: 'HIGH',
      priorityScore,
      title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY) Coverage Active',
      explanation: `Comprehensive crop insurance cover of ₹${policy.sumInsuredInr.toLocaleString(
        'en-IN'
      )} is registered on Survey ${policy.surveyNumber} for ${policy.cropName} (${policy.season} season). Government premium subsidy of ₹${policy.governmentSubsidyInr.toLocaleString(
        'en-IN'
      )} has been credited.`,
      actionableRecommendation: 'Review harvest season yield coverage and satellite weather monitoring status.',
      structuredExplanation: {
        whatChanged: `Active agricultural policy ${policy.policyNumber} confirmed for Basmati Paddy cultivation over ${policy.areaHectares} hectares.`,
        whyItMatters:
          'Under PMFBY guidelines, localized calamities and mid-season adversity yield losses are settled directly into the farmer bank account via DBT within 30 days of claims assessment.',
        whatIndraRecommends:
          'Ensure your linked bank mandate and Aadhaar-DBT seed remains active for seamless claim settlement.',
        whatCitizenMustAuthorize: 'No immediate action required unless reporting mid-season crop damage.',
        whatHappensNext:
          'Automated satellite weather indices and automatic claim triggers will monitor rainfall and temperature thresholds across your village revenue circle.',
      },
      actionLink: {
        actionType: 'LAUNCH_ACTION_PLAN',
        targetCode: 'FARMER_SEASONAL_CYCLE',
        prefilledContext: {
          surveyNumber: policy.surveyNumber,
          season: policy.season,
          cropName: policy.cropName,
        },
        requiresStatutoryAuthorization: false,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Ministry of Agriculture & Farmers Welfare (PMFBY Portal)',
        registryFact: `PMFBY Policy ${policy.policyNumber} covering Survey ${policy.surveyNumber} with sum insured ₹${policy.sumInsuredInr}`,
        systemObservation: 'Coverage registered and verified with district agriculture officer',
        policyDerivation: 'PMFBY Operational Guidelines Section 4 subsidized risk management',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        policyNumber: policy.policyNumber,
        cropName: policy.cropName,
        season: policy.season,
        sumInsuredInr: policy.sumInsuredInr,
      },
      provenanceData: {
        sourceAuthority: 'Department of Agriculture & Farmers Welfare',
        provenanceType: 'SYSTEM_OBSERVATION',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
