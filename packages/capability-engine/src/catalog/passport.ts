import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { PassportSpiAdapter } from '@indra/spi-adapters';

const passportAdapter = new PassportSpiAdapter();

export const PassportCheckStatusCapability: CapabilityContract<
  {
    citizenId: string;
  },
  any
> = {
  id: 'passport.check_status',
  version: '1.0.0',
  domain: 'TRAVEL',
  humanName: 'Check Passport Validity & Renewal Eligibility',
  description: 'Inquires Passport Seva Project records for validity expiration, police clearance, and renewal window.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
  }),
  outputSchema: z.object({
    passportNumberMasked: z.string(),
    holderName: z.string(),
    issueDate: z.string(),
    expiryDate: z.string(),
    daysRemaining: z.number(),
    status: z.string(),
    eligibleForRenewal: z.boolean(),
    rpoOffice: z.string(),
    policeVerificationClearance: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return passportAdapter.checkPassportStatus(input.citizenId);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PASSPORT_STATUS',
      entityId: input.citizenId,
      sourceType: 'FACT',
      sourceAuthority: 'Ministry of External Affairs (PSP)',
      confidence: 100,
    },
  ],
};

export const PassportApplyPoliceClearanceCapability: CapabilityContract<any, any> = {
  id: 'passport.apply_police_clearance',
  version: '1.0.0',
  domain: 'TRAVEL',
  humanName: 'Apply for Police Clearance Certificate (PCC)',
  description: 'Applies for formal Police Clearance Certificate issued through Passport Seva for emigration, long-term visas, or work permits.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Police Clearance Application',
    summary: 'Submit formal PCC request for international travel and emigration.',
    consequencesNotice: 'Initiates background verification with state police criminal tracking network.',
    confirmationLabel: 'Submit PCC Application',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    passportNumber: z.string(),
    countryOfTravel: z.string(),
    visaCategory: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    pccApplicationNo: z.string(),
    policeStation: z.string(),
    appointmentDate: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return passportAdapter.applyPoliceClearance(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'POLICE_CLEARANCE_CERTIFICATE',
      entityId: output.pccApplicationNo,
      sourceType: 'ACTION',
      sourceAuthority: 'Ministry of External Affairs (CPV Division)',
      confidence: 100,
    },
  ],
};

export const PassportBookSevaKendraSlotCapability: CapabilityContract<any, any> = {
  id: 'passport.book_seva_kendra_slot',
  version: '1.0.0',
  domain: 'TRAVEL',
  humanName: 'Book Passport Seva Kendra Appointment Slot',
  description: 'Reserves confirmed biometric and document verification slot at nearest PSK / Post Office PSK.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm PSK Appointment Slot',
    summary: 'Reserve physical reporting slot at designated Passport Seva Kendra.',
    consequencesNotice: 'Citizen must appear in person with original birth certificate, Aadhaar, and education documents.',
    confirmationLabel: 'Confirm Slot Booking',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    applicationArn: z.string(),
    pskLocation: z.string(),
    preferredDate: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    appointmentSlot: z.string(),
    pskCenter: z.string(),
    reportingTime: z.string(),
    bookingReference: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return passportAdapter.bookSevaKendraSlot(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PASSPORT_APPOINTMENT_SLOT',
      entityId: output.bookingReference,
      sourceType: 'ACTION',
      sourceAuthority: 'Passport Seva Project (Tata Consultancy Services & MEA)',
      confidence: 100,
    },
  ],
};

