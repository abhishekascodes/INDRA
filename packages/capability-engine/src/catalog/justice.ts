import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { JusticeSpiAdapter } from '@indra/spi-adapters';

const justiceAdapter = JusticeSpiAdapter.getInstance();

export const JusticeFileCpgramsGrievanceCapability: CapabilityContract<
  {
    citizenId: string;
    ministryCode: string;
    subject: string;
    grievanceDetails: string;
    previousReferenceNo?: string;
  },
  any
> = {
  id: 'justice.file_cpgrams_grievance',
  version: '1.0.0',
  domain: 'JUSTICE',
  humanName: 'File Central Public Grievance (CPGRAMS)',
  description: 'Submits an authenticated citizen complaint or grievance petition to the Department of Administrative Reforms.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Grievance Petition Filing',
    summary: 'Submit formal grievance petition to Central Ministry Nodal Public Grievance Officer.',
    consequencesNotice: 'Registers an official statutory complaint with tracked 30-day resolution mandate.',
    confirmationLabel: 'Authorize Grievance Filing',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    ministryCode: z.string(),
    subject: z.string().min(5),
    grievanceDetails: z.string().min(10),
    previousReferenceNo: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    registrationNumber: z.string(),
    ministryName: z.string(),
    subject: z.string(),
    assignedOfficer: z.string(),
    expectedResolutionDays: z.number(),
    status: z.string(),
    filingDate: z.string(),
    portal: z.string(),
  }),
  execute: async (input) => {
    return justiceAdapter.fileCpgramsGrievance(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CPGRAMS_GRIEVANCE',
      entityId: output.registrationNumber,
      sourceType: 'ACTION',
      sourceAuthority: output.portal,
      confidence: 100,
    },
  ],
};

export const JusticeCheckRtiStatusCapability: CapabilityContract<
  {
    citizenId: string;
    registrationNumber: string;
  },
  any
> = {
  id: 'justice.check_rti_status',
  version: '1.0.0',
  domain: 'JUSTICE',
  humanName: 'Check RTI Application & Appeal Status',
  description: 'Inquires statutory progress, PIO assignment, and response deadline of a Right to Information request.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    registrationNumber: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    registrationNumber: z.string(),
    publicAuthority: z.string(),
    dateOfReceipt: z.string(),
    status: z.string(),
    pioName: z.string(),
    pioDesignation: z.string(),
    statutoryDeadlineDate: z.string(),
    responseSummary: z.string().optional(),
  }),
  execute: async (input) => {
    return justiceAdapter.checkRtiStatus(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'RTI_APPLICATION_RECORD',
      entityId: output.registrationNumber,
      sourceType: 'FACT',
      sourceAuthority: output.publicAuthority,
      confidence: 100,
    },
  ],
};

export const JusticeApplyLegalAidCapability: CapabilityContract<any, any> = {
  id: 'justice.apply_legal_aid',
  version: '1.0.0',
  domain: 'JUSTICE',
  humanName: 'Apply for Free Legal Aid (NALSA)',
  description: 'Submits formal application for free legal aid and panel advocate assignment under Legal Services Authorities Act.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Free Legal Aid Application',
    summary: 'Apply for state-funded legal representation before civil/criminal courts.',
    consequencesNotice: 'Assigns certified legal aid advocate through District Legal Services Authority.',
    confirmationLabel: 'Apply for Legal Aid',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    matterSummary: z.string(),
    category: z.enum(['WOMEN_CHILDREN', 'SC_ST', 'LOW_INCOME', 'CUSTODIAL']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    caseAidNumber: z.string(),
    assignedAdvocateName: z.string(),
    legalServicesAuthority: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return justiceAdapter.applyLegalAid({
      ...input,
      category: input.category ?? 'LOW_INCOME',
    });
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'LEGAL_AID_ASSIGNMENT',
      entityId: output.caseAidNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'National Legal Services Authority (NALSA / DLSA)',
      confidence: 100,
    },
  ],
};

export const JusticeSearchPoliceFirCapability: CapabilityContract<any, any> = {
  id: 'justice.search_police_fir',
  version: '1.0.0',
  domain: 'JUSTICE',
  humanName: 'Search State Police e-FIR & Clearances',
  description: 'Searches Crime and Criminal Tracking Network & Systems (CCTNS) for registered FIRs or clearance certificates.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    policeStation: z.string(),
    firNumber: z.string().optional(),
    queryYear: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    firNumber: z.string(),
    policeStation: z.string(),
    incidentSection: z.string(),
    investigationStatus: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return justiceAdapter.searchPoliceFir(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'POLICE_FIR_RECORD',
      entityId: output.firNumber,
      sourceType: 'FACT',
      sourceAuthority: 'State Police Citizen Portal (CCTNS Inter-operable Criminal Justice System)',
      confidence: 100,
    },
  ],
};

