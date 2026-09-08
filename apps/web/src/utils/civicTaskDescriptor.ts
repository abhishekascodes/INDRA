import type {
  CivicTaskDescriptor,
  CivicTaskGroundTruthRecord,
  CivicTaskField,
  CivicTaskPrerequisite,
  CivicTaskDiscrepancy,
  CivicTaskDeclaration,
  CivicTaskDataDisclosure,
  CivicTaskConsequences,
  CivicTaskOutcomeReceipt,
} from '@indra/contracts';
import { formatStepTitle, formatHumanLabel } from './civicFormatters.js';

/**
 * Derives a contract-driven CivicTaskDescriptor for any capability in the 76-capability catalog,
 * tailored with deep authentic statutory metadata for the 8 representative experiences.
 */
export function getCivicTaskDescriptor(
  capabilityId: string,
  contextData: Record<string, any> = {},
  citizen: any = {},
  planStep?: any
): CivicTaskDescriptor {
  const citizenName = citizen?.primaryName || 'Priya Sharma';
  const aadhaarMasked = citizen?.aadhaarNumber ? `XXXX-XXXX-${citizen.aadhaarNumber.slice(-4)}` : 'XXXX-XXXX-9012';
  const pan = citizen?.pan || 'ABCP...04K';

  // --------------------------------------------------------------------------
  // 1. EMPLOYMENT / EPF: epfo.transfer_claim
  // --------------------------------------------------------------------------
  if (capabilityId === 'epfo.transfer_claim' || capabilityId === 'RECOVER_DORMANT_PF') {
    return {
      capabilityId: 'epfo.transfer_claim',
      title: 'Transfer Old PF Balance to New Job (Form 13)',
      subtitle: 'Move unlinked savings from your previous job into your current employer\'s PF account',
      authority: 'Employees\' Provident Fund Organisation (EPFO) · Ministry of Labour & Employment',
      statutoryAct: 'Employees\' Provident Funds and Miscellaneous Provisions Act, 1952 (Section 17A)',
      groundTruth: [
        {
          label: 'Universal Account Number (UAN)',
          value: '100904829104',
          sourceAuthority: 'EPFO Unified Member Portal',
          isVerified: true,
        },
        {
          label: 'Old PF Account (Previous Employer)',
          value: 'MH/BAN/0049210/000/0948201 · Apex Systems Global Services',
          sourceAuthority: 'EPFO Electronic Challan Return (ECR)',
          isVerified: true,
        },
        {
          label: 'Balance in Old PF Account',
          value: '₹1,42,500 (Stops earning interest if left inactive)',
          sourceAuthority: 'EPFO Central Passbook Ledger',
          isVerified: true,
        },
        {
          label: 'Current PF Account (New Employer)',
          value: 'KA/BLR/0184920/000/0192841 · InnoTech Solutions Private Limited',
          sourceAuthority: 'Current Employer Establishment Record',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'targetMemberId',
          label: 'Your New PF Member ID (Active Job)',
          type: 'TEXT',
          defaultValue: 'KA/BLR/0184920/000/0192841',
          required: true,
          helperText: 'Found from your current employer\'s monthly PF records.',
        },
        {
          fieldId: 'attestationThrough',
          label: 'Who Should Approve This First?',
          type: 'SELECT',
          defaultValue: 'PRESENT_EMPLOYER',
          options: [
            { label: 'Present Employer (InnoTech Solutions) - Fast 7-day digital sign', value: 'PRESENT_EMPLOYER' },
            { label: 'Previous Employer (Apex Systems)', value: 'PREVIOUS_EMPLOYER' },
          ],
          required: true,
        },
        {
          fieldId: 'reasonForTransfer',
          label: 'Reason for Transfer',
          type: 'TEXT',
          defaultValue: 'Consolidation of past employment service',
          required: false,
        },
      ],
      prerequisites: [
        {
          title: 'Aadhaar Verified & Seeded with UAN',
          authority: 'UIDAI & EPFO Member Portal',
          status: 'VERIFIED',
          details: `Verified with primary Aadhaar: ${aadhaarMasked}`,
        },
        {
          title: 'Bank Account Seeded & NPCI Active',
          authority: 'HDFC Bank & National Payments Corporation of India',
          status: 'VERIFIED',
          details: 'Account ending in ...8402 digitally matched and approved by employer.',
        },
        {
          title: 'Date of Exit Marked by Previous Establishment',
          authority: 'Apex Systems Global Services',
          status: 'VERIFIED',
          details: 'Exit date recorded: 31 May 2024 (Service: 38 months).',
        },
      ],
      consequences: {
        isIrreversible: true,
        severity: 'HIGH',
        warning:
          'Submitting Form 13 moves ₹1,42,500 from your old company to your new company. Once completed, your old PF account is closed and this cannot be undone.',
        downstreamUpdates: [
          'EPFO Central Passbook Balance',
          'National Pension Scheme Tier-II Records',
          'Citizen Employment Records',
        ],
      },
      declarations: [
        {
          id: 'decl_epfo_1',
          text: 'I hereby declare that all particulars stated above are true, complete, and correct according to my official records.',
          required: true,
          statutoryReference: 'EPF Act 1952, Section 17A',
        },
        {
          id: 'decl_epfo_2',
          text: 'I confirm that no prior withdrawal claim or final settlement has been claimed or received against Member ID MH/BAN/0049210/000/0948201.',
          required: true,
          statutoryReference: 'Employees\' Provident Funds Scheme, Paragraph 57',
        },
        {
          id: 'decl_epfo_3',
          text: 'I authorize EPFO and INDRA to synchronize service history for pension continuity under EPS 1995.',
          required: true,
          statutoryReference: 'Employees\' Pension Scheme 1995, Table B',
        },
      ],
      disclosures: [
        {
          recipient: 'Employees\' Provident Fund Organisation (EPFO)',
          purpose: 'Consolidation and inter-establishment ledger transfer of accumulated PF contributions',
          retention: 'Permanent statutory service ledger archive',
        },
        {
          recipient: 'InnoTech Solutions (Employer Establishment)',
          purpose: 'Digital Signature Certificate (DSC) verification and receipt acknowledgement',
          retention: 'Duration of active employment',
        },
      ],
      statutoryFeesInr: 0,
      actionVerb: 'Confirm & Transfer PF Balance',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: Form 13 PF Transfer Claim',
        referenceCode: output?.claimTrackingId || 'EPFO-F13-2026-09482',
        confirmationNotice:
          'Transfer claim successfully submitted to EPFO Regional Office. Electronic Annexure K generated for employer DSC signing.',
        authority: 'Employees\' Provident Fund Organisation (Ministry of Labour & Employment)',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'EPFO Central Passbook Ledger',
            status: 'CONVERGED',
            detail: 'Transferred ₹1,42,500 into KA/BLR/0184920/000/0192841. Member ID marked TRANSFERRED.',
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Consolidated employment records. Unlinked account alert resolved.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 2. PROPERTY: property.apply_mutation
  // --------------------------------------------------------------------------
  if (capabilityId === 'property.apply_mutation' || capabilityId.includes('mutation')) {
    return {
      capabilityId: 'property.apply_mutation',
      title: 'Transfer Property Ownership (Khata Mutation)',
      subtitle: 'Update official land and tax records so the property is legally registered in your name',
      authority: 'Department of Revenue & Survey Settlement · Government of Karnataka (Bhoomi)',
      statutoryAct: 'Karnataka Land Revenue Act, 1964 (Sections 128 & 129)',
      groundTruth: [
        {
          label: 'Plot & Survey Number',
          value: 'Plot 42, Aero Park, Devanahalli (Survey No. 142/2A)',
          sourceAuthority: 'Bhoomi Digital Cadastral Registry',
          isVerified: true,
        },
        {
          label: 'Registered Sale Deed Number',
          value: 'DOC-2026-BLR-09481 / Book 1',
          sourceAuthority: 'Kaveri 2.0 Sub-Registrar Office, Devanahalli',
          isVerified: true,
        },
        {
          label: 'Current Owner on Record',
          value: 'Gopal Rao (Seller)',
          sourceAuthority: 'State Revenue Bhoomi RTC Ledger',
          isVerified: true,
        },
        {
          label: 'Encumbrance Status (Loans & Dues)',
          value: 'Form 15 Nil Encumbrance Certificate Verified (0 Claims)',
          sourceAuthority: 'Kaveri Sub-Registrar Database',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'transfereeName',
          label: 'New Owner Legal Name',
          type: 'TEXT',
          defaultValue: citizenName,
          required: true,
          helperText: 'Must match the name on your registered sale deed.',
        },
        {
          fieldId: 'registrationDeedNumber',
          label: 'Sale Deed Document Number',
          type: 'TEXT',
          defaultValue: 'DOC-2026-BLR-09481',
          required: true,
        },
        {
          fieldId: 'mutationCategory',
          label: 'Type of Ownership Transfer',
          type: 'SELECT',
          defaultValue: 'ABSOLUTE_SALE',
          options: [
            { label: 'Sale Deed Transfer (Purchase)', value: 'ABSOLUTE_SALE' },
            { label: 'Inheritance / Family Succession', value: 'SUCCESSION' },
            { label: 'Court Decree / Partition', value: 'PARTITION' },
          ],
          required: true,
        },
      ],
      prerequisites: [
        {
          title: 'Registered Sale Deed in Kaveri 2.0',
          authority: 'Inspector General of Registration and Stamps',
          status: 'VERIFIED',
          details: 'Deed registration stamp duty & registration fees cleared.',
        },
        {
          title: 'Cadastral Geo-Demarcation (Podi / 11E Sketch)',
          authority: 'Survey Settlement and Land Records',
          status: 'VERIFIED',
          details: 'Parcel boundaries verified without encroachment flag.',
        },
      ],
      consequences: {
        isIrreversible: true,
        severity: 'HIGH',
        warning:
          'Submitting mutation starts a 30-day public notice period. Once passed with no objections, the property title and land tax records permanently transfer to your name.',
        downstreamUpdates: [
          'State Bhoomi RTC / Khata Ledger',
          'Municipal Property Tax Register',
          'Sub-Registrar Encumbrance Certificate',
        ],
      },
      declarations: [
        {
          id: 'decl_prop_1',
          text: 'I declare that I have acquired lawful right and title to the specified property through the registered deed cited above.',
          required: true,
          statutoryReference: 'Karnataka Land Revenue Act 1964, Section 128',
        },
        {
          id: 'decl_prop_2',
          text: 'I confirm that the property is free of pending litigation, attachment orders, or tenancy claims.',
          required: true,
          statutoryReference: 'Transfer of Property Act 1882, Section 52',
        },
      ],
      disclosures: [
        {
          recipient: 'Tahsildar / Revenue Inspector (Devanahalli Taluk)',
          purpose: 'Verification of sale deed, spot inspection, and public notice issuance',
          retention: 'Permanent land revenue ledger',
        },
      ],
      statutoryFeesInr: 250,
      actionVerb: 'Submit Property Mutation',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: Land Record Mutation Notice',
        referenceCode: output?.mutationNoticeNumber || 'BHOOMI-MUT-2026-84912',
        confirmationNotice:
          'Public Objection Notice generated. Revenue Inspector assigned for 30-day statutory notice period.',
        authority: 'Department of Revenue & Survey Settlement · Government of Karnataka',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'State Bhoomi Land Records',
            status: 'CONVERGED',
            detail: `Mutation notice registered for Survey 142/2A in favor of ${formData.transfereeName || citizenName}.`,
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Property ownership transfer started. Khata certificate issued after notice period.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 3. VEHICLE: transport.transfer_vehicle_rc
  // --------------------------------------------------------------------------
  if (capabilityId === 'transport.transfer_vehicle_rc' || capabilityId.includes('vehicle')) {
    return {
      capabilityId: 'transport.transfer_vehicle_rc',
      title: 'Transfer Vehicle to New State (RTO NOC Form 28)',
      subtitle: 'Apply for a No Objection Certificate (NOC) from your current RTO to register your vehicle in your new state',
      authority: 'Ministry of Road Transport and Highways (MoRTH) · Vahan National Register',
      statutoryAct: 'Motor Vehicles Act, 1988 (Section 48 - Grant of No Objection Certificate)',
      groundTruth: [
        {
          label: 'Vehicle Registration Number',
          value: 'KA-01-MJ-5021',
          sourceAuthority: 'MoRTH Vahan National Register',
          isVerified: true,
        },
        {
          label: 'Vehicle Model',
          value: 'Motor Car (LMV) · Tata Nexon EV MAX',
          sourceAuthority: 'State Transport Department (Karnataka)',
          isVerified: true,
        },
        {
          label: 'Current Registered RTO',
          value: 'KA-01 (Bengaluru Central - Koramangala RTO)',
          sourceAuthority: 'Regional Transport Office Records',
          isVerified: true,
        },
        {
          label: 'Chassis & Engine Verification',
          value: 'MBH4A8291048291 · Verified Match',
          sourceAuthority: 'Automaker Digital Vahan Certificate',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'destinationState',
          label: 'New State You Are Moving To',
          type: 'SELECT',
          defaultValue: 'Maharashtra',
          options: [
            { label: 'Maharashtra', value: 'Maharashtra' },
            { label: 'Karnataka', value: 'Karnataka' },
            { label: 'Delhi (NCT)', value: 'Delhi' },
            { label: 'Telangana', value: 'Telangana' },
          ],
          required: true,
        },
        {
          fieldId: 'destinationRto',
          label: 'New Local RTO Office',
          type: 'SELECT',
          defaultValue: 'MH-02 (Mumbai West)',
          options: [
            { label: 'MH-02 (Mumbai West - Andheri)', value: 'MH-02 (Mumbai West)' },
            { label: 'MH-01 (Mumbai South - Tardeo)', value: 'MH-01 (Mumbai South)' },
            { label: 'MH-12 (Pune Central)', value: 'MH-12 (Pune Central)' },
          ],
          required: true,
        },
        {
          fieldId: 'destinationAddress',
          label: 'Your New Home Address',
          type: 'TEXT',
          defaultValue: 'Flat 402, Sea Green Apts, Bandra West, Mumbai, MH 400050',
          required: true,
          helperText: 'Must match your verified residential address.',
        },
      ],
      prerequisites: [
        {
          title: 'Zero Pending Traffic E-Challan Fines',
          authority: 'National Traffic Challan Portal',
          status: 'VERIFIED',
          details: 'All traffic fines cleared. No pending court summons.',
        },
        {
          title: 'Valid Motor Insurance & Pollution (PUC)',
          authority: 'Insurance Information Bureau of India (IIB)',
          status: 'VERIFIED',
          details: 'Insurance active until 14 Nov 2026. PUC valid.',
        },
        {
          title: 'Bank Loan Clearance (Hypothecation)',
          authority: 'HDFC Bank Auto Loans & Vahan Portal',
          status: 'VERIFIED',
          details: 'Form 35 Loan Clearance recorded. Vehicle has no bank liens.',
        },
      ],
      consequences: {
        isIrreversible: false,
        severity: 'MEDIUM',
        warning:
          'Issuing Form 28 transfers registration authority from Karnataka. You must re-register the vehicle in Maharashtra within 60 days to avoid road tax penalties.',
        downstreamUpdates: [
          'Vahan National Register Database',
          'Karnataka State Road Tax Ledger',
          'Maharashtra Motor Vehicles Department',
        ],
      },
      declarations: [
        {
          id: 'decl_veh_1',
          text: 'I declare that the motor vehicle has not been involved in any theft, accident, or criminal investigation.',
          required: true,
          statutoryReference: 'Central Motor Vehicles Rules 1989, Rule 58',
        },
        {
          id: 'decl_veh_2',
          text: 'I certify that there are no arrears of tax or penalty payable in respect of the vehicle.',
          required: true,
          statutoryReference: 'Motor Vehicles Act 1988, Section 48(3)',
        },
      ],
      disclosures: [
        {
          recipient: 'Regional Transport Office (KA-01 Koramangala)',
          purpose: 'Verification of road tax clearance and issuance of Form 28 NOC',
          retention: '7 years statutory transport record',
        },
        {
          recipient: 'State Crime Records Bureau (SCRB Karnataka & Maharashtra)',
          purpose: 'Cross-check against national stolen vehicle database (Vahan-NCRB)',
          retention: 'Immediate query log',
        },
      ],
      statutoryFeesInr: 100,
      actionVerb: 'Submit RTO NOC Application',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: Form 28 Vehicle Inter-State NOC',
        referenceCode: output?.provenance?.entityId || 'VAHAN-NOC-2026-5021',
        confirmationNotice:
          'Inter-State NOC (Form 28) issued by RTO KA-01. Authority transferred to MH-02 Mumbai West.',
        authority: 'Ministry of Road Transport and Highways (MoRTH Vahan)',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'MoRTH Vahan National Register',
            status: 'CONVERGED',
            detail: 'NOC granted for KA-01-MJ-5021 to RTO MH-02 Mumbai West. Valid for 60 days.',
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Vehicle records updated with pending re-registration.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 4. TAX: tax.fetch_form_26as / CHECK_ITR_STATUS
  // --------------------------------------------------------------------------
  if (capabilityId === 'tax.fetch_form_26as' || capabilityId === 'tax.fetch_form26as' || capabilityId === 'CHECK_ITR_STATUS') {
    return {
      capabilityId: 'tax.fetch_form26as',
      title: 'Check Tax Deductions (Form 26AS)',
      subtitle: 'Check all taxes deducted by your employers and banks to verify your tax refund or dues',
      authority: 'Income Tax Department · Centralized Processing Centre (CPC Bengaluru)',
      statutoryAct: 'Income-tax Act, 1961 (Section 203AA & Section 139)',
      groundTruth: [
        {
          label: 'Permanent Account Number (PAN)',
          value: pan,
          sourceAuthority: 'Income Tax Department (NSDL/UTIITSL)',
          isVerified: true,
        },
        {
          label: 'Assessment Year',
          value: 'AY 2026-27 (Financial Year 2025-26)',
          sourceAuthority: 'Income Tax e-Filing Portal 2.0',
          isVerified: true,
        },
        {
          label: 'Total Tax Deducted at Source (TDS)',
          value: '₹1,84,200 (Deposited by InnoTech Solutions & Apex Systems)',
          sourceAuthority: 'TRACES Centralized TDS Statement',
          isVerified: true,
        },
        {
          label: 'Taxes Already Paid by You',
          value: '₹45,000 (Advance Tax Challan 280)',
          sourceAuthority: 'Income Tax Payment Ledger',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'financialYear',
          label: 'Financial Year to Check',
          type: 'SELECT',
          defaultValue: '2025-26',
          options: [
            { label: 'FY 2025-26 (AY 2026-27)', value: '2025-26' },
            { label: 'FY 2024-25 (AY 2025-26)', value: '2024-25' },
          ],
          required: true,
        },
        {
          fieldId: 'selectedForm',
          label: 'Income Tax Return Form (ITR)',
          type: 'SELECT',
          defaultValue: 'ITR-2',
          options: [
            { label: 'ITR-1 (Sahaj - Salary & Single House Property)', value: 'ITR-1' },
            { label: 'ITR-2 (Capital Gains & Multiple Properties)', value: 'ITR-2' },
          ],
          required: true,
        },
        {
          fieldId: 'bankAccountForRefund',
          label: 'Bank Account to Receive Tax Refund',
          type: 'TEXT',
          defaultValue: 'HDFC Bank · A/c ending in ...8402 (Pre-Validated)',
          required: true,
        },
      ],
      prerequisites: [
        {
          title: 'PAN Linked with Aadhaar',
          authority: 'Income Tax Department & UIDAI',
          status: 'VERIFIED',
          details: 'Active linkage confirmed. No fees pending.',
        },
        {
          title: 'Form 16 Tax Summary Reconciled',
          authority: 'Employer TRACES Portal',
          status: 'VERIFIED',
          details: 'Salary deductions match 100% with Income Tax records.',
        },
      ],
      consequences: {
        isIrreversible: false,
        severity: 'LOW',
        warning:
          'Verifying your Form 26AS checks that your employer actually deposited the tax they deducted from your salary, and saves a verified copy to your records.',
        downstreamUpdates: [
          'Income Tax e-Filing Portal',
          'TRACES Tax Reconciliation Ledger',
          'Digital Document Vault',
        ],
      },
      declarations: [
        {
          id: 'decl_tax_1',
          text: 'I declare that I have verified the TDS and Advance Tax credits against my actual bank statements.',
          required: true,
          statutoryReference: 'Income-tax Rules 1962, Rule 31AB',
        },
      ],
      disclosures: [
        {
          recipient: 'Income Tax Department (CPC Bengaluru)',
          purpose: 'e-Verification of tax return credits and refund determination',
          retention: '7-year statutory assessment period',
        },
      ],
      statutoryFeesInr: 0,
      actionVerb: 'Check Tax Statement',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: Form 26AS Tax Credit Statement',
        referenceCode: 'TRACES-26AS-2026-04812',
        confirmationNotice:
          'Annual Tax Statement reconciled with TRACES. Net eligible credit of ₹2,29,200 verified for AY 2026-27.',
        authority: 'Income Tax Department · Centralized Processing Centre',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'Income Tax e-Filing',
            status: 'CONVERGED',
            detail: 'Tax credits matched. Ready for tax return filing.',
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Tax liability and return status synchronized.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 5. CIVIC / MUNICIPAL: civic.update_utility_consumer
  // --------------------------------------------------------------------------
  if (capabilityId === 'civic.update_utility_consumer' || capabilityId.includes('utility')) {
    return {
      capabilityId: 'civic.update_utility_consumer',
      title: 'Transfer Electricity / Utility Bill to Your Name',
      subtitle: 'Transfer the power connection and deposit to your name following property registration',
      authority: 'Bangalore Electricity Supply Company (BESCOM) · Energy Department',
      statutoryAct: 'Electricity Act, 2003 (Section 43 & KERC Distribution Code)',
      groundTruth: [
        {
          label: 'Electricity Account (RR Number)',
          value: 'E-4019284-BES',
          sourceAuthority: 'BESCOM Central Billing System',
          isVerified: true,
        },
        {
          label: 'Service Address',
          value: 'Plot 42, Aero Park, Devanahalli, Bengaluru, KA 562110',
          sourceAuthority: 'Municipal Ward Database',
          isVerified: true,
        },
        {
          label: 'Previous Registered Consumer',
          value: 'V. K. Narayana (Previous Owner)',
          sourceAuthority: 'BESCOM Billing Ledger',
          isVerified: true,
        },
        {
          label: 'Outstanding Bill Amount',
          value: '₹0 (All bills paid - No dues)',
          sourceAuthority: 'BESCOM Revenue Billing Database',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'newHolderName',
          label: 'New Account Holder Name',
          type: 'TEXT',
          defaultValue: citizenName,
          required: true,
        },
        {
          fieldId: 'consumerNumber',
          label: 'Electricity Account RR Number',
          type: 'TEXT',
          defaultValue: 'E-4019284-BES',
          required: true,
        },
        {
          fieldId: 'utilityType',
          label: 'Utility Service Type',
          type: 'SELECT',
          defaultValue: 'ELECTRICITY',
          options: [
            { label: 'Electricity Power Connection (BESCOM)', value: 'ELECTRICITY' },
            { label: 'Water & Sewerage Connection (BWSSB)', value: 'WATER' },
          ],
          required: true,
        },
      ],
      prerequisites: [
        {
          title: 'Sale Deed / Property Ownership Verified',
          authority: 'Sub-Registrar Office Devanahalli',
          status: 'VERIFIED',
          details: 'Deed registration DOC-2026-BLR-09481 digitally verified.',
        },
        {
          title: 'Zero Arrears Clearance Certificate',
          authority: 'BESCOM Revenue Sub-Division',
          status: 'VERIFIED',
          details: 'Security deposit transferred to new applicant ledger.',
        },
      ],
      consequences: {
        isIrreversible: true,
        severity: 'MEDIUM',
        warning:
          'Submitting updates the consumer name on monthly electricity bills and transfers the permanent security deposit to you.',
        downstreamUpdates: [
          'BESCOM Billing & Revenue Portal',
          'Municipal Property Tax Ledger',
          'Citizen Civic Records',
        ],
      },
      declarations: [
        {
          id: 'decl_civic_1',
          text: 'I agree to abide by the Conditions of Supply of Electricity of Distribution Licensees in the State of Karnataka.',
          required: true,
          statutoryReference: 'Karnataka Electricity Regulatory Commission (KERC) Regulations',
        },
      ],
      disclosures: [
        {
          recipient: 'Bangalore Electricity Supply Company Limited (BESCOM)',
          purpose: 'Customer account transfer, billing notification, and outage alerts',
          retention: 'Duration of utility connection',
        },
      ],
      statutoryFeesInr: 150,
      actionVerb: 'Submit Utility Transfer',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: Utility Account Transfer',
        referenceCode: output?.endorsementId || 'BESCOM-END-2026-49210',
        confirmationNotice:
          'Consumer RR Number E-4019284-BES successfully transferred to new consumer name.',
        authority: 'Bangalore Electricity Supply Company Limited (BESCOM)',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'BESCOM Consumer Master Ledger',
            status: 'CONVERGED',
            detail: `Endorsed consumer account to ${formData.newHolderName || citizenName}. Billing updated.`,
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Utility connection linked to your Devanahalli property.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 6. IDENTITY DISCREPANCY: identity.update_pan_name / RESOLVE_NAME_MISMATCH
  // --------------------------------------------------------------------------
  if (capabilityId === 'identity.update_pan_name' || capabilityId === 'RESOLVE_NAME_MISMATCH') {
    return {
      capabilityId: 'identity.update_pan_name',
      title: 'Fix Name Mismatch on PAN Card',
      subtitle: 'Update your PAN card name so it matches your official Aadhaar name exactly',
      authority: 'Income Tax Department (NSDL / Protean / UTIITSL) · Central Board of Direct Taxes',
      statutoryAct: 'Income-tax Act, 1961 (Section 139AA) & Aadhaar Act, 2016',
      groundTruth: [
        {
          label: 'Name on PAN Card',
          value: 'Priya S. (Shortened)',
          sourceAuthority: 'Income Tax PAN Database',
          isVerified: true,
        },
        {
          label: 'Full Name on Aadhaar',
          value: 'Priya Sharma (Complete Name)',
          sourceAuthority: 'UIDAI Central Identities Data Repository (CIDR)',
          isVerified: true,
        },
        {
          label: 'Permanent Account Number',
          value: pan,
          sourceAuthority: 'CBDT PAN Registry',
          isVerified: true,
        },
        {
          label: 'Aadhaar Verification Status',
          value: 'Verified & Active',
          sourceAuthority: 'UIDAI Aadhaar Authentication Framework',
          isVerified: true,
        },
      ],
      discrepancy: {
        detected: true,
        field: 'Legal Holder Name',
        expectedValue: 'Priya Sharma',
        actualValue: 'Priya S.',
        authority: 'Cross-Registry Verification (UIDAI vs CBDT)',
        resolutionGuidance:
          'The shortened name on your PAN card ("Priya S.") does not match your Aadhaar card ("Priya Sharma"). This mismatch causes automatic rejections when transferring PF, renewing a passport, or opening bank accounts. Updating your PAN name to match Aadhaar fixes this immediately.',
      },
      fields: [
        {
          fieldId: 'correctedName',
          label: 'Correct Full Name (Matching Aadhaar)',
          type: 'TEXT',
          defaultValue: 'Priya Sharma',
          required: true,
          helperText: 'Must match the exact spelling on your Aadhaar card.',
        },
        {
          fieldId: 'supportingAadhaarNumber',
          label: 'Primary Aadhaar Reference',
          type: 'TEXT',
          defaultValue: citizen?.aadhaarNumber || '901248201948',
          required: true,
        },
      ],
      prerequisites: [
        {
          title: 'Demographic Similarity Match (Score: 94%)',
          authority: 'INDRA Verification Engine',
          status: 'VERIFIED',
          details: 'High-confidence name match confirmed for instant administrative correction.',
        },
        {
          title: 'Biometric Verification Token Active',
          authority: 'UIDAI Aadhaar Server',
          status: 'VERIFIED',
          details: 'Aadhaar verification token confirmed.',
        },
      ],
      consequences: {
        isIrreversible: false,
        severity: 'MEDIUM',
        warning:
          'Correcting your PAN name synchronizes your identity across banks, mutual funds, and EPFO. A revised digital e-PAN will be generated immediately.',
        downstreamUpdates: [
          'Income Tax Central PAN Database',
          'TRACES Income Tax Portal',
          'EPFO Member Profile Master',
        ],
      },
      declarations: [
        {
          id: 'decl_pan_1',
          text: 'I declare that "Priya S." and "Priya Sharma" refer to one and the same person, being myself.',
          required: true,
          statutoryReference: 'Income-tax Rules 1962, Form 49A',
        },
        {
          id: 'decl_pan_2',
          text: 'I authorize the Income Tax Department to update my PAN records to match my verified Aadhaar identity.',
          required: true,
          statutoryReference: 'Income-tax Act 1961, Section 139AA',
        },
      ],
      disclosures: [
        {
          recipient: 'Protean eGov Technologies / UTIITSL',
          purpose: 'PAN data correction processing and digital e-PAN dispatch',
          retention: 'Statutory PAN lifecycle archive',
        },
      ],
      statutoryFeesInr: 110,
      actionVerb: 'Fix Name Mismatch',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: PAN Name Correction',
        referenceCode: 'PAN-CORR-2026-09481',
        confirmationNotice:
          'PAN holder name synchronized with Aadhaar. Digital e-PAN issued in the name of Priya Sharma.',
        authority: 'Income Tax Department · NSDL e-Governance',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'Income Tax Department PAN Registry',
            status: 'CONVERGED',
            detail: 'Name updated from "Priya S." to "Priya Sharma". e-PAN generated.',
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Cross-registry name mismatch resolved across official records.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 7. GRIEVANCE / SECURITY: telecom.block_stolen_device / LOST_DEVICE_PROTECTION
  // --------------------------------------------------------------------------
  if (capabilityId === 'telecom.block_stolen_device' || capabilityId === 'LOST_DEVICE_PROTECTION' || capabilityId === 'LOST_PHONE') {
    return {
      capabilityId: 'telecom.block_stolen_device',
      title: 'Block Stolen Phone & SIM Card (CEIR)',
      subtitle: 'Immediately block your phone across all Indian mobile networks so no one can misuse your SIM or banking apps',
      authority: 'Department of Telecommunications (DoT - CEIR) & National Cyber Crime Reporting Portal',
      statutoryAct: 'Telecommunications Act, 2023 (Section 19 - Equipment Identity Verification)',
      groundTruth: [
        {
          label: 'Your Mobile Number',
          value: '+91 98765 43210',
          sourceAuthority: 'Telecom Provider Registry (Jio)',
          isVerified: true,
        },
        {
          label: 'Phone Model & IMEI Number',
          value: '359281049281049 (Apple iPhone 15 Pro)',
          sourceAuthority: 'Central Equipment Identity Register (CEIR)',
          isVerified: true,
        },
        {
          label: 'SIM Network Status',
          value: 'Active · Connected to Bengaluru Urban Tower 402',
          sourceAuthority: 'Telecom Network Gateway',
          isVerified: true,
        },
        {
          label: 'SIM Identifier (IMSI)',
          value: '404-45-82910482910',
          sourceAuthority: 'DoT National Numbering Database',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'reason',
          label: 'What Happened to Your Device?',
          type: 'SELECT',
          defaultValue: 'STOLEN',
          options: [
            { label: 'Device Stolen / Pickpocketed (Immediate Carrier Lock)', value: 'STOLEN' },
            { label: 'Device Lost / Misplaced', value: 'LOST' },
          ],
          required: true,
        },
        {
          fieldId: 'incidentLocation',
          label: 'Location Where Device Was Lost or Stolen',
          type: 'TEXT',
          defaultValue: 'Indiranagar 100ft Road, Bengaluru, Karnataka',
          required: true,
        },
        {
          fieldId: 'alternateContact',
          label: 'Emergency Alternate Phone Number',
          type: 'TEXT',
          defaultValue: '+91 98450 11223',
          required: true,
          helperText: 'Used by Police and CEIR for verification updates.',
        },
      ],
      prerequisites: [
        {
          title: 'SIM Registration Matches Aadhaar Identity',
          authority: 'UIDAI & Department of Telecommunications',
          status: 'VERIFIED',
          details: 'SIM owner identity confirmed against your Aadhaar record.',
        },
        {
          title: 'IMEI Association Confirmed on Network Logs',
          authority: 'Telecom Provider Network',
          status: 'VERIFIED',
          details: 'Handset verified as active on mobile number +91 98765 43210.',
        },
      ],
      consequences: {
        isIrreversible: false,
        severity: 'CRITICAL',
        warning:
          'Blocking your device immediately shuts down cellular signal across ALL Indian operators (Airtel, Jio, Vi, BSNL). An official police theft report receipt is issued.',
        downstreamUpdates: [
          'CEIR National Blacklist Database',
          'All Indian Mobile Operators (Jio, Airtel, Vi, BSNL)',
          'National Cyber Crime Reporting Portal',
        ],
      },
      declarations: [
        {
          id: 'decl_ceir_1',
          text: 'I declare that the handset whose IMEI is stated above is my personal property and has been lost or stolen.',
          required: true,
          statutoryReference: 'Telecommunications Act 2023, Section 19',
        },
        {
          id: 'decl_ceir_2',
          text: 'I understand that submitting a false theft report is a punishable offence under Section 217 of the Bharatiya Nyaya Sanhita (BNS).',
          required: true,
          statutoryReference: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
        },
      ],
      disclosures: [
        {
          recipient: 'Central Equipment Identity Register (CEIR)',
          purpose: 'National handset IMEI blacklisting and carrier lock',
          retention: 'Permanent until unblocked by verified owner',
        },
        {
          recipient: 'State Police Cyber Crime Division',
          purpose: 'Electronic Loss Report (e-LDR) registration and investigation',
          retention: 'Criminal justice investigation archive',
        },
      ],
      statutoryFeesInr: 0,
      actionVerb: 'Block Phone & Protect SIM',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: Stolen Device Block & Police e-Report',
        referenceCode: output?.ceirTicketNumber || 'CEIR-BLK-2026-09482',
        confirmationNotice:
          'Handset IMEI blacklisted across all Indian mobile networks. SIM deactivated to protect your bank accounts.',
        authority: 'Department of Telecommunications (DoT) & Cyber Police Bengaluru',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'CEIR National Equipment Blacklist',
            status: 'CONVERGED',
            detail: 'IMEI 359281049281049 blocked. Device cannot connect to any network.',
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Emergency defense mode active. Banking OTP protection enabled.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 8. COMPLEX CROSS-DOMAIN TRANSITION: business.reserve_name / START_BUSINESS
  // --------------------------------------------------------------------------
  if (capabilityId === 'business.reserve_name' || capabilityId === 'START_BUSINESS') {
    return {
      capabilityId: 'business.reserve_name',
      title: 'Reserve Company Name (MCA RUN)',
      subtitle: 'Reserve your chosen business name with the Ministry of Corporate Affairs before registering your company',
      authority: 'Ministry of Corporate Affairs (MCA) · Office of the Registrar of Companies (ROC)',
      statutoryAct: 'Companies Act, 2013 (Section 4 & Companies (Incorporation) Rules, 2014)',
      groundTruth: [
        {
          label: 'Director / Founder Name',
          value: `${citizenName} (Director Designate)`,
          sourceAuthority: 'Ministry of Corporate Affairs (DIN Portal)',
          isVerified: true,
        },
        {
          label: 'Primary Aadhaar Reference',
          value: aadhaarMasked,
          sourceAuthority: 'UIDAI Aadhaar Authentication Server',
          isVerified: true,
        },
        {
          label: 'Registrar of Companies (ROC Office)',
          value: 'ROC Karnataka (Bengaluru)',
          sourceAuthority: 'MCA Regional Directorate',
          isVerified: true,
        },
        {
          label: 'Business Industry Category',
          value: 'NIC 3030 · Aerospace & Precision Manufacturing',
          sourceAuthority: 'National Industrial Classification',
          isVerified: true,
        },
      ],
      fields: [
        {
          fieldId: 'proposedName1',
          label: 'Company Name Choice 1',
          type: 'TEXT',
          defaultValue: 'AeroDynamics Systems Private Limited',
          required: true,
          helperText: 'Must end with "Private Limited" or "Limited".',
        },
        {
          fieldId: 'proposedName2',
          label: 'Company Name Choice 2 (Backup)',
          type: 'TEXT',
          defaultValue: 'AeroDynamics Precision Tech Private Limited',
          required: false,
          helperText: 'Used automatically if your first choice has conflicts.',
        },
        {
          fieldId: 'businessObjective',
          label: 'What Will Your Business Do?',
          type: 'TEXTAREA',
          defaultValue: 'Design, manufacture, and deployment of aerial systems and precision components.',
          required: true,
        },
      ],
      prerequisites: [
        {
          title: 'Trademark Clearance Check',
          authority: 'Controller General of Patents, Designs and Trade Marks',
          status: 'VERIFIED',
          details: 'No conflicting or identical registered trademarks found.',
        },
        {
          title: 'Director Identity & KYC Verified',
          authority: 'Ministry of Corporate Affairs',
          status: 'VERIFIED',
          details: 'Director identity verified with active Director PIN status.',
        },
      ],
      consequences: {
        isIrreversible: true,
        severity: 'MEDIUM',
        warning:
          'Name approval reserves the exclusive company name for 20 days. You must file company incorporation (SPICe+) within this window.',
        downstreamUpdates: [
          'MCA Central Registration Centre (CRC)',
          'National Trademark Database',
          'Citizen Business Records',
        ],
      },
      declarations: [
        {
          id: 'decl_mca_1',
          text: 'I declare that the proposed name does not resemble closely the name of an existing company or registered trademark.',
          required: true,
          statutoryReference: 'Companies Act 2013, Section 4(2)',
        },
        {
          id: 'decl_mca_2',
          text: 'I certify that the proposed business objects are lawful and compliant with relevant regulations.',
          required: true,
          statutoryReference: 'Companies (Incorporation) Rules 2014, Rule 8',
        },
      ],
      disclosures: [
        {
          recipient: 'Ministry of Corporate Affairs (Central Registration Centre)',
          purpose: 'Name availability assessment and public company ledger reservation',
          retention: '20 days reservation window, permanent ROC archive',
        },
      ],
      statutoryFeesInr: 1000,
      actionVerb: 'Reserve Company Name',
      requiresAuthorization: true,
      generateOutcome: (formData, output) => ({
        receiptTitle: 'Official Digital Receipt: MCA Company Name Approval',
        referenceCode: output?.srn || 'MCA-RUN-2026-09482',
        confirmationNotice:
          'Proposed name "AeroDynamics Systems Private Limited" successfully reserved. Valid for 20 days for company registration.',
        authority: 'Ministry of Corporate Affairs · Central Registration Centre',
        timestamp: new Date().toISOString(),
        verifiedUpdates: [
          {
            registry: 'MCA Central Registration Centre',
            status: 'CONVERGED',
            detail: 'Name reserved with SRN: MCA-RUN-2026-09482. Phase 2 unblocked.',
          },
          {
            registry: 'Citizen Records',
            status: 'CONVERGED',
            detail: 'Company entity initialized. Ready for registration and tax setup.',
          },
        ],
      }),
    };
  }

  // --------------------------------------------------------------------------
  // 9. GENERIC CONTRACT-DRIVEN FALLBACK FOR ANY OTHER CAPABILITY (IN THE 76 CATALOG)
  // --------------------------------------------------------------------------
  const rawTitle = planStep?.title || capabilityId;
  const humanTitle = formatStepTitle(rawTitle, planStep?.stepKey || capabilityId);
  const authorityDomain = capabilityId.split('.')[0]?.toUpperCase() || 'CIVIC';
  
  return {
    capabilityId,
    title: humanTitle,
    subtitle: planStep?.description || `Official government processing for ${humanTitle}`,
    authority: planStep?.authority || `Government Department · ${authorityDomain}`,
    statutoryAct: 'Digital Personal Data Protection Act, 2023 & Relevant Public Acts',
    groundTruth: [
      {
        label: 'Citizen Identity',
        value: `${citizenName} · ${aadhaarMasked}`,
        sourceAuthority: 'UIDAI Aadhaar Verified Records',
        isVerified: true,
      },
      {
        label: 'Operational Status',
        value: 'Ready for Submission',
        sourceAuthority: 'INDRA Verified Records',
        isVerified: true,
      },
    ],
    fields: [
      {
        fieldId: 'notes',
        label: 'Filing Remarks / Specific Instructions',
        type: 'TEXT',
        defaultValue: 'Standard public administration filing',
        required: false,
      },
    ],
    prerequisites: [
      {
        title: 'Citizen Identity Verified',
        authority: 'National Public Infrastructure',
        status: 'VERIFIED',
        details: 'Identity verified against official records without contradiction.',
      },
    ],
    consequences: {
      isIrreversible: planStep?.isIrreversible ?? false,
      severity: 'MEDIUM',
      warning: 'Submitting this will officially send your details to the relevant department.',
      downstreamUpdates: ['Official Department Records', 'My Records'],
    },
    declarations: [
      {
        id: 'decl_generic_1',
        text: 'I confirm that the details provided are accurate and complete to the best of my knowledge.',
        required: true,
        statutoryReference: 'Digital Personal Data Protection Act 2023, Section 6',
      },
    ],
    disclosures: [
      {
        recipient: planStep?.authority || 'Relevant Government Department',
        purpose: 'Application processing and official record maintenance',
        retention: 'Statutory audit period',
      },
    ],
    statutoryFeesInr: planStep?.estimatedFeeInr || 0,
    actionVerb: 'Confirm & Submit',
    requiresAuthorization: true,
    generateOutcome: (formData, output) => ({
      receiptTitle: `Official Digital Receipt: ${humanTitle}`,
      referenceCode: output?.trackingId || output?.referenceId || `INDRA-STAT-${Math.floor(100000 + Math.random() * 900000)}`,
      confirmationNotice: `Your application for ${humanTitle} was submitted successfully.`,
      authority: planStep?.authority || 'Official Government Department',
      timestamp: new Date().toISOString(),
      verifiedUpdates: [
        {
          registry: 'Department Records',
          status: 'CONVERGED',
          detail: 'Official record updated and registered.',
        },
      ],
    }),
  };
}
