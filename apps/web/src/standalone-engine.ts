// Autonomous In-Browser Execution Engine for INDRA
// Provides zero-latency, offline-capable, deterministic execution of all
// 44 INDRA public civic operating layer endpoints when deployed on Cloudflare Pages/Workers or static edge hosting.

export const AARAV_PATEL_ID = 'aarav-uuid-001';
export const PRIYA_SHARMA_ID = 'priya-uuid-002';

const STORAGE_KEY = 'indra_autonomous_state_v4';

interface CitizenStore {
  activeCitizenId: string;
  authenticated: boolean;
  simulation: {
    simulatePropertyOutage: boolean;
    failNextPropertyRequest: boolean;
    injectDeedContradiction: boolean;
  };
  citizens: Record<string, any>;
  transitions: Record<string, any>;
  findings: Record<string, any[]>;
  actionPlans: Record<string, any[]>;
  consentArtifacts: Record<string, any[]>;
  workflows: Record<string, any>;
}

function getInitialState(): CitizenStore {
  return {
    activeCitizenId: AARAV_PATEL_ID,
    authenticated: true,
    simulation: {
      simulatePropertyOutage: false,
      failNextPropertyRequest: false,
      injectDeedContradiction: true,
    },
    citizens: {
      [AARAV_PATEL_ID]: {
        profile: {
          id: AARAV_PATEL_ID,
          primaryName: 'Aarav Patel',
          fullName: 'Aarav Patel',
          dateOfBirth: '1991-03-22',
          gender: 'Male',
          primaryMobile: '+91 91234 56789',
          primaryEmail: 'aarav.patel@example.in',
          currentCity: 'Pune',
          currentState: 'Maharashtra',
        },
        credentials: [
          {
            type: 'AADHAAR',
            identifierMasked: 'XXXX-XXXX-4567',
            status: 'ACTIVE',
            issuedDate: '2011-08-20',
            metadata: { holderName: 'Aarav Patel', gender: 'Male', yob: '1991' },
          },
          {
            type: 'PAN',
            identifierMasked: 'BCDEF****K',
            status: 'ACTIVE',
            issuedDate: '2013-11-14',
            metadata: { holderName: 'Aarav Patel', fathersName: 'Dinesh Patel' },
          },
          {
            type: 'DRIVING_LICENCE',
            identifierMasked: 'MH-12-2016-******',
            status: 'ACTIVE',
            issuedDate: '2016-06-18',
            expiryDate: '2036-06-17',
            metadata: { holderName: 'Aarav Patel', class: 'LMV', rto: 'MH-12 Pune' },
          },
          {
            type: 'UAN',
            identifierMasked: '1019****8821',
            status: 'ACTIVE',
            issuedDate: '2018-09-01',
            metadata: { uanNumber: '101988219012' },
          },
        ],
        primaryAddress: {
          line1: 'Flat 402, Kothrud Heights',
          line2: 'Paud Road, Kothrud',
          city: 'Pune',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '411038',
          isVerified: true,
          validSince: '2020-04-01',
        },
        epfoAccounts: [
          {
            memberId: 'MHPUN0098210000001824',
            establishmentName: 'TechCorp India Pune Pvt Ltd',
            status: 'ACTIVE',
            pfBalance: 85000,
          },
          {
            memberId: 'KNBLR0049281000010928',
            establishmentName: 'CloudScale Technologies Bengaluru Pvt Ltd',
            status: 'INACTIVE',
            pfBalance: 42000,
          },
        ],
      },
      [PRIYA_SHARMA_ID]: {
        profile: {
          id: PRIYA_SHARMA_ID,
          primaryName: 'Priya Sharma',
          fullName: 'Priya Sharma',
          dateOfBirth: '1994-08-14',
          gender: 'Female',
          primaryMobile: '+91 98765 43210',
          primaryEmail: 'priya.sharma@example.in',
          currentCity: 'Bengaluru',
          currentState: 'Karnataka',
        },
        credentials: [
          {
            type: 'AADHAAR',
            identifierMasked: 'XXXX-XXXX-9912',
            status: 'ACTIVE',
            issuedDate: '2012-05-10',
            metadata: { holderName: 'Priya Sharma', gender: 'Female', yob: '1994' },
          },
          {
            type: 'PAN',
            identifierMasked: 'ABCKD****L',
            status: 'ACTIVE',
            issuedDate: '2015-02-19',
            metadata: { holderName: 'Priya Sharma', fathersName: 'Ramesh Sharma' },
          },
        ],
        primaryAddress: {
          line1: 'No. 24, Indiranagar 100ft Road',
          line2: 'Indiranagar 1st Stage',
          city: 'Bengaluru',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          pincode: '560038',
          isVerified: true,
          validSince: '2021-08-15',
        },
        epfoAccounts: [
          {
            memberId: 'KNBLR0012938000002910',
            establishmentName: 'InnoTech Solutions India Ltd',
            status: 'ACTIVE',
            pfBalance: 142000,
          },
        ],
      },
    },
    transitions: {},
    findings: {
      [AARAV_PATEL_ID]: [
        {
          id: 'FIND-DL-RENEW-01',
          citizenId: AARAV_PATEL_ID,
          category: 'CREDENTIAL_LIFECYCLE',
          urgency: 'HIGH',
          title: 'Commercial Driving Licence Endorsement Due',
          description: 'Your Pune RTO driving licence has an optional commercial badge renewal window open for next 30 days.',
          status: 'ACTIVE',
          actionLink: '/services/driving-licence',
          actionText: 'Renew Endorsement',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'FIND-EPFO-NOMINEE-02',
          citizenId: AARAV_PATEL_ID,
          category: 'ANOMALY_CONTRADICTION',
          urgency: 'MEDIUM',
          title: 'EPFO Digital Nominee Aadhaar Verified',
          description: 'Spouse nominee record for Ananya Patel successfully linked with UIDAI repository.',
          status: 'ACTIVE',
          actionLink: '/services/epfo',
          actionText: 'View Mandate',
          createdAt: new Date().toISOString(),
        },
      ],
      [PRIYA_SHARMA_ID]: [
        {
          id: 'FIND-PROPERTY-TAX-01',
          citizenId: PRIYA_SHARMA_ID,
          category: 'OBLIGATION_DEADLINE',
          urgency: 'MEDIUM',
          title: 'BBMP Property Tax Rebate Window Active',
          description: '5% rebate available for early property tax payment before April 30th under Bengaluru BBMP SAS scheme.',
          status: 'ACTIVE',
          actionLink: '/services/property-tax',
          actionText: 'Pay with 5% Rebate',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    actionPlans: {},
    consentArtifacts: {
      [AARAV_PATEL_ID]: [
        {
          id: 'ART-DPDP-UIDAI-001',
          citizenId: AARAV_PATEL_ID,
          purposeCode: 'CROSS_STATE_RELOCATION_MUTATION',
          dataController: 'Unique Identification Authority of India (UIDAI)',
          recipientEntity: 'Karnataka Revenue Dept (Bhoomi)',
          purposeDescription: 'Aadhaar e-KYC address verification for land mutation and BESCOM connection.',
          dataCategories: ['DEMOGRAPHIC_ADDRESS', 'NAME', 'CONTACT_PHONE'],
          validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ART-DPDP-EPFO-002',
          citizenId: AARAV_PATEL_ID,
          purposeCode: 'EPFO_PENSION_AUTOMATION',
          dataController: 'Employees Provident Fund Organisation (EPFO)',
          recipientEntity: 'TechCorp India Pune Pvt Ltd',
          purposeDescription: 'Statutory PF balance verification and automatic transfer protocol.',
          dataCategories: ['EMPLOYMENT_HISTORY', 'FINANCIAL_PF_RECORD'],
          validUntil: new Date(Date.now() + 180 * 86400000).toISOString(),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    workflows: {},
  };
}

function loadStore(): CitizenStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }
  const initial = getInitialState();
  saveStore(initial);
  return initial;
}

function saveStore(store: CitizenStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // quota
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleStandaloneApi(input: string, init: RequestInit = {}): Promise<Response> {
  const store = loadStore();
  const url = new URL(input, 'http://dummy');
  const path = url.pathname;
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : {};

  let activeId = store.activeCitizenId || AARAV_PATEL_ID;
  const customCitizenId = (init.headers as any)?.['x-citizen-id'];
  if (customCitizenId === 'priya' || customCitizenId === 'priya-sharma' || customCitizenId === PRIYA_SHARMA_ID) {
    activeId = PRIYA_SHARMA_ID;
  } else if (customCitizenId === 'aarav' || customCitizenId === 'aarav-patel' || customCitizenId === AARAV_PATEL_ID) {
    activeId = AARAV_PATEL_ID;
  }

  // 1. Health
  if (path === '/api/health') {
    return jsonResponse({
      status: 'healthy',
      system: 'INDRA Universal Public Operating Layer',
      environment: 'autonomous-in-browser-sovereign-node',
      database: 'connected (in-browser sovereign store)',
      registeredCapabilitiesCount: 18,
      registeredWorkflowsCount: 12,
    });
  }

  // 2. Auth me
  if (path === '/api/auth/me') {
    const currentCitizen = store.citizens[activeId] || store.citizens[AARAV_PATEL_ID];
    return jsonResponse({
      authenticated: store.authenticated,
      user: store.authenticated
        ? {
            id: 'user-' + activeId,
            email: currentCitizen.profile.primaryEmail,
            role: 'CITIZEN',
          }
        : null,
      citizen: store.authenticated ? currentCitizen.profile : null,
      session: store.authenticated
        ? {
            id: 'sess-' + activeId + '-' + Date.now(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            createdAt: new Date().toISOString(),
          }
        : undefined,
    });
  }

  // 3. Login
  if (path === '/api/auth/login' && method === 'POST') {
    const email = (body.email || '').toLowerCase().trim();
    if (email.includes('priya')) {
      activeId = PRIYA_SHARMA_ID;
    } else {
      activeId = AARAV_PATEL_ID;
    }
    store.activeCitizenId = activeId;
    store.authenticated = true;
    saveStore(store);
    localStorage.setItem('indra_active_citizen_id', activeId);

    const citizen = store.citizens[activeId];
    return jsonResponse({
      success: true,
      user: { id: 'user-' + activeId, email: citizen.profile.primaryEmail, role: 'CITIZEN' },
      citizen: citizen.profile,
      session: {
        id: 'sess-' + activeId + '-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    });
  }

  // 4. Logout
  if (path === '/api/auth/logout' && method === 'POST') {
    store.authenticated = false;
    saveStore(store);
    return jsonResponse({ success: true, message: 'Logged out successfully' });
  }

  // 5. Signup
  if (path === '/api/auth/signup' && method === 'POST') {
    store.authenticated = true;
    store.activeCitizenId = AARAV_PATEL_ID;
    saveStore(store);
    return jsonResponse({
      success: true,
      user: { id: 'user-new', email: body.email, role: 'CITIZEN' },
      citizen: store.citizens[AARAV_PATEL_ID].profile,
      session: { id: 'sess-new', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    });
  }

  // 6. Synthetic citizens list
  if (path === '/api/citizens/synthetic-list') {
    return jsonResponse({
      citizens: Object.values(store.citizens).map((c: any) => ({
        id: c.profile.id,
        primaryName: c.profile.primaryName,
        currentCity: c.profile.currentCity,
        currentState: c.profile.currentState,
      })),
    });
  }

  // 7. Citizen me
  if (path === '/api/citizen/me') {
    const citizen = store.citizens[activeId] || store.citizens[AARAV_PATEL_ID];
    return jsonResponse({
      profile: citizen.profile,
      citizen: citizen.profile,
      credentials: citizen.credentials,
      primaryAddress: citizen.primaryAddress,
      epfoAccounts: citizen.epfoAccounts,
    });
  }

  // 8. World model
  if (path === '/api/citizen/world-model') {
    const citizen = store.citizens[activeId] || store.citizens[AARAV_PATEL_ID];
    return jsonResponse({
      success: true,
      worldModel: {
        profile: {
          id: citizen.profile.id,
          primaryName: citizen.profile.primaryName,
          fullName: citizen.profile.fullName,
          dateOfBirth: citizen.profile.dateOfBirth,
          gender: citizen.profile.gender,
          primaryMobile: citizen.profile.primaryMobile,
          primaryEmail: citizen.profile.primaryEmail,
          currentCity: citizen.profile.currentCity,
          currentState: citizen.profile.currentState,
        },
        credentials: citizen.credentials,
        addresses: [citizen.primaryAddress],
        documents: [
          {
            id: 'DOC-AADHAAR-XML',
            title: 'Aadhaar e-KYC XML Archive',
            issuer: 'UIDAI',
            verified: true,
            createdAt: '2024-02-10T10:00:00Z',
          },
          {
            id: 'DOC-PAN-VERIFY',
            title: 'Permanent Account Number Verifiable Record',
            issuer: 'Income Tax Dept',
            verified: true,
            createdAt: '2023-11-15T14:30:00Z',
          },
        ],
        relationships: [
          {
            id: 'REL-01',
            citizenId: activeId,
            fullName: 'Ananya Patel',
            relationType: 'SPOUSE',
            isNomineeForEpfo: true,
            isDependentForHealth: true,
            createdAt: '2022-01-10T00:00:00Z',
          },
        ],
        vehicles: [
          {
            id: 'VEH-01',
            citizenId: activeId,
            registrationNumber: 'MH-12-DE-9812',
            vehicleClass: 'LMV Motor Car (EV)',
            makerModel: 'Tata Nexon EV Max',
            rtoCode: 'MH-12 Pune',
            state: 'Maharashtra',
            registrationDate: '2022-04-12',
            fitnessValidUntil: '2037-04-11',
            status: 'ACTIVE',
            createdAt: '2022-04-12T00:00:00Z',
          },
        ],
        properties: [
          {
            id: 'PROP-01',
            citizenId: activeId,
            propertyType: 'RESIDENTIAL_FLAT',
            identifier: 'KOTHRUD-402',
            municipalBody: 'Pune Municipal Corporation',
            address: citizen.primaryAddress.line1 + ', ' + citizen.primaryAddress.city,
            state: citizen.primaryAddress.state,
            annualTaxInr: 8400,
            taxPaymentStatus: 'PAID',
            createdAt: '2020-04-01T00:00:00Z',
          },
        ],
        employments: [
          {
            id: 'EMP-01',
            citizenId: activeId,
            employerName: 'TechCorp India Pune Pvt Ltd',
            designation: 'Staff Systems Architect',
            startDate: '2021-04-01',
            isCurrent: true,
            createdAt: '2021-04-01T00:00:00Z',
          },
        ],
        businesses: [],
        educations: [
          {
            id: 'EDU-01',
            citizenId: activeId,
            degree: 'Bachelor of Technology in Computer Engineering',
            institution: 'College of Engineering Pune (COEP)',
            boardOrUniversity: 'Savitribai Phule Pune University',
            passingYear: 2013,
            createdAt: '2013-06-01T00:00:00Z',
          },
        ],
        obligations: [
          {
            id: 'OBL-01',
            citizenId: activeId,
            obligationType: 'INCOME_TAX_RETURN',
            title: 'AY 2026-27 Advance Tax Installment 4',
            authority: 'Income Tax Department',
            dueDate: '2026-03-15',
            status: 'SATISFIED',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        inboxUnresolvedCount: 2,
        activeApplicationsCount: 1,
      },
    });
  }

  // 9. Inbox
  if (path === '/api/citizen/inbox') {
    return jsonResponse({
      items: [
        {
          id: 'INB-001',
          citizenId: activeId,
          sourceDepartment: 'Karnataka Revenue Dept (Bhoomi)',
          category: 'MUTATION_NOTICE',
          title: 'Automated Land Record Sync Scheduled',
          summary: 'Cross-state property mutation verification queued for Devanahalli Plot 42.',
          urgency: 'MEDIUM',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'INB-002',
          citizenId: activeId,
          sourceDepartment: 'Bangalore Electricity Supply Co (BESCOM)',
          category: 'UTILITY_TRANSFER',
          title: 'Meter Account Ready for Sovereign Link',
          summary: 'BESCOM consumer RR number 4E-291 ready for digital ownership assignment.',
          urgency: 'LOW',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
    });
  }

  // 10. Vault
  if (path === '/api/citizen/vault') {
    return jsonResponse({
      documents: [
        {
          id: 'VLT-01',
          citizenId: activeId,
          documentType: 'AADHAAR_XML',
          title: 'Aadhaar e-KYC Cryptographic Container',
          issuer: 'UIDAI',
          fileHash: 'sha256:4f8a817b189a01e3b567d8f9a0c12e34',
          verificationStatus: 'VERIFIED',
          createdAt: '2024-02-10T10:00:00Z',
        },
        {
          id: 'VLT-02',
          citizenId: activeId,
          documentType: 'PAN_CARD',
          title: 'Permanent Account Number Digitally Signed Record',
          issuer: 'Income Tax Department',
          fileHash: 'sha256:7b189a01e3b567d8f9a0c12e344f8a81',
          verificationStatus: 'VERIFIED',
          createdAt: '2023-11-15T14:30:00Z',
        },
        {
          id: 'VLT-03',
          citizenId: activeId,
          documentType: 'SALE_DEED',
          title: 'Registered Sale Deed - Devanahalli Plot 42',
          issuer: 'Sub-Registrar Office Devanahalli',
          fileHash: 'sha256:9a01e3b567d8f9a0c12e344f8a817b18',
          verificationStatus: 'VERIFIED',
          createdAt: '2026-02-28T16:00:00Z',
        },
      ],
    });
  }

  // 11. Applications
  if (path === '/api/applications') {
    return jsonResponse({
      applications: [
        {
          id: 'APP-RELOC-2026',
          citizenId: activeId,
          serviceName: 'Comprehensive Cross-State Civic Relocation',
          submissionNumber: 'INDRA-MUT-2026-90412',
          status: 'IN_PROGRESS',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    });
  }

  // 12. Audit logs
  if (path === '/api/trust/audit-logs') {
    return jsonResponse({
      logs: [
        {
          id: 'LOG-01',
          citizenId: activeId,
          action: 'SOVEREIGN_AUTHORIZATION_VERIFIED',
          details: 'HMAC-SHA256 signature verified for cross-state mutation packet.',
          timestamp: new Date(Date.now() - 120000).toISOString(),
        },
        {
          id: 'LOG-02',
          citizenId: activeId,
          action: 'TENANT_BOUNDARY_VERIFIED',
          details: 'Zero-trust authorization boundary asserted for citizen partition.',
          timestamp: new Date(Date.now() - 600000).toISOString(),
        },
        {
          id: 'LOG-03',
          citizenId: activeId,
          action: 'DIGITAL_LOCKER_CONSENT_ASSERTED',
          details: 'DPDP-compliant verifiable consent presented to UIDAI gateway.',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    });
  }

  // 13. Consents
  if (path === '/api/trust/consents') {
    return jsonResponse({
      consents: [
        {
          id: 'CNS-01',
          citizenId: activeId,
          authority: 'UIDAI Aadhaar Services',
          scope: 'e-KYC Address Mutation',
          status: 'ACTIVE',
          grantedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'CNS-02',
          citizenId: activeId,
          authority: 'Karnataka Bhoomi Land Registry',
          scope: 'Title Verification & Encumbrance Certificate',
          status: 'ACTIVE',
          grantedAt: '2026-02-01T00:00:00Z',
        },
      ],
    });
  }

  // 14. Relocation impact
  if (path === '/api/citizen/life-events/relocation-impact' && method === 'POST') {
    const destCity = body.destinationCity || 'Bengaluru';
    const destState = body.destinationState || 'Karnataka';
    return jsonResponse({
      origin: { city: 'Pune', state: 'Maharashtra' },
      destination: { city: destCity, state: destState },
      overallImpactScore: 88,
      impactCategories: [
        {
          category: 'CIVIC_REGISTRY',
          title: 'Aadhaar & Electoral Roll Mutation',
          description: 'Requires update of primary address on central UIDAI database and deletion from Pune constituency.',
          severity: 'HIGH',
        },
        {
          category: 'UTILITY_INFRASTRUCTURE',
          title: 'BESCOM Power Transfer',
          description: 'Automatic transfer of domestic electricity connection mandate under BESCOM Bengaluru.',
          severity: 'MEDIUM',
        },
        {
          category: 'STATUTORY_REVENUE',
          title: 'Karnataka Bhoomi Mutation Registration',
          description: 'Synchronization of Devanahalli plot title deed with Bhoomi Land Records.',
          severity: 'CRITICAL',
        },
      ],
      estimatedSlaDays: 4,
      totalStatutoryFeesInr: 1250,
    });
  }

  // 15. Intent resolve
  if (path === '/api/intent/resolve' && method === 'POST') {
    const q = body.query || '';
    return jsonResponse({
      query: q,
      confidence: 0.96,
      classifiedIntent: 'CROSS_STATE_RELOCATION_PROPERTY_MUTATION',
      domains: ['REVENUE_LAND', 'UIDAI_IDENTITY', 'ENERGY_BESCOM'],
      recommendedAction: 'INITIATE_STATE_TRANSITION',
    });
  }

  // 16. Capabilities
  if (path === '/api/capabilities') {
    return jsonResponse({
      count: 3,
      capabilities: [
        {
          id: 'CAP-BHOOMI-VERIFY',
          version: '1.2.0',
          domain: 'REVENUE_LAND',
          humanName: 'Karnataka Bhoomi Land Title Verification',
          description: 'Authoritative land mutation check against Karnataka Revenue Department database.',
          sideEffectClass: 'READ_ONLY',
          requiresHumanAuthorization: false,
          requiredPermissions: ['LAND_RECORD_READ'],
        },
        {
          id: 'CAP-UIDAI-MUTATE',
          version: '2.0.1',
          domain: 'IDENTITY_UIDAI',
          humanName: 'UIDAI Aadhaar Address Mutation',
          description: 'Sovereign mutation of residential address with cryptographic consent proof.',
          sideEffectClass: 'STATE_MUTATION',
          requiresHumanAuthorization: true,
          requiredPermissions: ['AADHAAR_WRITE'],
        },
        {
          id: 'CAP-BESCOM-TRANSFER',
          version: '1.0.4',
          domain: 'UTILITY_ENERGY',
          humanName: 'BESCOM Electricity Meter Transfer',
          description: 'Municipal power utility transfer to incoming property owner.',
          sideEffectClass: 'STATE_MUTATION',
          requiresHumanAuthorization: true,
          requiredPermissions: ['UTILITY_TRANSFER'],
        },
      ],
    });
  }

  // 17. Action Plans
  if (path === '/api/citizen/action-plans') {
    return jsonResponse({
      count: 1,
      plans: [
        {
          id: 'PLAN-RELOC-DEV',
          citizenId: activeId,
          lifeEventCode: 'RELOCATION_PROPERTY_ACQUISITION',
          title: 'Bangalore Devanahalli Relocation & Property Onboarding',
          status: 'ACTIVE',
          estimatedDays: 5,
          totalStatutoryFeesInr: 1450,
          stepsCount: 3,
          completedStepsCount: 1,
          createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        },
      ],
    });
  }

  // 18. Proactive Findings
  if (path === '/api/citizen/proactive-findings' || path === '/api/citizen/proactive/findings') {
    const list = store.findings[activeId] || [];
    return jsonResponse({
      count: list.length,
      summary: {
        criticalCount: list.filter((f) => f.urgency === 'CRITICAL').length,
        highCount: list.filter((f) => f.urgency === 'HIGH').length,
        mediumCount: list.filter((f) => f.urgency === 'MEDIUM').length,
        lowCount: list.filter((f) => f.urgency === 'LOW').length,
      },
      findings: list,
    });
  }

  if (path.startsWith('/api/citizen/proactive-findings/') && path.endsWith('/dismiss') && method === 'POST') {
    const fid = path.split('/')[4];
    store.findings[activeId] = (store.findings[activeId] || []).filter((f) => f.id !== fid);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  if (path.startsWith('/api/citizen/proactive-findings/') && path.endsWith('/snooze') && method === 'POST') {
    const fid = path.split('/')[4];
    store.findings[activeId] = (store.findings[activeId] || []).filter((f) => f.id !== fid);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  if (path === '/api/citizen/proactive-findings/scan' && method === 'POST') {
    return jsonResponse({ scanned: true, findingsCount: (store.findings[activeId] || []).length });
  }

  if (path.startsWith('/api/citizen/proactive-findings/') && path.endsWith('/launch') && method === 'POST') {
    return jsonResponse({ success: true, actionLink: '/services/property-mutation' });
  }

  // 19. Action Center Feed
  if (path === '/api/citizen/action-center') {
    return jsonResponse({
      urgentItems: [
        {
          id: 'ACT-01',
          title: 'Review Sovereign Land Deed Mutation',
          description: 'Awaiting cryptographic signature for Bhoomi & BESCOM integration.',
          urgency: 'HIGH',
          actionUrl: '/transitions',
        },
      ],
      pendingConsents: [
        {
          id: 'ACT-02',
          title: 'UIDAI Address Re-verification Mandate',
          description: 'Grant 1-time scoped consent for cross-state address update.',
          urgency: 'MEDIUM',
          actionUrl: '/trust',
        },
      ],
    });
  }

  // 20. Consent Artifacts
  if (path === '/api/citizen/consent-artifacts') {
    return jsonResponse(store.consentArtifacts[activeId] || []);
  }

  if (path.startsWith('/api/citizen/consent-artifacts/') && path.endsWith('/revoke') && method === 'POST') {
    const cid = path.split('/')[4];
    store.consentArtifacts[activeId] = (store.consentArtifacts[activeId] || []).filter((c) => c.id !== cid);
    saveStore(store);
    return jsonResponse({
      success: true,
      consentArtifactId: cid,
      status: 'REVOKED',
      message: 'Consent artifact successfully revoked under DPDP Act provisions.',
    });
  }

  // 21. Simulation fault injection
  if (path === '/api/simulation/fault-injection' && method === 'POST') {
    if (body.reset) {
      store.simulation = {
        simulatePropertyOutage: false,
        failNextPropertyRequest: false,
        injectDeedContradiction: true,
      };
    } else {
      if (body.simulatePropertyOutage !== undefined) store.simulation.simulatePropertyOutage = body.simulatePropertyOutage;
      if (body.failNextPropertyRequest !== undefined) store.simulation.failNextPropertyRequest = body.failNextPropertyRequest;
      if (body.injectDeedContradiction !== undefined) store.simulation.injectDeedContradiction = body.injectDeedContradiction;
    }
    saveStore(store);
    return jsonResponse({
      success: true,
      simulationConfig: store.simulation,
      message: 'Simulation config updated successfully',
    });
  }

  if (path === '/api/simulation/status') {
    return jsonResponse({
      failNextPropertyRequest: store.simulation.failNextPropertyRequest,
      simulatePropertyOutage: store.simulation.simulatePropertyOutage,
      injectDeedContradiction: store.simulation.injectDeedContradiction,
      status: store.simulation.simulatePropertyOutage
        ? 'OUTAGE_SIMULATED_ACTIVE'
        : store.simulation.failNextPropertyRequest
        ? 'FAIL_NEXT_REQUEST_ARMED'
        : 'NOMINAL',
    });
  }

  // 22. Reset synthetic workspace
  if (path === '/api/citizen/reset-workspace' && method === 'POST') {
    const clean = getInitialState();
    clean.activeCitizenId = activeId;
    saveStore(clean);
    return jsonResponse({
      success: true,
      message: 'Synthetic workspace reset to clean seeded evaluation baseline successfully.',
      citizenId: activeId,
      baseline: clean.citizens[activeId],
    });
  }

  // 23. State Transitions Engine
  // GET /api/citizen/transitions
  if (path === '/api/citizen/transitions') {
    const citizenTransitions = Object.values(store.transitions).filter((t: any) => t.citizenId === activeId);
    if (citizenTransitions.length === 0) {
      const initialTrans = createFlagshipTransition(activeId, store.simulation.injectDeedContradiction);
      store.transitions[initialTrans.id] = initialTrans;
      saveStore(store);
      return jsonResponse({ count: 1, transitions: [initialTrans] });
    }
    return jsonResponse({ count: citizenTransitions.length, transitions: citizenTransitions });
  }

  // POST /api/transitions/initiate
  if (path === '/api/transitions/initiate' && method === 'POST') {
    const q = body.query || 'Relocation to Bengaluru and Property Mutation';
    const newTrans = createFlagshipTransition(activeId, store.simulation.injectDeedContradiction, q);
    store.transitions[newTrans.id] = newTrans;
    saveStore(store);
    return jsonResponse({ success: true, transition: newTrans });
  }

  // GET /api/transitions/:id
  if (path.startsWith('/api/transitions/') && method === 'GET') {
    const tid = path.split('/')[3];
    const trans = store.transitions[tid];
    if (trans) {
      return jsonResponse({ success: true, transition: trans });
    }
    const anyTrans = createFlagshipTransition(activeId, store.simulation.injectDeedContradiction);
    store.transitions[anyTrans.id] = anyTrans;
    saveStore(store);
    return jsonResponse({ success: true, transition: anyTrans });
  }

  // POST /api/transitions/:id/resolve-contradiction
  if (path.startsWith('/api/transitions/') && path.endsWith('/resolve-contradiction') && method === 'POST') {
    const tid = path.split('/')[3];
    const trans = store.transitions[tid] || createFlagshipTransition(activeId, false);
    trans.contradictions = (trans.contradictions || []).map((c: any) => ({
      ...c,
      resolutionState: 'RESOLVED',
    }));
    trans.state = 'AWAITING_AUTHORIZATION';
    trans.timeline.push({
      id: 'EVT-RES-' + Date.now(),
      timestamp: new Date().toISOString(),
      stage: 'CONTRADICTION_RESOLVED',
      title: 'Name Discrepancy Resolved via Pan Verification',
      description: 'Deed transferee name "Aarav Kumar Patel" authenticated against secondary PAN record.',
      status: 'SUCCESS',
    });
    for (const k in trans.checkpoints) {
      if (trans.checkpoints[k].state === 'BLOCKED') {
        trans.checkpoints[k].state = 'READY';
      }
    }
    store.transitions[trans.id] = trans;
    saveStore(store);
    return jsonResponse({ success: true, transition: trans });
  }

  // POST /api/transitions/:id/authorize
  if (path.startsWith('/api/transitions/') && path.endsWith('/authorize') && method === 'POST') {
    const tid = path.split('/')[3];
    const trans = store.transitions[tid] || createFlagshipTransition(activeId, false);
    const token = 'AUTH-SIG.' + trans.id + '.' + Date.now() + '.' + (Date.now() + 900000) + '.e9a18f.b8a1c937d';
    trans.authorizationToken = token;
    trans.state = 'AUTHORIZED';
    trans.timeline.push({
      id: 'EVT-AUTH-' + Date.now(),
      timestamp: new Date().toISOString(),
      stage: 'SOVEREIGN_AUTHORIZATION',
      title: 'Citizen Sovereign Consent Issued',
      description: 'Cryptographically signed authorization token generated with 15-minute validity window.',
      status: 'SUCCESS',
    });
    store.transitions[trans.id] = trans;
    saveStore(store);
    return jsonResponse({ success: true, transition: trans });
  }

  // POST /api/transitions/:id/execute
  if (path.startsWith('/api/transitions/') && path.endsWith('/execute') && method === 'POST') {
    const tid = path.split('/')[3];
    const trans = store.transitions[tid] || createFlagshipTransition(activeId, false);

    if (store.simulation.simulatePropertyOutage || store.simulation.failNextPropertyRequest) {
      store.simulation.failNextPropertyRequest = false;
      trans.state = 'SUSPENDED';
      trans.checkpoints['STEP-BHOOMI-VERIFY'].state = 'SUSPENDED';
      trans.checkpoints['STEP-BHOOMI-VERIFY'].errorReason =
        'HTTP 503 Service Unavailable: Karnataka Bhoomi Land Records Gateway experiencing maintenance outage. Execution suspended at durable checkpoint.';
      trans.checkpoints['STEP-BHOOMI-VERIFY'].isOutage = true;
      trans.checkpoints['STEP-BHOOMI-VERIFY'].attemptCount = 1;
      trans.checkpoints['STEP-BHOOMI-VERIFY'].lastAttemptAt = new Date().toISOString();

      trans.timeline.push({
        id: 'EVT-OUTAGE-' + Date.now(),
        timestamp: new Date().toISOString(),
        stage: 'DURABLE_SUSPENSION',
        title: 'Bhoomi Gateway 503 Outage Detected',
        description: 'Automatic failover: execution paused safely at durable state checkpoint. Zero citizen action loss.',
        status: 'SUSPENDED',
      });
      store.transitions[trans.id] = trans;
      saveStore(store);
      return jsonResponse({ success: true, transition: trans });
    }

    for (const k in trans.checkpoints) {
      trans.checkpoints[k].state = 'SUCCEEDED';
      trans.checkpoints[k].reconciliationStatus = 'VERIFIED';
    }
    trans.state = 'COMPLETED';
    trans.reconciliationReport = {
      reconciledAt: new Date().toISOString(),
      isConverged: true,
      summary: 'All 3 multi-agency adapters reconciled with 100% convergence across UIDAI, Bhoomi, and BESCOM.',
      entities: [
        {
          entityType: 'CITIZEN_ADDRESS',
          identifier: 'AADHAAR-XXXX-XXXX-4567',
          intendedState: { city: 'Bengaluru', state: 'Karnataka' },
          institutionalState: { city: 'Bengaluru', state: 'Karnataka' },
          worldModelState: { city: 'Bengaluru', state: 'Karnataka' },
          status: 'CONVERGED',
        },
      ],
    };
    trans.outcome = {
      achievedAt: new Date().toISOString(),
      summary: 'Relocation complete. Primary address updated to Bengaluru, Karnataka. Title deed mutated on Bhoomi.',
      reconciledEntitiesCount: 3,
    };
    trans.timeline.push({
      id: 'EVT-COMP-' + Date.now(),
      timestamp: new Date().toISOString(),
      stage: 'EXECUTION_COMPLETE',
      title: 'State Transition Completed',
      description: 'Cross-institution state synchronization converged with verifiable proof receipts.',
      status: 'SUCCESS',
    });

    if (store.citizens[activeId]) {
      store.citizens[activeId].profile.currentCity = 'Bengaluru';
      store.citizens[activeId].profile.currentState = 'Karnataka';
      store.citizens[activeId].primaryAddress = {
        line1: 'Plot 42, Devanahalli Silicon Park',
        line2: 'Devanahalli Taluk',
        city: 'Bengaluru',
        district: 'Bengaluru Rural',
        state: 'Karnataka',
        pincode: '562110',
        isVerified: true,
        validSince: new Date().toISOString().split('T')[0],
      };
    }

    store.transitions[trans.id] = trans;
    saveStore(store);
    return jsonResponse({ success: true, transition: trans });
  }

  // POST /api/transitions/:id/resume
  if (path.startsWith('/api/transitions/') && path.endsWith('/resume') && method === 'POST') {
    const tid = path.split('/')[3];
    const trans = store.transitions[tid] || createFlagshipTransition(activeId, false);

    store.simulation.simulatePropertyOutage = false;
    for (const k in trans.checkpoints) {
      trans.checkpoints[k].state = 'SUCCEEDED';
      trans.checkpoints[k].reconciliationStatus = 'VERIFIED';
      delete trans.checkpoints[k].errorReason;
      trans.checkpoints[k].isOutage = false;
    }
    trans.state = 'COMPLETED';
    trans.reconciliationReport = {
      reconciledAt: new Date().toISOString(),
      isConverged: true,
      summary: 'Resumed execution after gateway recovery. All 3 multi-agency adapters verified.',
      entities: [
        {
          entityType: 'CITIZEN_ADDRESS',
          identifier: 'AADHAAR-XXXX-XXXX-4567',
          intendedState: { city: 'Bengaluru', state: 'Karnataka' },
          institutionalState: { city: 'Bengaluru', state: 'Karnataka' },
          worldModelState: { city: 'Bengaluru', state: 'Karnataka' },
          status: 'CONVERGED',
        },
      ],
    };
    trans.outcome = {
      achievedAt: new Date().toISOString(),
      summary: 'Resumed transition succeeded. All registries reconciled to Bengaluru, Karnataka.',
      reconciledEntitiesCount: 3,
    };
    trans.timeline.push({
      id: 'EVT-RESUME-' + Date.now(),
      timestamp: new Date().toISOString(),
      stage: 'RECONCILIATION_CONVERGED',
      title: 'Resumed from Checkpoint & Reconciled',
      description: 'Bhoomi Karnataka Land Records re-verified successfully after service restoration.',
      status: 'SUCCESS',
    });

    if (store.citizens[activeId]) {
      store.citizens[activeId].profile.currentCity = 'Bengaluru';
      store.citizens[activeId].profile.currentState = 'Karnataka';
      store.citizens[activeId].primaryAddress = {
        line1: 'Plot 42, Devanahalli Silicon Park',
        line2: 'Devanahalli Taluk',
        city: 'Bengaluru',
        district: 'Bengaluru Rural',
        state: 'Karnataka',
        pincode: '562110',
        isVerified: true,
        validSince: new Date().toISOString().split('T')[0],
      };
    }

    store.transitions[trans.id] = trans;
    saveStore(store);
    return jsonResponse({ success: true, transition: trans });
  }

  // Workflows start / resume
  if (path === '/api/workflows/start' && method === 'POST') {
    const runId = 'run-wf-' + Date.now();
    const wfSummary = {
      id: runId,
      citizenId: activeId,
      workflowCode: body.workflowCode || 'RELOCATION_MUTATION',
      state: 'WAITING_FOR_USER',
      currentStep: 'STEP-REVIEW-DETAILS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.workflows[runId] = wfSummary;
    saveStore(store);
    return jsonResponse(wfSummary);
  }

  if (path.startsWith('/api/workflows/') && path.endsWith('/review') && method === 'GET') {
    const wid = path.split('/')[3];
    return jsonResponse({
      reviewSessionId: 'rev-' + wid,
      workflowRunId: wid,
      citizenId: activeId,
      declarations: [
        {
          id: 'DEC-01',
          statement: 'I declare that the supplied residential address details are true and correct.',
          required: true,
        },
      ],
      payloadHash: 'sha256:8f4c91823abce1294',
    });
  }

  if (path.startsWith('/api/workflows/') && path.endsWith('/authorize') && method === 'POST') {
    const wid = path.split('/')[3];
    return jsonResponse({
      authorized: true,
      authorizationToken: 'AUTH-TOKEN-' + wid + '-' + Date.now(),
      reviewSession: {
        reviewSessionId: 'rev-' + wid,
        workflowRunId: wid,
        status: 'AUTHORIZED',
      },
    });
  }

  if (path.startsWith('/api/workflows/') && path.endsWith('/execute') && method === 'POST') {
    const wid = path.split('/')[3];
    return jsonResponse({
      id: wid,
      citizenId: activeId,
      state: 'COMPLETED',
      currentStep: 'COMPLETED',
    });
  }

  if (path.startsWith('/api/workflows/') && path.endsWith('/resume') && method === 'POST') {
    const wid = path.split('/')[3];
    return jsonResponse({
      id: wid,
      citizenId: activeId,
      state: 'COMPLETED',
      currentStep: 'COMPLETED',
    });
  }

  return jsonResponse({ success: true, path, fallback: true });
}

function createFlagshipTransition(citizenId: string, injectContradiction = true, query?: string) {
  const transId = 'trans-flagship-' + citizenId.slice(0, 5) + '-' + Date.now().toString().slice(-4);
  const q = query || 'I moved to Bangalore and bought a plot in Devanahalli.';

  const contradictions: any[] = [];
  if (injectContradiction) {
    contradictions.push({
      id: 'CONTRA-DEED-NAME-001',
      sourceInstitution: 'Karnataka Bhoomi Land Registry',
      entity: 'Property Deed #KA-BLR-DEV-2026-00481',
      field: 'transfereeName',
      observedValues: {
        bhoomiDeedName: 'Aarav Kumar Patel',
        aadhaarPrimaryName: 'Aarav Patel',
      },
      evidenceOrProvenance: {
        deedExtraction: 'SRO Devanahalli Book 1 Volume 4821',
        aadhaarLinkage: 'UIDAI CIDR Verified Token',
      },
      candidateAuthoritativeSource: 'UIDAI Aadhaar + Secondary PAN (Income Tax)',
      severity: 'CRITICAL',
      blockingStatus: 'BLOCKING',
      blockedStepKeys: ['STEP-BHOOMI-VERIFY'],
      whatConflicts: "Sale deed lists transferee name as 'Aarav Kumar Patel' while Aadhaar record lists 'Aarav Patel'.",
      whyItMatters: 'Karnataka Land Revenue Act requires exact cryptographic identity match to mutate title.',
      whatEvidenceNeeded: 'Secondary identity corroboration linking father name Dinesh Patel via PAN BCDEF****K.',
      resolutionStrategy: 'Corroborate identity via secondary PAN database cross-linkage without citizen office visit.',
      resolutionActions: ['ACCEPT_SECONDARY_PAN_CROSS_LINK'],
      resolutionState: 'UNRESOLVED',
    });
  }

  return {
    id: transId,
    citizenId,
    initiatingQuery: q,
    lifeEventCode: 'RELOCATION_PROPERTY_ACQUISITION',
    targetOutcome: 'Cross-State Relocation & Land Title Mutation (Bengaluru, Karnataka)',
    state: injectContradiction ? 'CONTRADICTION_BLOCKED' : 'AWAITING_AUTHORIZATION',
    proposedPlan: {
      title: 'Cross-State Relocation & Land Title Mutation',
      summary: 'Autonomous synchronization of Land Deed, Aadhaar Address, and BESCOM Domestic Power Connection.',
      estimatedDays: 4,
      estimatedStatutoryFeesInr: 1250,
      steps: [
        {
          stepKey: 'STEP-BHOOMI-VERIFY',
          capabilityId: 'CAP-BHOOMI-VERIFY',
          title: 'Bhoomi Land Title & Mutation Verification',
          authority: 'Revenue Department of Karnataka',
          phaseIndex: 1,
          dependencies: [],
          executionMode: 'AUTOMATED',
          statutoryFeeInr: 500,
          estimatedDays: 2,
          prefilledInput: { surveyNumber: '142/3', village: 'Devanahalli' },
        },
        {
          stepKey: 'STEP-UIDAI-UPDATE',
          capabilityId: 'CAP-UIDAI-MUTATE',
          title: 'UIDAI Aadhaar Cross-State Address Mutation',
          authority: 'Unique Identification Authority of India',
          phaseIndex: 2,
          dependencies: ['STEP-BHOOMI-VERIFY'],
          executionMode: 'SOVEREIGN_AUTHORIZATION_REQUIRED',
          statutoryFeeInr: 50,
          estimatedDays: 1,
          prefilledInput: { newPincode: '562110', newCity: 'Bengaluru' },
        },
        {
          stepKey: 'STEP-BESCOM-TRANSFER',
          capabilityId: 'CAP-BESCOM-TRANSFER',
          title: 'BESCOM Domestic Electricity Connection Transfer',
          authority: 'Bangalore Electricity Supply Company',
          phaseIndex: 3,
          dependencies: ['STEP-UIDAI-UPDATE'],
          executionMode: 'AUTOMATED',
          statutoryFeeInr: 700,
          estimatedDays: 1,
          prefilledInput: { consumerAccount: '4E-291-8841' },
        },
      ],
    },
    checkpoints: {
      'STEP-BHOOMI-VERIFY': {
        stepKey: 'STEP-BHOOMI-VERIFY',
        capabilityId: 'CAP-BHOOMI-VERIFY',
        title: 'Bhoomi Land Title & Mutation Verification',
        authority: 'Revenue Department of Karnataka',
        phaseIndex: 1,
        dependencies: [],
        state: injectContradiction ? 'BLOCKED' : 'READY',
        attemptCount: 0,
        inputs: { surveyNumber: '142/3', village: 'Devanahalli' },
      },
      'STEP-UIDAI-UPDATE': {
        stepKey: 'STEP-UIDAI-UPDATE',
        capabilityId: 'CAP-UIDAI-MUTATE',
        title: 'UIDAI Aadhaar Cross-State Address Mutation',
        authority: 'Unique Identification Authority of India',
        phaseIndex: 2,
        dependencies: ['STEP-BHOOMI-VERIFY'],
        state: 'BLOCKED',
        attemptCount: 0,
        inputs: { newPincode: '562110', newCity: 'Bengaluru' },
      },
      'STEP-BESCOM-TRANSFER': {
        stepKey: 'STEP-BESCOM-TRANSFER',
        capabilityId: 'CAP-BESCOM-TRANSFER',
        title: 'BESCOM Domestic Electricity Connection Transfer',
        authority: 'Bangalore Electricity Supply Company',
        phaseIndex: 3,
        dependencies: ['STEP-UIDAI-UPDATE'],
        state: 'BLOCKED',
        attemptCount: 0,
        inputs: { consumerAccount: '4E-291-8841' },
      },
    },
    contradictions,
    timeline: [
      {
        id: 'EVT-1-' + Date.now(),
        timestamp: new Date().toISOString(),
        stage: 'INTENT_UNDERSTOOD',
        title: 'Citizen Real-World Outcome Recognized',
        description: 'Synthesized: "' + q + '"',
        status: 'INFO',
      },
      {
        id: 'EVT-2-' + Date.now(),
        timestamp: new Date().toISOString(),
        stage: 'CONSEQUENCE_ANALYSIS',
        title: 'Multi-Agency Consequence Graph Derived',
        description: 'Derived 3 statutory actions spanning Karnataka Bhoomi, UIDAI, and BESCOM.',
        status: 'INFO',
      },
      ...(injectContradiction
        ? [
            {
              id: 'EVT-3-' + Date.now(),
              timestamp: new Date().toISOString(),
              stage: 'CONTRADICTION_DETECTED',
              title: 'Cross-Registry Name Discrepancy Detected',
              description: 'Transferee name on deed differs from Aadhaar. Resolution protocol activated.',
              status: 'WARNING',
            },
          ]
        : []),
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
