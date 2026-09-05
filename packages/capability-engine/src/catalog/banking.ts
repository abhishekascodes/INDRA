import type { CapabilityContract } from '@indra/contracts';
import {
  BankingAccountAggregatorConsentInputSchema,
  BankingAccountAggregatorConsentOutputSchema,
  BankingRegisterBankMandateInputSchema,
  BankingRegisterBankMandateOutputSchema,
} from '@indra/contracts';
import { AccountAggregatorSpiAdapter } from '@indra/spi-adapters';

const aaAdapter = AccountAggregatorSpiAdapter.getInstance();

export const BankingAccountAggregatorConsentCapability: CapabilityContract<any, any> = {
  id: 'banking.account_aggregator_consent',
  version: '1.0.0',
  domain: 'FINANCE' as any,
  humanName: 'Grant Account Aggregator Consent & Fetch Statement',
  description:
    'Issues an RBI-compliant electronic consent artifact to retrieve bank statement summaries for statutory tax or welfare reconciliation.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  inputSchema: BankingAccountAggregatorConsentInputSchema,
  outputSchema: BankingAccountAggregatorConsentOutputSchema,
  execute: async (input) => {
    return aaAdapter.requestConsentAndFetchSummary(input);
  },
  compensate: async (input, output) => {
    if (output?.consentArtifactId) {
      await aaAdapter.revokeConsent(output.consentArtifactId, input.citizenId);
    }
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CONSENT_ARTIFACT',
      entityId: output.consentArtifactId,
      sourceType: 'FACT',
      sourceAuthority: 'Reserve Bank of India (Sahamati AA Framework)',
      confidence: 100,
    },
  ],
};

export const BankingFetchCibilReportCapability: CapabilityContract<any, any> = {
  id: 'banking.fetch_cibil_report',
  version: '1.0.0',
  domain: 'FINANCE' as any,
  humanName: 'Fetch Sovereign Credit Score & CIR Report (CIBIL)',
  description: 'Retrieves verified Comprehensive Information Report (CIR) and CIBIL score from authorized credit bureaus.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: BankingAccountAggregatorConsentInputSchema.partial().extend({
    citizenId: BankingAccountAggregatorConsentInputSchema.shape.citizenId,
  }),
  outputSchema: BankingAccountAggregatorConsentOutputSchema.partial().extend({
    cibilScore: BankingAccountAggregatorConsentOutputSchema.shape.success,
  }),
  execute: async (input) => {
    return aaAdapter.fetchCibilReport(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CREDIT_BUREAU_RECORD',
      entityId: String(output.cibilScore || 'CIBIL-REPORT'),
      sourceType: 'FACT',
      sourceAuthority: 'TransUnion CIBIL Limited (RBI Authorized CIR)',
      confidence: 100,
    },
  ],
};

export const BankingRegisterBankMandateCapability: CapabilityContract<any, any> = {
  id: 'banking.register_bank_mandate',
  version: '1.0.0',
  domain: 'FINANCE' as any,
  humanName: 'Register e-NACH Statutory Bank Mandate',
  description: 'Establishes electronic auto-debit standing mandate for recurring statutory payments, municipal fees, or loan service.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm e-NACH Payment Mandate',
    summary: 'Authorize automated statutory standing debit instruction with your bank.',
    consequencesNotice: 'Bank account will be debited automatically up to authorized threshold amount.',
    confirmationLabel: 'Register Mandate',
  },
  inputSchema: BankingRegisterBankMandateInputSchema,
  outputSchema: BankingRegisterBankMandateOutputSchema,
  execute: async (input) => {
    return aaAdapter.registerBankMandate(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'BANK_MANDATE_RECORD',
      entityId: output.mandateUmn,
      sourceType: 'ACTION',
      sourceAuthority: 'National Payments Corporation of India (NACH / e-Mandate)',
      confidence: 100,
    },
  ],
};

