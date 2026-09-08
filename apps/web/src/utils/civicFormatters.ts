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
  inquire_epfo_accounts: 'Check Your PF Accounts (EPFO)',
  update_epfo_pan: 'Link PAN Card to PF Account',
  consolidate_dormant_pf: 'Transfer Old PF Balance to New Job (Form 13)',
  fetch_form26as_tds: 'Check Tax Deductions (Form 26AS)',
  verify_aadhaar: 'Verify Aadhaar Identity',
  update_address: 'Update Residential Address',
  update_aadhaar_address: 'Update Address on Aadhaar',
  lock_biometrics: 'Lock Aadhaar Biometrics',
  verify_pan: 'Verify PAN Card',
  link_pan_aadhaar: 'Link PAN Card to Aadhaar',
  endorse_dl_address: 'Update Address on Driving Licence',
  inquire_dl_status: 'Check Driving Licence Status',
  fetch_vahan_details: 'Check Vehicle Registration Details',
  fetch_traffic_challans: 'Check Traffic Challans & Fines',
  settle_traffic_challan: 'Pay Traffic Fine',
  update_voter_constituency: 'Update Voting Address (Voter ID Form 8)',
  transfer_voter_constituency: 'Update Voting Address (Voter ID Form 8)',
  transfer_vehicle_rc: 'Transfer Vehicle to New State (RTO NOC Form 28)',
  issue_residence_vc: 'Get Digital Address Certificate',
  request_water_utility_transfer: 'Transfer Water Connection',
  report_pothole_sanitation: 'Submit Municipal Civic Report',
  inquire_ration_card: 'Check Ration Card Status',
  update_ration_card_address: 'Update Ration Card Address',
  fetch_land_record: 'Fetch Land Record (Pahani/RTC)',
  request_encumbrance_certificate: 'Request Encumbrance Certificate (EC)',
  register_tenancy_agreement: 'Register Rent Agreement',
  claim_dormant_deposit: 'Claim Dormant Bank Account Deposit',
  register_auto_debit_mandate: 'Set Up Auto-Debit Mandate',
  fetch_account_aggregates: 'View Bank Account Summary',
  create_abha_id: 'Create Digital Health ABHA ID',
  link_abha_records: 'Link Hospital Health Records',
  inquire_ayushman_bharat: 'Check Ayushman Bharat Health Card',
  pull_digilocker_document: 'Get DigiLocker Document',
  push_digilocker_certificate: 'Issue Verified Digital Certificate',
  fetch_apaar_id: 'Verify Student APAAR ID',
  pull_degree_from_nad: 'Fetch Degree Certificate from NAD',
  apply_national_scholarship: 'Submit Scholarship Application',
  fetch_soil_health_card: 'Get Soil Health Card',
  apply_crop_insurance: 'Apply for PM Crop Insurance',
  verify_kisan_credit_card: 'Verify Kisan Credit Card',
  file_cpgrams_grievance: 'Lodge Central Grievance (CPGRAMS)',
  check_rti_status: 'Track RTI Application Status',
  apply_legal_aid: 'Apply for Free Legal Aid (NALSA)',
  search_police_fir: 'Search Police FIR Records',
  endorse_kinship_nomination: 'Add Family Member / Nominee',
  register_civil_marriage: 'Register Marriage Notice',
  inquire_family_tree: 'View Family Registry Records',
  freeze_compromised_account: 'Emergency Freeze on Bank Accounts',
  report_cyber_fraud: 'Report Cyber Crime Incident (1930 Helpline)',
  request_disaster_relief: 'Request State Disaster Relief Assistance',
  apply_udid_card: 'Apply for Disability Card (UDID)',
  inquire_uan_status: 'Check Provident Fund (UAN) Status',
  transfer_pf_balance: 'Transfer Provident Fund Balance',
  claim_dormant_pf: 'Claim Old Provident Fund Balance',
  update_epfo_kyc: 'Update PF Account KYC & Bank Details',
  inquire_mobile_connections: 'Check SIM Cards Registered to You',
  report_fraudulent_connection: 'Report Unknown / Fraudulent SIM Card',
  evaluate_pmkisan_eligibility: 'Check PM-KISAN Scheme Eligibility',
  enroll_pmkisan: 'Apply for PM-KISAN Farmer Support',
  link_npci_subsidy: 'Link Bank Account to Receive Government Subsidies',
  reserve_company_name: 'Reserve Company Name (MCA RUN)',
  generate_spice_plus: 'Register Company & Get Company PAN (SPICe+)',
  incorporate_company: 'Register Company & Get Company PAN (SPICe+)',
  apply_pan_tan: 'Apply for Company PAN & TAN',
  register_gstin: 'Apply for GST Number (GSTIN)',
  register_udyam: 'Get MSME Udyam Certificate',
  open_current_account: 'Open Bank Current Account',
  verify_form_26as: 'Check Tax Deductions (Form 26AS)',
  file_nil_itr: 'File Nil Income Tax Return',
  claim_tds_refund: 'Claim Income Tax TDS Refund',
  inquire_passport_status: 'Track Passport Application Status',
  apply_passport_reissue: 'Renew / Reissue Passport',
  apply_police_clearance: 'Apply for Police Clearance Certificate (PCC)',

  // Plan Codes
  RELOCATION: 'Moving to Another City (Address & Records)',
  NEW_EMPLOYMENT: 'Switching Jobs (Transfer PF & Tax)',
  START_BUSINESS: 'Starting a Company (MCA, PAN & GST)',
  BUY_PROPERTY: 'Buying Property (Title & Registry Check)',
  CHILD_BIRTH: 'Registering a New Baby (Birth Certificate & Benefits)',
  CYBER_INCIDENT: 'Report Cyber Fraud & Lock Accounts',
  JOB_LOSS: 'Job Transition & Severance Benefits',
  FARMER_SEASONAL: 'Farmer Support (PM-KISAN & Crop Insurance)',

  // Common Rule Codes
  RULE_OBLIGATION_DEADLINE: 'Filing Deadline Alert',
  RULE_TRAFFIC_CHALLAN: 'Unpaid Traffic Challan Notice',
  RULE_CREDENTIAL_LIFECYCLE: 'Document Expiration Alert',
  RULE_ELIGIBILITY_OPPORTUNITY: 'Government Scheme Eligibility',
  RULE_CROP_INSURANCE_WINDOW: 'Crop Insurance Cutoff Notice',
  RULE_ANOMALY_CONTRADICTION: 'Mismatched Details Detected',
  RULE_DORMANT_ASSET: 'Unclaimed Money Notice',
  RULE_LIFE_EVENT_TRIGGER: 'Recommended Next Steps',

  // Finding Categories
  OBLIGATION_DEADLINE: 'Statutory Deadlines',
  CREDENTIAL_LIFECYCLE: 'Document Renewals',
  DORMANT_ASSET: 'Unclaimed Assets',
  ANOMALY_CONTRADICTION: 'Record Mismatches',
  ELIGIBILITY_OPPORTUNITY: 'Available Schemes',
  LIFE_EVENT_TRIGGER: 'Life Events',

  // Providers
  'in.gov.uidai': 'UIDAI (Aadhaar)',
  'in.gov.epfindia': 'EPFO (Provident Fund)',
  'in.gov.incometax': 'Income Tax Department',
  'in.gov.morth': 'Ministry of Road Transport / RTO',
  'in.gov.passport': 'Passport Seva',
  'in.gov.mca': 'Ministry of Corporate Affairs (MCA)',
  'in.gov.gst': 'GST Network (GSTN)',
  'in.gov.cybercrime': 'National Cyber Crime Portal (1930)',
  'in.gov.darpg': 'CPGRAMS (Public Grievance Portal)',
  'in.gov.digilocker': 'DigiLocker',
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
      return 'Action Needed';
    case 'IN_PROGRESS':
    case 'RUNNING':
      return 'In Progress';
    case 'FAILED':
      return 'Needs Attention';
    case 'BLOCKED':
      return 'Waiting on Previous Step';
    case 'AWAITING_AUTHORIZATION':
      return 'Awaiting Your Approval';
    case 'AWAITING_USER_INPUT':
      return 'Information Needed';
    case 'PENDING_REVIEW':
      return 'Under Review';
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
 * Translates bureaucratic and legalistic plan titles into clean, citizen-friendly plain English.
 */
export function formatPlanTitle(title: string | null | undefined): string {
  if (!title) return 'Guided Action Plan';
  const lower = title.toLowerCase();

  if (lower.includes('employment') || lower.includes('job') || lower.includes('onboarding') || lower.includes('benefits consolidation')) {
    return 'Switching Jobs (Transfer PF & Tax)';
  }
  if (lower.includes('incorporation') || lower.includes('enterprise') || lower.includes('business') || lower.includes('formation')) {
    return 'Starting a Company (MCA, PAN & GST)';
  }
  if (lower.includes('relocation') || lower.includes('inter-jurisdictional') || lower.includes('moving')) {
    return 'Moving to Another City (Address & Records)';
  }
  if (lower.includes('property') || lower.includes('acquisition') || lower.includes('title')) {
    return 'Buying Property (Title & Registry Check)';
  }
  if (lower.includes('cyber') || lower.includes('fraud') || lower.includes('emergency')) {
    return 'Report Cyber Fraud & Lock Accounts';
  }
  if (lower.includes('birth') || lower.includes('child')) {
    return 'Registering a New Baby (Birth Certificate & Benefits)';
  }
  if (lower.includes('farmer') || lower.includes('agricultural') || lower.includes('crop')) {
    return 'Farmer Support (PM-KISAN & Crop Insurance)';
  }

  return formatHumanLabel(title);
}

/**
 * Translates plan summaries into simple English that explains what the plan does.
 */
export function formatPlanSummary(summary: string | null | undefined, title?: string): string {
  if (!summary) return 'Follow this guided step-by-step checklist to complete all official requirements.';
  const lower = (summary + ' ' + (title || '')).toLowerCase();

  if (lower.includes('employment') || lower.includes('job') || lower.includes('onboarding') || lower.includes('benefits consolidation')) {
    return 'Move your Provident Fund (PF) balance from your old employer to your new job, and link your PAN card so extra tax is not deducted on transfers or withdrawals.';
  }
  if (lower.includes('incorporation') || lower.includes('enterprise') || lower.includes('business') || lower.includes('spice')) {
    return 'Complete all government filings to register your company: reserve your business name, get your official incorporation certificate, PAN card, and GST registration.';
  }
  if (lower.includes('relocation') || lower.includes('inter-jurisdictional') || lower.includes('moving')) {
    return 'Update your official records in the right order: change your residential address on Aadhaar, transfer your vehicle registration (RTO), and update your voter ID.';
  }
  if (lower.includes('property') || lower.includes('acquisition')) {
    return 'Complete all official checks and registrations to purchase property: verify property title, clear encumbrance certificates, and register ownership mutation.';
  }

  return summary;
}

/**
 * Returns a plan-specific, context-aware title for each phase.
 * Completely eliminates the bug where every plan was hardcoded to "Phase 1 · First Steps & Address Update".
 */
export function formatPhaseTitle(planTitle: string, phaseIndex: number): string {
  const lower = (planTitle || '').toLowerCase();

  // Employment Plan (Job Switch)
  if (lower.includes('employment') || lower.includes('job') || lower.includes('benefits')) {
    if (phaseIndex === 1) return 'Phase 1 · Check PF Accounts & Link PAN Card';
    if (phaseIndex === 2) return 'Phase 2 · Transfer Old PF Balance & Reconcile Tax';
    return `Phase ${phaseIndex} · Final Verification & Records`;
  }

  // Business Plan
  if (lower.includes('business') || lower.includes('enterprise') || lower.includes('incorporation')) {
    if (phaseIndex === 1) return 'Phase 1 · Reserve Company Name (MCA RUN)';
    if (phaseIndex === 2) return 'Phase 2 · Register Company & Get PAN Card (SPICe+)';
    if (phaseIndex === 3) return 'Phase 3 · GST & MSME Business Registration';
    return `Phase ${phaseIndex} · Banking & Legal Setup`;
  }

  // Relocation Plan
  if (lower.includes('relocation') || lower.includes('moving') || lower.includes('jurisdiction')) {
    if (phaseIndex === 1) return 'Phase 1 · Update Address on Aadhaar';
    if (phaseIndex === 2) return 'Phase 2 · Vehicle & Driving Licence Transfer';
    if (phaseIndex === 3) return 'Phase 3 · Voter ID & Proof of Residence';
    return `Phase ${phaseIndex} · Local Services & Banking`;
  }

  // Default fallback
  if (phaseIndex === 1) return 'Phase 1 · First Steps & Identity Verification';
  if (phaseIndex === 2) return 'Phase 2 · Department Filings & Transfers';
  return `Phase ${phaseIndex} · Final Approvals & Records`;
}

/**
 * Translates step titles into simple, citizen-friendly action names.
 */
export function formatStepTitle(title: string | null | undefined, stepKey?: string): string {
  const key = (stepKey || '').toLowerCase();
  const raw = (title || '').toLowerCase();

  if (key === 'inquire_epfo_accounts' || raw.includes('inquire universal account number') || raw.includes('uan member ledgers')) {
    return 'Check Your PF Accounts (EPFO)';
  }
  if (key === 'update_epfo_pan' || raw.includes('seed verified income tax pan') || raw.includes('pan on uan')) {
    return 'Link PAN Card to PF Account';
  }
  if (key === 'consolidate_dormant_pf' || raw.includes('consolidate inactive provident fund') || raw.includes('transfer_claim')) {
    return 'Transfer Old PF Balance to New Job (Form 13)';
  }
  if (key === 'fetch_form26as_tds' || raw.includes('reconcile multi-employer tax credits') || raw.includes('traces form 26as')) {
    return 'Check Tax Deductions (Form 26AS)';
  }
  if (key === 'update_aadhaar_address' || raw.includes('update aadhaar residential address')) {
    return 'Update Address on Aadhaar';
  }
  if (key === 'transfer_voter_constituency' || raw.includes('transfer voter assembly') || raw.includes('form 8')) {
    return 'Update Voting Address (Voter ID Form 8)';
  }
  if (key === 'endorse_dl_address' || raw.includes('endorse driving licence') || raw.includes('driving licence residential')) {
    return 'Update Address on Driving Licence';
  }
  if (key === 'transfer_vehicle_rc' || raw.includes('transfer motor vehicle registration') || raw.includes('vehicle inter-state noc')) {
    return 'Transfer Vehicle to New State (RTO NOC Form 28)';
  }
  if (key === 'issue_residence_vc' || raw.includes('issue cryptographic verifiable residence') || raw.includes('verifiable residence credential')) {
    return 'Get Digital Address Certificate';
  }
  if (key === 'reserve_company_name' || raw.includes('reserve enterprise legal name') || raw.includes('mca run')) {
    return 'Reserve Company Name (MCA RUN)';
  }
  if (key === 'incorporate_company' || raw.includes('incorporate enterprise') || raw.includes('spice+')) {
    return 'Register Company & Get Company PAN';
  }
  if (key === 'register_gstin' || raw.includes('goods & services tax identification number')) {
    return 'Apply for GST Number (GSTIN)';
  }
  if (key === 'register_udyam' || raw.includes('msme udyam sovereign certificate')) {
    return 'Get MSME Udyam Certificate';
  }
  if (key === 'link_pan_aadhaar' || raw.includes('link pan') || raw.includes('synchronize pan')) {
    return 'Link PAN Card to Aadhaar';
  }
  if (key === 'apply_mutation' || raw.includes('revenue land record mutation') || raw.includes('khata')) {
    return 'Transfer Property Ownership (Khata Mutation)';
  }
  if (key === 'update_utility_consumer' || raw.includes('transfer municipal utility')) {
    return 'Transfer Electricity / Utility Bill to Your Name';
  }
  if (key === 'report_cyber_fraud' || raw.includes('report incident to cyber crime')) {
    return 'Report Cyber Fraud to 1930 Helpline';
  }
  if (key === 'freeze_compromised_account' || raw.includes('emergency freeze on compromised')) {
    return 'Emergency Freeze on Bank Accounts';
  }

  return formatHumanLabel(title);
}

/**
 * Returns a one-sentence plain English explanation of what this step does and why it matters.
 */
export function formatStepExplanation(stepKey?: string, title?: string): string {
  const key = (stepKey || '').toLowerCase();
  const raw = (title || '').toLowerCase();

  if (key === 'update_epfo_pan' || raw.includes('pan on uan') || raw.includes('link pan') || raw.includes('pan card to pf')) {
    return 'Links your PAN card to your PF account so extra tax is not deducted on transfers or withdrawals.';
  }
  if (key === 'inquire_epfo_accounts' || raw.includes('uan') || raw.includes('check your pf accounts') || raw.includes('inquire universal')) {
    return 'Finds all past employers and Provident Fund account numbers linked to your mobile and UAN.';
  }
  if (key === 'consolidate_dormant_pf' || raw.includes('consolidate') || raw.includes('transfer pf') || raw.includes('form 13')) {
    return 'Moves money from your previous employer\'s PF account into your current active job account.';
  }
  if (key === 'fetch_form26as_tds' || raw.includes('form 26as') || raw.includes('tax credits')) {
    return 'Verifies tax deducted (TDS) by your old and new employers against Income Tax records.';
  }
  if (key === 'update_aadhaar_address' || raw.includes('aadhaar')) {
    return 'Updates your home address in the national UIDAI database using your rent agreement or utility bill.';
  }
  if (key === 'transfer_voter_constituency' || raw.includes('voter') || raw.includes('form 8')) {
    return 'Moves your voter registration to your new constituency so you can vote in upcoming local elections.';
  }
  if (key === 'endorse_dl_address' || raw.includes('driving licence')) {
    return 'Updates your residential address in the national Sarathi driving licence database.';
  }
  if (key === 'transfer_vehicle_rc' || raw.includes('vehicle') || raw.includes('noc')) {
    return 'Applies for a No Objection Certificate (NOC) from your current RTO to register in your new state.';
  }
  if (key === 'issue_residence_vc' || raw.includes('residence credential') || raw.includes('digital address')) {
    return 'Creates a tamper-proof digital certificate verifying your new residence for banks and utilities.';
  }
  if (key === 'reserve_company_name' || raw.includes('reserve')) {
    return 'Checks company name availability with the Ministry of Corporate Affairs and reserves it for 20 days.';
  }
  if (key === 'incorporate_company' || raw.includes('incorporate') || raw.includes('spice')) {
    return 'Files official registration documents and issues your Certificate of Incorporation and Company PAN.';
  }
  if (key === 'register_gstin' || raw.includes('gst')) {
    return 'Registers your company on the GST portal to collect taxes and claim input tax credit.';
  }
  if (key === 'register_udyam' || raw.includes('udyam') || raw.includes('msme')) {
    return 'Registers your business with MSME for government subsidies, priority lending, and tax benefits.';
  }
  if (key === 'apply_mutation' || raw.includes('mutation') || raw.includes('khata')) {
    return 'Updates official state revenue records so the property title is legally registered in your name.';
  }
  if (key === 'update_utility_consumer' || raw.includes('utility')) {
    return 'Transfers the electricity meter and consumer account to your name with zero disruption to power.';
  }
  if (key === 'report_cyber_fraud' || raw.includes('cyber')) {
    return 'Alerts law enforcement and banks to freeze fraudulent money transfers within the golden hour.';
  }
  if (key === 'freeze_compromised_account' || raw.includes('freeze')) {
    return 'Immediately pauses online banking and card transactions to prevent further unauthorized loss.';
  }

  return 'Follow this step to keep your official government records accurate, verified, and up to date.';
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
      return formatStepTitle(match.title, match.stepKey || match.id);
    }
  }

  return formatStepTitle(depKey, depKey);
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
  if (!raw) return 'Official Verification';
  return formatHumanLabel(raw);
}
