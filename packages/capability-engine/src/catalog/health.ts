import type { CapabilityContract } from '@indra/contracts';
import {
  HealthLinkAbhaRecordsInputSchema,
  HealthLinkAbhaRecordsOutputSchema,
} from '@indra/contracts';
import { AbdmSpiAdapter } from '@indra/spi-adapters';

const abdmAdapter = AbdmSpiAdapter.getInstance();

export const HealthLinkAbhaRecordsCapability: CapabilityContract<any, any> = {
  id: 'health.link_abha_records',
  version: '1.0.0',
  domain: 'HEALTH' as any,
  humanName: 'Link ABDM Health Records & Electronic Consent',
  description:
    'Establishes Ayushman Bharat Digital Mission (ABDM) electronic consent and synchronizes hospital records.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  inputSchema: HealthLinkAbhaRecordsInputSchema,
  outputSchema: HealthLinkAbhaRecordsOutputSchema,
  execute: async (input) => {
    return abdmAdapter.linkAbhaRecords(input);
  },
  compensate: async (input, output) => {
    if (output?.consentArtifactId) {
      await abdmAdapter.revokeConsent(output.consentArtifactId, input.citizenId);
    }
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CONSENT_ARTIFACT',
      entityId: output.consentArtifactId,
      sourceType: 'FACT',
      sourceAuthority: 'National Health Authority (ABDM Gateway)',
      confidence: 100,
    },
  ],
};

export const HealthFetchAyushmanCardCapability: CapabilityContract<any, any> = {
  id: 'health.fetch_ayushman_card',
  version: '1.0.0',
  domain: 'HEALTH' as any,
  humanName: 'Fetch PM-JAY Ayushman Bharat Golden Card',
  description: 'Verifies statutory entitlement and annual hospital cashless treatment coverage (INR 5 Lakhs) under PM-JAY.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: HealthLinkAbhaRecordsInputSchema.partial().extend({
    citizenId: HealthLinkAbhaRecordsInputSchema.shape.citizenId,
    abhaNumber: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress.optional(),
  }),
  outputSchema: HealthLinkAbhaRecordsOutputSchema.partial().extend({
    success: HealthLinkAbhaRecordsOutputSchema.shape.success,
    pmjayId: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
    beneficiaryName: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
    annualFamilyCoverageInr: HealthLinkAbhaRecordsOutputSchema.shape.linkedRecordsCount,
    eligibilityStatus: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
    message: HealthLinkAbhaRecordsOutputSchema.shape.message,
  }),
  execute: async (input) => {
    return abdmAdapter.fetchAyushmanCard(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PMJAY_GOLDEN_CARD',
      entityId: output.pmjayId,
      sourceType: 'FACT',
      sourceAuthority: 'National Health Authority (PM-JAY Scheme)',
      confidence: 100,
    },
  ],
};

export const HealthFetchVaccinationCertificateCapability: CapabilityContract<any, any> = {
  id: 'health.fetch_vaccination_certificate',
  version: '1.0.0',
  domain: 'HEALTH' as any,
  humanName: 'Fetch Official Universal Vaccination Record',
  description: 'Retrieves digitally signed immunization certificate from the CoWIN / U-WIN National Digital Registry.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: HealthLinkAbhaRecordsInputSchema.partial().extend({
    citizenId: HealthLinkAbhaRecordsInputSchema.shape.citizenId,
    beneficiaryReferenceId: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
  }),
  outputSchema: HealthLinkAbhaRecordsOutputSchema.partial().extend({
    success: HealthLinkAbhaRecordsOutputSchema.shape.success,
    beneficiaryName: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
    vaccineName: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
    dosesCompleted: HealthLinkAbhaRecordsOutputSchema.shape.linkedRecordsCount,
    finalCertificateIssued: HealthLinkAbhaRecordsOutputSchema.shape.success,
    certificateId: HealthLinkAbhaRecordsInputSchema.shape.abhaAddress,
    message: HealthLinkAbhaRecordsOutputSchema.shape.message,
  }),
  execute: async (input) => {
    return abdmAdapter.fetchVaccinationCertificate(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'VACCINATION_CERTIFICATE',
      entityId: output.certificateId,
      sourceType: 'FACT',
      sourceAuthority: 'Ministry of Health and Family Welfare (CoWIN / U-WIN)',
      confidence: 100,
    },
  ],
};

