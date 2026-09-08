import type { LifeEventCode, ActionPlanStepExecutionMode } from '@indra/contracts';
import type { CitizenWorldModel } from '@indra/contracts';

export interface ConsequenceStepTemplate {
  stepKey: string;
  capabilityId: string;
  title: string;
  authority: string;
  phaseIndex: number;
  dependencies: string[];
  executionMode: ActionPlanStepExecutionMode;
  estimatedDays: number;
  statutoryFeeInr: number;
  isApplicable: (worldModel: CitizenWorldModel, context: Record<string, any>) => boolean;
  deriveInput: (worldModel: CitizenWorldModel, context: Record<string, any>) => Record<string, any>;
}

export interface ConsequenceGraphDefinition {
  lifeEventCode: LifeEventCode;
  title: string;
  summaryTemplate: (worldModel: CitizenWorldModel, context: Record<string, any>) => string;
  estimatedDays: number;
  stepTemplates: ConsequenceStepTemplate[];
}

export const RELOCATION_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'RELOCATION',
  title: 'Moving to Another City (Address & Records)',
  summaryTemplate: (wm, ctx) =>
    `Update your official records in the right order: change your residential address on Aadhaar, transfer your vehicle registration (RTO), and update your voter ID. Moving from ${
      wm.profile.currentCity || 'origin'
    } to ${ctx.destinationCity || 'Pune'}, ${ctx.destinationState || 'Maharashtra'}.`,
  estimatedDays: 14,
  stepTemplates: [
    // Phase 1: Identity Foundation (UIDAI)
    {
      stepKey: 'update_aadhaar_address',
      capabilityId: 'identity.update_aadhaar_address',
      title: 'Update Address on Aadhaar',
      authority: 'Unique Identification Authority of India (UIDAI)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 3,
      statutoryFeeInr: 50,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        newAddress: ctx.newAddress || `Flat 102, Koregaon Park, ${ctx.destinationCity || 'Pune'}`,
        city: ctx.destinationCity || 'Pune',
        state: ctx.destinationState || 'Maharashtra',
        pincode: ctx.destinationPincode || '411001',
      }),
    },
    // Phase 2: Electoral Roll Transposition (ECI)
    {
      stepKey: 'transfer_voter_constituency',
      capabilityId: 'identity.transfer_voter_constituency',
      title: 'Update Voting Address (Voter ID Form 8)',
      authority: 'Election Commission of India (ECI)',
      phaseIndex: 2,
      dependencies: ['update_aadhaar_address'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 5,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        newConstituency:
          ctx.destinationConstituency || `${ctx.destinationCity || 'Pune'} Cantonment Constituency`,
        state: ctx.destinationState || 'Maharashtra',
        newAddress: ctx.newAddress || `Flat 102, Koregaon Park, ${ctx.destinationCity || 'Pune'}`,
      }),
    },
    // Phase 2: Driving Licence Endorsement (Sarathi)
    {
      stepKey: 'endorse_dl_address',
      capabilityId: 'transport.endorse_dl_address',
      title: 'Update Address on Driving Licence',
      authority: 'MoRTH Sarathi Portal',
      phaseIndex: 2,
      dependencies: ['update_aadhaar_address'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 4,
      statutoryFeeInr: 200,
      isApplicable: (wm) => wm.credentials.some((c: any) => c.type === 'DRIVING_LICENCE'),
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        newAddress: ctx.newAddress || `Flat 102, Koregaon Park, ${ctx.destinationCity || 'Pune'}`,
        destinationState: ctx.destinationState || 'Maharashtra',
        destinationRto: ctx.destinationRto || 'MH-12',
      }),
    },
    // Phase 2: Vehicle RC Transfer (Vahan) - ONLY if citizen holds motor vehicle
    {
      stepKey: 'transfer_vehicle_rc',
      capabilityId: 'transport.transfer_vehicle_rc',
      title: 'Transfer Vehicle to New State (RTO NOC Form 28)',
      authority: 'Ministry of Road Transport and Highways (MoRTH Vahan)',
      phaseIndex: 2,
      dependencies: ['update_aadhaar_address'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 7,
      statutoryFeeInr: 750,
      isApplicable: (wm) => wm.vehicles.length > 0,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        registrationNumber: wm.vehicles[0]?.registrationNumber || '',
        destinationState: ctx.destinationState || 'Maharashtra',
        destinationRto: ctx.destinationRto || 'MH-12',
        destinationAddress: ctx.newAddress || `Flat 102, Koregaon Park, ${ctx.destinationCity || 'Pune'}`,
      }),
    },
    // Phase 3: Sovereign Residence Credential Issuance
    {
      stepKey: 'issue_residence_vc',
      capabilityId: 'documents.issue_credential',
      title: 'Get Digital Address Certificate',
      authority: 'INDRA Sovereign Digital Credentials Exchange',
      phaseIndex: 3,
      dependencies: ['update_aadhaar_address'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        title: `Verifiable Residence Credential (${ctx.destinationCity || 'Pune'})`,
        documentType: 'VERIFIABLE_RESIDENCE_ASSERTION',
        issuer: 'INDRA Trust Network',
        documentNumber: `VRC-${(ctx.destinationCity || 'PUN').toUpperCase()}-${Date.now()
          .toString()
          .slice(-6)}`,
        payload: {
          residentName: wm.profile.fullName,
          city: ctx.destinationCity || 'Pune',
          state: ctx.destinationState || 'Maharashtra',
          verifiedAt: new Date().toISOString(),
        },
      }),
    },
  ],
};

export const NEW_EMPLOYMENT_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'NEW_EMPLOYMENT',
  title: 'Switching Jobs (Transfer PF & Tax)',
  summaryTemplate: (wm, ctx) =>
    `Move your Provident Fund (PF) balance from your old employer to your new job, and link your PAN card so extra tax is not deducted on transfers or withdrawals. Onboarding for ${ctx.employerName || 'new job'}.`,
  estimatedDays: 7,
  stepTemplates: [
    {
      stepKey: 'inquire_epfo_accounts',
      capabilityId: 'epfo.inquire_accounts',
      title: 'Check Your PF Accounts (EPFO)',
      authority: "Employees' Provident Fund Organisation (EPFO)",
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
    {
      stepKey: 'update_epfo_pan',
      capabilityId: 'epfo.update_kyc_pan',
      title: 'Link PAN Card to PF Account',
      authority: "Employees' Provident Fund Organisation (EPFO)",
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 2,
      statutoryFeeInr: 0,
      isApplicable: (wm) => wm.credentials.some((c: any) => c.type === 'PAN'),
      deriveInput: (wm) => {
        const pan = wm.credentials.find((c: any) => c.type === 'PAN');
        return {
          citizenId: wm.profile.id,
          panNumber: (pan as any)?.identifierMasked || 'ABCDE1234F',
        };
      },
    },
    {
      stepKey: 'consolidate_dormant_pf',
      capabilityId: 'epfo.transfer_claim',
      title: 'Transfer Old PF Balance to New Job (Form 13)',
      authority: "Employees' Provident Fund Organisation (EPFO)",
      phaseIndex: 2,
      dependencies: ['inquire_epfo_accounts', 'update_epfo_pan'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 3,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
        sourceMemberId: 'KNBLR0049281000010928',
        targetMemberId: 'MHPU0091248000012019',
      }),
    },
    {
      stepKey: 'fetch_form26as_tds',
      capabilityId: 'tax.fetch_form26as',
      title: 'Check Tax Deductions (Form 26AS)',
      authority: 'Income Tax Department (TRACES)',
      phaseIndex: 2,
      dependencies: ['update_epfo_pan'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: (wm) => wm.credentials.some((c: any) => c.type === 'PAN'),
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
        financialYear: '2025-26',
      }),
    },
  ],
};

export const START_BUSINESS_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'START_BUSINESS',
  title: 'Starting a Company (MCA, PAN & GST)',
  summaryTemplate: (wm, ctx) =>
    `Complete all government filings to register '${ctx.companyName || 'New Company'}': reserve company name, get certificate of incorporation, PAN card, and GST registration.`,
  estimatedDays: 10,
  stepTemplates: [
    {
      stepKey: 'reserve_company_name',
      capabilityId: 'business.reserve_name',
      title: 'Reserve Company Name (MCA RUN)',
      authority: 'Ministry of Corporate Affairs (MCA)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 1000,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        proposedName: ctx.companyName || 'AeroDynamics AI Solutions Private Limited',
        entityType: ctx.entityType || 'PRIVATE_LIMITED',
      }),
    },
    {
      stepKey: 'incorporate_company',
      capabilityId: 'business.incorporate',
      title: 'Register Company & Get Company PAN (SPICe+)',
      authority: 'Ministry of Corporate Affairs / Registrar of Companies',
      phaseIndex: 2,
      dependencies: ['reserve_company_name'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 4,
      statutoryFeeInr: 5000,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        companyName: ctx.companyName || 'AeroDynamics AI Solutions Private Limited',
        entityType: ctx.entityType || 'PRIVATE_LIMITED',
        registeredAddress: {
          line1: ctx.addressLine || '100 Feet Road, Indiranagar',
          city: ctx.city || wm.profile.currentCity || 'Bengaluru',
          state: ctx.state || wm.profile.currentState || 'Karnataka',
          pincode: ctx.pincode || '560038',
        },
        capitalInr: ctx.capitalInr || 1000000,
      }),
    },
    {
      stepKey: 'register_gstin',
      capabilityId: 'business.register_gstin',
      title: 'Apply for GST Number (GSTIN)',
      authority: 'Goods and Services Tax Network (GSTN)',
      phaseIndex: 3,
      dependencies: ['incorporate_company'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 2,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        entityId: ctx.entityId || '',
        stateCode: ctx.stateCode || '29',
      }),
    },
    {
      stepKey: 'register_udyam',
      capabilityId: 'business.register_udyam',
      title: 'Get MSME Udyam Certificate',
      authority: 'Ministry of Micro, Small and Medium Enterprises',
      phaseIndex: 3,
      dependencies: ['incorporate_company'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        entityId: ctx.entityId || '',
        enterpriseType: 'MICRO',
        majorActivity: 'SERVICES',
      }),
    },
  ],
};

export function validateGraphDefinition(definition: ConsequenceGraphDefinition): {
  valid: boolean;
  topologicalOrder: string[];
} {
  const stepKeys = new Set<string>();
  for (const step of definition.stepTemplates) {
    if (stepKeys.has(step.stepKey)) {
      throw new Error(
        `GraphValidationError: Duplicate stepKey '${step.stepKey}' in life event graph '${definition.lifeEventCode}'.`
      );
    }
    stepKeys.add(step.stepKey);
  }

  for (const step of definition.stepTemplates) {
    for (const dep of step.dependencies) {
      if (dep === step.stepKey) {
        throw new Error(
          `GraphValidationError: Self-dependency detected in step '${step.stepKey}'.`
        );
      }
      if (!stepKeys.has(dep)) {
        throw new Error(
          `GraphValidationError: Unknown dependency '${dep}' referenced by step '${step.stepKey}'.`
        );
      }
    }
  }

  // Kahn's Algorithm for Cycle Detection & Topological Ordering
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const key of stepKeys) {
    inDegree.set(key, 0);
    adjList.set(key, []);
  }

  for (const step of definition.stepTemplates) {
    for (const dep of step.dependencies) {
      adjList.get(dep)!.push(step.stepKey);
      inDegree.set(step.stepKey, inDegree.get(step.stepKey)! + 1);
    }
  }

  const queue: string[] = [];
  for (const [key, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(key);
  }
  // Sort queue alphabetically for deterministic ordering
  queue.sort();

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    topologicalOrder.push(curr);

    const neighbors = (adjList.get(curr) || []).sort();
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (topologicalOrder.length !== stepKeys.size) {
    throw new Error(
      `GraphValidationError: Cycle detected in dependency graph for life event '${definition.lifeEventCode}'.`
    );
  }

  return { valid: true, topologicalOrder };
}

export const BUY_PROPERTY_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'BUY_PROPERTY',
  title: 'Real Property Acquisition & Municipal Titling Cascade',
  summaryTemplate: (wm, ctx) =>
    `Comprehensive property acquisition cascade for Survey No. ${ctx.surveyNumber || '142/3'}, ${ctx.village || 'Varthur'}, Bengaluru.`,
  estimatedDays: 21,
  stepTemplates: [
    {
      stepKey: 'verify_encumbrance',
      capabilityId: 'property.verify_encumbrance',
      title: 'Inspect Registered Encumbrance (Form 15 Non-Encumbrance Certificate)',
      authority: 'Department of Stamps and Registration (Kaveri 2.0)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 2,
      statutoryFeeInr: 100,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        surveyNumber: ctx.surveyNumber || '142/3',
        subRegistrarOffice: ctx.subRegistrarOffice || 'Varthur SRO',
      }),
    },
    {
      stepKey: 'inquire_cadastral_survey',
      capabilityId: 'property.inquire_cadastral_survey',
      title: 'Fetch Cadastral Boundary Map & Spatial Geo-Fencing',
      authority: 'Survey, Settlement and Land Records Department (Bhoomi)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        surveyNumber: ctx.surveyNumber || '142/3',
        village: ctx.village || 'Varthur',
      }),
    },
    {
      stepKey: 'fetch_title_deed',
      capabilityId: 'property.fetch_title_deed',
      title: 'Retrieve Registered Parent Sale Deed from Sovereign Archive',
      authority: 'Department of Stamps and Registration (Kaveri 2.0)',
      phaseIndex: 2,
      dependencies: ['verify_encumbrance', 'inquire_cadastral_survey'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 3,
      statutoryFeeInr: 250,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        documentNumber: ctx.documentNumber || 'KA-BLR-VR-2024-00918',
        subRegistrarOffice: ctx.subRegistrarOffice || 'Varthur SRO',
        registrationYear: '2024',
      }),
    },
    {
      stepKey: 'apply_mutation',
      capabilityId: 'property.apply_mutation',
      title: 'Apply for Revenue Record Mutation & Record of Rights (RTC)',
      authority: 'Revenue Department (Bhoomi)',
      phaseIndex: 3,
      dependencies: ['fetch_title_deed'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 10,
      statutoryFeeInr: 500,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        propertyIdentifier: ctx.surveyNumber || '142/3',
        transactionType: 'SALE_ACQUISITION',
      }),
    },
    {
      stepKey: 'apply_water_connection',
      capabilityId: 'civic.apply_water_sewerage_connection',
      title: 'Sanction Municipal Water & Sewerage Supply Connection',
      authority: 'Bangalore Water Supply and Sewerage Board (BWSSB)',
      phaseIndex: 4,
      dependencies: ['apply_mutation'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 5,
      statutoryFeeInr: 2500,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        propertyIdentifier: ctx.surveyNumber || '142/3',
        connectionType: 'DOMESTIC',
        pipeDiameterMm: 15,
      }),
    },
  ],
};

export const CHILD_BIRTH_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'BIRTH_OF_CHILD',
  title: 'Child Vital Registration & Kinship Inclusion Cascade',
  summaryTemplate: (wm, ctx) =>
    `Statutory birth registration, immunization tracking, and family entitlement endorsement for infant born to ${wm.profile.fullName}.`,
  estimatedDays: 14,
  stepTemplates: [
    {
      stepKey: 'verify_vital_record',
      capabilityId: 'civic.verify_vital_record',
      title: 'Inquire Institutional Birth Registration Ledger (Civil Registration System)',
      authority: 'Civil Registration System (CRS / Office of Registrar General)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        recordType: 'BIRTH',
        registrationNumber: ctx.hospitalAckNumber || 'CRS-2026-BIRTH-0921',
      }),
    },
    {
      stepKey: 'fetch_vaccination_schedule',
      capabilityId: 'health.fetch_vaccination_certificate',
      title: 'Link Infant Immunization Ledger to ABDM Healthcare Identity',
      authority: 'Universal Immunization Programme (U-WIN / MoHFW)',
      phaseIndex: 2,
      dependencies: ['verify_vital_record'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
    {
      stepKey: 'inquire_family_tree',
      capabilityId: 'family.inquire_family_tree',
      title: 'Update Statutory Family Tree Ledger & Ration Member Registry',
      authority: 'Department of Food, Civil Supplies and Consumer Affairs',
      phaseIndex: 3,
      dependencies: ['verify_vital_record'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 2,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
    {
      stepKey: 'endorse_child_nomination',
      capabilityId: 'family.endorse_kinship_nomination',
      title: 'Endorse Dependent Child as Nominee Across Statutory Accounts',
      authority: 'EPFO & Scheduled Commercial Banks',
      phaseIndex: 4,
      dependencies: ['inquire_family_tree'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 3,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        nomineeName: ctx.childName || 'Child',
        relationship: 'DAUGHTER',
        sharePercentage: 50,
      }),
    },
  ],
};

export const CYBER_INCIDENT_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'CYBER_FRAUD_INCIDENT',
  title: 'Emergency Financial Cybercrime Containment Cascade',
  summaryTemplate: (wm, ctx) =>
    `Emergency inter-agency containment for reported financial fraud incident (disputed INR ${ctx.fraudAmountInr || 85000}).`,
  estimatedDays: 3,
  stepTemplates: [
    {
      stepKey: 'freeze_bank_account',
      capabilityId: 'security.freeze_compromised_account',
      title: 'Issue Regulatory Debit Freeze Broadcast across Compromised Accounts',
      authority: 'National Cyber Crime Reporting Portal (1930 / I4C)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        incidentBrief: ctx.incidentBrief || 'Unauthorized phishing transaction detected.',
      }),
    },
    {
      stepKey: 'lock_biometrics',
      capabilityId: 'identity.lock_biometrics',
      title: 'Emergency Lock on Sovereign Aadhaar Biometrics',
      authority: 'Unique Identification Authority of India (UIDAI)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
        action: 'LOCK',
        biometricTypes: ['FINGERPRINT', 'IRIS'],
      }),
    },
    {
      stepKey: 'report_cyber_fraud',
      capabilityId: 'security.report_cyber_fraud',
      title: 'Register Statutory Cyber Crime Complaint under IT Act Section 66D',
      authority: 'State Cyber Crime Police Station (1930)',
      phaseIndex: 2,
      dependencies: ['freeze_bank_account'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        incidentDate: ctx.incidentDate || new Date().toISOString().split('T')[0],
        fraudAmountInr: ctx.fraudAmountInr || 85000,
        suspectAccountOrPhone: ctx.suspectAccountOrPhone || '+91-9876543210',
        transactionRefNumber: ctx.transactionRefNumber || 'UPI/2026/091823901',
      }),
    },
    {
      stepKey: 'inquire_registered_sims',
      capabilityId: 'telecom.inquire_registered_sims',
      title: 'Scan Telecom Sanchar Saathi for Unauthorized SIM Subscriptions',
      authority: 'Department of Telecommunications (TAFCOP / CEIR)',
      phaseIndex: 3,
      dependencies: ['lock_biometrics'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
  ],
};

export const JOB_LOSS_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'JOB_LOSS',
  title: 'Employment Transition & Social Security Safety Net Cascade',
  summaryTemplate: (wm) =>
    `Social security activation, pension preservation, and tax adjustment cascade for ${wm.profile.fullName}.`,
  estimatedDays: 14,
  stepTemplates: [
    {
      stepKey: 'inquire_pension_status',
      capabilityId: 'epfo.inquire_pension_status',
      title: 'Inquire EPS 1995 Pension Eligibility & Service Scheme Certificate',
      authority: "Employees' Provident Fund Organisation (EPFO)",
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
    {
      stepKey: 'evaluate_social_welfare',
      capabilityId: 'welfare.evaluate_schemes',
      title: 'Evaluate Eligibility for Unemployment & Skill Transition Grants',
      authority: 'Ministry of Labour and Employment / State Welfare Board',
      phaseIndex: 2,
      dependencies: ['inquire_pension_status'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 2,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
    {
      stepKey: 'reconcile_tax_credits',
      capabilityId: 'tax.reconcile_ais_tis',
      title: 'Reconcile Final Severance TDS with Annual Information Statement',
      authority: 'Income Tax Department (AIS / TRACES)',
      phaseIndex: 3,
      dependencies: ['inquire_pension_status'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
        assessmentYear: '2025-26',
      }),
    },
  ],
};

export const FARMER_SEASONAL_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'FARMER_SEASONAL_CYCLE',
  title: 'Agricultural Season Entitlement & Crop Protection Cascade',
  summaryTemplate: (wm, ctx) =>
    `Seasonal agronomic advisory, credit verification, and crop insurance protection for ${ctx.season || 'Kharif'} cycle.`,
  estimatedDays: 10,
  stepTemplates: [
    {
      stepKey: 'fetch_soil_health_card',
      capabilityId: 'agriculture.fetch_soil_health_card',
      title: 'Fetch Soil Health Card & Nutrient Prescription',
      authority: 'Ministry of Agriculture & Farmers Welfare',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        surveyNumber: ctx.surveyNumber || 'SURVEY-78/2',
      }),
    },
    {
      stepKey: 'verify_kisan_credit_card',
      capabilityId: 'agriculture.verify_kisan_credit_card',
      title: 'Verify Kisan Credit Card (KCC) Subsidized Working Capital',
      authority: 'National Bank for Agriculture and Rural Development (NABARD)',
      phaseIndex: 2,
      dependencies: ['fetch_soil_health_card'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
    {
      stepKey: 'apply_crop_insurance',
      capabilityId: 'agriculture.apply_crop_insurance',
      title: 'Enroll in Pradhan Mantri Fasal Bima Yojana (PMFBY) Crop Cover',
      authority: 'Ministry of Agriculture & Farmers Welfare (PMFBY)',
      phaseIndex: 3,
      dependencies: ['verify_kisan_credit_card'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 2,
      statutoryFeeInr: 450,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        surveyNumber: ctx.surveyNumber || 'SURVEY-78/2',
        season: ctx.season || 'KHARIF',
        cropName: ctx.cropName || 'Paddy (Basmati)',
        areaHectares: ctx.areaHectares || 2.5,
      }),
    },
    {
      stepKey: 'verify_pmkisan_status',
      capabilityId: 'agriculture.verify_pmkisan_status',
      title: 'Confirm PM-KISAN Direct Benefit Transfer Installment Ledger',
      authority: 'Ministry of Agriculture & Farmers Welfare (PM-KISAN)',
      phaseIndex: 4,
      dependencies: ['apply_crop_insurance'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm) => ({
        citizenId: wm.profile.id,
      }),
    },
  ],
};

export const RELOCATION_PROPERTY_ACQUISITION_GRAPH: ConsequenceGraphDefinition = {
  lifeEventCode: 'RELOCATION_PROPERTY_ACQUISITION',
  title: 'Inter-Jurisdictional Relocation & Real Property Acquisition Cascade',
  summaryTemplate: (wm, ctx) =>
    `Statutory relocation from ${wm.profile.currentCity || 'Pune'} to Bengaluru and statutory acquisition of real property (Survey No. ${ctx.surveyNumber || '142/3'}, Devanahalli, Bengaluru) including cross-registry identity harmonization.`,
  estimatedDays: 17,
  stepTemplates: [
    {
      stepKey: 'update_aadhaar_address',
      capabilityId: 'identity.update_aadhaar_address',
      title: 'Update Aadhaar Residential Address',
      authority: 'Unique Identification Authority of India (UIDAI)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 2,
      statutoryFeeInr: 50,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        newAddress: ctx.destinationAddress || ctx.newAddress || `Plot 42, Survey No. ${ctx.surveyNumber || '142/3'}, Devanahalli, Bengaluru`,
        city: ctx.destinationCity || 'Bengaluru',
        state: ctx.destinationState || 'Karnataka',
        pincode: ctx.destinationPincode || '562110',
      }),
    },
    {
      stepKey: 'resolve_identity_discrepancy',
      capabilityId: 'identity.harmonize_records',
      title: 'Harmonize Legal Name Discrepancy Across Civil & Revenue Registries',
      authority: 'UIDAI & Department of Stamps and Registration (Kaveri 2.0)',
      phaseIndex: 1,
      dependencies: [],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 2,
      statutoryFeeInr: 100,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        targetRegistry: 'Kaveri 2.0 / Bhoomi Land Records (Devanahalli SRO)',
        variantName: ctx.deedTransfereeName || `${wm.profile.fullName.split(' ')[0]} Kumar Patel`,
        authoritativeName: wm.profile.fullName,
        supportingDocumentNumber: ctx.documentNumber || 'KA-BLR-DEV-2026-00481',
      }),
    },
    {
      stepKey: 'verify_encumbrance',
      capabilityId: 'property.verify_encumbrance',
      title: 'Inspect Registered Encumbrance (Form 15 Non-Encumbrance Certificate)',
      authority: 'Department of Stamps and Registration (Kaveri 2.0)',
      phaseIndex: 2,
      dependencies: [],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 1,
      statutoryFeeInr: 100,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        propertyIdentifier: ctx.surveyNumber || '142/3',
        searchYears: 15,
      }),
    },
    {
      stepKey: 'fetch_title_deed',
      capabilityId: 'property.fetch_title_deed',
      title: 'Retrieve Registered Parent Sale Deed from Sovereign Archive',
      authority: 'Department of Stamps and Registration (Kaveri 2.0)',
      phaseIndex: 2,
      dependencies: ['verify_encumbrance'],
      executionMode: 'AUTOMATED_SAFE_READ',
      estimatedDays: 2,
      statutoryFeeInr: 250,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        surveyNumber: ctx.surveyNumber || '142/3',
        propertyIdentifier: ctx.surveyNumber || '142/3',
        district: 'Bengaluru Rural',
        taluk: 'Devanahalli',
      }),
    },
    {
      stepKey: 'apply_mutation',
      capabilityId: 'property.apply_mutation',
      title: 'Apply for Revenue Record Mutation & Record of Rights (Bhoomi RTC)',
      authority: 'Revenue Department (Bhoomi / Tahsildar Office)',
      phaseIndex: 3,
      dependencies: ['fetch_title_deed', 'resolve_identity_discrepancy'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 7,
      statutoryFeeInr: 500,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        propertyIdentifier: ctx.surveyNumber || '142/3',
        registrationDeedNumber: ctx.documentNumber || 'KA-BLR-DEV-2026-00481',
        transfereeName: wm.profile.fullName,
      }),
    },
    {
      stepKey: 'transfer_vehicle_rc',
      capabilityId: 'transport.transfer_vehicle_rc',
      title: 'Transfer Motor Vehicle Registration Jurisdiction (MoRTH Vahan)',
      authority: 'Ministry of Road Transport and Highways (MoRTH Vahan)',
      phaseIndex: 3,
      dependencies: ['update_aadhaar_address'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 4,
      statutoryFeeInr: 750,
      isApplicable: (wm) => wm.vehicles.length > 0,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        registrationNumber: wm.vehicles[0]?.registrationNumber || 'MH-12-DE-9102',
        destinationState: ctx.destinationState || 'Karnataka',
        destinationRto: ctx.destinationRto || 'KA-50',
        destinationAddress: ctx.destinationAddress || `Plot 42, Survey No. ${ctx.surveyNumber || '142/3'}, Devanahalli, Bengaluru`,
      }),
    },
    {
      stepKey: 'issue_residence_vc',
      capabilityId: 'documents.issue_credential',
      title: 'Issue Cryptographic Verifiable Residence Credential',
      authority: 'INDRA Sovereign Digital Credentials Exchange',
      phaseIndex: 4,
      dependencies: ['update_aadhaar_address', 'apply_mutation'],
      executionMode: 'STATUTORY_AUTHORIZATION_REQUIRED',
      estimatedDays: 1,
      statutoryFeeInr: 0,
      isApplicable: () => true,
      deriveInput: (wm, ctx) => ({
        citizenId: wm.profile.id,
        title: `Verifiable Resident & Landowner Credential (${ctx.destinationCity || 'Bengaluru'})`,
        documentType: 'VERIFIABLE_RESIDENCE_ASSERTION',
        issuer: 'INDRA Sovereign Trust Network',
        documentNumber: `VRC-BLR-${Date.now().toString().slice(-6)}`,
        payload: {
          residentName: wm.profile.fullName,
          city: ctx.destinationCity || 'Bengaluru',
          state: ctx.destinationState || 'Karnataka',
          surveyNumber: ctx.surveyNumber || '142/3',
          taluk: 'Devanahalli',
          verifiedAt: new Date().toISOString(),
        },
      }),
    },
  ],
};

export class ConsequenceGraphEngine {
  private static instance: ConsequenceGraphEngine | null = null;
  private graphs: Map<LifeEventCode, ConsequenceGraphDefinition> = new Map();

  constructor() {
    this.registerGraph(RELOCATION_GRAPH);
    this.registerGraph(NEW_EMPLOYMENT_GRAPH);
    this.registerGraph(START_BUSINESS_GRAPH);
    this.registerGraph(BUY_PROPERTY_GRAPH);
    this.registerGraph(CHILD_BIRTH_GRAPH);
    this.registerGraph(CYBER_INCIDENT_GRAPH);
    this.registerGraph(JOB_LOSS_GRAPH);
    this.registerGraph(FARMER_SEASONAL_GRAPH);
    this.registerGraph(RELOCATION_PROPERTY_ACQUISITION_GRAPH);
  }

  static getInstance(): ConsequenceGraphEngine {
    if (!ConsequenceGraphEngine.instance) {
      ConsequenceGraphEngine.instance = new ConsequenceGraphEngine();
    }
    return ConsequenceGraphEngine.instance;
  }

  registerGraph(graph: ConsequenceGraphDefinition): void {
    validateGraphDefinition(graph);
    this.graphs.set(graph.lifeEventCode, graph);
  }

  getGraph(code: LifeEventCode): ConsequenceGraphDefinition | undefined {
    return this.graphs.get(code);
  }

  /**
   * Generates a concrete, customized consequence action plan for a citizen
   * by applying applicability predicates and deriving prefilled payloads
   * from the citizen's authoritative world model.
   * Supports partial plan customization via omittedStepKeys.
   */
  evaluatePlan(
    code: LifeEventCode,
    worldModel: CitizenWorldModel,
    context: Record<string, any> = {},
    omittedStepKeys: string[] = []
  ): {
    title: string;
    summary: string;
    estimatedDays: number;
    estimatedStatutoryFeesInr: number;
    steps: Array<{
      stepKey: string;
      capabilityId: string;
      title: string;
      authority: string;
      phaseIndex: number;
      dependencies: string[];
      executionMode: ActionPlanStepExecutionMode;
      initialState: 'READY' | 'BLOCKED' | 'SKIPPED';
      prefilledInput: Record<string, any>;
    }>;
  } {
    const graph = this.graphs.get(code);
    if (!graph) {
      throw new Error(`Consequence graph for life event '${code}' is not registered.`);
    }

    const applicableTemplates = graph.stepTemplates.filter((t) =>
      t.isApplicable(worldModel, context)
    );

    const omittedSet = new Set(omittedStepKeys);
    let totalFees = 0;
    const steps = applicableTemplates.map((t) => {
      const isOmitted = omittedSet.has(t.stepKey);
      if (!isOmitted) {
        totalFees += t.statutoryFeeInr;
      }
      const prefilledInput = t.deriveInput(worldModel, context);
      const isBlocked = t.dependencies.length > 0;

      let initialState: 'READY' | 'BLOCKED' | 'SKIPPED' = isBlocked ? 'BLOCKED' : 'READY';
      if (isOmitted) {
        initialState = 'SKIPPED';
      }

      return {
        stepKey: t.stepKey,
        capabilityId: t.capabilityId,
        title: t.title,
        authority: t.authority,
        phaseIndex: t.phaseIndex,
        dependencies: t.dependencies,
        executionMode: t.executionMode,
        initialState,
        prefilledInput,
      };
    });

    return {
      title: graph.title,
      summary: graph.summaryTemplate(worldModel, context),
      estimatedDays: graph.estimatedDays,
      estimatedStatutoryFeesInr: totalFees,
      steps,
    };
  }
}
