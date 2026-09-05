import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { IncomeTaxSpiAdapter } from '@indra/spi-adapters';

const taxAdapter = new IncomeTaxSpiAdapter();

export const TaxCheckItrStatusCapability: CapabilityContract<
  {
    citizenId: string;
    assessmentYear: string;
  },
  any
> = {
  id: 'tax.check_itr_status',
  version: '1.0.0',
  domain: 'TAX',
  humanName: 'Check Income Tax Return Filing Status',
  description: 'Inquires CPC e-Filing ledger for return processing, intimation u/s 143(1), and refund issuance.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    assessmentYear: z.string(),
  }),
  outputSchema: z.object({
    panMasked: z.string(),
    assessmentYear: z.string(),
    filingStatus: z.string(),
    acknowledgementNumber: z.string(),
    refundAmountInr: z.number(),
    intimationSection: z.string(),
    processedDate: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return taxAdapter.checkItrStatus(input.citizenId, input.assessmentYear);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'ITR_STATUS',
      entityId: `${input.citizenId}:${input.assessmentYear}`,
      sourceType: 'FACT',
      sourceAuthority: 'Income Tax Department (CPC Bengaluru)',
      confidence: 100,
    },
  ],
};

export const TaxFetchForm26AsCapability: CapabilityContract<
  {
    citizenId: string;
    financialYear: string;
  },
  any
> = {
  id: 'tax.fetch_form26as',
  version: '1.0.0',
  domain: 'TAX',
  humanName: 'Fetch Form 26AS Tax Credit Statement',
  description: 'Retrieves comprehensive TDS, TCS, and advance tax payment credits from TRACES.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    financialYear: z.string(),
  }),
  outputSchema: z.object({
    panMasked: z.string(),
    financialYear: z.string(),
    totalTdsInr: z.number(),
    totalAdvanceTaxInr: z.number(),
    entries: z.array(
      z.object({
        tan: z.string(),
        deductorName: z.string(),
        totalAmountPaidInr: z.number(),
        taxDeductedInr: z.number(),
        sectionCode: z.string(),
      })
    ),
    generatedAt: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return taxAdapter.fetchForm26As(input.citizenId, input.financialYear);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'FORM_26AS_TAX_CREDIT',
      entityId: `${input.citizenId}:${input.financialYear}`,
      sourceType: 'FACT',
      sourceAuthority: 'Income Tax Department (TRACES)',
      confidence: 100,
    },
  ],
};

export const TaxReconcileAisTisCapability: CapabilityContract<any, any> = {
  id: 'tax.reconcile_ais_tis',
  version: '1.0.0',
  domain: 'TAX',
  humanName: 'Reconcile Annual Information Statement (AIS/TIS)',
  description: 'Audits taxpayer annual income summary against employer TDS, dividend statements, and banking transactions.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    assessmentYear: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    assessmentYear: z.string(),
    tdsReportedInr: z.number(),
    tdsDeductedInr: z.number(),
    highValueTransactionsCount: z.number(),
    discrepancyCount: z.number(),
    reconciliationStatus: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return taxAdapter.reconcileAisTis(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'AIS_TIS_RECONCILIATION',
      entityId: `${input.citizenId}:${output.assessmentYear}`,
      sourceType: 'FACT',
      sourceAuthority: 'Income Tax Department Directorate of Systems',
      confidence: 100,
    },
  ],
};

export const TaxEVerifyReturnCapability: CapabilityContract<any, any> = {
  id: 'tax.e_verify_return',
  version: '1.0.0',
  domain: 'TAX',
  humanName: 'e-Verify Income Tax Return (ITR)',
  description: 'Instantly e-verifies submitted ITR return via Aadhaar OTP or Bank EVC under statutory CBDT guidelines.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Statutory ITR e-Verification',
    summary: 'Submit cryptographic e-verification for filed Income Tax Return.',
    consequencesNotice: 'Concludes return submission. Legally substitutes physical paper ITR-V signature.',
    confirmationLabel: 'e-Verify ITR',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    ackNumber: z.string(),
    verificationMethod: z.enum(['AADHAAR_OTP', 'BANK_EVC', 'DEMAT_EVC']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    ackNumber: z.string(),
    verificationCode: z.string(),
    verificationTimestamp: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return taxAdapter.eVerifyReturn(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'ITR_E_VERIFICATION',
      entityId: output.ackNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'Central Board of Direct Taxes (CBDT)',
      confidence: 100,
    },
  ],
};

export const TaxInquireGstinComplianceCapability: CapabilityContract<any, any> = {
  id: 'tax.inquire_gstin_compliance',
  version: '1.0.0',
  domain: 'TAX',
  humanName: 'Inquire GSTIN Compliance & Filing Status',
  description: 'Inquires GST Goods and Services Tax Network for return filing track record (GSTR-1/GSTR-3B) and compliance score.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    gstin: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    gstin: z.string(),
    legalName: z.string(),
    filingStatus: z.string(),
    lastGstr1FilingPeriod: z.string(),
    lastGstr3bFilingPeriod: z.string(),
    complianceRating: z.number(),
    message: z.string(),
  }),
  execute: async (input) => {
    return taxAdapter.inquireGstinCompliance(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'GSTIN_COMPLIANCE_RECORD',
      entityId: input.gstin,
      sourceType: 'FACT',
      sourceAuthority: 'Goods and Services Tax Network (GSTN)',
      confidence: 100,
    },
  ],
};

