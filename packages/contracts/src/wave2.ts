import { z } from 'zod';

// =========================================================================
// 1. IDENTITY DOMAIN
// =========================================================================
export const IdentityLockBiometricsInputSchema = z.object({
  citizenId: z.string().uuid(),
  action: z.enum(['LOCK', 'UNLOCK']),
  biometricTypes: z.array(z.enum(['FINGERPRINT', 'IRIS', 'FACE'])).default(['FINGERPRINT', 'IRIS']),
  unlockDurationMinutes: z.number().min(5).max(1440).optional(),
});
export type IdentityLockBiometricsInput = z.infer<typeof IdentityLockBiometricsInputSchema>;

export const IdentityLockBiometricsOutputSchema = z.object({
  success: z.boolean(),
  status: z.enum(['LOCKED', 'TEMPORARILY_UNLOCKED', 'UNLOCKED']),
  referenceId: z.string(),
  effectiveUntil: z.string().optional(),
  message: z.string(),
});
export type IdentityLockBiometricsOutput = z.infer<typeof IdentityLockBiometricsOutputSchema>;

export const IdentityInquireMaskAadhaarInputSchema = z.object({
  citizenId: z.string().uuid(),
  purpose: z.string().default('IDENTITY_VERIFICATION'),
});
export type IdentityInquireMaskAadhaarInput = z.infer<typeof IdentityInquireMaskAadhaarInputSchema>;

export const IdentityInquireMaskAadhaarOutputSchema = z.object({
  success: z.boolean(),
  maskedAadhaar: z.string(),
  vid: z.string(),
  qrDigest: z.string(),
  generatedAt: z.string(),
  message: z.string(),
});
export type IdentityInquireMaskAadhaarOutput = z.infer<typeof IdentityInquireMaskAadhaarOutputSchema>;

// =========================================================================
// 2. DOCUMENTS DOMAIN
// =========================================================================
export const DocumentsRevokeCredentialInputSchema = z.object({
  citizenId: z.string().uuid(),
  documentId: z.string().uuid(),
  reason: z.string().min(5),
});
export type DocumentsRevokeCredentialInput = z.infer<typeof DocumentsRevokeCredentialInputSchema>;

export const DocumentsRevokeCredentialOutputSchema = z.object({
  success: z.boolean(),
  documentId: z.string().uuid(),
  status: z.string(),
  revokedAt: z.string(),
  message: z.string(),
});
export type DocumentsRevokeCredentialOutput = z.infer<typeof DocumentsRevokeCredentialOutputSchema>;

export const DocumentsVerifyDocHashInputSchema = z.object({
  citizenId: z.string().uuid(),
  documentId: z.string().uuid(),
  hashAlgorithm: z.string().default('SHA-256'),
});
export type DocumentsVerifyDocHashInput = z.infer<typeof DocumentsVerifyDocHashInputSchema>;

export const DocumentsVerifyDocHashOutputSchema = z.object({
  success: z.boolean(),
  documentId: z.string().uuid(),
  provenanceMatch: z.boolean(),
  issuerAuthority: z.string(),
  merkleRoot: z.string(),
  message: z.string(),
});
export type DocumentsVerifyDocHashOutput = z.infer<typeof DocumentsVerifyDocHashOutputSchema>;

// =========================================================================
// 3. TAX DOMAIN (DIRECT & INDIRECT)
// =========================================================================
export const TaxReconcileAisTisInputSchema = z.object({
  citizenId: z.string().uuid(),
  assessmentYear: z.string().default('2024-25'),
});
export type TaxReconcileAisTisInput = z.infer<typeof TaxReconcileAisTisInputSchema>;

export const TaxReconcileAisTisOutputSchema = z.object({
  success: z.boolean(),
  assessmentYear: z.string(),
  tdsReportedInr: z.number(),
  tdsDeductedInr: z.number(),
  highValueTransactionsCount: z.number(),
  discrepancyCount: z.number(),
  reconciliationStatus: z.enum(['MATCHED', 'DISCREPANCY_DETECTED', 'UNDER_RECONCILIATION']),
  message: z.string(),
});
export type TaxReconcileAisTisOutput = z.infer<typeof TaxReconcileAisTisOutputSchema>;

export const TaxEVerifyReturnInputSchema = z.object({
  citizenId: z.string().uuid(),
  ackNumber: z.string().min(6),
  verificationMethod: z.enum(['AADHAAR_OTP', 'BANK_EVC', 'DEMAT_EVC']).default('AADHAAR_OTP'),
});
export type TaxEVerifyReturnInput = z.infer<typeof TaxEVerifyReturnInputSchema>;

export const TaxEVerifyReturnOutputSchema = z.object({
  success: z.boolean(),
  ackNumber: z.string(),
  verificationCode: z.string(),
  verificationTimestamp: z.string(),
  status: z.string(),
  message: z.string(),
});
export type TaxEVerifyReturnOutput = z.infer<typeof TaxEVerifyReturnOutputSchema>;

export const TaxInquireGstinComplianceInputSchema = z.object({
  citizenId: z.string().uuid(),
  gstin: z.string().min(15),
});
export type TaxInquireGstinComplianceInput = z.infer<typeof TaxInquireGstinComplianceInputSchema>;

export const TaxInquireGstinComplianceOutputSchema = z.object({
  success: z.boolean(),
  gstin: z.string(),
  legalName: z.string(),
  filingStatus: z.string(),
  lastGstr1FilingPeriod: z.string(),
  lastGstr3bFilingPeriod: z.string(),
  complianceRating: z.number(),
  message: z.string(),
});
export type TaxInquireGstinComplianceOutput = z.infer<typeof TaxInquireGstinComplianceOutputSchema>;

// =========================================================================
// 4. BANKING & FINANCE DOMAIN
// =========================================================================
export const BankingFetchCibilReportInputSchema = z.object({
  citizenId: z.string().uuid(),
  consentGiven: z.boolean().default(true),
});
export type BankingFetchCibilReportInput = z.infer<typeof BankingFetchCibilReportInputSchema>;

export const BankingFetchCibilReportOutputSchema = z.object({
  success: z.boolean(),
  cibilScore: z.number(),
  scoreCategory: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_ATTENTION']),
  activeCreditAccounts: z.number(),
  totalOutstandingInr: z.number(),
  overdueAmountInr: z.number(),
  inquiryCount: z.number(),
  message: z.string(),
});
export type BankingFetchCibilReportOutput = z.infer<typeof BankingFetchCibilReportOutputSchema>;

export const BankingRegisterBankMandateInputSchema = z.object({
  citizenId: z.string().uuid(),
  accountMasked: z.string(),
  mandatePurpose: z.string(),
  maxAmountInr: z.number().min(100),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'AS_PRESENTED']).default('MONTHLY'),
});
export type BankingRegisterBankMandateInput = z.infer<typeof BankingRegisterBankMandateInputSchema>;

export const BankingRegisterBankMandateOutputSchema = z.object({
  success: z.boolean(),
  mandateUmn: z.string(),
  status: z.string(),
  maxAmountInr: z.number(),
  startDate: z.string(),
  message: z.string(),
});
export type BankingRegisterBankMandateOutput = z.infer<typeof BankingRegisterBankMandateOutputSchema>;

// =========================================================================
// 5. EMPLOYMENT & EPFO DOMAIN
// =========================================================================
export const EpfoGenerateUanCardInputSchema = z.object({
  citizenId: z.string().uuid(),
  uan: z.string().min(10),
});
export type EpfoGenerateUanCardInput = z.infer<typeof EpfoGenerateUanCardInputSchema>;

export const EpfoGenerateUanCardOutputSchema = z.object({
  success: z.boolean(),
  uan: z.string(),
  holderName: z.string(),
  qrCodePayload: z.string(),
  issuanceDate: z.string(),
  message: z.string(),
});
export type EpfoGenerateUanCardOutput = z.infer<typeof EpfoGenerateUanCardOutputSchema>;

export const EpfoInquirePensionStatusInputSchema = z.object({
  citizenId: z.string().uuid(),
  uan: z.string().min(10),
});
export type EpfoInquirePensionStatusInput = z.infer<typeof EpfoInquirePensionStatusInputSchema>;

export const EpfoInquirePensionStatusOutputSchema = z.object({
  success: z.boolean(),
  uan: z.string(),
  pensionableServiceYears: z.number(),
  eligibleForEps95: z.boolean(),
  estimatedMonthlyPensionInr: z.number(),
  pensionStatus: z.string(),
  message: z.string(),
});
export type EpfoInquirePensionStatusOutput = z.infer<typeof EpfoInquirePensionStatusOutputSchema>;

// =========================================================================
// 6. TRANSPORT DOMAIN
// =========================================================================
export const TransportInquireEchallanInputSchema = z.object({
  citizenId: z.string().uuid(),
  vehicleRegNo: z.string().min(5),
});
export type TransportInquireEchallanInput = z.infer<typeof TransportInquireEchallanInputSchema>;

export const TransportInquireEchallanOutputSchema = z.object({
  success: z.boolean(),
  vehicleRegNo: z.string(),
  totalPendingChallans: z.number(),
  totalFineAmountInr: z.number(),
  challans: z.array(
    z.object({
      challanNo: z.string(),
      violationDate: z.string(),
      offense: z.string(),
      amountInr: z.number(),
      status: z.string(),
      location: z.string(),
    })
  ),
  message: z.string(),
});
export type TransportInquireEchallanOutput = z.infer<typeof TransportInquireEchallanOutputSchema>;

export const TransportRenewDrivingLicenseInputSchema = z.object({
  citizenId: z.string().uuid(),
  dlNumber: z.string().min(8),
  medicalFitnessSelfDeclared: z.boolean().default(true),
  currentAddressUpdate: z.boolean().optional(),
});
export type TransportRenewDrivingLicenseInput = z.infer<typeof TransportRenewDrivingLicenseInputSchema>;

export const TransportRenewDrivingLicenseOutputSchema = z.object({
  success: z.boolean(),
  dlNumber: z.string(),
  renewedValidUntil: z.string(),
  rtoOffice: z.string(),
  applicationNumber: z.string(),
  message: z.string(),
});
export type TransportRenewDrivingLicenseOutput = z.infer<typeof TransportRenewDrivingLicenseOutputSchema>;

// =========================================================================
// 7. TRAVEL & PASSPORT DOMAIN
// =========================================================================
export const PassportApplyPoliceClearanceInputSchema = z.object({
  citizenId: z.string().uuid(),
  passportNumber: z.string().min(8),
  countryOfTravel: z.string(),
  visaCategory: z.string().default('EMPLOYMENT'),
});
export type PassportApplyPoliceClearanceInput = z.infer<typeof PassportApplyPoliceClearanceInputSchema>;

export const PassportApplyPoliceClearanceOutputSchema = z.object({
  success: z.boolean(),
  pccApplicationNo: z.string(),
  policeStation: z.string(),
  appointmentDate: z.string(),
  status: z.string(),
  message: z.string(),
});
export type PassportApplyPoliceClearanceOutput = z.infer<typeof PassportApplyPoliceClearanceOutputSchema>;

export const PassportBookSevaKendraSlotInputSchema = z.object({
  citizenId: z.string().uuid(),
  applicationArn: z.string().min(10),
  pskLocation: z.string(),
  preferredDate: z.string(),
});
export type PassportBookSevaKendraSlotInput = z.infer<typeof PassportBookSevaKendraSlotInputSchema>;

export const PassportBookSevaKendraSlotOutputSchema = z.object({
  success: z.boolean(),
  appointmentSlot: z.string(),
  pskCenter: z.string(),
  reportingTime: z.string(),
  bookingReference: z.string(),
  message: z.string(),
});
export type PassportBookSevaKendraSlotOutput = z.infer<typeof PassportBookSevaKendraSlotOutputSchema>;

// =========================================================================
// 8. HEALTH DOMAIN
// =========================================================================
export const HealthFetchAyushmanCardInputSchema = z.object({
  citizenId: z.string().uuid(),
  abhaNumber: z.string().optional(),
});
export type HealthFetchAyushmanCardInput = z.infer<typeof HealthFetchAyushmanCardInputSchema>;

export const HealthFetchAyushmanCardOutputSchema = z.object({
  success: z.boolean(),
  pmjayId: z.string(),
  beneficiaryName: z.string(),
  annualFamilyCoverageInr: z.number(),
  eligibilityStatus: z.string(),
  message: z.string(),
});
export type HealthFetchAyushmanCardOutput = z.infer<typeof HealthFetchAyushmanCardOutputSchema>;

export const HealthFetchVaccinationCertificateInputSchema = z.object({
  citizenId: z.string().uuid(),
  beneficiaryReferenceId: z.string(),
});
export type HealthFetchVaccinationCertificateInput = z.infer<typeof HealthFetchVaccinationCertificateInputSchema>;

export const HealthFetchVaccinationCertificateOutputSchema = z.object({
  success: z.boolean(),
  beneficiaryName: z.string(),
  vaccineName: z.string(),
  dosesCompleted: z.number(),
  finalCertificateIssued: z.boolean(),
  certificateId: z.string(),
  message: z.string(),
});
export type HealthFetchVaccinationCertificateOutput = z.infer<typeof HealthFetchVaccinationCertificateOutputSchema>;

// =========================================================================
// 9. EDUCATION DOMAIN
// =========================================================================
export const EducationFetchAcademicTranscriptInputSchema = z.object({
  citizenId: z.string().uuid(),
  apaarId: z.string().min(10),
  degreeName: z.string().min(3),
});
export type EducationFetchAcademicTranscriptInput = z.infer<typeof EducationFetchAcademicTranscriptInputSchema>;

export const EducationFetchAcademicTranscriptOutputSchema = z.object({
  success: z.boolean(),
  transcriptId: z.string(),
  degreeName: z.string(),
  institutionName: z.string(),
  creditsEarned: z.number(),
  cgpa: z.string(),
  signedDigest: z.string(),
  message: z.string(),
});
export type EducationFetchAcademicTranscriptOutput = z.infer<typeof EducationFetchAcademicTranscriptOutputSchema>;

export const EducationApplyNationalScholarshipInputSchema = z.object({
  citizenId: z.string().uuid(),
  scholarshipCode: z.string(),
  institutionCode: z.string(),
  annualFamilyIncomeInr: z.number(),
  bankAccountMasked: z.string(),
});
export type EducationApplyNationalScholarshipInput = z.infer<typeof EducationApplyNationalScholarshipInputSchema>;

export const EducationApplyNationalScholarshipOutputSchema = z.object({
  success: z.boolean(),
  applicationId: z.string(),
  schemeName: z.string(),
  sanctionedAmountInr: z.number(),
  status: z.string(),
  message: z.string(),
});
export type EducationApplyNationalScholarshipOutput = z.infer<typeof EducationApplyNationalScholarshipOutputSchema>;

// =========================================================================
// 10. SOCIAL WELFARE & SUBSIDIES DOMAIN
// =========================================================================
export const WelfareInquireRationEntitlementInputSchema = z.object({
  citizenId: z.string().uuid(),
  rationCardNo: z.string().optional(),
});
export type WelfareInquireRationEntitlementInput = z.infer<typeof WelfareInquireRationEntitlementInputSchema>;

export const WelfareInquireRationEntitlementOutputSchema = z.object({
  success: z.boolean(),
  rationCardNo: z.string(),
  schemeType: z.string(),
  membersCount: z.number(),
  monthlyWheatKg: z.number(),
  monthlyRiceKg: z.number(),
  allocatedFpsName: z.string(),
  message: z.string(),
});
export type WelfareInquireRationEntitlementOutput = z.infer<typeof WelfareInquireRationEntitlementOutputSchema>;

export const WelfareVerifyDbtAadhaarSeedInputSchema = z.object({
  citizenId: z.string().uuid(),
  bankName: z.string(),
  accountMasked: z.string(),
});
export type WelfareVerifyDbtAadhaarSeedInput = z.infer<typeof WelfareVerifyDbtAadhaarSeedInputSchema>;

export const WelfareVerifyDbtAadhaarSeedOutputSchema = z.object({
  success: z.boolean(),
  aadhaarSeeded: z.boolean(),
  npciMapperActive: z.boolean(),
  seedingDate: z.string(),
  eligibleForDbt: z.boolean(),
  message: z.string(),
});
export type WelfareVerifyDbtAadhaarSeedOutput = z.infer<typeof WelfareVerifyDbtAadhaarSeedOutputSchema>;

// =========================================================================
// 11. AGRICULTURE DOMAIN
// =========================================================================
export const AgricultureApplyCropInsuranceInputSchema = z.object({
  citizenId: z.string().uuid(),
  surveyNumber: z.string().min(3),
  season: z.enum(['KHARIF', 'RABI']),
  cropName: z.string(),
  areaHectares: z.number().min(0.1),
});
export type AgricultureApplyCropInsuranceInput = z.infer<typeof AgricultureApplyCropInsuranceInputSchema>;

export const AgricultureApplyCropInsuranceOutputSchema = z.object({
  success: z.boolean(),
  policyNumber: z.string(),
  sumInsuredInr: z.number(),
  farmerPremiumInr: z.number(),
  governmentSubsidyInr: z.number(),
  status: z.string(),
  message: z.string(),
});
export type AgricultureApplyCropInsuranceOutput = z.infer<typeof AgricultureApplyCropInsuranceOutputSchema>;

export const AgricultureVerifyKisanCreditCardInputSchema = z.object({
  citizenId: z.string().uuid(),
  kccNumber: z.string().optional(),
});
export type AgricultureVerifyKisanCreditCardInput = z.infer<typeof AgricultureVerifyKisanCreditCardInputSchema>;

export const AgricultureVerifyKisanCreditCardOutputSchema = z.object({
  success: z.boolean(),
  kccNumber: z.string(),
  sanctionedCreditLimitInr: z.number(),
  utilizedAmountInr: z.number(),
  subsidizedInterestRatePercent: z.number(),
  expiryDate: z.string(),
  message: z.string(),
});
export type AgricultureVerifyKisanCreditCardOutput = z.infer<typeof AgricultureVerifyKisanCreditCardOutputSchema>;

// =========================================================================
// 12. CORPORATE & MSME DOMAIN
// =========================================================================
export const BusinessFileAnnualRocReturnInputSchema = z.object({
  citizenId: z.string().uuid(),
  cin: z.string().min(10),
  financialYear: z.string().default('2023-24'),
  formType: z.enum(['AOC-4', 'MGT-7']).default('AOC-4'),
});
export type BusinessFileAnnualRocReturnInput = z.infer<typeof BusinessFileAnnualRocReturnInputSchema>;

export const BusinessFileAnnualRocReturnOutputSchema = z.object({
  success: z.boolean(),
  cin: z.string(),
  formType: z.string(),
  srnNumber: z.string(),
  filingTimestamp: z.string(),
  status: z.string(),
  message: z.string(),
});
export type BusinessFileAnnualRocReturnOutput = z.infer<typeof BusinessFileAnnualRocReturnOutputSchema>;

// =========================================================================
// 13. PROPERTY & LAND DOMAIN
// =========================================================================
export const PropertyInquireCadastralSurveyInputSchema = z.object({
  citizenId: z.string().uuid(),
  surveyNumber: z.string().min(3),
  village: z.string(),
});
export type PropertyInquireCadastralSurveyInput = z.infer<typeof PropertyInquireCadastralSurveyInputSchema>;

export const PropertyInquireCadastralSurveyOutputSchema = z.object({
  success: z.boolean(),
  surveyNumber: z.string(),
  cadastralMapId: z.string(),
  boundaryCoordinates: z.string(),
  geoFencedAreaSqFt: z.number(),
  disputeFlag: z.boolean(),
  message: z.string(),
});
export type PropertyInquireCadastralSurveyOutput = z.infer<typeof PropertyInquireCadastralSurveyOutputSchema>;

// =========================================================================
// 14. CIVIC & MUNICIPAL DOMAIN
// =========================================================================
export const CivicApplyWaterSewerageConnectionInputSchema = z.object({
  citizenId: z.string().uuid(),
  propertyIdentifier: z.string().min(3),
  connectionType: z.enum(['DOMESTIC', 'NON_DOMESTIC']).default('DOMESTIC'),
  pipeDiameterMm: z.number().default(15),
});
export type CivicApplyWaterSewerageConnectionInput = z.infer<typeof CivicApplyWaterSewerageConnectionInputSchema>;

export const CivicApplyWaterSewerageConnectionOutputSchema = z.object({
  success: z.boolean(),
  consumerRrNumber: z.string(),
  inspectionScheduledDate: z.string(),
  status: z.string(),
  message: z.string(),
});
export type CivicApplyWaterSewerageConnectionOutput = z.infer<typeof CivicApplyWaterSewerageConnectionOutputSchema>;

export const CivicRegisterTradeLicenseInputSchema = z.object({
  citizenId: z.string().uuid(),
  tradeName: z.string().min(3),
  commercialAddress: z.string(),
  category: z.string().default('RETAIL_COMMERCE'),
  premisesSqFt: z.number().min(10),
});
export type CivicRegisterTradeLicenseInput = z.infer<typeof CivicRegisterTradeLicenseInputSchema>;

export const CivicRegisterTradeLicenseOutputSchema = z.object({
  success: z.boolean(),
  licenseNumber: z.string(),
  tradeName: z.string(),
  validUntil: z.string(),
  status: z.string(),
  message: z.string(),
});
export type CivicRegisterTradeLicenseOutput = z.infer<typeof CivicRegisterTradeLicenseOutputSchema>;

// =========================================================================
// 15. JUSTICE & LEGAL DOMAIN
// =========================================================================
export const JusticeApplyLegalAidInputSchema = z.object({
  citizenId: z.string().uuid(),
  matterSummary: z.string().min(10),
  category: z.enum(['WOMEN_CHILDREN', 'SC_ST', 'LOW_INCOME', 'CUSTODIAL']).default('LOW_INCOME'),
});
export type JusticeApplyLegalAidInput = z.infer<typeof JusticeApplyLegalAidInputSchema>;

export const JusticeApplyLegalAidOutputSchema = z.object({
  success: z.boolean(),
  caseAidNumber: z.string(),
  assignedAdvocateName: z.string(),
  legalServicesAuthority: z.string(),
  status: z.string(),
  message: z.string(),
});
export type JusticeApplyLegalAidOutput = z.infer<typeof JusticeApplyLegalAidOutputSchema>;

export const JusticeSearchPoliceFirInputSchema = z.object({
  citizenId: z.string().uuid(),
  policeStation: z.string(),
  firNumber: z.string().optional(),
  queryYear: z.string().optional(),
});
export type JusticeSearchPoliceFirInput = z.infer<typeof JusticeSearchPoliceFirInputSchema>;

export const JusticeSearchPoliceFirOutputSchema = z.object({
  success: z.boolean(),
  firNumber: z.string(),
  policeStation: z.string(),
  incidentSection: z.string(),
  investigationStatus: z.string(),
  message: z.string(),
});
export type JusticeSearchPoliceFirOutput = z.infer<typeof JusticeSearchPoliceFirOutputSchema>;

// =========================================================================
// 16. FAMILY & KINSHIP DOMAIN
// =========================================================================
export const FamilyRegisterCivilMarriageInputSchema = z.object({
  citizenId: z.string().uuid(),
  spouseCitizenId: z.string().uuid().optional(),
  spouseFullName: z.string().min(3),
  intendedMarriageDate: z.string(),
  witnessCount: z.number().min(3).default(3),
});
export type FamilyRegisterCivilMarriageInput = z.infer<typeof FamilyRegisterCivilMarriageInputSchema>;

export const FamilyRegisterCivilMarriageOutputSchema = z.object({
  success: z.boolean(),
  noticeReferenceNo: z.string(),
  subRegistrarOffice: z.string(),
  noticeExpiryDate: z.string(),
  status: z.string(),
  message: z.string(),
});
export type FamilyRegisterCivilMarriageOutput = z.infer<typeof FamilyRegisterCivilMarriageOutputSchema>;

export const FamilyInquireFamilyTreeInputSchema = z.object({
  citizenId: z.string().uuid(),
});
export type FamilyInquireFamilyTreeInput = z.infer<typeof FamilyInquireFamilyTreeInputSchema>;

export const FamilyInquireFamilyTreeOutputSchema = z.object({
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
});
export type FamilyInquireFamilyTreeOutput = z.infer<typeof FamilyInquireFamilyTreeOutputSchema>;

// =========================================================================
// 17. TELECOM DOMAIN
// =========================================================================
export const TelecomInquireRegisteredSimsInputSchema = z.object({
  citizenId: z.string().uuid(),
});
export type TelecomInquireRegisteredSimsInput = z.infer<typeof TelecomInquireRegisteredSimsInputSchema>;

export const TelecomInquireRegisteredSimsOutputSchema = z.object({
  success: z.boolean(),
  totalActiveConnections: z.number(),
  connections: z.array(
    z.object({
      mobileMasked: z.string(),
      operator: z.string(),
      activationDate: z.string(),
      isFlaggedUnauthorized: z.boolean(),
    })
  ),
  message: z.string(),
});
export type TelecomInquireRegisteredSimsOutput = z.infer<typeof TelecomInquireRegisteredSimsOutputSchema>;

// =========================================================================
// 18. CYBERSECURITY DOMAIN
// =========================================================================
export const SecurityReportCyberFraudInputSchema = z.object({
  citizenId: z.string().uuid(),
  incidentDate: z.string(),
  fraudAmountInr: z.number().min(1),
  suspectAccountOrPhone: z.string(),
  transactionRefNumber: z.string().min(5),
});
export type SecurityReportCyberFraudInput = z.infer<typeof SecurityReportCyberFraudInputSchema>;

export const SecurityReportCyberFraudOutputSchema = z.object({
  success: z.boolean(),
  complaintAckNo: z.string(),
  assignedCyberCell: z.string(),
  freezeRequestSentToBanks: z.boolean(),
  portal1930Status: z.string(),
  message: z.string(),
});
export type SecurityReportCyberFraudOutput = z.infer<typeof SecurityReportCyberFraudOutputSchema>;

// =========================================================================
// 19. EMERGENCY & DISASTER SERVICES DOMAIN
// =========================================================================
export const EmergencyRequestDisasterReliefInputSchema = z.object({
  citizenId: z.string().uuid(),
  disasterType: z.enum(['FLOOD', 'CYCLONE', 'DROUGHT', 'EARTHQUAKE']),
  lossDescription: z.string().min(10),
  bankAccountMasked: z.string(),
});
export type EmergencyRequestDisasterReliefInput = z.infer<typeof EmergencyRequestDisasterReliefInputSchema>;

export const EmergencyRequestDisasterReliefOutputSchema = z.object({
  success: z.boolean(),
  reliefClaimNo: z.string(),
  assessedAssistanceInr: z.number(),
  status: z.string(),
  disbursementSchedule: z.string(),
  message: z.string(),
});
export type EmergencyRequestDisasterReliefOutput = z.infer<typeof EmergencyRequestDisasterReliefOutputSchema>;

// =========================================================================
// 20. ACCESSIBILITY & INCLUSION DOMAIN
// =========================================================================
export const AccessibilityApplyUdidCardInputSchema = z.object({
  citizenId: z.string().uuid(),
  disabilityType: z.string().min(3),
  disabilityPercentage: z.number().min(1).max(100),
  medicalHospitalName: z.string().min(3),
});
export type AccessibilityApplyUdidCardInput = z.infer<typeof AccessibilityApplyUdidCardInputSchema>;

export const AccessibilityApplyUdidCardOutputSchema = z.object({
  success: z.boolean(),
  udidEnrollmentNo: z.string(),
  medicalBoardSlot: z.string(),
  status: z.string(),
  message: z.string(),
});
export type AccessibilityApplyUdidCardOutput = z.infer<typeof AccessibilityApplyUdidCardOutputSchema>;
