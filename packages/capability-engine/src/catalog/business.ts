import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { BusinessSpiAdapter } from '@indra/spi-adapters';

const businessAdapter = new BusinessSpiAdapter();

export const BusinessReserveNameCapability: CapabilityContract<
  {
    citizenId: string;
    proposedName: string;
    entityType: 'PRIVATE_LIMITED' | 'LLP' | 'PROPRIETORSHIP';
  },
  any
> = {
  id: 'business.reserve_name',
  version: '1.0.0',
  domain: 'BUSINESS',
  humanName: 'Verify & Reserve Corporate Name',
  description: 'Checks MCA corporate name availability and reserves the trade name.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    proposedName: z.string(),
    entityType: z.enum(['PRIVATE_LIMITED', 'LLP', 'PROPRIETORSHIP']),
  }),
  outputSchema: z.object({
    available: z.boolean(),
    reservationCode: z.string(),
  }),
  execute: async (input) => {
    return businessAdapter.checkNameAvailability(input);
  },
  compensate: async (input, output) => {
    console.log(`[Compensation] Released corporate reservation code ${output.reservationCode} for ${input.proposedName}`);
  },
};

export const BusinessIncorporateCapability: CapabilityContract<any, any> = {
  id: 'business.incorporate',
  version: '1.0.0',
  domain: 'BUSINESS',
  humanName: 'Incorporate Enterprise & Issue Credentials',
  description: 'Executes SPICe+ incorporation, issues PAN, GSTIN, Udyam MSME certificate.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Authorize Company Incorporation',
    summary: 'Incorporate your enterprise and register tax credentials.',
    consequencesNotice: 'This will legally register the business with the Ministry of Corporate Affairs, generate a GSTIN, and register under Udyam.',
    confirmationLabel: 'Incorporate Enterprise',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    companyName: z.string(),
    entityType: z.enum(['PRIVATE_LIMITED', 'LLP', 'PROPRIETORSHIP']),
    registeredAddress: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
    }),
    capitalInr: z.number().default(100000),
  }),
  outputSchema: z.object({
    cinOrId: z.string(),
    legalName: z.string(),
    pan: z.string(),
    gstin: z.string(),
    udyamNumber: z.string(),
    incorporationDate: z.string(),
    status: z.string(),
  }),
  execute: async (input) => {
    return businessAdapter.incorporateCompany(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'BUSINESS_INCORPORATION',
      entityId: output.cinOrId,
      sourceType: 'ACTION',
      sourceAuthority: 'Ministry of Corporate Affairs (MCA)',
      confidence: 100,
    },
  ],
};

export const BusinessRegisterGstinCapability: CapabilityContract<
  {
    citizenId: string;
    entityId: string;
    stateCode: string;
  },
  any
> = {
  id: 'business.register_gstin',
  version: '1.0.0',
  domain: 'BUSINESS',
  humanName: 'Register Enterprise GSTIN',
  description: 'Provisions Goods and Services Tax Identification Number (GSTIN) on the GST Portal.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['GSTN_REGISTRATION', 'BUSINESS_TAX'],
  inputSchema: z.object({
    citizenId: z.string(),
    entityId: z.string(),
    stateCode: z.string(),
  }),
  outputSchema: z.object({
    gstin: z.string(),
    legalName: z.string(),
    stateCode: z.string(),
    registrationDate: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return businessAdapter.registerGstin(input);
  },
  compensate: async (input) => {
    // Reversal logic for GSTIN cancellation
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'GSTIN_REGISTRATION',
      entityId: output.gstin,
      sourceType: 'FACT',
      sourceAuthority: 'Goods and Services Tax Network (GSTN)',
      confidence: 100,
    },
  ],
};

export const BusinessRegisterUdyamCapability: CapabilityContract<
  {
    citizenId: string;
    entityId: string;
    enterpriseType: 'MICRO' | 'SMALL' | 'MEDIUM';
    majorActivity: 'SERVICES' | 'MANUFACTURING';
  },
  any
> = {
  id: 'business.register_udyam',
  version: '1.0.0',
  domain: 'BUSINESS',
  humanName: 'Register MSME Udyam Certificate',
  description: 'Registers MSME classification and issues Udyam Registration Number.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['MSME_UDYAM_REGISTRATION'],
  inputSchema: z.object({
    citizenId: z.string(),
    entityId: z.string(),
    enterpriseType: z.enum(['MICRO', 'SMALL', 'MEDIUM']),
    majorActivity: z.enum(['SERVICES', 'MANUFACTURING']),
  }),
  outputSchema: z.object({
    udyamNumber: z.string(),
    enterpriseType: z.string(),
    legalName: z.string(),
    issuedAt: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return businessAdapter.registerUdyam(input);
  },
  compensate: async (input) => {
    // Reversal logic for Udyam de-registration
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'UDYAM_REGISTRATION',
      entityId: output.udyamNumber,
      sourceType: 'FACT',
      sourceAuthority: 'Ministry of Micro, Small and Medium Enterprises',
      confidence: 100,
    },
  ],
};

export const BusinessFileAnnualRocReturnCapability: CapabilityContract<any, any> = {
  id: 'business.file_annual_roc_return',
  version: '1.0.0',
  domain: 'BUSINESS',
  humanName: 'File Annual Statutory ROC Compliance (MCA-21)',
  description: 'Files mandatory annual returns (Form AOC-4 Financials and MGT-7) with Registrar of Companies to maintain active DIN/CIN status.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Statutory MCA-21 ROC Filing',
    summary: 'Submit formal annual return filing to Registrar of Companies under Companies Act 2013.',
    consequencesNotice: 'Generates permanent MCA Service Request Number (SRN). Avoids statutory director disqualification and late penalties.',
    confirmationLabel: 'File Annual ROC Return',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    cin: z.string(),
    financialYear: z.string().optional(),
    formType: z.enum(['AOC-4', 'MGT-7']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    cin: z.string(),
    formType: z.string(),
    srnNumber: z.string(),
    filingTimestamp: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return businessAdapter.fileAnnualRocReturn(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'MCA_ROC_FILING',
      entityId: output.srnNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'Ministry of Corporate Affairs (MCA-21 Registry)',
      confidence: 100,
    },
  ],
};

