import { CapabilityRegistry } from '../registry.js';
import {
  EpfoInquireAccountsCapability,
  EpfoTransferClaimCapability,
  EpfoDownloadPassbookCapability,
  EpfoUpdateKycPanCapability,
  EpfoGenerateUanCardCapability,
  EpfoInquirePensionStatusCapability,
} from './epfo.js';
import {
  IdentityVerifyCredentialCapability,
  IdentityUpdatePanNameCapability,
  IdentityUpdateAadhaarAddressCapability,
  IdentityTransferVoterConstituencyCapability,
  IdentityLockBiometricsCapability,
  IdentityInquireMaskAadhaarCapability,
  IdentityHarmonizeRecordsCapability,
} from './identity.js';
import {
  BusinessReserveNameCapability,
  BusinessIncorporateCapability,
  BusinessRegisterGstinCapability,
  BusinessRegisterUdyamCapability,
  BusinessFileAnnualRocReturnCapability,
} from './business.js';
import {
  TransportInquireVehicleRcCapability,
  TransportTransferVehicleRcCapability,
  TransportEndorseDlAddressCapability,
  TransportInquireEchallanCapability,
  TransportRenewDrivingLicenseCapability,
} from './transport.js';
import {
  DocumentsFetchDigiLockerCapability,
  DocumentsIssueCredentialCapability,
  DocumentsRevokeCredentialCapability,
  DocumentsVerifyDocHashCapability,
} from './documents.js';
import {
  TaxCheckItrStatusCapability,
  TaxFetchForm26AsCapability,
  TaxReconcileAisTisCapability,
  TaxEVerifyReturnCapability,
  TaxInquireGstinComplianceCapability,
} from './tax.js';
import {
  PassportCheckStatusCapability,
  PassportApplyPoliceClearanceCapability,
  PassportBookSevaKendraSlotCapability,
} from './passport.js';
import {
  TelecomBlockStolenDeviceCapability,
  TelecomInquireRegisteredSimsCapability,
} from './telecom.js';
import { PaymentsProcessFeeCapability } from './payments.js';
import {
  WelfareEvaluateSchemesCapability,
  WelfareSubmitApplicationCapability,
  WelfareInquireRationEntitlementCapability,
  WelfareVerifyDbtAadhaarSeedCapability,
} from './welfare.js';
import {
  HealthLinkAbhaRecordsCapability,
  HealthFetchAyushmanCardCapability,
  HealthFetchVaccinationCertificateCapability,
} from './health.js';
import {
  BankingAccountAggregatorConsentCapability,
  BankingFetchCibilReportCapability,
  BankingRegisterBankMandateCapability,
} from './banking.js';
import {
  EducationVerifyApaarIdCapability,
  EducationFetchAcademicTranscriptCapability,
  EducationApplyNationalScholarshipCapability,
} from './education.js';
import { JudiciaryCheckEcourtsStatusCapability } from './judiciary.js';
import {
  PropertyVerifyEncumbranceCapability,
  PropertyFetchTitleDeedCapability,
  PropertyApplyMutationCapability,
  PropertyInquireCadastralSurveyCapability,
} from './property.js';
import {
  CivicPayPropertyTaxCapability,
  CivicUpdateUtilityConsumerCapability,
  CivicVerifyVitalRecordCapability,
  CivicApplyWaterSewerageConnectionCapability,
  CivicRegisterTradeLicenseCapability,
} from './civic.js';
import {
  AgricultureVerifyPmkisanStatusCapability,
  AgricultureFetchSoilHealthCardCapability,
  AgricultureApplyCropInsuranceCapability,
  AgricultureVerifyKisanCreditCardCapability,
} from './agriculture.js';
import {
  JusticeFileCpgramsGrievanceCapability,
  JusticeCheckRtiStatusCapability,
  JusticeApplyLegalAidCapability,
  JusticeSearchPoliceFirCapability,
} from './justice.js';
import {
  FamilyEndorseKinshipNominationCapability,
  FamilyRegisterCivilMarriageCapability,
  FamilyInquireFamilyTreeCapability,
} from './family.js';
import {
  SecurityFreezeCompromisedAccountCapability,
  SecurityReportCyberFraudCapability,
} from './security.js';
import { EmergencyRequestDisasterReliefCapability } from './emergency.js';
import { AccessibilityApplyUdidCardCapability } from './accessibility.js';

export * from './epfo.js';
export * from './identity.js';
export * from './business.js';
export * from './transport.js';
export * from './documents.js';
export * from './tax.js';
export * from './passport.js';
export * from './telecom.js';
export * from './payments.js';
export * from './welfare.js';
export * from './health.js';
export * from './banking.js';
export * from './education.js';
export * from './judiciary.js';
export * from './property.js';
export * from './civic.js';
export * from './agriculture.js';
export * from './justice.js';
export * from './family.js';
export * from './security.js';
export * from './emergency.js';
export * from './accessibility.js';

export function registerDefaultCapabilities(): void {
  const registry = CapabilityRegistry.getInstance();

  // 1. EPFO
  registry.register(EpfoInquireAccountsCapability);
  registry.register(EpfoTransferClaimCapability);
  registry.register(EpfoDownloadPassbookCapability);
  registry.register(EpfoUpdateKycPanCapability);
  registry.register(EpfoGenerateUanCardCapability);
  registry.register(EpfoInquirePensionStatusCapability);

  // 2. Identity
  registry.register(IdentityVerifyCredentialCapability);
  registry.register(IdentityUpdatePanNameCapability);
  registry.register(IdentityUpdateAadhaarAddressCapability);
  registry.register(IdentityTransferVoterConstituencyCapability);
  registry.register(IdentityLockBiometricsCapability);
  registry.register(IdentityInquireMaskAadhaarCapability);
  registry.register(IdentityHarmonizeRecordsCapability);

  // 3. Transport
  registry.register(TransportInquireVehicleRcCapability);
  registry.register(TransportTransferVehicleRcCapability);
  registry.register(TransportEndorseDlAddressCapability);
  registry.register(TransportInquireEchallanCapability);
  registry.register(TransportRenewDrivingLicenseCapability);

  // 4. Documents & DigiLocker
  registry.register(DocumentsFetchDigiLockerCapability);
  registry.register(DocumentsIssueCredentialCapability);
  registry.register(DocumentsRevokeCredentialCapability);
  registry.register(DocumentsVerifyDocHashCapability);

  // 5. Tax & TRACES
  registry.register(TaxCheckItrStatusCapability);
  registry.register(TaxFetchForm26AsCapability);
  registry.register(TaxReconcileAisTisCapability);
  registry.register(TaxEVerifyReturnCapability);
  registry.register(TaxInquireGstinComplianceCapability);

  // 6. Passport Seva & Consular
  registry.register(PassportCheckStatusCapability);
  registry.register(PassportApplyPoliceClearanceCapability);
  registry.register(PassportBookSevaKendraSlotCapability);

  // 7. Business & MSME
  registry.register(BusinessReserveNameCapability);
  registry.register(BusinessIncorporateCapability);
  registry.register(BusinessRegisterGstinCapability);
  registry.register(BusinessRegisterUdyamCapability);
  registry.register(BusinessFileAnnualRocReturnCapability);

  // 8. Telecom
  registry.register(TelecomBlockStolenDeviceCapability);
  registry.register(TelecomInquireRegisteredSimsCapability);

  // 9. Payments
  registry.register(PaymentsProcessFeeCapability);

  // 10. Welfare & DBT
  registry.register(WelfareEvaluateSchemesCapability);
  registry.register(WelfareSubmitApplicationCapability);
  registry.register(WelfareInquireRationEntitlementCapability);
  registry.register(WelfareVerifyDbtAadhaarSeedCapability);

  // 11. Healthcare & ABDM
  registry.register(HealthLinkAbhaRecordsCapability);
  registry.register(HealthFetchAyushmanCardCapability);
  registry.register(HealthFetchVaccinationCertificateCapability);

  // 12. Banking & Account Aggregator
  registry.register(BankingAccountAggregatorConsentCapability);
  registry.register(BankingFetchCibilReportCapability);
  registry.register(BankingRegisterBankMandateCapability);

  // 13. Education & APAAR/ABC
  registry.register(EducationVerifyApaarIdCapability);
  registry.register(EducationFetchAcademicTranscriptCapability);
  registry.register(EducationApplyNationalScholarshipCapability);

  // 14. Judiciary & eCourts NJDG
  registry.register(JudiciaryCheckEcourtsStatusCapability);

  // 15. Land & Real Property
  registry.register(PropertyVerifyEncumbranceCapability);
  registry.register(PropertyFetchTitleDeedCapability);
  registry.register(PropertyApplyMutationCapability);
  registry.register(PropertyInquireCadastralSurveyCapability);

  // 16. Civic & Municipal Administration
  registry.register(CivicPayPropertyTaxCapability);
  registry.register(CivicUpdateUtilityConsumerCapability);
  registry.register(CivicVerifyVitalRecordCapability);
  registry.register(CivicApplyWaterSewerageConnectionCapability);
  registry.register(CivicRegisterTradeLicenseCapability);

  // 17. Agriculture & Rural Entitlements
  registry.register(AgricultureVerifyPmkisanStatusCapability);
  registry.register(AgricultureFetchSoilHealthCardCapability);
  registry.register(AgricultureApplyCropInsuranceCapability);
  registry.register(AgricultureVerifyKisanCreditCardCapability);

  // 18. Justice, Grievances & RTI
  registry.register(JusticeFileCpgramsGrievanceCapability);
  registry.register(JusticeCheckRtiStatusCapability);
  registry.register(JusticeApplyLegalAidCapability);
  registry.register(JusticeSearchPoliceFirCapability);

  // 19. Family & Kinship Nominee Endorsement
  registry.register(FamilyEndorseKinshipNominationCapability);
  registry.register(FamilyRegisterCivilMarriageCapability);
  registry.register(FamilyInquireFamilyTreeCapability);

  // 20. Emergency Cybersecurity Incident Freeze
  registry.register(SecurityFreezeCompromisedAccountCapability);
  registry.register(SecurityReportCyberFraudCapability);

  // 21. Emergency & Disaster Services
  registry.register(EmergencyRequestDisasterReliefCapability);

  // 22. Accessibility & Inclusion
  registry.register(AccessibilityApplyUdidCardCapability);
}

