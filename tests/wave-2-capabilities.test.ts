import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
} from '@indra/database';
import {
  CapabilityRegistry,
  CapabilityExecutor,
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import { ConsequenceGraphEngine } from '@indra/policy-engine';
import { ProactiveCitizenEngine } from '@indra/policy-engine';
import {
  computePayloadHash,
  signAuthorizationToken,
  verifyAuthorizationToken,
} from '@indra/workflow-engine';

describe('Wave 2 Capability Expansion & National Civic Coverage Suite', () => {
  let registry: CapabilityRegistry;
  let executor: CapabilityExecutor;
  let graphEngine: ConsequenceGraphEngine;

  beforeAll(() => {
    registerDefaultCapabilities();
    registry = CapabilityRegistry.getInstance();
    executor = new CapabilityExecutor();
    graphEngine = ConsequenceGraphEngine.getInstance();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  async function runCap<T = any>(
    capabilityId: string,
    input: any,
    context: { citizenId: string; authorizationGranted?: boolean; idempotencyKey?: string }
  ) {
    return executor.execute<T>({
      capabilityId,
      input,
      context,
    });
  }

  // =========================================================================
  // 1. CAPABILITY METRICS & EXPANSION VERIFICATION
  // =========================================================================
  describe('Capability Universe Metrics', () => {
    it('registers at least 62 capabilities across all 21 national civic domains', () => {
      const all = registry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(62);

      const domains = new Set(all.map((c) => c.domain));
      expect(domains.size).toBeGreaterThanOrEqual(18);
    });

    it('contains all Wave 2 national capabilities with valid schemas', () => {
      const wave2CapabilityIds = [
        'transport.inquire_echallan',
        'transport.renew_driving_license',
        'welfare.inquire_ration_entitlement',
        'welfare.verify_dbt_aadhaar_seed',
        'agriculture.apply_crop_insurance',
        'agriculture.verify_kisan_credit_card',
        'civic.apply_water_sewerage_connection',
        'civic.register_trade_license',
        'property.inquire_cadastral_survey',
        'justice.apply_legal_aid',
        'justice.search_police_fir',
        'telecom.inquire_registered_sims',
        'security.report_cyber_fraud',
        'identity.lock_biometrics',
        'identity.inquire_mask_aadhaar',
        'documents.revoke_credential',
        'documents.verify_doc_hash',
        'tax.reconcile_ais_tis',
        'tax.e_verify_return',
        'tax.inquire_gstin_compliance',
        'banking.fetch_cibil_report',
        'banking.register_bank_mandate',
        'epfo.generate_uan_card',
        'epfo.inquire_pension_status',
        'passport.apply_police_clearance',
        'passport.book_seva_kendra_slot',
        'health.fetch_ayushman_card',
        'health.fetch_vaccination_certificate',
        'education.fetch_academic_transcript',
        'education.apply_national_scholarship',
        'family.register_civil_marriage',
        'family.inquire_family_tree',
        'business.file_annual_roc_return',
        'emergency.request_disaster_relief',
        'accessibility.apply_udid_card',
      ];

      for (const capId of wave2CapabilityIds) {
        const cap = registry.get(capId);
        expect(cap, `Expected capability ${capId} to be registered`).toBeDefined();
        expect(cap?.inputSchema).toBeDefined();
        expect(cap?.outputSchema).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 2. DOMAIN SPI ADAPTER & CAPABILITY EXECUTION TESTS
  // =========================================================================
  describe('Domain Capability Execution', () => {
    it('transport.inquire_echallan: retrieves pending traffic violation fine for Priya Sharma', async () => {
      const result = await runCap(
        'transport.inquire_echallan',
        { citizenId: PRIYA_SHARMA_ID, vehicleRegNo: 'KA-01-MJ-5544' },
        { citizenId: PRIYA_SHARMA_ID }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).totalPendingChallans).toBeGreaterThanOrEqual(1);
      expect((result.output as any).totalFineAmountInr).toBeGreaterThanOrEqual(1000);
      expect((result.output as any).challans[0].challanNo).toBe('KA90124810294');
    });

    it('transport.renew_driving_license: submits DL renewal application', async () => {
      const result = await runCap(
        'transport.renew_driving_license',
        {
          citizenId: PRIYA_SHARMA_ID,
          dlNumber: 'KA-01-2015-0049281',
          medicalFitnessSelfDeclared: true,
          currentAddressUpdate: true,
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).applicationNumber).toMatch(/^(SARATHI-RNW-|DL-REN-)/);
      expect((result.output as any).success).toBe(true);
    });

    it('welfare.inquire_ration_entitlement: fetches PHH quota for Aarav Patel', async () => {
      const result = await runCap(
        'welfare.inquire_ration_entitlement',
        { citizenId: AARAV_PATEL_ID },
        { citizenId: AARAV_PATEL_ID }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).rationCardNo).toBe('RC-MH-2021-998821');
      expect((result.output as any).monthlyWheatKg).toBe(15);
      expect((result.output as any).monthlyRiceKg).toBe(10);
    });

    it('agriculture.apply_crop_insurance: enrolls Aarav Patel in PMFBY scheme', async () => {
      const result = await runCap(
        'agriculture.apply_crop_insurance',
        {
          citizenId: AARAV_PATEL_ID,
          surveyNumber: 'SURVEY-78/2-AHM',
          season: 'KHARIF',
          cropName: 'Cotton (Bt-II)',
          areaHectares: 2.5,
        },
        { citizenId: AARAV_PATEL_ID, authorizationGranted: true }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).policyNumber).toMatch(/^PMFBY-/);
      expect((result.output as any).sumInsuredInr).toBeGreaterThan(0);
      expect(['ACTIVE', 'SANCTIONED']).toContain((result.output as any).status);
    });

    it('civic.apply_water_sewerage_connection: creates fresh municipal water connection record', async () => {
      const result = await runCap(
        'civic.apply_water_sewerage_connection',
        {
          citizenId: PRIYA_SHARMA_ID,
          propertyIdentifier: 'PID-BLR-INDIRA-4482',
          connectionType: 'DOMESTIC',
          pipeDiameterMm: 15,
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).consumerRrNumber).toMatch(/^(WTR-BLR-|RR-BWSSB-)/);
      expect((result.output as any).status).toBe('INSPECTION_SCHEDULED');
    });

    it('property.inquire_cadastral_survey: retrieves geo-referenced spatial survey', async () => {
      const result = await runCap(
        'property.inquire_cadastral_survey',
        {
          citizenId: PRIYA_SHARMA_ID,
          surveyNumber: 'SURVEY-142/3',
          village: 'Varthur',
        },
        { citizenId: PRIYA_SHARMA_ID }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).surveyNumber).toBe('SURVEY-142/3');
      expect((result.output as any).disputeFlag).toBe(false);
      expect((result.output as any).geoFencedAreaSqFt).toBeGreaterThan(0);
    });

    it('security.report_cyber_fraud: files emergency 1930 complaint with debit freeze', async () => {
      const result = await runCap(
        'security.report_cyber_fraud',
        {
          citizenId: PRIYA_SHARMA_ID,
          incidentDate: '2026-09-04',
          fraudAmountInr: 65000,
          suspectAccountOrPhone: '+91-9876543210',
          transactionRefNumber: 'UPI/2026/091823901',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).complaintAckNo).toMatch(/^1930-I4C-/);
      expect((result.output as any).freezeRequestSentToBanks).toBe(true);
    });

    it('emergency.request_disaster_relief: files ex-gratia claim under SDRF', async () => {
      const result = await runCap(
        'emergency.request_disaster_relief',
        {
          citizenId: AARAV_PATEL_ID,
          disasterType: 'FLOOD',
          lossDescription: 'Crop submergence across 2 hectares due to river flooding.',
          bankAccountMasked: 'XXXX-4819',
        },
        { citizenId: AARAV_PATEL_ID, authorizationGranted: true }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).reliefClaimNo).toMatch(/^(NDMA-RELIEF-|SDRF-RELIEF-)/);
      expect((result.output as any).status).toBe('APPROVED_FOR_DBT');
      expect((result.output as any).assessedAssistanceInr).toBe(25000);
    });

    it('accessibility.apply_udid_card: enrolls citizen for Swavlamban certificate', async () => {
      const result = await runCap(
        'accessibility.apply_udid_card',
        {
          citizenId: PRIYA_SHARMA_ID,
          disabilityType: 'LOCOMOTOR',
          disabilityPercentage: 45,
          medicalHospitalName: 'Victoria District Government Hospital',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).udidEnrollmentNo).toMatch(/^(UDID-SWAV-|UDID-KA-)/);
      expect((result.output as any).status).toBe('ENROLLED_ASSESSMENT_SCHEDULED');
    });

    it('banking.fetch_cibil_report: inquires credit score and liability summary', async () => {
      const result = await runCap(
        'banking.fetch_cibil_report',
        {
          citizenId: PRIYA_SHARMA_ID,
          consentGiven: true,
        },
        { citizenId: PRIYA_SHARMA_ID }
      );
      expect(result.success).toBe(true);
      expect((result.output as any).cibilScore).toBe(785);
      expect((result.output as any).scoreCategory).toBe('EXCELLENT');
    });
  });

  // =========================================================================
  // 3. MULTI-DOMAIN CONSEQUENCE GRAPH & LIFECYCLE TESTS
  // =========================================================================
  describe('Consequence Graph Lifecycles', () => {
    it('evaluates BUY_PROPERTY lifecycle with correct topological dependencies', () => {
      const graph = graphEngine.getGraph('BUY_PROPERTY');
      expect(graph).toBeDefined();
      expect(graph?.stepTemplates.length).toBe(5);

      const plan = graphEngine.evaluatePlan('BUY_PROPERTY', {
        profile: { id: PRIYA_SHARMA_ID, fullName: 'Priya Sharma' } as any,
        credentials: [],
        bankAccounts: [],
        vehicles: [],
        properties: [],
        employmentHistory: [],
      });

      expect(plan.steps.length).toBe(5);
      expect(plan.steps[0].initialState).toBe('READY'); // verify_encumbrance has no deps
      expect(plan.steps[1].initialState).toBe('READY'); // cadastral_survey has no deps
      expect(plan.steps[2].initialState).toBe('BLOCKED'); // fetch_title_deed depends on encumbrance
      expect(plan.steps[3].initialState).toBe('BLOCKED'); // apply_mutation depends on title deed
      expect(plan.steps[4].initialState).toBe('BLOCKED'); // apply_water_connection depends on mutation
    });

    it('evaluates CYBER_FRAUD_INCIDENT containment lifecycle', () => {
      const graph = graphEngine.getGraph('CYBER_FRAUD_INCIDENT');
      expect(graph).toBeDefined();
      expect(graph?.stepTemplates.length).toBe(4);

      const plan = graphEngine.evaluatePlan('CYBER_FRAUD_INCIDENT', {
        profile: { id: PRIYA_SHARMA_ID, fullName: 'Priya Sharma' } as any,
        credentials: [],
        bankAccounts: [],
        vehicles: [],
        properties: [],
        employmentHistory: [],
      });

      expect(plan.steps.length).toBe(4);
      expect(plan.steps.some((s) => s.capabilityId === 'security.freeze_compromised_account')).toBe(true);
      expect(plan.steps.some((s) => s.capabilityId === 'identity.lock_biometrics')).toBe(true);
      expect(plan.steps.some((s) => s.capabilityId === 'security.report_cyber_fraud')).toBe(true);
    });

    it('evaluates FARMER_SEASONAL_CYCLE agricultural protection cascade', () => {
      const graph = graphEngine.getGraph('FARMER_SEASONAL_CYCLE');
      expect(graph).toBeDefined();
      expect(graph?.stepTemplates.length).toBe(4);

      const plan = graphEngine.evaluatePlan('FARMER_SEASONAL_CYCLE', {
        profile: { id: AARAV_PATEL_ID, fullName: 'Aarav Patel' } as any,
        credentials: [],
        bankAccounts: [],
        vehicles: [],
        properties: [],
        employmentHistory: [],
      });

      expect(plan.steps.length).toBe(4);
      expect(plan.steps[0].capabilityId).toBe('agriculture.fetch_soil_health_card');
      expect(plan.steps[2].capabilityId).toBe('agriculture.apply_crop_insurance');
    });
  });

  // =========================================================================
  // 4. UNIVERSAL REVIEW LAYER & TAMPER-EVIDENT CRYPTOGRAPHIC BINDING
  // =========================================================================
  describe('Universal Citizen Review & Authorization Artifacts', () => {
    it('computes deterministic SHA-256 payload hash regardless of object key ordering', () => {
      const payloadA = { citizenId: PRIYA_SHARMA_ID, amountInr: 5000, scheme: 'PMFBY' };
      const payloadB = { scheme: 'PMFBY', citizenId: PRIYA_SHARMA_ID, amountInr: 5000 };

      const hashA = computePayloadHash(payloadA);
      const hashB = computePayloadHash(payloadB);

      expect(hashA).toMatch(/^[a-f0-9]{64}$/);
      expect(hashA).toBe(hashB);
    });

    it('issues a valid tamper-evident HMAC server authorization artifact binding citizen and payload', () => {
      const payload = {
        citizenId: PRIYA_SHARMA_ID,
        capabilityId: 'accessibility.apply_udid_card',
        disabilityType: 'LOCOMOTOR',
      };
      const payloadHash = computePayloadHash(payload);

      const claims = {
        sessionId: 'c0000000-0000-0000-0000-000000000001',
        workflowRunId: 'a0000000-0000-0000-0000-000000000001',
        stepId: 'udid_step',
        version: 1,
        citizenId: PRIYA_SHARMA_ID,
        payloadHash,
        authorizedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      const token = signAuthorizationToken(claims);
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);

      const verifiedClaims = verifyAuthorizationToken(token);
      expect(verifiedClaims.citizenId).toBe(PRIYA_SHARMA_ID);
      expect(verifiedClaims.payloadHash).toBe(payloadHash);
      expect(verifiedClaims.version).toBe(1);
    });

    it('strictly rejects execution if authorization artifact has been tampered with', () => {
      const payload = { citizenId: PRIYA_SHARMA_ID, amountInr: 1000 };
      const payloadHash = computePayloadHash(payload);

      const claims = {
        sessionId: 'c0000000-0000-0000-0000-000000000002',
        workflowRunId: 'a0000000-0000-0000-0000-000000000002',
        stepId: 'step_2',
        version: 1,
        citizenId: PRIYA_SHARMA_ID,
        payloadHash,
        authorizedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      const token = signAuthorizationToken(claims);

      // Tamper with signature
      const tamperedToken = token.slice(0, -4) + 'abcd';
      expect(() => verifyAuthorizationToken(tamperedToken)).toThrow(
        /Cryptographic signature mismatch/i
      );
    });

    it('rejects expired authorization artifacts', () => {
      const claims = {
        sessionId: 'c0000000-0000-0000-0000-000000000003',
        workflowRunId: 'a0000000-0000-0000-0000-000000000003',
        stepId: 'step_3',
        version: 1,
        citizenId: PRIYA_SHARMA_ID,
        payloadHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        authorizedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1800 * 1000).toISOString(), // Expired 30 mins ago
      };

      const expiredToken = signAuthorizationToken(claims);
      expect(() => verifyAuthorizationToken(expiredToken)).toThrow(/TOKEN_EXPIRED/i);
    });
  });

  // =========================================================================
  // 5. PROACTIVE CITIZEN INTELLIGENCE RULES
  // =========================================================================
  describe('Proactive Intelligence Rules', () => {
    it('detects pending traffic e-challans for Priya Sharma', async () => {
      const engine = ProactiveCitizenEngine.getInstance();
      const summary = await engine.scanCitizen(PRIYA_SHARMA_ID, 'MANUAL_REFRESH');

      expect(summary.status).toBe('SUCCESS');
      const findings = await engine.listFindings(PRIYA_SHARMA_ID, { status: 'ALL' });
      const challanFinding = findings.find((f) => f.ruleCode === 'RULE_PENDING_TRAFFIC_CHALLAN');

      expect(challanFinding).toBeDefined();
      expect(challanFinding?.title).toContain('Traffic E-Challan');
      expect(challanFinding?.urgency).toBe('MEDIUM');
      expect(challanFinding?.status).toBe('ACTIVE');
    });

    it('detects active crop insurance policy coverage for Aarav Patel', async () => {
      const engine = ProactiveCitizenEngine.getInstance();
      const summary = await engine.scanCitizen(AARAV_PATEL_ID, 'MANUAL_REFRESH');

      expect(summary.status).toBe('SUCCESS');
      const findings = await engine.listFindings(AARAV_PATEL_ID, { status: 'ALL' });
      const cropFinding = findings.find((f) => f.ruleCode === 'RULE_CROP_INSURANCE_SEASONAL_WINDOW');

      expect(cropFinding).toBeDefined();
      expect(cropFinding?.title).toContain('PMFBY');
      expect(cropFinding?.urgency).toBe('HIGH');
    });
  });
});
