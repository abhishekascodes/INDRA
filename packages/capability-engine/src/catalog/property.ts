import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { PropertySpiAdapter } from '@indra/spi-adapters';

const propertyAdapter = PropertySpiAdapter.getInstance();

export const PropertyVerifyEncumbranceCapability: CapabilityContract<
  {
    citizenId: string;
    propertyIdentifier: string;
    searchYears?: number;
  },
  any
> = {
  id: 'property.verify_encumbrance',
  version: '1.0.0',
  domain: 'PROPERTY',
  humanName: 'Verify Sub-Registrar Encumbrance Certificate',
  description: 'Searches official Sub-Registrar books for registered transactions, mortgages, or court injunctions.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    propertyIdentifier: z.string(),
    searchYears: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    propertyIdentifier: z.string(),
    searchPeriodYears: z.number(),
    encumbrancesFound: z.boolean(),
    encumbrances: z.array(z.any()),
    isCleanTitle: z.boolean(),
    clearanceCertificateNumber: z.string(),
    issuingAuthority: z.string(),
  }),
  execute: async (input) => {
    return propertyAdapter.verifyEncumbrance(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'ENCUMBRANCE_CERTIFICATE',
      entityId: output.clearanceCertificateNumber,
      sourceType: 'FACT',
      sourceAuthority: output.issuingAuthority,
      confidence: 100,
    },
  ],
};

export const PropertyFetchTitleDeedCapability: CapabilityContract<
  {
    citizenId: string;
    surveyNumber?: string;
    propertyIdentifier?: string;
    district?: string;
    taluk?: string;
  },
  any
> = {
  id: 'property.fetch_title_deed',
  version: '1.0.0',
  domain: 'PROPERTY',
  humanName: 'Fetch Official Digital Title Extract (Khata / RoR)',
  description: 'Retrieves official Record of Rights (Khata / Patta / 7/12 Extract) confirming verified ownership.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    surveyNumber: z.string().optional(),
    propertyIdentifier: z.string().optional(),
    district: z.string().optional(),
    taluk: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    deedRecordId: z.string(),
    ownerName: z.string(),
    identifier: z.string(),
    propertyType: z.string(),
    areaAcresOrSqft: z.string(),
    state: z.string(),
    district: z.string(),
    isVerified: z.boolean(),
    sourceRegistry: z.string(),
  }),
  execute: async (input) => {
    return propertyAdapter.fetchTitleDeed(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'TITLE_DEED_RECORD',
      entityId: output.deedRecordId,
      sourceType: 'FACT',
      sourceAuthority: output.sourceRegistry,
      confidence: 100,
    },
  ],
};

export const PropertyApplyMutationCapability: CapabilityContract<
  {
    citizenId: string;
    propertyIdentifier: string;
    registrationDeedNumber: string;
    transfereeName: string;
  },
  any
> = {
  id: 'property.apply_mutation',
  version: '1.0.0',
  domain: 'PROPERTY',
  humanName: 'Apply for Revenue Property Mutation',
  description: 'Submits official application to mutate title ownership in municipal/revenue land records.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Statutory Property Mutation',
    summary: 'Submit formal application to transfer municipal title record to the new legal holder.',
    consequencesNotice: 'Initiates a statutory 30-day public objection period. Irreversible once registered.',
    confirmationLabel: 'Authorize Mutation Filing',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    propertyIdentifier: z.string(),
    registrationDeedNumber: z.string(),
    transfereeName: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    mutationNoticeNumber: z.string(),
    propertyIdentifier: z.string(),
    transfereeName: z.string(),
    status: z.string(),
    objectionPeriodDays: z.number(),
    expectedDisposalDays: z.number(),
    filingDate: z.string(),
    authority: z.string(),
  }),
  execute: async (input) => {
    return propertyAdapter.applyMutation(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'MUTATION_APPLICATION',
      entityId: output.mutationNoticeNumber,
      sourceType: 'ACTION',
      sourceAuthority: output.authority,
      confidence: 100,
    },
  ],
};

export const PropertyInquireCadastralSurveyCapability: CapabilityContract<any, any> = {
  id: 'property.inquire_cadastral_survey',
  version: '1.0.0',
  domain: 'PROPERTY',
  humanName: 'Inquire Cadastral Survey & Geo-Boundary Map',
  description: 'Inquires state revenue land records for digital cadastral map, geo-coordinates, and border demarcation clearance.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    surveyNumber: z.string(),
    village: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    surveyNumber: z.string(),
    cadastralMapId: z.string(),
    boundaryCoordinates: z.string(),
    geoFencedAreaSqFt: z.number(),
    disputeFlag: z.boolean(),
    message: z.string(),
  }),
  execute: async (input) => {
    return propertyAdapter.inquireCadastralSurvey(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CADASTRAL_SURVEY_MAP',
      entityId: output.cadastralMapId,
      sourceType: 'FACT',
      sourceAuthority: 'Survey and Settlement Department / Land Records Authority',
      confidence: 100,
    },
  ],
};

