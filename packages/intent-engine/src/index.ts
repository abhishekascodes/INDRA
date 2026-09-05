import {
  type StructuredIntent,
  type CapabilityDomain,
} from '@indra/contracts';
import {
  type StructuredLlmIntentAdapter,
  type IntentCatalogItem,
  DefaultStructuredLlmIntentAdapter,
  LlmIntentResolutionSchema,
} from './llm-adapter.js';

export * from './llm-adapter.js';

export interface IntentRule {
  intentId: string;
  category: string;
  workflowCode?: string;
  actionTitle: string;
  actionDescription: string;
  humanExplanation: string;
  statutoryAuthority: string;
  recoverableValue?: string;
  patterns: RegExp[];
  extractEntities?: (query: string) => Record<string, unknown>;
}

export class IntentEngine {
  private llmAdapter: StructuredLlmIntentAdapter;

  constructor(llmAdapter?: StructuredLlmIntentAdapter) {
    this.llmAdapter = llmAdapter || new DefaultStructuredLlmIntentAdapter();
  }

  private rules: IntentRule[] = [
    {
      intentId: 'START_BUSINESS',
      category: 'BUSINESS',
      workflowCode: 'START_BUSINESS',
      actionTitle: 'Incorporate Enterprise',
      actionDescription: 'Establish your company, reserve trade name, and obtain PAN, GSTIN & Udyam registration.',
      humanExplanation: "I think you're looking to establish a registered business enterprise",
      statutoryAuthority: 'Ministry of Corporate Affairs (MCA) & MSME',
      patterns: [
        /start\s+.*(company|business|startup|firm|pvt\s+ltd|enterprise)/i,
        /incoorp?erat(e|ion)/i,
        /incorporat(e|ion)/i,
        /open\s+.*(company|business|firm|startup|pvt\s+ltd|enterprise)/i,
        /register\s+.*(company|business|firm|startup|pvt\s+ltd)/i,
        /create\s+.*(company|business|firm|startup)/i,
        /formation\s+of\s+.*(company|business)/i,
        /how\s+do\s+i\s+incorporate\s+(a\s+)?startup/i,
        /need\s+to\s+set\s+up\s+a\s+business/i,
        /set\s+up\s+a\s+business/i,
      ],
      extractEntities: (q) => {
        const match = q.match(/(?:called|named)\s+([A-Za-z0-9\s]+)/i);
        return match ? { proposedName: match[1].trim() } : {};
      },
    },
    {
      intentId: 'RECOVER_DORMANT_PF',
      category: 'EMPLOYMENT',
      workflowCode: 'RECOVER_DORMANT_PF',
      actionTitle: 'Recover Inactive Provident Fund',
      actionDescription: 'Identify unlinked EPFO member accounts and consolidate funds into your active account.',
      humanExplanation: "I think you're trying to recover an old PF account",
      statutoryAuthority: "Employees' Provident Fund Organisation (EPFO)",
      recoverableValue: '₹1,42,500 potentially recoverable',
      patterns: [
        /pf\s+(transfer|stuck|missing|dormant|claim|balance|consolidation)/i,
        /epfo\s+(transfer|claim|passbook|balance|account)/i,
        /provident\s+fund/i,
        /pf\s+.*(stuck|missing|dormant|unlinked|sitting\s+there)/i,
        /pf\s+transfer\s+.*(stuck|old\s+company|previous)/i,
        /old\s+employer('s)?\s+pf\s+(hasn't\s+moved|stuck)/i,
        /find\s+my\s+old\s+pf/i,
        /old\s+pf/i,
        /recover\s+my\s+old\s+pf/i,
        /my\s+pf\s+is\s+just\s+sitting\s+there/i,
        /dormant\s+(pf|epf|provident)/i,
        /consolidate\s+.*(pf|epf|provident\s+fund)/i,
        /unlinked\s+(pf|epfo|provident)/i,
        /bro\s+.*pf.*stuck/i,
      ],
    },
    {
      intentId: 'TRANSFER_ACTIVE_PF',
      category: 'EMPLOYMENT',
      workflowCode: 'RECOVER_DORMANT_PF',
      actionTitle: 'Transfer Active Provident Fund',
      actionDescription: 'Submit an EPFO Form 13 online transfer from your previous employer to your current employer.',
      humanExplanation: "I think you're looking to transfer your active PF from your previous employer to your current employer",
      statutoryAuthority: "Employees' Provident Fund Organisation (EPFO - Form 13)",
      patterns: [
        /transfer\s+(my\s+)?(pf|epf)\s+(to|between|into)\s+(my\s+)?(new|current|present)\s+(employer|company|job)/i,
        /form\s+13\s+(online\s+)?transfer/i,
        /switch\s+pf\s+to\s+new\s+job/i,
      ],
    },
    {
      intentId: 'LOST_PHONE_SECURITY',
      category: 'SECURITY',
      workflowCode: 'LOST_DEVICE_PROTECTION',
      actionTitle: 'Emergency Handset & SIM Protection',
      actionDescription: 'Blacklist device IMEI across all Indian networks and initiate emergency SIM freeze.',
      humanExplanation: 'Emergency handset blacklisting and cellular protection',
      statutoryAuthority: 'Central Equipment Identity Register (CEIR & DoT)',
      patterns: [
        /(lost|stolen|steln)\s+(my\s+)?(phone|mobile|device|handset|phne)/i,
        /(phone|mobile|device|handset|phne)\s+(was\s+)?(stolen|lost|steln)/i,
        /block\s+.*(phone|sim|imei|handset)/i,
        /ceir\s+(block|blacklist)/i,
        /blacklist\s+.*(imei|phone|handset)/i,
        /stolen\s+imei/i,
        /mobile\s+theft/i,
        /lost\s+device/i,
        /phone\s+gone\s+sim\s+gone/i,
        /handset\s+disappeared/i,
        /snatched\s+(my\s+)?(phone|mobile|handset)/i,
      ],
    },
    {
      intentId: 'RESOLVE_NAME_MISMATCH',
      category: 'IDENTITY',
      workflowCode: 'RESOLVE_NAME_MISMATCH',
      actionTitle: 'Harmonize Identity Records',
      actionDescription: 'Resolve name variations between PAN and Aadhaar using verified government ground truth.',
      humanExplanation: 'Harmonize name discrepancies across identity documents',
      statutoryAuthority: 'Income Tax Department & UIDAI',
      patterns: [
        /name\s+mismatch/i,
        /name\s+on\s+pan\s+(is\s+)?wrong/i,
        /fix\s+name/i,
        /differen(ce|t)\s+name/i,
        /name\s+differen(ce|t)/i,
        /pan\s+.*aadhaar.*(name|mismatch|link|differen)/i,
        /aadhaar\s+.*pan.*(name|mismatch|link|differen)/i,
        /why\s+is\s+my\s+name\s+different\s+on\s+pan/i,
        /fix\s+my\s+identity\s+records/i,
        /(aadhaar|pan)\s+and\s+(pan|aadhaar)\s+names\s+don't\s+match/i,
        /harmonize\s+name/i,
        /spelling\s+mistake\s+in\s+pan/i,
      ],
    },
    {
      intentId: 'EVALUATE_BENEFITS',
      category: 'BENEFITS',
      actionTitle: 'Check Benefit Eligibility',
      actionDescription: 'Evaluate your socio-economic indicators against central and state welfare programmes.',
      humanExplanation: 'Screen your profile against central and state welfare schemes',
      statutoryAuthority: 'National Welfare Registry (DBT)',
      recoverableValue: '3 programmes available',
      patterns: [
        /what\s+benefits/i,
        /eligible\s+for/i,
        /government\s+schemes/i,
        /scholarship(s)?/i,
        /subsid(y|ies)/i,
        /welfare\s+benefits/i,
        /find\s+benefits\s+for\s+me/i,
      ],
    },
    {
      intentId: 'RENEW_PASSPORT',
      category: 'TRAVEL',
      workflowCode: 'RENEW_PASSPORT',
      actionTitle: 'Renew Indian Passport',
      actionDescription: 'Prepare passport reissue, verify police station jurisdiction, and schedule PSK slot.',
      humanExplanation: 'Prepare passport reissue and verify police jurisdiction',
      statutoryAuthority: 'Passport Seva (Ministry of External Affairs)',
      patterns: [
        /renew\s+(my\s+)?passport/i,
        /passport\s+expire(d|s)?/i,
        /passport\s+expiring\s+soon/i,
        /travelling\s+abroad.*passport.*expir/i,
        /new\s+passport/i,
        /passport\s+reissue/i,
        /passport\s+appointment/i,
      ],
    },
    {
      intentId: 'LIFE_EVENT_MOVING',
      category: 'LIFE_EVENT',
      actionTitle: 'Relocation & Address Harmonization',
      actionDescription: 'Update current residence and harmonize downstream driving licence and voter records.',
      humanExplanation: 'I can help with that. I found multiple registrations to update for your move',
      statutoryAuthority: 'Multi-Registry Synchronization (Transport & Election Commission)',
      patterns: [
        /moved\s+to\s+([A-Za-z\s]+)/i,
        /relocat(ed|ing)\s+to/i,
        /change\s+(my\s+)?address/i,
        /shifted\s+to/i,
        /update\s+(my\s+)?address/i,
        /shifted\s+cities/i,
        /moved\s+house/i,
        /bro\s+moved\s+.*need\s+all\s+govt\s+things\s+fixed/i,
      ],
      extractEntities: (q) => {
        const match = q.match(/(?:moved|shifted|relocated)\s+to\s+([A-Za-z\s]+)/i);
        return match ? { targetCity: match[1].trim() } : {};
      },
    },
    {
      intentId: 'LIFE_EVENT_MARRIAGE',
      category: 'LIFE_EVENT',
      actionTitle: 'Post-Marriage Document & Status Harmonization',
      actionDescription: 'Harmonize marital status and optional legal surname updates across UIDAI, Income Tax, and Passport.',
      humanExplanation: 'I can help with that. INDRA can harmonize your marital status and legal documents after marriage',
      statutoryAuthority: 'Multi-Registry Public Records (Registrar of Marriages, UIDAI, Income Tax)',
      patterns: [
        /after\s+getting\s+married/i,
        /got\s+married/i,
        /post[- ]marriage/i,
        /marriage\s+update/i,
      ],
    },
    {
      intentId: 'TRACES_TAX_STATUS',
      category: 'TAX',
      workflowCode: 'CHECK_ITR_STATUS',
      actionTitle: 'Review Tax Deductions & ITR Status',
      actionDescription: 'Inspect TRACES Form 26AS verified tax credits and evaluate ITR filing obligations.',
      humanExplanation: 'Here is your current tax and Form 26AS deduction status',
      statutoryAuthority: 'Income Tax Department & TRACES',
      patterns: [
        /tax\s+(status|return|filing|due|credit|deduction|refund)/i,
        /itr/i,
        /form\s*26as/i,
        /income\s*tax/i,
        /tds\s*(credit|statement|certificate)?/i,
      ],
    },
    {
      intentId: 'VAHAN_VEHICLE_RC',
      category: 'TRANSPORT',
      actionTitle: 'Vehicle Registration & RC Status',
      actionDescription: 'Query MoRTH Vahan 4.0 database for vehicle registration, roadworthiness, and state RTO transfer status.',
      humanExplanation: 'Here is your vehicle registration and RTO status',
      statutoryAuthority: 'Ministry of Road Transport & Highways (MoRTH Vahan)',
      patterns: [
        /vehicle/i,
        /car\s*(rc|status|details)?/i,
        /scooter|bike|motorcycle/i,
        /vahan/i,
        /rto/i,
        /rc\s+transfer/i,
        /driving\s*licen[sc]e/i,
      ],
    },
    {
      intentId: 'ECOURTS_CASE_STATUS',
      category: 'JUDICIARY',
      actionTitle: 'Check Property Encumbrance & Legal Records',
      actionDescription: 'Search the National Judicial Data Grid (NJDG) for active civil suits, injunctions, or lis pendens encumbrances.',
      humanExplanation: 'Here is the verified judicial encumbrance status for your property',
      statutoryAuthority: 'eCourts National Judicial Data Grid (NJDG)',
      patterns: [
        /court/i,
        /ecourt/i,
        /njdg/i,
        /litigation/i,
        /encumbrance/i,
        /land\s*dispute/i,
        /legal\s*(dispute|suit|injunction|notice)/i,
        /court\s*record/i,
        /property\s*dispute/i,
      ],
    },

    {
      intentId: 'ABDM_HEALTH_RECORDS',
      category: 'HEALTHCARE',
      actionTitle: 'Access Verified ABHA Health Records',
      actionDescription: 'Retrieve and link longitudinal electronic medical records via Ayushman Bharat Digital Mission (ABDM).',
      humanExplanation: 'Here is your linked ABHA healthcare record summary',
      statutoryAuthority: 'National Health Authority (ABDM)',
      patterns: [
        /health\s*(record|card|data)?/i,
        /abha/i,
        /abdm/i,
        /hospital\s*(record|discharge)?/i,
        /medical\s*(record|history)?/i,
      ],
    },
    {
      intentId: 'AA_BANK_STATEMENT',
      category: 'FINANCIAL',
      actionTitle: 'View Bank Account & Financial Statements',
      actionDescription: 'Fetch consolidated electronic statements across verified accounts via RBI Account Aggregator framework.',
      humanExplanation: 'Here is your verified financial account statement via Account Aggregator',
      statutoryAuthority: 'Reserve Bank of India (RBI Account Aggregator Framework)',
      patterns: [
        /bank\s*(account|statement|balance)?/i,
        /account\s*aggregator/i,
        /financial\s*(statement|record|data)/i,
        /hdfc|sbi|icici/i,
      ],
    },
    {
      intentId: 'APAAR_ACADEMIC_RECORDS',
      category: 'EDUCATION',
      actionTitle: 'Verify Academic Records & Degree Credits',
      actionDescription: 'Query the Academic Bank of Credits (ABC) and verify APAAR ID academic credentials from accredited institutions.',
      humanExplanation: 'Here is your verified academic record and degree credit ledger from the Academic Bank of Credits',
      statutoryAuthority: 'Ministry of Education & DigiLocker NAD (APAAR / ABC)',
      patterns: [
        /academic\s*(record|credential|transcript)?/i,
        /apaar/i,
        /academic\s*bank\s*of\s*credits/i,
        /degree\s*(certificate|record)?/i,
        /college\s*credits/i,
        /education\s*record/i,
      ],
    },
    {
      intentId: 'TRAFFIC_ECHALLAN',
      category: 'TRANSPORT',
      actionTitle: 'Inquire Traffic E-Challans',
      actionDescription: 'Query MoRTH Parivahan e-Challan repository for pending traffic violations and payment options.',
      humanExplanation: 'Here are the traffic e-challan notices pending against your vehicles',
      statutoryAuthority: 'MoRTH Parivahan / State Traffic Police',
      patterns: [
        /challan/i,
        /echallan/i,
        /traffic\s*(fine|ticket|violation|penalty)/i,
        /pending\s*fine/i,
        /speeding\s*ticket/i,
      ],
    },
    {
      intentId: 'RENEW_DRIVING_LICENSE',
      category: 'TRANSPORT',
      actionTitle: 'Renew Driving Licence',
      actionDescription: 'Submit application for driving licence renewal with medical fitness self-declaration.',
      humanExplanation: 'I can help you renew your driving licence before or after expiration',
      statutoryAuthority: 'Ministry of Road Transport and Highways (Sarathi)',
      patterns: [
        /renew\s*(my\s*)?(driving\s*licen[sc]e|dl)/i,
        /dl\s*expir/i,
        /expired\s*driving\s*licen[sc]e/i,
        /driving\s*licen[sc]e\s*renewal/i,
      ],
    },
    {
      intentId: 'RATION_ENTITLEMENT',
      category: 'WELFARE',
      actionTitle: 'Inquire Foodgrain Entitlement (NFSA / PDS)',
      actionDescription: 'Query National Food Security Act monthly grain quotas and allocated Fair Price Shop.',
      humanExplanation: 'Here is your monthly subsidized ration entitlement under the National Food Security Act',
      statutoryAuthority: 'Department of Food and Public Distribution (NFSA / Annavitran)',
      patterns: [
        /ration\s*(card|quota|shop|entitlement|grain|rice|wheat|fps)/i,
        /pds\s*quota/i,
        /nfsa/i,
        /free\s*ration/i,
      ],
    },
    {
      intentId: 'CROP_INSURANCE_PMFBY',
      category: 'AGRICULTURE',
      actionTitle: 'Enroll in PMFBY Crop Insurance',
      actionDescription: 'Submit seasonal crop insurance proposal under Pradhan Mantri Fasal Bima Yojana with subsidized farmer premium.',
      humanExplanation: 'I can help you enroll your agricultural acreage in PMFBY weather and yield index insurance',
      statutoryAuthority: 'Ministry of Agriculture & Farmers Welfare (PMFBY)',
      patterns: [
        /crop\s*insurance/i,
        /pmfby/i,
        /fasal\s*bima/i,
        /insure\s*(my\s*)?(crop|field|harvest|paddy|wheat)/i,
        /crop\s*loss\s*compensation/i,
      ],
    },
    {
      intentId: 'KISAN_CREDIT_CARD',
      category: 'AGRICULTURE',
      actionTitle: 'Verify Kisan Credit Card (KCC)',
      actionDescription: 'Inquire active KCC credit limit, subsidized interest rate, and operating balance.',
      humanExplanation: 'Here is your active Kisan Credit Card working capital status',
      statutoryAuthority: 'National Bank for Agriculture and Rural Development (NABARD)',
      patterns: [
        /kisan\s*credit\s*card/i,
        /kcc/i,
        /farmer\s*credit/i,
        /subsidized\s*crop\s*loan/i,
      ],
    },
    {
      intentId: 'MUNICIPAL_WATER_CONNECTION',
      category: 'CIVIC',
      actionTitle: 'Apply for Municipal Water & Sewerage Connection',
      actionDescription: 'Submit application for piped domestic water supply and sewerage meter installation.',
      humanExplanation: 'I can assist you with applying for a fresh municipal water supply meter',
      statutoryAuthority: 'Municipal Water Board (BWSSB / Jal Board)',
      patterns: [
        /water\s*(connection|meter|pipe|supply|line)/i,
        /sewerage\s*connection/i,
        /bwssb/i,
        /jal\s*board/i,
        /new\s*water\s*tap/i,
      ],
    },
    {
      intentId: 'TRADE_LICENSE',
      category: 'CIVIC',
      actionTitle: 'Register Municipal Trade Licence',
      actionDescription: 'Issue official commercial operating trade licence for retail, service, or food establishment premises.',
      humanExplanation: 'I can help you obtain or renew your municipal commercial trade license',
      statutoryAuthority: 'Urban Local Body / Municipal Health & Licensing Department',
      patterns: [
        /trade\s*licen[sc]e/i,
        /shop\s*(and\s*establishment|act|license)/i,
        /gumasta/i,
        /commercial\s*permit/i,
      ],
    },
    {
      intentId: 'CADASTRAL_SURVEY',
      category: 'PROPERTY',
      actionTitle: 'Inquire Cadastral Land Survey & Geo-Fence',
      actionDescription: 'Inspect geo-referenced survey parcel map, spatial dimensions, and legal boundary dispute status.',
      humanExplanation: 'Here is the official cadastral spatial survey record for your property parcel',
      statutoryAuthority: 'Survey, Settlement and Land Records Department (Bhoomi / Dishaank)',
      patterns: [
        /cadastral/i,
        /survey\s*number/i,
        /bhoomi\s*map/i,
        /land\s*boundaries/i,
        /parcel\s*naksha/i,
        /geofence/i,
      ],
    },
    {
      intentId: 'LEGAL_AID_NALSA',
      category: 'JUSTICE',
      actionTitle: 'Apply for Free Legal Aid (NALSA)',
      actionDescription: 'Submit statutory request for state-appointed advocate and pro bono legal services under Legal Services Authorities Act.',
      humanExplanation: 'I can connect you with free statutory legal aid and an assigned legal advocate',
      statutoryAuthority: 'National Legal Services Authority (NALSA / DLSA)',
      patterns: [
        /legal\s*aid/i,
        /free\s*(lawyer|advocate|legal\s*representation)/i,
        /nalsa/i,
        /dalsa/i,
        /pro\s*bono\s*lawyer/i,
      ],
    },
    {
      intentId: 'POLICE_FIR_STATUS',
      category: 'JUSTICE',
      actionTitle: 'Search Police FIR Records',
      actionDescription: 'Track first information report investigation status, booked sections, and supervisory station across state police jurisdictions.',
      humanExplanation: 'Here is the current investigation and registration status of your police FIR',
      statutoryAuthority: 'Crime and Criminal Tracking Network & Systems (CCTNS)',
      patterns: [
        /police\s*fir/i,
        /fir\s*(status|copy|details|track)/i,
        /police\s*complaint\s*track/i,
        /cctns/i,
      ],
    },
    {
      intentId: 'TELECOM_SIM_INQUIRY',
      category: 'TELECOM',
      actionTitle: 'Inquire Registered SIM Cards (TAFCOP)',
      actionDescription: 'Check all mobile subscriptions issued against citizen identity and flag unauthorized connections.',
      humanExplanation: 'Here are all active mobile SIM numbers registered under your Aadhaar identity',
      statutoryAuthority: 'Department of Telecommunications (TAFCOP / Sanchar Saathi)',
      patterns: [
        /sim(s)?\s*(in\s*my\s*name|registered|issued|active)/i,
        /sanchar\s*saathi/i,
        /tafcop/i,
        /how\s*many\s*(sims|mobile\s*numbers)\s*(do\s*i\s*have|in\s*my\s*name)/i,
        /unauthorized\s*sim/i,
      ],
    },
    {
      intentId: 'REPORT_CYBER_FRAUD',
      category: 'SECURITY',
      actionTitle: 'Report Cyber Financial Fraud (Portal 1930)',
      actionDescription: 'Dispatches emergency fraud complaint to 1930 / I4C and issues inter-bank regulatory lien broadcast to freeze stolen funds.',
      humanExplanation: 'Emergency containment for cyber financial fraud with inter-bank lien broadcast',
      statutoryAuthority: 'National Cyber Crime Reporting Portal (1930 / I4C)',
      patterns: [
        /cyber\s*(fraud|crime|scam)/i,
        /scammed/i,
        /upi\s*fraud/i,
        /lost\s*money\s*(online|in\s*scam|to\s*fraudster)/i,
        /1930/i,
        /i4c/i,
        /phishing\s*scam/i,
      ],
    },
    {
      intentId: 'DISASTER_RELIEF_CLAIM',
      category: 'EMERGENCY',
      actionTitle: 'Request Emergency Disaster Relief & Ex-Gratia',
      actionDescription: 'Submit statutory claim for NDRF/SDRF disaster compensation and emergency ex-gratia relief following notified natural calamity.',
      humanExplanation: 'I can help you file a statutory claim for disaster relief and ex-gratia assistance',
      statutoryAuthority: 'National Disaster Management Authority (NDMA / SDRF)',
      patterns: [
        /disaster\s*relief/i,
        /flood\s*(relief|compensation|damage)/i,
        /cyclone\s*(relief|compensation)/i,
        /drought\s*(aid|relief)/i,
        /sdrf/i,
        /ndrf/i,
        /calamity\s*relief/i,
      ],
    },
    {
      intentId: 'UDID_DISABILITY_CARD',
      category: 'ACCESSIBILITY',
      actionTitle: 'Apply for UDID Disability Certificate (Swavlamban)',
      actionDescription: 'Enroll for Unique Disability ID card and schedule medical assessment board under RPwD Act 2016.',
      humanExplanation: 'I can help you apply for the national UDID disability certificate and identity card',
      statutoryAuthority: 'Department of Empowerment of Persons with Disabilities (DEPwD)',
      patterns: [
        /udid/i,
        /disability\s*(card|certificate|id)/i,
        /swavlamban/i,
        /divyang\s*card/i,
        /rpwd/i,
      ],
    },
    {
      intentId: 'CIBIL_CREDIT_REPORT',
      category: 'FINANCIAL',
      actionTitle: 'Fetch Sovereign Credit Score & CIR Report (CIBIL)',
      actionDescription: 'Retrieve verified Comprehensive Information Report (CIR) and CIBIL score from authorized credit bureaus.',
      humanExplanation: 'Here is your official credit score and loan liability summary',
      statutoryAuthority: 'TransUnion CIBIL (RBI Authorized Credit Information Company)',
      patterns: [
        /cibil/i,
        /credit\s*score/i,
        /credit\s*(report|health)/i,
        /check\s*my\s*score/i,
      ],
    },
    {
      intentId: 'CIVIL_MARRIAGE_REGISTRATION',
      category: 'FAMILY',
      actionTitle: 'Register Civil Marriage (Special Marriage Act)',
      actionDescription: 'File statutory notice of intended marriage with Sub-Registrar Office under Special Marriage Act, 1954.',
      humanExplanation: 'I can assist you with filing the statutory notice for civil marriage registration',
      statutoryAuthority: 'Inspector General of Registration & Stamps',
      patterns: [
        /register\s*(a\s*)?marriage/i,
        /marriage\s*(registration|certificate|notice)/i,
        /special\s*marriage\s*act/i,
        /court\s*marriage/i,
      ],
    },
    {
      intentId: 'AIS_TIS_TAX_RECONCILIATION',
      category: 'TAX',
      actionTitle: 'Reconcile Annual Information Statement (AIS/TIS)',
      actionDescription: 'Inspect reported high-value transactions, interest incomes, dividends, and verify TDS alignment.',
      humanExplanation: 'Here is your Annual Information Statement (AIS/TIS) tax reconciliation summary',
      statutoryAuthority: 'Income Tax Department (AIS / TRACES)',
      patterns: [
        /ais/i,
        /tis/i,
        /annual\s*information\s*statement/i,
        /taxpayer\s*information\s*summary/i,
        /tax\s*reconciliation/i,
      ],
    },
    {
      intentId: 'LOCK_AADHAAR_BIOMETRICS',
      category: 'IDENTITY',
      actionTitle: 'Lock Sovereign Biometrics (UIDAI)',
      actionDescription: 'Instantly lock fingerprint, iris, and facial biometrics to prevent unauthorized identity exploitation.',
      humanExplanation: 'I can help you lock your Aadhaar biometrics for maximum identity protection',
      statutoryAuthority: 'Unique Identification Authority of India (UIDAI)',
      patterns: [
        /lock\s*(my\s*)?biometrics/i,
        /lock\s*(my\s*)?aadhaar/i,
        /biometric\s*lock/i,
        /secure\s*(my\s*)?aadhaar/i,
      ],
    },
    {
      intentId: 'POLICE_CLEARANCE_PASSPORT',
      category: 'TRAVEL',
      actionTitle: 'Apply for Police Clearance Certificate (PCC)',
      actionDescription: 'Submit formal application for sovereign Police Clearance Certificate for emigration, employment, or foreign visa processing.',
      humanExplanation: 'I can help you apply for an official Police Clearance Certificate for visa or emigration',
      statutoryAuthority: 'Passport Seva (Ministry of External Affairs)',
      patterns: [
        /pcc/i,
        /police\s*clearance/i,
        /police\s*verification\s*for\s*(visa|passport|abroad)/i,
      ],
    },
    {
      intentId: 'AYUSHMAN_CARD_FETCH',
      category: 'HEALTHCARE',
      actionTitle: 'Fetch Ayushman Bharat PM-JAY Golden Card',
      actionDescription: 'Retrieve verified Ayushman Bharat health insurance entitlement card for cashless hospital treatment up to ₹5,00,000.',
      humanExplanation: 'Here is your Ayushman Bharat PM-JAY Golden Card health cover summary',
      statutoryAuthority: 'National Health Authority (PM-JAY)',
      patterns: [
        /ayushman\s*(card|bharat|golden\s*card)/i,
        /pmjay/i,
        /5\s*lakh\s*health\s*cover/i,
      ],
    },
  ];



  public isMaliciousQuery(query: string): boolean {
    const trimmed = query.trim();
    return (
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i.test(trimmed) ||
      /system\s+prompt/i.test(trimmed) ||
      /system\s*:\s*/i.test(trimmed) ||
      /drop\s+table/i.test(trimmed) ||
      /delete\s+(from|root|all|user)/i.test(trimmed) ||
      /override\s+security/i.test(trimmed) ||
      /grant\s+admin/i.test(trimmed) ||
      /rm\s+-rf/i.test(trimmed) ||
      /export\s+secret/i.test(trimmed)
    );
  }

  /**
   * Synchronous fast-path deterministic resolver.
   */
  resolve(query: string): StructuredIntent {
    const trimmed = query.trim();

    // Adversarial Defense: Detect Prompt Injection / Command Execution Attempts
    if (this.isMaliciousQuery(trimmed)) {
      return {
        intentId: 'GENERAL_INQUIRY',
        intentCategory: 'GENERAL',
        confidence: 0.99,
        userQuery: trimmed.slice(0, 100),
        matchedWorkflowCode: null,
        suggestedActionTitle: 'Sovereign Public Interface Guardrail',
        suggestedActionDescription:
          'INDRA is the citizen operating layer for public services. Commands attempting to manipulate internal instructions or security policies are rejected.',
        humanExplanation: 'Please describe the public statutory service you need assistance with',
        statutoryAuthority: 'INDRA Universal Interface',
        extractedEntities: {},
        clarificationRequired: true,
        clarificationQuestion: 'What public statutory service would you like to get done?',
      };
    }

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          const extractedEntities = rule.extractEntities ? rule.extractEntities(trimmed) : {};
          return {
            intentId: rule.intentId,
            intentCategory: rule.category,
            confidence: 0.96,
            userQuery: trimmed,
            matchedWorkflowCode: rule.workflowCode || null,
            suggestedActionTitle: rule.actionTitle,
            suggestedActionDescription: rule.actionDescription,
            humanExplanation: rule.humanExplanation,
            statutoryAuthority: rule.statutoryAuthority,
            recoverableValue: rule.recoverableValue,
            extractedEntities,
            clarificationRequired: false,
          };
        }
      }
    }

    // Default conversational fallback
    return {
      intentId: 'GENERAL_INQUIRY',
      intentCategory: 'GENERAL',
      confidence: 0.4,
      userQuery: trimmed.slice(0, 300),
      matchedWorkflowCode: null,
      suggestedActionTitle: 'Tell INDRA what you need',
      suggestedActionDescription:
        'INDRA can assist you with business incorporation, EPF recovery, lost device protection, identity discrepancies, passport renewal, and welfare benefits.',
      humanExplanation: 'Tell me what public matter you need to handle',
      statutoryAuthority: 'INDRA Universal Interface',
      extractedEntities: {},
      clarificationRequired: true,
      clarificationQuestion:
        'Could you tell me a little more about what you want to get done? For example: "I want to start a company", "My PF transfer is stuck", or "My phone was stolen".',
    };
  }

  /**
   * Dual-mode resolver:
   * 1. Fast-path deterministic rule engine (0ms, zero tokens).
   * 2. If no canonical rule matches: calls StructuredLlmIntentAdapter.
   * 3. SAFETY BOUNDARY:
   *    - The LLM is an untrusted parser.
   *    - Its output MUST pass Zod validation AND Catalog validation.
   *    - If LLM returns an unknown intentId or invalid workflow, it is REJECTED.
   *    - Model confidence is NEVER used to authorize or execute actions.
   */
  async resolveAsync(query: string): Promise<StructuredIntent> {
    const fastResult = this.resolve(query);
    if (fastResult.confidence >= 0.9) {
      return fastResult;
    }

    const catalog: IntentCatalogItem[] = this.rules.map((r) => ({
      intentId: r.intentId,
      category: r.category,
      workflowCode: r.workflowCode,
      actionTitle: r.actionTitle,
      actionDescription: r.actionDescription,
    }));

    try {
      const rawLlm = await this.llmAdapter.resolveWithLlm(query, catalog);

      // 1. Zod Schema Validation
      const parsed = LlmIntentResolutionSchema.safeParse(rawLlm);
      if (!parsed.success) {
        console.warn('[IntentEngine] LLM output failed Zod schema validation:', parsed.error);
        return this.resolve(query); // Safe fallback
      }

      const llmResult = parsed.data;

      // 2. Deterministic Catalog Validation
      // The intentId MUST exist in our registered catalog
      const matchingRule = this.rules.find((r) => r.intentId === llmResult.intentId);
      if (!matchingRule && llmResult.intentId !== 'GENERAL_INQUIRY') {
        console.warn(
          `[IntentEngine Security Guardrail] Untrusted LLM returned unregistered intent '${llmResult.intentId}'. Safely rejecting.`
        );
        return this.resolve(query);
      }

      // 3. Workflow Validation
      let matchedWorkflowCode: string | null = null;
      if (matchingRule?.workflowCode) {
        matchedWorkflowCode = matchingRule.workflowCode;
      }

      return {
        intentId: matchingRule ? matchingRule.intentId : 'GENERAL_INQUIRY',
        intentCategory: matchingRule ? matchingRule.category : 'GENERAL',
        confidence: llmResult.confidence,
        userQuery: query.trim(),
        matchedWorkflowCode,
        suggestedActionTitle: matchingRule?.actionTitle || 'Tell INDRA what you need',
        suggestedActionDescription: llmResult.reasoningSummary || matchingRule?.actionDescription || '',
        humanExplanation: matchingRule?.humanExplanation || 'Tell me what public matter you need to handle',
        statutoryAuthority: matchingRule?.statutoryAuthority || 'INDRA Universal Interface',
        recoverableValue: matchingRule?.recoverableValue,
        extractedEntities: llmResult.extractedEntities || {},
        clarificationRequired: matchingRule ? false : true,
        clarificationQuestion: llmResult.clarificationQuestion,
      };
    } catch (err) {
      console.error('[IntentEngine] Error during LLM resolution fallback:', err);
      return this.resolve(query);
    }
  }
}
