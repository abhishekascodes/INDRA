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

export const WelfareSubmitApplicationCapability: CapabilityContract<
  {
    citizenId: string;
    schemeCode: string;
    applicantDetails?: Record<string, unknown>;
  },
  any
> = {
  id: 'welfare.submit_application',
  version: '1.0.0',
  domain: 'BENEFITS',
  humanName: 'Submit Statutory Welfare Benefit Application',
  description: 'Files direct benefit application for enrollment and DBT transfer.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['WELFARE_DBT_ENROLLMENT'],
  inputSchema: z.object({
    citizenId: z.string(),
    schemeCode: z.string(),
    applicantDetails: z.record(z.any()).optional(),
  }),
  outputSchema: z.object({
    applicationNumber: z.string(),
    schemeCode: z.string(),
    schemeTitle: z.string(),
    status: z.string(),
    annualBenefitInr: z.number(),
    disbursementMethod: z.string(),
    submittedAt: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return welfareAdapter.submitApplication(input);
  },
  compensate: async (input) => {
    // Reversal logic for application withdrawal
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'WELFARE_APPLICATION',
      entityId: output.applicationNumber,
      sourceType: 'FACT',
      sourceAuthority: 'National Direct Benefit Transfer (DBT) Portal',
      confidence: 100,
    },
  ],
};

export const WelfareInquireRationEntitlementCapability: CapabilityContract<any, any> = {
  id: 'welfare.inquire_ration_entitlement',
  version: '1.0.0',
  domain: 'BENEFITS',
  humanName: 'Inquire NFSA Ration Card & Foodgrain Quota',
  description: 'Inquires One Nation One Ration Card registry for monthly grain entitlement and designated Fair Price Shop.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    rationCardNo: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    rationCardNo: z.string(),
    schemeType: z.string(),
    membersCount: z.number(),
    monthlyWheatKg: z.number(),
    monthlyRiceKg: z.number(),
    allocatedFpsName: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return welfareAdapter.inquireRationEntitlement(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'RATION_CARD_RECORD',
      entityId: output.rationCardNo,
      sourceType: 'FACT',
      sourceAuthority: 'Department of Food and Public Distribution (NFSA / Annavitran)',
      confidence: 100,
    },
  ],
};

export const WelfareVerifyDbtAadhaarSeedCapability: CapabilityContract<any, any> = {
  id: 'welfare.verify_dbt_aadhaar_seed',
  version: '1.0.0',
  domain: 'BENEFITS',
  humanName: 'Verify NPCI Aadhaar DBT Bank Seeding',
  description: 'Verifies whether bank account is mapped on NPCI Bharat Aadhaar Payment Bridge (APB) for direct government benefit transfers.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    bankName: z.string(),
    accountMasked: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    aadhaarSeeded: z.boolean(),
    npciMapperActive: z.boolean(),
    seedingDate: z.string(),
    eligibleForDbt: z.boolean(),
    message: z.string(),
  }),
  execute: async (input) => {
    return welfareAdapter.verifyDbtAadhaarSeed(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'DBT_MAPPING_RECORD',
      entityId: input.accountMasked,
      sourceType: 'FACT',
      sourceAuthority: 'National Payments Corporation of India (Aadhaar Payment Bridge)',
      confidence: 100,
    },
  ],
};

