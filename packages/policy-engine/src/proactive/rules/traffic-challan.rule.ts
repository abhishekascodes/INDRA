import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';
import { getDb, schema, eq, and } from '@indra/database';

export class TrafficChallanRule implements DetectiveRule {
  ruleCode = 'RULE_PENDING_TRAFFIC_CHALLAN';
  ruleVersion = '1.0.0';
  statutoryDomain = 'MOTOR_VEHICLES_ACT_1988_SECTION_133';
  category = 'OBLIGATION_DEADLINE' as const;
  name = 'MoRTH Pending Traffic E-Challan Rule';
  description = 'Detects outstanding unpaid traffic violation notices pending against registered vehicles.';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const db = await getDb();
    const challans = await db
      .select()
      .from(schema.spiTrafficChallans)
      .where(
        and(
          eq(schema.spiTrafficChallans.citizenId, context.citizenId),
          eq(schema.spiTrafficChallans.status, 'UNPAID')
        )
      );

    if (challans.length === 0) {
      return null;
    }

    const challan = challans[0];
    const totalFines = challans.reduce((acc, curr) => acc + curr.amountInr, 0);

    const priorityScore = calculatePriorityScore({
      urgency: 'MEDIUM',
      financialImpactInr: totalFines,
      isLegalMandate: true,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'DEADLINE',
      triggerEntityId: String(challan.challanNo || challan.id),
      urgency: 'MEDIUM',
      priorityScore,
      title: 'Unpaid Traffic E-Challan Notice Pending',
      explanation: `MoRTH Parivahan ledger reflects an unpaid traffic violation of ₹${totalFines.toLocaleString(
        'en-IN'
      )} on vehicle ${challan.vehicleRegNo} (${challan.offense}). Unsettled challans risk virtual court summons and insurance non-renewal.`,
      actionableRecommendation: 'Settle traffic violation penalty online to maintain clean vehicle title.',
      structuredExplanation: {
        whatChanged: `Traffic violation notice ${challan.challanNo} issued for ${challan.offense} at ${challan.location}.`,
        whyItMatters:
          'Under Section 133 of the Motor Vehicles Act, unresolved e-challans exceeding 90 days are escalated to the National Virtual Courts for judicial prosecution.',
        whatIndraRecommends:
          'Authorize settlement of the penalty through the integrated MoRTH Parivahan e-Challan gateway.',
        whatCitizenMustAuthorize:
          'Payment authorization for statutory fine debit from your selected payment method.',
        whatHappensNext:
          'Payment receipt will be generated, the violation ledger will be reconciled, and your vehicle registration record will be cleared immediately.',
      },
      actionLink: {
        actionType: 'LAUNCH_WORKFLOW',
        targetCode: 'SETTLE_TRAFFIC_CHALLAN',
        prefilledContext: {
          challanNo: challan.challanNo,
          vehicleRegNo: challan.vehicleRegNo,
          amountInr: totalFines,
        },
        requiresStatutoryAuthorization: true,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: 'Ministry of Road Transport and Highways (MoRTH Parivahan)',
        registryFact: `Challan ${challan.challanNo} on ${challan.vehicleRegNo} with penalty ₹${totalFines}`,
        systemObservation: 'Challan status marked UNPAID in traffic enforcement ledger',
        policyDerivation: 'Motor Vehicles Act 1988 statutory compliance rule applies',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        challanNo: challan.challanNo,
        vehicleRegNo: challan.vehicleRegNo,
        amountInr: totalFines,
        violationDate: challan.violationDate,
      },
      provenanceData: {
        sourceAuthority: 'MoRTH Parivahan / Traffic Police',
        provenanceType: 'SYSTEM_OBSERVATION',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
