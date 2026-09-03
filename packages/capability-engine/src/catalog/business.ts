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
