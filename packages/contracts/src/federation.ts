import { z } from 'zod';
import { ProvenanceMetadataSchema } from './domain.js';

// =========================================================================
// 1. MEITY DEPA / RBI AA / ABDM CONSENT ARTIFACT SCHEMA
// =========================================================================
export const ConsentEcosystemSchema = z.enum(['ABDM', 'RBI_AA', 'DIGILOCKER']);
export type ConsentEcosystem = z.infer<typeof ConsentEcosystemSchema>;

export const ConsentArtifactStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']);
export type ConsentArtifactStatus = z.infer<typeof ConsentArtifactStatusSchema>;

export const ConsentArtifactSchema = z.object({
  id: z.string().uuid(),
  citizenId: z.string().uuid(),
  ecosystem: ConsentEcosystemSchema,
  consentManagerId: z.string(),
  purposeCode: z.string(),
  dataProviderId: z.string(),
  dataConsumerId: z.string(),
  dataTypes: z.array(z.string()).default([]),
  status: ConsentArtifactStatusSchema.default('ACTIVE'),
  signatureAlgorithm: z.string().default('ED25519_SHA256'),
  signatureDigest: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable().optional(),
  provenanceData: z.record(z.unknown()).default({}),
  createdAt: z.string(),
});
export type ConsentArtifact = z.infer<typeof ConsentArtifactSchema>;

// =========================================================================
// 2. UNIVERSAL CIVIC STATUS LIFECYCLE (15 CANONICAL STATES)
// =========================================================================
export const UniversalCivicStatusSchema = z.enum([
  'DRAFT',
  'ACTION_REQUIRED',
  'READY_TO_SUBMIT',
  'AWAITING_AUTHORIZATION',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFICATION',
  'APPOINTMENT_REQUIRED',
  'PAYMENT_REQUIRED',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'EXPIRED',
  'BLOCKED',
  'FAILED',
]);
export type UniversalCivicStatus = z.infer<typeof UniversalCivicStatusSchema>;

// =========================================================================
// 3. ACTION CENTER UNIFIED FEED ITEM
// =========================================================================
export const ActionCenterItemTypeSchema = z.enum([
  'PROACTIVE_FINDING',
  'ACTION_PLAN_STEP',
  'PENDING_CONSENT',
  'APPLICATION_LIFECYCLE',
  'STATUTORY_DEADLINE',
]);
export type ActionCenterItemType = z.infer<typeof ActionCenterItemTypeSchema>;

export const ActionCenterItemSchema = z.object({
  id: z.string(),
  citizenId: z.string().uuid(),
  itemType: ActionCenterItemTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string(),
  canonicalStatus: UniversalCivicStatusSchema,
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priorityScore: z.number().default(50),
  actionUrl: z.string().optional(),
  actionPayload: z.record(z.unknown()).default({}),
  requiresAuthorization: z.boolean().default(false),
  provenance: ProvenanceMetadataSchema.optional(),
  dueDate: z.string().optional(),
  createdAt: z.string(),
});
export type ActionCenterItem = z.infer<typeof ActionCenterItemSchema>;

// =========================================================================
// 4. CAPABILITY CONTRACTS: HEALTHCARE (ABDM)
// =========================================================================
export const HealthLinkAbhaRecordsInputSchema = z.object({
  citizenId: z.string().uuid(),
  abhaAddress: z.string().min(3), // e.g. priya@abdm
  hipId: z.string().optional(), // Hospital / Diagnostic provider
  purpose: z.enum(['CARE_MANAGEMENT', 'INSURANCE_CLAIM', 'FAMILY_RECORD']).default('CARE_MANAGEMENT'),
  consentExpiryDays: z.number().min(1).max(365).default(30),
});
export type HealthLinkAbhaRecordsInput = z.infer<typeof HealthLinkAbhaRecordsInputSchema>;

export const HealthLinkAbhaRecordsOutputSchema = z.object({
  success: z.boolean(),
  abhaAddress: z.string(),
  consentArtifactId: z.string().uuid(),
  linkedRecordsCount: z.number(),
  records: z.array(
    z.object({
      recordId: z.string(),
      hipName: z.string(),
      recordType: z.string(),
      recordDate: z.string(),
      diagnosticSummary: z.string(),
    })
  ),
  message: z.string(),
});
export type HealthLinkAbhaRecordsOutput = z.infer<typeof HealthLinkAbhaRecordsOutputSchema>;

// =========================================================================
// 5. CAPABILITY CONTRACTS: BANKING & FINANCIAL (ACCOUNT AGGREGATOR)
// =========================================================================
export const BankingAccountAggregatorConsentInputSchema = z.object({
  citizenId: z.string().uuid(),
  fipId: z.string(), // Financial Information Provider, e.g. FIP_HDFC_BANK
  accountMasked: z.string(),
  purposeCode: z.string().default('TAX_AUDIT_RECONCILIATION'),
  dataTypes: z.array(z.string()).default(['TRANSACTIONS', 'SUMMARY']),
  validityDays: z.number().min(1).max(90).default(14),
});
export type BankingAccountAggregatorConsentInput = z.infer<
  typeof BankingAccountAggregatorConsentInputSchema
>;

export const BankingAccountAggregatorConsentOutputSchema = z.object({
  success: z.boolean(),
  consentArtifactId: z.string().uuid(),
  fipId: z.string(),
  accountMasked: z.string(),
  statementSummary: z.object({
    closingBalanceInr: z.number(),
    aggregateCreditsInr: z.number(),
    aggregateDebitsInr: z.number(),
    verifiedTdsTransactionsCount: z.number(),
    statementPeriod: z.string(),
  }),
  message: z.string(),
});
export type BankingAccountAggregatorConsentOutput = z.infer<
  typeof BankingAccountAggregatorConsentOutputSchema
>;

// =========================================================================
// 6. CAPABILITY CONTRACTS: EDUCATION (APAAR / ABC)
// =========================================================================
export const EducationVerifyApaarIdInputSchema = z.object({
  citizenId: z.string().uuid(),
  apaarId: z.string().min(10),
  institutionCode: z.string().optional(),
});
export type EducationVerifyApaarIdInput = z.infer<typeof EducationVerifyApaarIdInputSchema>;

export const EducationVerifyApaarIdOutputSchema = z.object({
  success: z.boolean(),
  apaarId: z.string(),
  studentName: z.string(),
  academicCreditsTotal: z.number(),
  qualifications: z.array(
    z.object({
      degreeName: z.string(),
      institutionName: z.string(),
      yearOfPassing: numberOrString(),
      gradeOrCgpa: z.string(),
      verificationStatus: z.string(),
    })
  ),
  message: z.string(),
});
export type EducationVerifyApaarIdOutput = z.infer<typeof EducationVerifyApaarIdOutputSchema>;

function numberOrString() {
  return z.union([z.number(), z.string()]);
}

// =========================================================================
// 7. CAPABILITY CONTRACTS: JUDICIARY & JUSTICE (ECOURTS / NJDG)
// =========================================================================
export const JudiciaryCheckEcourtsStatusInputSchema = z.object({
  citizenId: z.string().uuid(),
  queryType: z.enum(['PROPERTY_ENCUMBRANCE', 'CNR_NUMBER', 'PARTY_NAME']),
  queryValue: z.string().min(3),
  state: z.string(),
  district: z.string().optional(),
});
export type JudiciaryCheckEcourtsStatusInput = z.infer<
  typeof JudiciaryCheckEcourtsStatusInputSchema
>;

export const JudiciaryCheckEcourtsStatusOutputSchema = z.object({
  success: z.boolean(),
  queryType: z.string(),
  queryValue: z.string(),
  encumbranceFound: z.boolean(),
  activeCivilLitigationCount: z.number(),
  caseDetails: z.array(
    z.object({
      cnrNumber: z.string(),
      courtName: z.string(),
      caseType: z.string(),
      filingDate: z.string(),
      status: z.string(),
      summary: z.string(),
    })
  ),
  clearanceCertificateIssued: z.boolean(),
  message: z.string(),
});
export type JudiciaryCheckEcourtsStatusOutput = z.infer<
  typeof JudiciaryCheckEcourtsStatusOutputSchema
>;
