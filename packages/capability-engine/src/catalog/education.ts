import type { CapabilityContract } from '@indra/contracts';
import {
  EducationVerifyApaarIdInputSchema,
  EducationVerifyApaarIdOutputSchema,
  type EducationVerifyApaarIdInput,
  type EducationVerifyApaarIdOutput,
} from '@indra/contracts';
import { EducationSpiAdapter } from '@indra/spi-adapters';

const eduAdapter = EducationSpiAdapter.getInstance();

export const EducationVerifyApaarIdCapability: CapabilityContract<
  EducationVerifyApaarIdInput,
  EducationVerifyApaarIdOutput
> = {
  id: 'education.verify_apaar_id',
  version: '1.0.0',
  domain: 'EDUCATION' as any,
  humanName: 'Verify APAAR ID & Academic Bank of Credits',
  description:
    'Queries the National Academic Depository (NAD) and Academic Bank of Credits (ABC) to verify degree qualifications and credits.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: EducationVerifyApaarIdInputSchema,
  outputSchema: EducationVerifyApaarIdOutputSchema,
  execute: async (input) => {
    return eduAdapter.verifyApaarId(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'ACADEMIC_CREDENTIAL',
      entityId: input.apaarId,
      sourceType: 'FACT',
      sourceAuthority: 'Academic Bank of Credits (DigiLocker NAD)',
      confidence: 100,
    },
  ],
};

export const EducationFetchAcademicTranscriptCapability: CapabilityContract<any, any> = {
  id: 'education.fetch_academic_transcript',
  version: '1.0.0',
  domain: 'EDUCATION',
  humanName: 'Fetch Verified Academic Degree Transcript',
  description: 'Retrieves authoritative cryptographically signed academic transcript and cumulative credits from ABC.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: EducationVerifyApaarIdInputSchema.partial().extend({
    citizenId: EducationVerifyApaarIdInputSchema.shape.citizenId,
    apaarId: EducationVerifyApaarIdInputSchema.shape.apaarId,
    degreeName: EducationVerifyApaarIdInputSchema.shape.apaarId,
  }),
  outputSchema: EducationVerifyApaarIdOutputSchema.partial().extend({
    success: EducationVerifyApaarIdOutputSchema.shape.success,
    transcriptId: EducationVerifyApaarIdInputSchema.shape.apaarId,
    degreeName: EducationVerifyApaarIdInputSchema.shape.apaarId,
    institutionName: EducationVerifyApaarIdInputSchema.shape.apaarId,
    creditsEarned: EducationVerifyApaarIdOutputSchema.shape.academicCreditsTotal,
    cgpa: EducationVerifyApaarIdInputSchema.shape.apaarId,
    signedDigest: EducationVerifyApaarIdInputSchema.shape.apaarId,
    message: EducationVerifyApaarIdOutputSchema.shape.message,
  }),
  execute: async (input) => {
    return eduAdapter.fetchAcademicTranscript(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'ACADEMIC_TRANSCRIPT',
      entityId: output.transcriptId,
      sourceType: 'FACT',
      sourceAuthority: 'Ministry of Education (Academic Bank of Credits)',
      confidence: 100,
    },
  ],
};

export const EducationApplyNationalScholarshipCapability: CapabilityContract<any, any> = {
  id: 'education.apply_national_scholarship',
  version: '1.0.0',
  domain: 'EDUCATION',
  humanName: 'Apply for National Central Sector Scholarship',
  description: 'Submits formal scholarship and stipend application through the National Scholarship Portal (NSP).',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm National Scholarship Application',
    summary: 'Submit formal student scholarship application under Central Sector Scheme.',
    consequencesNotice: 'Eligible award will be disbursed via DBT directly to verified bank account.',
    confirmationLabel: 'Apply for Scholarship',
  },
  inputSchema: EducationVerifyApaarIdInputSchema.partial().extend({
    citizenId: EducationVerifyApaarIdInputSchema.shape.citizenId,
    scholarshipCode: EducationVerifyApaarIdInputSchema.shape.apaarId,
    institutionCode: EducationVerifyApaarIdInputSchema.shape.apaarId,
    annualFamilyIncomeInr: EducationVerifyApaarIdOutputSchema.shape.academicCreditsTotal,
    bankAccountMasked: EducationVerifyApaarIdInputSchema.shape.apaarId,
  }),
  outputSchema: EducationVerifyApaarIdOutputSchema.partial().extend({
    success: EducationVerifyApaarIdOutputSchema.shape.success,
    applicationId: EducationVerifyApaarIdInputSchema.shape.apaarId,
    schemeName: EducationVerifyApaarIdInputSchema.shape.apaarId,
    sanctionedAmountInr: EducationVerifyApaarIdOutputSchema.shape.academicCreditsTotal,
    status: EducationVerifyApaarIdInputSchema.shape.apaarId,
    message: EducationVerifyApaarIdOutputSchema.shape.message,
  }),
  execute: async (input) => {
    return eduAdapter.applyNationalScholarship(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'SCHOLARSHIP_APPLICATION',
      entityId: output.applicationId,
      sourceType: 'ACTION',
      sourceAuthority: 'National Scholarship Portal (NSP / DBT Bharat)',
      confidence: 100,
    },
  ],
};

