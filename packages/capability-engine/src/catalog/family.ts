import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { FamilySpiAdapter } from '@indra/spi-adapters';

const familyAdapter = FamilySpiAdapter.getInstance();

export const FamilyEndorseKinshipNominationCapability: CapabilityContract<
  {
    citizenId: string;
    targetAccountType: 'EPFO' | 'BANK' | 'INSURANCE';
    accountIdentifier: string;
    nomineeFullName: string;
    relation: 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
    allocationPercentage: number;
  },
  any
> = {
  id: 'family.endorse_kinship_nomination',
  version: '1.0.0',
  domain: 'CIVIC',
  humanName: 'Endorse Legal Kinship Nomination Across Institutions',
  description: 'Synchronizes and registers official nominee records across EPF (Form 2), Bank Accounts, or Insurance.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Statutory Legal Nomination',
    summary: 'Designate beneficial nominee relationship for financial asset succession.',
    consequencesNotice: 'Officially registers nominee with statutory authority; supersedes previous nomination.',
    confirmationLabel: 'Authorize Nomination Endorsement',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    targetAccountType: z.enum(['EPFO', 'BANK', 'INSURANCE']),
    accountIdentifier: z.string(),
    nomineeFullName: z.string(),
    relation: z.enum(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER']),
    allocationPercentage: z.number().min(1).max(100),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    nominationReferenceNumber: z.string(),
    targetAccountType: z.string(),
    accountIdentifier: z.string(),
    nomineeFullName: z.string(),
    relation: z.string(),
    allocationPercentage: z.number(),
    status: z.string(),
    effectiveDate: z.string(),
    statutoryScheme: z.string(),
  }),
  execute: async (input) => {
    return familyAdapter.endorseKinshipNomination(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'KINSHIP_NOMINATION',
      entityId: output.nominationReferenceNumber,
      sourceType: 'ACTION',
      sourceAuthority: output.statutoryScheme,
      confidence: 100,
    },
  ],
};

export const FamilyRegisterCivilMarriageCapability: CapabilityContract<any, any> = {
  id: 'family.register_civil_marriage',
  version: '1.0.0',
  domain: 'FAMILY' as any,
  humanName: 'Register Notice of Marriage (Special Marriage Act)',
  description: 'Submits formal solemnization notice of civil marriage under Special Marriage Act, 1954 to Sub-Registrar.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Notice of Intended Marriage',
    summary: 'Submit formal marriage solemnization notice to the Jurisdictional Marriage Officer.',
    consequencesNotice: 'Publishes 30-day statutory public inspection notice in marriage notice book.',
    confirmationLabel: 'Publish Marriage Notice',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    spouseCitizenId: z.string().optional(),
    spouseFullName: z.string(),
    intendedMarriageDate: z.string(),
    witnessCount: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    noticeReferenceNo: z.string(),
    subRegistrarOffice: z.string(),
    noticeExpiryDate: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return familyAdapter.registerCivilMarriage(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CIVIL_MARRIAGE_NOTICE',
      entityId: output.noticeReferenceNo,
      sourceType: 'ACTION',
      sourceAuthority: 'Office of the Marriage Officer & Sub-Registrar',
      confidence: 100,
    },
  ],
};

export const FamilyInquireFamilyTreeCapability: CapabilityContract<any, any> = {
  id: 'family.inquire_family_tree',
  version: '1.0.0',
  domain: 'FAMILY' as any,
  humanName: 'Inquire Composite Family Unit & Kinship Graph',
  description: 'Inquires official family tree, dependent coverage, and legal relations from Civil Registration and Ration databases.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    familyHeadName: z.string(),
    familyId: z.string(),
    members: z.array(
      z.object({
        fullName: z.string(),
        relation: z.string(),
        age: z.number(),
        isDependent: z.boolean(),
      })
    ),
    message: z.string(),
  }),
  execute: async (input) => {
    return familyAdapter.inquireFamilyTree(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'FAMILY_KINSHIP_GRAPH',
      entityId: output.familyId,
      sourceType: 'FACT',
      sourceAuthority: 'State Civil Registration & Family Pehchan Authority',
      confidence: 100,
    },
  ],
};

