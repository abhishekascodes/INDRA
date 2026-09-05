import type {
  CitizenWorldModel,
  ProactiveFindingCategory,
  ProactiveFindingStatus,
  StructuredExplanation,
  FindingActionLink,
  PolicyProvenance,
} from '@indra/contracts';

export interface RuleEvaluationContext {
  citizenId: string;
  simulatedNow: Date;
  triggerType: 'EVENT_DRIVEN' | 'TEMPORAL_SWEEP' | 'MANUAL_REFRESH';
  metadata?: Record<string, unknown>;
}

export interface ProactiveEvaluationResult {
  ruleCode: string;
  category: ProactiveFindingCategory;
  findingType:
    | 'CREDENTIAL_EXPIRY'
    | 'DORMANT_ASSET'
    | 'IDENTITY_DISCREPANCY'
    | 'DEADLINE'
    | 'BENEFIT_ELIGIBILITY'
    | 'JURISDICTIONAL_CASCADE';
  triggerEntityId: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityScore: number;
  title: string;
  explanation: string;
  actionableRecommendation: string;
  structuredExplanation: StructuredExplanation;
  actionLink: FindingActionLink;
  policyProvenance?: PolicyProvenance;
  actionPayload?: Record<string, unknown>;
  provenanceData?: Record<string, unknown>;
}

export interface DetectiveRule {
  ruleCode: string;
  ruleVersion: string;
  statutoryDomain: string;
  category: ProactiveFindingCategory;
  name: string;
  description: string;
  evaluate(
    worldModel: CitizenWorldModel,
    context: RuleEvaluationContext
  ): Promise<ProactiveEvaluationResult | null>;
}
