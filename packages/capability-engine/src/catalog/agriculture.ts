import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { AgricultureSpiAdapter } from '@indra/spi-adapters';

const agricultureAdapter = AgricultureSpiAdapter.getInstance();

export const AgricultureVerifyPmkisanStatusCapability: CapabilityContract<
  {
    citizenId: string;
    aadhaarMasked?: string;
  },
  any
> = {
  id: 'agriculture.verify_pmkisan_status',
  version: '1.0.0',
  domain: 'AGRICULTURE',
  humanName: 'Verify PM-KISAN Entitlement & DBT Installment',
  description: 'Checks farmer registration, e-KYC compliance, and direct benefit transfer installment disbursement.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    aadhaarMasked: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    registrationNumber: z.string(),
    farmerName: z.string(),
    eligible: z.boolean(),
    ekycCompleted: z.boolean(),
    landSeedingStatus: z.boolean(),
    aadhaarBankSeedingStatus: z.boolean(),
    totalInstallmentsReleased: z.number(),
    lastInstallmentReleased: z.number(),
    lastInstallmentAmountInr: z.number(),
    lastCreditDate: z.string(),
    bankAccountMasked: z.string(),
    program: z.string(),
  }),
  execute: async (input) => {
    return agricultureAdapter.verifyPmkisanStatus(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PMKISAN_RECORD',
      entityId: output.registrationNumber,
      sourceType: 'FACT',
      sourceAuthority: output.program,
      confidence: 100,
    },
  ],
};

export const AgricultureFetchSoilHealthCardCapability: CapabilityContract<
  {
    citizenId: string;
    surveyNumber?: string;
  },
  any
> = {
  id: 'agriculture.fetch_soil_health_card',
  version: '1.0.0',
  domain: 'AGRICULTURE',
  humanName: 'Fetch ICAR Soil Health Card & Nutrient Plan',
  description: 'Retrieves 12-parameter soil nutrient report and crop-specific fertilizer recommendations.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    surveyNumber: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    cardId: z.string(),
    surveyNumber: z.string(),
    soilHealthIndex: z.number(),
    macronutrients: z.object({
      nitrogenKgPerHa: z.number(),
      nitrogenStatus: z.string(),
      phosphorusKgPerHa: z.number(),
      phosphorusStatus: z.string(),
      potassiumKgPerHa: z.number(),
      potassiumStatus: z.string(),
    }),
    soilProperties: z.object({
      phValue: z.number(),
      electricalConductivity: z.string(),
      organicCarbonPercent: z.number(),
    }),
    recommendations: z.array(z.string()),
    issuingLab: z.string(),
  }),
  execute: async (input) => {
    return agricultureAdapter.fetchSoilHealthCard(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'SOIL_HEALTH_CARD',
      entityId: output.cardId,
      sourceType: 'FACT',
      sourceAuthority: output.issuingLab,
      confidence: 100,
    },
  ],
};

export const AgricultureApplyCropInsuranceCapability: CapabilityContract<any, any> = {
  id: 'agriculture.apply_crop_insurance',
  version: '1.0.0',
  domain: 'AGRICULTURE',
  humanName: 'Enroll in Pradhan Mantri Fasal Bima Yojana (PMFBY)',
  description: 'Enrolls registered landholding and standing crops into statutory crop insurance for drought, flood, or pest loss.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm PMFBY Crop Insurance Enrollment',
    summary: 'Submit formal agricultural insurance application for registered survey parcel.',
    consequencesNotice: 'Statutory subsidized premium (1.5% - 2%) debited from linked bank account. Crop is covered for entire seasonal cycle.',
    confirmationLabel: 'Enroll in Crop Insurance',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    surveyNumber: z.string(),
    season: z.enum(['KHARIF', 'RABI']),
    cropName: z.string(),
    areaHectares: z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    policyNumber: z.string(),
    sumInsuredInr: z.number(),
    farmerPremiumInr: z.number(),
    governmentSubsidyInr: z.number(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return agricultureAdapter.applyCropInsurance(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PMFBY_INSURANCE_POLICY',
      entityId: output.policyNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'Ministry of Agriculture & Farmers Welfare (PMFBY Portal)',
      confidence: 100,
    },
  ],
};

export const AgricultureVerifyKisanCreditCardCapability: CapabilityContract<any, any> = {
  id: 'agriculture.verify_kisan_credit_card',
  version: '1.0.0',
  domain: 'AGRICULTURE',
  humanName: 'Verify Kisan Credit Card (KCC) Limit & Subvention',
  description: 'Retrieves active KCC sanctioned crop loan limit, current drawing power, and 3% prompt repayment incentive status.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    kccNumber: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kccNumber: z.string(),
    sanctionedCreditLimitInr: z.number(),
    utilizedAmountInr: z.number(),
    subsidizedInterestRatePercent: z.number(),
    expiryDate: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return agricultureAdapter.verifyKisanCreditCard(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'KISAN_CREDIT_CARD',
      entityId: output.kccNumber,
      sourceType: 'FACT',
      sourceAuthority: 'NABARD / State Bank of India Agricultural Banking Division',
      confidence: 100,
    },
  ],
};

