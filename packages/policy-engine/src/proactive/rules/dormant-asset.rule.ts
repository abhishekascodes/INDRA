import type { DetectiveRule, RuleEvaluationContext, ProactiveEvaluationResult } from '../types.js';
import type { CitizenWorldModel } from '@indra/contracts';
import { calculatePriorityScore } from '../priority-ranker.js';
import { getDb, schema, eq } from '@indra/database';

export class DormantAssetRule implements DetectiveRule {
  ruleCode = 'RULE_EPFO_DORMANT_BALANCE';
  ruleVersion = '1.0.0';
  statutoryDomain = 'EPF_SCHEME_1952_SECTION_72_6';
  category = 'DORMANT_ASSET' as const;
  name = 'EPFO Inactive Member Ledger Rule';
  description = 'Detects unlinked dormant Provident Fund balances across previous employers.';

  async evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null> {
    const db = await getDb();
    const accounts = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(eq(schema.spiEpfoAccounts.citizenId, context.citizenId));

    const dormantAccounts = accounts.filter(
      (a) => a.status === 'DORMANT' && a.pfBalance > 0
    );

    if (dormantAccounts.length === 0) {
      return null;
    }

    const dormantAccount = dormantAccounts[0];
    const totalDormantBalance = dormantAccounts.reduce(
      (acc, curr) => acc + curr.pfBalance,
      0
    );

    const priorityScore = calculatePriorityScore({
      urgency: 'HIGH',
      financialImpactInr: totalDormantBalance,
      isLegalMandate: false,
    });

    return {
      ruleCode: this.ruleCode,
      category: this.category,
      findingType: 'DORMANT_ASSET',
      triggerEntityId: String(dormantAccount.memberId || dormantAccount.id),
      urgency: 'HIGH',
      priorityScore,
      title: 'Unclaimed / Inactive Provident Fund Balance Discovered',
      explanation: `INDRA discovered ₹${totalDormantBalance.toLocaleString(
        'en-IN'
      )} sitting in an unlinked EPFO member ledger (${dormantAccount.establishmentName}). Inactive accounts cease statutory compound interest accrual after 36 months of non-contribution.`,
      actionableRecommendation:
        'Consolidate inactive balance into your active employment account.',
      structuredExplanation: {
        whatChanged: `Audit of UAN ledgers discovered dormant Member ID ${dormantAccount.memberId} holding ₹${totalDormantBalance.toLocaleString(
          'en-IN'
        )}.`,
        whyItMatters:
          "Under Section 72(6) of the EPF Scheme, an account becomes 'inoperative' when wage contributions cease. Inoperative accounts stop compounding statutory interest after 36 months.",
        whatIndraRecommends:
          'Submit an electronic Form 13 transfer claim to merge past contributions into your active employer account.',
        whatCitizenMustAuthorize:
          'Statutory consent to generate and submit an online EPFO Form 13 transfer claim using your linked UAN credentials.',
        whatHappensNext:
          'Both past and present employer digital ledgers will synchronize, and the accumulated balance plus accrued interest will be credited to your active passbook.',
      },
      actionLink: {
        actionType: 'LAUNCH_WORKFLOW',
        targetCode: 'RECOVER_DORMANT_PF',
        prefilledContext: {
          sourceMemberId: dormantAccount.memberId,
          balanceInr: totalDormantBalance,
        },
        requiresStatutoryAuthorization: true,
      },
      policyProvenance: {
        ruleCode: this.ruleCode,
        ruleVersion: this.ruleVersion,
        statutoryDomain: this.statutoryDomain,
        sourceAuthority: "Employees' Provident Fund Organisation (Unified Portal)",
        registryFact: `EPFO Account Member ID ${dormantAccount.memberId} holding ledger balance ₹${totalDormantBalance}`,
        systemObservation: 'Account marked status DORMANT with wage contributions inactive',
        policyDerivation: 'Section 72(6) inoperative account interest cessation rule applies',
        isSimulationAssumption: true,
        simulationDisclaimer: 'Simulated statutory policy derivation under INDRA Synthetic Public Infrastructure.',
        evaluatedAt: context.simulatedNow.toISOString(),
      },
      actionPayload: {
        totalDormantBalance,
        dormantMemberId: dormantAccount.memberId,
        establishmentName: dormantAccount.establishmentName,
      },
      provenanceData: {
        sourceAuthority: "Employees' Provident Fund Organisation (Unified Portal)",
        provenanceType: 'SYSTEM_OBSERVATION',
        observedAt: context.simulatedNow.toISOString(),
      },
    };
  }
}
