import { z } from 'zod';
import {
  type CapabilityContract,
  SecurityReportCyberFraudInputSchema,
  SecurityReportCyberFraudOutputSchema,
  type SecurityReportCyberFraudInput,
  type SecurityReportCyberFraudOutput,
} from '@indra/contracts';
import { SecuritySpiAdapter } from '@indra/spi-adapters';

const securityAdapter = SecuritySpiAdapter.getInstance();

export const SecurityFreezeCompromisedAccountCapability: CapabilityContract<
  {
    citizenId: string;
    bankAccountId?: string;
    accountMasked?: string;
    transactionIdFraudulent?: string;
    incidentBrief: string;
  },
  any
> = {
  id: 'security.freeze_compromised_account',
  version: '1.0.0',
  domain: 'SECURITY',
  humanName: 'Emergency Cybercrime Account Freeze (1930 Helpline)',
  description: 'Issues immediate emergency regulatory incident broadcast to freeze debits on compromised bank accounts or UPI.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Emergency Account Debit Freeze Confirmation',
    summary: 'Instantly freeze outbound debit transactions across compromised financial accounts.',
    consequencesNotice: 'All debit transactions, cards, and UPI channels will be frozen immediately under CrPC provisions.',
    confirmationLabel: 'Authorize Emergency Debit Freeze',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    bankAccountId: z.string().optional(),
    accountMasked: z.string().optional(),
    transactionIdFraudulent: z.string().optional(),
    incidentBrief: z.string().min(5),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    acknowledgementNumber: z.string(),
    accountLienStatus: z.string(),
    timestamp: z.string(),
    reportingChannel: z.string(),
    bankNotified: z.string(),
    statutoryOrder: z.string(),
    remedialNextSteps: z.array(z.string()),
  }),
  execute: async (input) => {
    return securityAdapter.freezeCompromisedAccount(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CYBER_FRAUD_INCIDENT',
      entityId: output.acknowledgementNumber,
      sourceType: 'ACTION',
      sourceAuthority: output.reportingChannel,
      confidence: 100,
    },
  ],
};

export const SecurityReportCyberFraudCapability: CapabilityContract<
  SecurityReportCyberFraudInput,
  SecurityReportCyberFraudOutput
> = {
  id: 'security.report_cyber_fraud',
  version: '1.0.0',
  domain: 'SECURITY',
  humanName: 'Report Cyber Financial Fraud (National Cybercrime Portal 1930)',
  description: 'Files an official financial cyber fraud complaint on 1930 / I4C framework and dispatches inter-bank lien broadcast.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Cyber Financial Fraud Report',
    summary: 'Dispatches emergency fraud report to National Cybercrime Reporting Portal (1930) and requests debit freeze on suspect recipient accounts.',
    consequencesNotice: 'Statutory complaint will be lodged under Section 66D IT Act and bank freeze requests will be broadcast across beneficiary accounts.',
    confirmationLabel: 'Authorize Cyber Fraud Report',
  },
  inputSchema: SecurityReportCyberFraudInputSchema,
  outputSchema: SecurityReportCyberFraudOutputSchema,
  execute: async (input) => {
    return securityAdapter.reportCyberFraud(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CYBER_CRIME_REPORT',
      entityId: output.complaintAckNo,
      sourceType: 'ACTION',
      sourceAuthority: 'Indian Cyber Crime Coordination Centre (I4C)',
      confidence: 100,
    },
  ],
};

