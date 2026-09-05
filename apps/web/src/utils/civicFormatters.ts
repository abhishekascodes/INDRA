/**
 * INDRA Civic Formatters
 * Formats internal identifiers, states, rule codes, and system keys
 * into clean, natural, citizen-first language.
 *
 * Principles:
 * - NO raw underscores ('_') displayed anywhere in the UI.
 * - NO raw developer identifiers or variable names shown to citizens.
 * - Proper capitalization (Title Case) with statutory acronym preservation (EPFO, PAN, Aadhaar, etc.).
 */

const ACRONYMS = new Set([
  'EPFO',
  'UAN',
  'PAN',
  'TAN',
  'ITR',
  'TDS',
  'UIDAI',
  'MORTH',
  'RTO',
  'DL',
  'RC',
  'MCA',
  'GSTIN',
  'GST',
  'MSME',
  'UDYAM',
  'NPCI',
  'NACH',
  'PMKISAN',
  'PMJAY',
  'ABDM',
  'ABHA',
  'UDID',
  'CPGRAMS',
  'RTI',
  'NALSA',
  'CCTNS',
  'FIR',
  'CERT',
  'RBI',
  'UDGAM',
  'TRACES',
  'NSP',
  'NAD',
  'APAAR',
  'PMFBY',
  'ECI',
  'NVSP',
  'KYC',
  'AY',
  'FY',
  'ID',
  'NOC',
]);

const KNOWN_KEY_LABELS: Record<string, string> = {
  // Step Keys & Capabilities
  inquire_epfo_accounts: 'Inquire UAN Member Accounts',
  update_epfo_pan: 'Link PAN to EPFO Profile',
  consolidate_dormant_pf: 'Consolidate Inactive PF Balances',
  fetch_form26as_tds: 'Reconcile TRACES Form 26AS',
  verify_aadhaar: 'Verify Aadhaar Identity',
  update_address: 'Update Residential Address',
  update_aadhaar_address: 'Update Aadhaar Address',
  lock_biometrics: 'Lock Aadhaar Biometrics',
  verify_pan: 'Verify PAN Record',
  link_pan_aadhaar: 'Link PAN with Aadhaar',
  endorse_dl_address: 'Update Driving Licence Address',
  inquire_dl_status: 'Check Driving Licence Status',
  fetch_vahan_details: 'Fetch Vehicle Registration Details',
  fetch_traffic_challans: 'Check Traffic Challans',
  settle_traffic_challan: 'Settle Traffic Fine',
  update_voter_constituency: 'Update Voter Constituency',
  request_water_utility_transfer: 'Transfer Water Utility Connection',
  report_pothole_sanitation: 'Submit Municipal Civic Report',
  inquire_ration_card: 'Inquire Ration Card Status',
  update_ration_card_address: 'Update Ration Card Address',
  fetch_land_record: 'Fetch State Land Record',
  request_encumbrance_certificate: 'Request Encumbrance Certificate',
  register_tenancy_agreement: 'Register Tenancy Agreement',
  claim_dormant_deposit: 'Claim Dormant Bank Deposit',
  register_auto_debit_mandate: 'Register Auto-Debit Mandate',
  fetch_account_aggregates: 'Inspect Account Aggregates',
  create_abha_id: 'Create Digital Health ABHA ID',
  link_abha_records: 'Link ABDM Health Records',
  inquire_ayushman_bharat: 'Inquire PMJAY Health Insurance',
  pull_digilocker_document: 'Import DigiLocker Document',
  push_digilocker_certificate: 'Issue Verified Certificate',
  fetch_apaar_id: 'Verify Academic APAAR ID',
  pull_degree_from_nad: 'Fetch Degree from Academic Depository',
  apply_national_scholarship: 'Submit National Scholarship Application',
  fetch_soil_health_card: 'Fetch Soil Health Card',
  apply_crop_insurance: 'Apply for PM Crop Insurance',
  verify_kisan_credit_card: 'Verify Kisan Credit Card',
  file_cpgrams_grievance: 'Lodge CPGRAMS Central Grievance',
  check_rti_status: 'Track RTI Application Status',
  apply_legal_aid: 'Apply for NALSA Legal Aid',
  search_police_fir: 'Search State Police FIR Ledger',
  endorse_kinship_nomination: 'Register Kinship Nomination',
  register_civil_marriage: 'Register Civil Marriage Notice',
  inquire_family_tree: 'Inspect Family Registry Records',
  freeze_compromised_account: 'Emergency Freeze on Compromised Accounts',
  report_cyber_fraud: 'Report Incident to Cyber Crime Portal',
  request_disaster_relief: 'Request State Disaster Relief Assistance',
  apply_udid_card: 'Apply for Unique Disability UDID Card',
  inquire_uan_status: 'Check Universal Account Number Status',
  transfer_pf_balance: 'Transfer Provident Fund Balance',
  claim_dormant_pf: 'Claim Dormant Provident Fund Balance',
  update_epfo_kyc: 'Update EPFO Member KYC',
  inquire_mobile_connections: 'Inspect Active Mobile Numbers',
  report_fraudulent_connection: 'Report Fraudulent Mobile SIM',
  evaluate_pmkisan_eligibility: 'Evaluate PM-KISAN Scheme Eligibility',
  enroll_pmkisan: 'Enroll in PM-KISAN Direct Support',
  link_npci_subsidy: 'Link Bank Account to Aadhaar Subsidy Bridge',
  reserve_company_name: 'Reserve Corporate Name (RUN)',
  generate_spice_plus: 'File SPICe+ Company Incorporation',
  apply_pan_tan: 'Apply for Company PAN & TAN',
  register_gstin: 'Register for Goods & Services Tax (GSTIN)',
  register_msme_udyam: 'Register MSME Udyam Certificate',
  open_current_account: 'Open Scheduled Bank Current Account',
  verify_form_26as: 'Inspect Annual Tax Credit (Form 26AS)',
  file_nil_itr: 'File Zero / Nil Income Tax Return',
  claim_tds_refund: 'Claim Withheld TDS Tax Refund',
  inquire_passport_status: 'Track Passport Seva Status',
  apply_passport_reissue: 'Apply for Passport Renewal / Re-issue',
  apply_police_clearance: 'Apply for Police Clearance Certificate (PCC)',

  // Plan Codes
  RELOCATION: 'Inter-State Relocation & Civic Transfer',
  NEW_EMPLOYMENT: 'Employment Transition & Benefits Onboarding',
  START_BUSINESS: 'New Business & Enterprise Formation',
  BUY_PROPERTY: 'Property Acquisition & Title Verification',
  CHILD_BIRTH: 'Birth Registration & Family Benefits Onboarding',
  CYBER_INCIDENT: 'Cyber Crime Defense & Financial Emergency',
  JOB_LOSS: 'Career Transition & Severance Safeguards',
  FARMER_SEASONAL: 'Agricultural Seasonal Cycle & PM-KISAN Assistance',

  // Common Rule Codes
  RULE_OBLIGATION_DEADLINE: 'Compliance Deadline Alert',
  RULE_TRAFFIC_CHALLAN: 'Unpaid Traffic Challan Notice',
  RULE_CREDENTIAL_LIFECYCLE: 'Document Expiration Alert',
  RULE_ELIGIBILITY_OPPORTUNITY: 'Welfare Scheme Eligibility',
  RULE_CROP_INSURANCE_WINDOW: 'Crop Insurance Cutoff Notice',
  RULE_ANOMALY_CONTRADICTION: 'Registry Data Discrepancy',
  RULE_DORMANT_ASSET: 'Unclaimed Financial Asset Notice',
  RULE_LIFE_EVENT_TRIGGER: 'Life Event Next Steps',

  // Providers
  'in.gov.uidai': 'UIDAI (Aadhaar)',
  'in.gov.epfindia': 'EPFO (Provident Fund)',
  'in.gov.incometax': 'Income Tax Department',
  'in.gov.morth': 'Ministry of Road Transport',
  'in.gov.passport': 'Passport Seva (MEA)',
  'in.gov.mca': 'Ministry of Corporate Affairs',
  'in.gov.gst': 'GST Network (GSTN)',
  'in.gov.cybercrime': 'National Cyber Crime Portal',
  'in.gov.darpg': 'CPGRAMS (Public Grievances)',
  'in.gov.digilocker': 'National DigiLocker',
};

/**
 * Formats any string into a clean, human-readable label.
 * Replaces underscores, preserves statutory acronyms, and formats title case.
 */
export function formatHumanLabel(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Check known labels map first
  if (KNOWN_KEY_LABELS[trimmed]) {
    return KNOWN_KEY_LABELS[trimmed];
  }

  // Strip prefixes like RULE_, SPI_, ACTION_, WORKFLOW_, INTENT_
  const stripped = trimmed
    .replace(/^RULE_/i, '')
    .replace(/^SPI_/i, '')
    .replace(/^WORKFLOW_/i, '')
    .replace(/^INTENT_/i, '')
    .replace(/^ACTION_/i, '');

  // Split on underscores, hyphens, dots, or camelCase
  const tokens = stripped
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_\-\.]+/);

  const formattedWords = tokens
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

  return formattedWords.join(' ');
}

/**
 * Formats execution and lifecycle states into natural citizen language.
 */
export function formatStateLabel(state: string | null | undefined): string {
  if (!state) return '';
  const upper = state.toUpperCase().trim();

  switch (upper) {
    case 'COMPLETED':
    case 'SATISFIED':
      return 'Completed';
    case 'READY':
      return 'Ready';
    case 'IN_PROGRESS':
    case 'RUNNING':
      return 'In Progress';
    case 'FAILED':
      return 'Needs Attention';
    case 'BLOCKED':
      return 'Waiting on Step';
    case 'AWAITING_AUTHORIZATION':
      return 'Awaiting Authorization';
    case 'AWAITING_USER_INPUT':
      return 'Input Required';
    case 'PENDING_REVIEW':
      return 'Pending Review';
    case 'ACTIVE':
      return 'Active';
    case 'REVOKED':
      return 'Revoked';
    case 'EXPIRED':
      return 'Expired';
    case 'SUSPENDED':
      return 'Suspended';
    case 'TRANSFERRED':
      return 'Transferred';
    case 'PENDING':
      return 'Pending';
    default:
      return formatHumanLabel(state);
  }
}

/**
 * Resolves a prerequisite step key or ID to its clean human title.
 */
export function resolveStepTitle(
  depKey: string,
  availableSteps?: Array<{ stepKey?: string; id?: string; title: string }>
): string {
  if (!depKey) return '';
  
  if (availableSteps && availableSteps.length > 0) {
    const match = availableSteps.find(
      (s) => s.stepKey === depKey || s.id === depKey
    );
    if (match?.title) {
      return match.title;
    }
  }

  return formatHumanLabel(depKey);
}

/**
 * Formats data provider and consumer identifiers into human institutional titles.
 */
export function formatProviderName(raw: string | null | undefined): string {
  if (!raw) return 'Designated Authority';
  const trimmed = raw.trim();
  if (KNOWN_KEY_LABELS[trimmed]) {
    return KNOWN_KEY_LABELS[trimmed];
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('uidai') || lower.includes('aadhaar')) return 'UIDAI (Aadhaar)';
  if (lower.includes('epfo') || lower.includes('epf')) return 'EPFO (Provident Fund)';
  if (lower.includes('incometax') || lower.includes('income_tax') || lower.includes('cbdt')) return 'Income Tax Department';
  if (lower.includes('morth') || lower.includes('vahan') || lower.includes('sarathi')) return 'MoRTH (Transport)';
  if (lower.includes('mca') || lower.includes('corporate')) return 'Ministry of Corporate Affairs';
  if (lower.includes('digilocker')) return 'National DigiLocker';
  if (lower.includes('bank') || lower.includes('rbi')) return 'Scheduled Commercial Bank';

  return formatHumanLabel(trimmed);
}

/**
 * Formats consent purpose codes into natural citizen language.
 */
export function formatPurposeName(raw: string | null | undefined): string {
  if (!raw) return 'Statutory Verification';
  return formatHumanLabel(raw);
}
