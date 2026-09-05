import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  eq,
  and,
} from '@indra/database';
import {
  CapabilityRegistry,
  CapabilityExecutor,
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import { CitizenWorldModelService } from '@indra/policy-engine';

describe('Phase 3.2: Expanded Capability Catalog & Synthetic SPI Suite', () => {
  let registry: CapabilityRegistry;
  let executor: CapabilityExecutor;
  let wmService: CitizenWorldModelService;

  beforeAll(() => {
    registerDefaultCapabilities();
    registry = CapabilityRegistry.getInstance();
    executor = new CapabilityExecutor();
    wmService = CitizenWorldModelService.getInstance();
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
  // 1. TRANSPORT CAPABILITIES
  // =========================================================================
  describe('Transport Capabilities (Vahan & Sarathi)', () => {
    it('transport.inquire_vehicle_rc: succeeds for vehicle owner, fails deterministically for non-owner', async () => {
      // Priya holds Ather 450X (KA-01-EQ-4921)
      const priyaResult = await runCap(
        'transport.inquire_vehicle_rc',
        {
          citizenId: PRIYA_SHARMA_ID,
          registrationNumber: 'KA-01-EQ-4921',
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(priyaResult.success).toBe(true);
      expect(priyaResult.output.registrationNumber).toBe('KA-01-EQ-4921');
      expect(priyaResult.output.makerModel).toContain('Ather 450X');
      expect(priyaResult.output.state).toBe('Karnataka');
      expect(priyaResult.output.provenance.source).toBe('SPI_VAHAN_NATIONAL_REGISTER');
      expect(priyaResult.output.provenance.provenanceType).toBe('FACT');

      // Precondition Failure: Aarav holds NO vehicles -> must fail deterministically!
      const aaravResult = await runCap(
        'transport.inquire_vehicle_rc',
        {
          citizenId: AARAV_PATEL_ID,
          registrationNumber: 'KA-01-EQ-4921',
        },
        { citizenId: AARAV_PATEL_ID }
      );

      expect(aaravResult.success).toBe(false);
      expect(aaravResult.error).toMatch(/has no motor vehicles registered/);
    });

    it('transport.transfer_vehicle_rc: enforces preconditions, mutates persistent state, and reflects in World Model', async () => {
      // Precondition Failure for Aarav (holds no vehicles)
      const aaravFail = await runCap(
        'transport.transfer_vehicle_rc',
        {
          citizenId: AARAV_PATEL_ID,
          registrationNumber: 'KA-01-EQ-4921',
          destinationState: 'Maharashtra',
          destinationRto: 'MH-12',
          destinationAddress: 'Koregaon Park, Pune',
        },
        { citizenId: AARAV_PATEL_ID, authorizationGranted: true }
      );
      expect(aaravFail.success).toBe(false);
      expect(aaravFail.error).toMatch(/holds no registered motor vehicles/);

      // Successful Transfer for Priya
      const res = await runCap(
        'transport.transfer_vehicle_rc',
        {
          citizenId: PRIYA_SHARMA_ID,
          registrationNumber: 'KA-01-EQ-4921',
          destinationState: 'Maharashtra',
          destinationRto: 'MH-12',
          destinationAddress: 'Koregaon Park, Pune, Maharashtra - 411001',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.transferred).toBe(true);
      expect(res.output.newRtoCode).toBe('MH-12');
      expect(res.output.newState).toBe('Maharashtra');

      // Verify Persisted State Mutation in Database
      const db = await getDb();
      const [vehicle] = await db
        .select()
        .from(schema.citizenVehicles)
        .where(
          and(
            eq(schema.citizenVehicles.citizenId, PRIYA_SHARMA_ID),
            eq(schema.citizenVehicles.registrationNumber, 'KA-01-EQ-4921')
          )
        );
      expect(vehicle.rtoCode).toBe('MH-12');
      expect(vehicle.state).toBe('Maharashtra');

      // Verify Single Source of Truth: World Model Inspector sees the updated state
      const wm = await wmService.getWorldModel(PRIYA_SHARMA_ID);
      expect(wm.vehicles[0].rtoCode).toBe('MH-12');
      expect(wm.vehicles[0].state).toBe('Maharashtra');
    });

    it('transport.endorse_dl_address: updates Driving Licence in Sarathi registry', async () => {
      const res = await runCap(
        'transport.endorse_dl_address',
        {
          citizenId: PRIYA_SHARMA_ID,
          newAddress: 'Flat 102, Shanti Vihar, Koregaon Park, Pune - 411001',
          destinationState: 'Maharashtra',
          destinationRto: 'MH-12',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.endorsed).toBe(true);
      expect(res.output.rtoCode).toBe('MH-12');
      expect(res.output.updatedAddress).toContain('Koregaon Park');

      // Verify DL table mutation in database
      const db = await getDb();
      const [dl] = await db
        .select()
        .from(schema.spiDrivingLicences)
        .where(eq(schema.spiDrivingLicences.citizenId, PRIYA_SHARMA_ID));
      expect(dl.address).toContain('Koregaon Park');
      expect(dl.rtoCode).toBe('MH-12');
    });
  });

  // =========================================================================
  // 2. IDENTITY CAPABILITIES (Aadhaar & Voter)
  // =========================================================================
  describe('Identity Capabilities (UIDAI & ECI)', () => {
    it('identity.update_aadhaar_address: updates residential address in UIDAI ledger', async () => {
      const res = await runCap(
        'identity.update_aadhaar_address',
        {
          citizenId: PRIYA_SHARMA_ID,
          newAddress: '124 Platinum Towers, Baner Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411045',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.updated).toBe(true);
      expect(res.output.city).toBe('Pune');
      expect(res.output.state).toBe('Maharashtra');

      // Verify database synchronization in citizen addresses
      const db = await getDb();
      const [addr] = await db
        .select()
        .from(schema.citizenAddresses)
        .where(
          and(
            eq(schema.citizenAddresses.citizenId, PRIYA_SHARMA_ID),
            eq(schema.citizenAddresses.type, 'CURRENT')
          )
        );
      expect(addr.city).toBe('Pune');
      expect(addr.line1).toContain('Baner Road');

      // Verify domain primitive reflects new residence
      const residence = await wmService.getCurrentResidence(PRIYA_SHARMA_ID);
      expect(residence.city).toBe('Pune');
      expect(residence.state).toBe('Maharashtra');
    });

    it('identity.transfer_voter_constituency: creates ECI Form 8 transposition record', async () => {
      const res = await runCap(
        'identity.transfer_voter_constituency',
        {
          citizenId: PRIYA_SHARMA_ID,
          newConstituency: '208 - Kothrud Assembly Constituency',
          state: 'Maharashtra',
          newAddress: '124 Platinum Towers, Baner, Pune',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.status).toBe('SUBMITTED_FOR_BLO_FIELD_VERIFICATION');
      expect(res.output.trackingRef).toContain('ECI-F8-');
      expect(res.output.newConstituency).toContain('Kothrud');
      expect(res.output.provenance.source).toBe('SPI_ECI_NATIONAL_VOTERS_SERVICE_PORTAL');
    });
  });

  // =========================================================================
  // 3. DOCUMENTS & DIGILOCKER CAPABILITIES
  // =========================================================================
  describe('Documents & DigiLocker Capabilities', () => {
    it('documents.fetch_digilocker: pulls verified credential from partner issuer into vault', async () => {
      const res = await runCap(
        'documents.fetch_digilocker',
        {
          citizenId: PRIYA_SHARMA_ID,
          documentType: 'CLASS_X_MARKSHEET',
          title: 'Secondary School Leaving Certificate (Class X)',
          issuerId: 'CBSE',
          parameters: { rollNumber: 'CBSE-2010-891048' },
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(res.success).toBe(true);
      expect(res.output.documentType).toBe('CLASS_X_MARKSHEET');
      expect(res.output.verificationStatus).toBe('VERIFIED');
      expect(res.output.uri).toContain('digilocker:cbse');

      // Verify document persisted in database
      const db = await getDb();
      const [doc] = await db
        .select()
        .from(schema.citizenDocuments)
        .where(eq(schema.citizenDocuments.id, res.output.documentId));
      expect(doc).toBeDefined();
      expect(doc.title).toContain('Class X');
    });

    it('documents.issue_credential: issues verifiable credential to citizen vault', async () => {
      const res = await runCap(
        'documents.issue_credential',
        {
          citizenId: PRIYA_SHARMA_ID,
          title: 'Verified Sovereign Address Credential',
          documentType: 'VERIFIABLE_ADDRESS_ASSERTION',
          issuer: 'INDRA Identity Trust Network',
          documentNumber: 'VC-ADDR-2026-0098',
          payload: { city: 'Bengaluru', verifiedDate: '2026-09-03' },
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.verificationStatus).toBe('VERIFIED');
      expect(res.output.uri).toContain('urn:vc:indra');
    });
  });

  // =========================================================================
  // 4. TAX & TRACES CAPABILITIES
  // =========================================================================
  describe('Tax & TRACES Capabilities', () => {
    it('tax.check_itr_status: evaluates CPC e-filing status based on citizen obligations', async () => {
      // Priya has SATISFIED ITR obligation -> returns processed with refund
      const priyaRes = await runCap(
        'tax.check_itr_status',
        { citizenId: PRIYA_SHARMA_ID, assessmentYear: '2026-27' },
        { citizenId: PRIYA_SHARMA_ID }
      );
      expect(priyaRes.success).toBe(true);
      expect(priyaRes.output.filingStatus).toBe('PROCESSED_WITH_REFUND');
      expect(priyaRes.output.refundAmountInr).toBeGreaterThan(0);

      // Aarav has PENDING ITR obligation -> returns pending verification
      const aaravRes = await runCap(
        'tax.check_itr_status',
        { citizenId: AARAV_PATEL_ID, assessmentYear: '2026-27' },
        { citizenId: AARAV_PATEL_ID }
      );
      expect(aaravRes.success).toBe(true);
      expect(aaravRes.output.filingStatus).toBe('PENDING_VERIFICATION');
      expect(aaravRes.output.refundAmountInr).toBe(0);
    });

    it('tax.fetch_form26as: retrieves tax credits from employer TDS entries', async () => {
      const res = await runCap(
        'tax.fetch_form26as',
        { citizenId: PRIYA_SHARMA_ID, financialYear: '2025-26' },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(res.success).toBe(true);
      expect(res.output.totalTdsInr).toBeGreaterThan(0);
      expect(res.output.entries.length).toBe(2); // TechSolutions + Apex Systems
      expect(res.output.provenance.source).toBe('SPI_INCOME_TAX_TRACES_SYSTEM');
    });
  });

  // =========================================================================
  // 5. PASSPORT CAPABILITY
  // =========================================================================
  describe('Passport Capability', () => {
    it('passport.check_status: computes expiration and renewal eligibility', async () => {
      const res = await runCap(
        'passport.check_status',
        { citizenId: PRIYA_SHARMA_ID },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(res.success).toBe(true);
      expect(res.output.passportNumberMasked).toContain('****');
      expect(res.output.holderName).toBe('Priya Sharma');
      expect(res.output.eligibleForRenewal).toBe(true);
      expect(res.output.rpoOffice).toContain('Bengaluru');
    });
  });

  // =========================================================================
  // 6. BUSINESS & MSME CAPABILITIES
  // =========================================================================
  describe('Business & MSME Capabilities', () => {
    it('business.register_gstin: provisions GSTIN on incorporated enterprise', async () => {
      // Incorporate enterprise first
      const incRes = await runCap(
        'business.incorporate',
        {
          citizenId: PRIYA_SHARMA_ID,
          companyName: 'AeroDynamics AI Tech Private Limited',
          entityType: 'PRIVATE_LIMITED',
          registeredAddress: {
            line1: '100 Feet Road, Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
          },
          capitalInr: 1000000,
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(incRes.success).toBe(true);
      const entityId = incRes.output.cinOrId;

      // Register GSTIN
      const gstinRes = await runCap(
        'business.register_gstin',
        {
          citizenId: PRIYA_SHARMA_ID,
          entityId,
          stateCode: '29',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(gstinRes.success).toBe(true);
      expect(gstinRes.output.gstin).toMatch(/^29AABCI\d{4}K1Z8$/);
      expect(gstinRes.output.legalName).toContain('AeroDynamics');

      // Verify GSTIN persisted in database
      const db = await getDb();
      const [entity] = await db
        .select()
        .from(schema.spiBusinessEntities)
        .where(eq(schema.spiBusinessEntities.id, entityId));
      expect(entity.gstin).toBe(gstinRes.output.gstin);
    });

    it('business.register_udyam: registers MSME classification and issues Udyam number', async () => {
      const incRes = await runCap(
        'business.incorporate',
        {
          citizenId: PRIYA_SHARMA_ID,
          companyName: 'Vayu Dynamics Private Limited',
          entityType: 'PRIVATE_LIMITED',
          registeredAddress: {
            line1: '100 Feet Road, Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
          },
          capitalInr: 500000,
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(incRes.success).toBe(true);
      const entityId = incRes.output.cinOrId;

      const udyamRes = await runCap(
        'business.register_udyam',
        {
          citizenId: PRIYA_SHARMA_ID,
          entityId,
          enterpriseType: 'MICRO',
          majorActivity: 'SERVICES',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(udyamRes.success).toBe(true);
      expect(udyamRes.output.udyamNumber).toContain('UDYAM-KR-03-');
      expect(udyamRes.output.enterpriseType).toBe('MICRO');
    });
  });

  // =========================================================================
  // 7. EMPLOYMENT & EPFO CAPABILITIES
  // =========================================================================
  describe('Employment & EPFO Capabilities', () => {
    it('epfo.download_passbook: retrieves monthly contribution ledger and statutory interest', async () => {
      const res = await runCap(
        'epfo.download_passbook',
        {
          citizenId: PRIYA_SHARMA_ID,
          memberId: 'KNBLR0049281000010928',
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(res.success).toBe(true);
      expect(res.output.totalPfBalanceInr).toBeGreaterThan(0);
      expect(res.output.interestRatePercent).toBe(8.25);
      expect(res.output.monthlyBreakdown.length).toBeGreaterThan(0);
      expect(res.output.provenance.source).toBe('SPI_EPFO_MEMBER_PASSBOOK_PORTAL');
    });

    it('epfo.update_kyc_pan: seeds verified PAN into member profile', async () => {
      const res = await runCap(
        'epfo.update_kyc_pan',
        {
          citizenId: PRIYA_SHARMA_ID,
          panNumber: 'ABCDE1234F',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.seedingStatus).toBe('VERIFIED_BY_INCOME_TAX_DEPT');
      expect(res.output.uanLinked).toBe(true);
    });
  });

  // =========================================================================
  // 8. WELFARE & DBT CAPABILITIES
  // =========================================================================
  describe('Welfare & DBT Capabilities', () => {
    it('welfare.evaluate_schemes: evaluates agricultural land eligibility for Aarav vs Priya', async () => {
      // Aarav holds agricultural land in Satara -> eligible for PM_KISAN
      const aaravRes = await runCap(
        'welfare.evaluate_schemes',
        { citizenId: AARAV_PATEL_ID },
        { citizenId: AARAV_PATEL_ID }
      );
      expect(aaravRes.success).toBe(true);
      const pmKisanAarav = aaravRes.output.schemes.find((s: any) => s.code === 'PM_KISAN');
      expect(pmKisanAarav?.eligible).toBe(true);

      // Priya holds residential flat in Indiranagar -> NOT eligible for PM_KISAN
      const priyaRes = await runCap(
        'welfare.evaluate_schemes',
        { citizenId: PRIYA_SHARMA_ID },
        { citizenId: PRIYA_SHARMA_ID }
      );
      expect(priyaRes.success).toBe(true);
      const pmKisanPriya = priyaRes.output.schemes.find((s: any) => s.code === 'PM_KISAN');
      expect(pmKisanPriya?.eligible).toBe(false);
    });

    it('welfare.submit_application: files direct benefit claim and creates persistent application record', async () => {
      const res = await runCap(
        'welfare.submit_application',
        {
          citizenId: AARAV_PATEL_ID,
          schemeCode: 'PM_KISAN',
          applicantDetails: { landSurveyNumber: '142/3', bankAccountVerified: true },
        },
        { citizenId: AARAV_PATEL_ID, authorizationGranted: true }
      );

      expect(res.success).toBe(true);
      expect(res.output.status).toBe('SUBMITTED');
      expect(res.output.applicationNumber).toContain('WLF-APP-');

      // Verify application persisted in database
      const db = await getDb();
      const [app] = await db
        .select()
        .from(schema.applications)
        .where(eq(schema.applications.referenceCode, res.output.applicationNumber));
      expect(app).toBeDefined();
      expect(app.citizenId).toBe(AARAV_PATEL_ID);
      expect(app.serviceCategory).toBe('WELFARE');
    });
  });

  // =========================================================================
  // 9. IDEMPOTENCY & RUNTIME SECURITY
  // =========================================================================
  describe('Idempotency & Runtime Safety', () => {
    it('enforces idempotency over repeated capability executions with same key', async () => {
      const idempotencyKey = 'idemp_test_passbook_901284';

      const run1 = await runCap(
        'epfo.download_passbook',
        { citizenId: PRIYA_SHARMA_ID, memberId: 'KNBLR0049281000010928' },
        { citizenId: PRIYA_SHARMA_ID, idempotencyKey }
      );

      const run2 = await runCap(
        'epfo.download_passbook',
        { citizenId: PRIYA_SHARMA_ID, memberId: 'KNBLR0049281000010928' },
        { citizenId: PRIYA_SHARMA_ID, idempotencyKey }
      );

      expect(run1.success).toBe(true);
      expect(run2.success).toBe(true);
      expect(run2.idempotencyHit).toBe(true);
      expect(run1.output.memberId).toBe(run2.output.memberId);
    });

    it('rejects execution when required human authorization is omitted for sensitive mutations', async () => {
      // transport.transfer_vehicle_rc requires human authorization
      const res = await runCap(
        'transport.transfer_vehicle_rc',
        {
          citizenId: PRIYA_SHARMA_ID,
          registrationNumber: 'KA-01-EQ-4921',
          destinationState: 'Maharashtra',
          destinationRto: 'MH-12',
          destinationAddress: 'Koregaon Park, Pune',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: false } // No authorization!
      );

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/requires explicit citizen authorization/);
    });
  });
});
