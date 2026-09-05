import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { CivicSpiAdapter } from '@indra/spi-adapters';

const civicAdapter = CivicSpiAdapter.getInstance();

export const CivicPayPropertyTaxCapability: CapabilityContract<
  {
    citizenId: string;
    propertyIdentifier: string;
    assessmentYear: string;
    amountInr: number;
  },
  any
> = {
  id: 'civic.pay_property_tax',
  version: '1.0.0',
  domain: 'CIVIC',
  humanName: 'Pay Municipal Property Tax',
  description: 'Calculates tax demand with statutory rebate and processes receipt payment to Urban Local Body.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Municipal Property Tax Payment',
    summary: 'Pay annual civic property tax to update municipal title status.',
    consequencesNotice: 'Deducts amount from citizen treasury account and marks civic assessment PAID.',
    confirmationLabel: 'Authorize Tax Payment',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    propertyIdentifier: z.string(),
    assessmentYear: z.string(),
    amountInr: z.number().positive(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    receiptNumber: z.string(),
    propertyIdentifier: z.string(),
    assessmentYear: z.string(),
    paidAmountInr: z.number(),
    paymentDate: z.string(),
    updatedBalanceInr: z.number(),
    status: z.string(),
    treasuryHead: z.string(),
    municipalBody: z.string(),
  }),
  execute: async (input) => {
    return civicAdapter.payPropertyTax(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PROPERTY_TAX_RECEIPT',
      entityId: output.receiptNumber,
      sourceType: 'ACTION',
      sourceAuthority: output.municipalBody,
      confidence: 100,
    },
  ],
};

export const CivicUpdateUtilityConsumerCapability: CapabilityContract<
  {
    citizenId: string;
    consumerNumber: string;
    utilityType: 'WATER' | 'ELECTRICITY';
    newHolderName: string;
  },
  any
> = {
  id: 'civic.update_utility_consumer',
  version: '1.0.0',
  domain: 'CIVIC',
  humanName: 'Transfer Municipal Utility Connection (Water / Power)',
  description: 'Endorses utility consumer connection to the legal title holder following property purchase.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Utility Connection Endorsement',
    summary: 'Update registered consumer name on water or electricity connection.',
    consequencesNotice: 'Updates utility billing ground truth and issues fresh consumer endorsement.',
    confirmationLabel: 'Authorize Utility Transfer',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    consumerNumber: z.string(),
    utilityType: z.enum(['WATER', 'ELECTRICITY']),
    newHolderName: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    endorsementId: z.string(),
    consumerNumber: z.string(),
    utilityType: z.string(),
    newConsumerName: z.string(),
    status: z.string(),
    effectiveDate: z.string(),
    issuingBoard: z.string(),
  }),
  execute: async (input) => {
    return civicAdapter.updateUtilityConsumer(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'UTILITY_ENDORSEMENT',
      entityId: output.endorsementId,
      sourceType: 'ACTION',
      sourceAuthority: output.issuingBoard,
      confidence: 100,
    },
  ],
};

export const CivicVerifyVitalRecordCapability: CapabilityContract<
  {
    citizenId: string;
    registrationNumber: string;
    eventType: 'BIRTH' | 'DEATH';
    year: number;
  },
  any
> = {
  id: 'civic.verify_vital_record',
  version: '1.0.0',
  domain: 'CIVIC',
  humanName: 'Verify Municipal Vital Event Record (Birth / Death)',
  description: 'Verifies registration extract issued under the Registration of Births and Deaths Act, 1969.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    registrationNumber: z.string(),
    eventType: z.enum(['BIRTH', 'DEATH']),
    year: z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    verified: z.boolean(),
    registrationNumber: z.string(),
    eventType: z.string(),
    personName: z.string(),
    eventDate: z.string(),
    placeOfEvent: z.string(),
    registrationDate: z.string(),
    issuingAuthority: z.string(),
  }),
  execute: async (input) => {
    return civicAdapter.verifyVitalRecord(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CIVIL_REGISTRATION_RECORD',
      entityId: output.registrationNumber,
      sourceType: 'FACT',
      sourceAuthority: output.issuingAuthority,
      confidence: 100,
    },
  ],
};

export const CivicApplyWaterSewerageConnectionCapability: CapabilityContract<any, any> = {
  id: 'civic.apply_water_sewerage_connection',
  version: '1.0.0',
  domain: 'CIVIC',
  humanName: 'Apply for Municipal Water & Sewerage Sanction',
  description: 'Applies for municipal piped water connection, meter installation, and physical inspection.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Municipal Water Connection Application',
    summary: 'Submit formal application for domestic or commercial piped water supply.',
    consequencesNotice: 'Schedules physical site inspection with municipal engineering team.',
    confirmationLabel: 'Apply for Connection',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    propertyIdentifier: z.string(),
    connectionType: z.enum(['DOMESTIC', 'NON_DOMESTIC']).optional(),
    pipeDiameterMm: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    consumerRrNumber: z.string(),
    inspectionScheduledDate: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return civicAdapter.applyWaterSewerageConnection({
      ...input,
      connectionType: input.connectionType ?? 'DOMESTIC',
      pipeDiameterMm: input.pipeDiameterMm ?? 15,
    });
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'WATER_CONNECTION_APPLICATION',
      entityId: output.consumerRrNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'Urban Water Supply & Drainage Board (BWSSB / PMC)',
      confidence: 100,
    },
  ],
};

export const CivicRegisterTradeLicenseCapability: CapabilityContract<any, any> = {
  id: 'civic.register_trade_license',
  version: '1.0.0',
  domain: 'CIVIC',
  humanName: 'Register Municipal Commercial Trade License',
  description: 'Registers or renews commercial trade license under Karnataka/Maharashtra Municipal Corporations Act.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Trade License Issuance',
    summary: 'Apply for statutory commercial establishment trade license for your registered business premises.',
    consequencesNotice: 'Issues digital license certificate. Annual municipal health and trade cess applicable.',
    confirmationLabel: 'Issue Trade License',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    tradeName: z.string(),
    commercialAddress: z.string(),
    category: z.string().optional(),
    premisesSqFt: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    licenseNumber: z.string(),
    tradeName: z.string(),
    validUntil: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return civicAdapter.registerTradeLicense({
      ...input,
      category: input.category ?? 'RETAIL_COMMERCE',
      premisesSqFt: input.premisesSqFt ?? 250,
    });
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'MUNICIPAL_TRADE_LICENSE',
      entityId: output.licenseNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'Bruhat Bengaluru Mahanagara Palike (Revenue Health Dept)',
      confidence: 100,
    },
  ],
};

