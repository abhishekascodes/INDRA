import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { WelfareSpiAdapter } from '@indra/spi-adapters';

const welfareAdapter = new WelfareSpiAdapter();

export const WelfareEvaluateSchemesCapability: CapabilityContract<
  {
    citizenId: string;
    categoryFilter?: string;
  },
  any
> = {
  id: 'welfare.evaluate_schemes',
  version: '1.0.0',
  domain: 'BENEFITS',
  humanName: 'Evaluate Welfare Scheme Eligibility',
  description: 'Evaluates public profile and socio-economic indicators against central and state scheme eligibility criteria.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    categoryFilter: z.string().optional(),
  }),
  outputSchema: z.object({
    schemes: z.array(
      z.object({
        code: z.string(),
        title: z.string(),
        category: z.string(),
        eligible: z.boolean(),
        annualBenefitInr: z.number(),
        benefitDescription: z.string(),
        reason: z.string(),
      })
    ),
    eligibleCount: z.number(),
  }),
  execute: async (input) => {
    const results = await welfareAdapter.evaluateSchemes(input);
    const eligible = results.filter((r) => r.eligible);
    return {
      schemes: results,
      eligibleCount: eligible.length,
      eligibleSchemes: eligible,
    };
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'SCHEME_ELIGIBILITY_EVALUATION',
      entityId: input.citizenId,
      sourceType: 'INFERENCE',
      sourceAuthority: 'Unified Public Benefits Eligibility Engine',
      confidence: 95,
    },
  ],
};
