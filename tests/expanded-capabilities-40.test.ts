import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  eq,
} from '@indra/database';
import {
  CapabilityRegistry,
  CapabilityExecutor,
  registerDefaultCapabilities,
} from '@indra/capability-engine';

describe('Expanded Capability Catalog Suite (40 Capabilities Baseline)', () => {
  let registry: CapabilityRegistry;
  let executor: CapabilityExecutor;

  beforeAll(() => {
    registerDefaultCapabilities();
    registry = CapabilityRegistry.getInstance();
    executor = new CapabilityExecutor();
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
  // 1. CATALOG UNIVERSE VERIFICATION
  // =========================================================================
  describe('Capability Universe Metrics', () => {
    it('registers at least 40 capabilities across all civic domains (now expanded to full national coverage)', () => {
      const all = registry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(40);
    });

    it('contains all 12 newly expanded capabilities with valid schemas', () => {
      const newCaps = [
        'property.verify_encumbrance',
        'property.fetch_title_deed',
        'property.apply_mutation',
        'civic.pay_property_tax',
        'civic.update_utility_consumer',
        'civic.verify_vital_record',
        'agriculture.verify_pmkisan_status',
        'agriculture.fetch_soil_health_card',
        'justice.file_cpgrams_grievance',
        'justice.check_rti_status',
        'family.endorse_kinship_nomination',
        'security.freeze_compromised_account',
      ];

      for (const capId of newCaps) {
        const cap = registry.get(capId);
        expect(cap, `Capability ${capId} must be registered`).toBeDefined();
        expect(cap?.inputSchema).toBeDefined();
        expect(cap?.outputSchema).toBeDefined();
        expect(cap?.sideEffectClass).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 2. LAND & REAL PROPERTY CAPABILITIES
  // =========================================================================
  describe('Land & Real Property Capabilities', () => {
    it('property.verify_encumbrance: returns clean 15-year search certificate', async () => {
      const result = await runCap(
        'property.verify_encumbrance',
        {
          citizenId: PRIYA_SHARMA_ID,
          propertyIdentifier: 'PID-BBMP-984210',
          searchYears: 15,
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(result.success).toBe(true);
      expect(result.output!.isCleanTitle).toBe(true);
      expect(result.output!.clearanceCertificateNumber).toContain('EC-');
      expect(result.output!.issuingAuthority).toContain('Department of Stamps and Registration');
    });

    it('property.fetch_title_deed: retrieves official Khata / RoR title extract', async () => {
      const result = await runCap(
        'property.fetch_title_deed',
        {
          citizenId: PRIYA_SHARMA_ID,
          propertyIdentifier: 'PID-BBMP-984210',
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(result.success).toBe(true);
      expect(result.output!.isVerified).toBe(true);
      expect(result.output!.ownerName).toBe('Priya Sharma');
      expect(result.output!.sourceRegistry).toBeDefined();
    });

    it('property.apply_mutation: enforces human authorization for irreversible title mutation', async () => {
      // Without authorization -> rejects
      const unauthResult = await runCap(
        'property.apply_mutation',
        {
          citizenId: PRIYA_SHARMA_ID,
          propertyIdentifier: 'PID-BBMP-984210',
          registrationDeedNumber: 'DEED-2026-98124',
          transfereeName: 'Aarav Patel',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: false }
      );

      expect(unauthResult.success).toBe(false);
      expect(unauthResult.error).toContain('requires explicit citizen authorization');

      // With authorization -> succeeds
      const authResult = await runCap(
        'property.apply_mutation',
        {
          citizenId: PRIYA_SHARMA_ID,
          propertyIdentifier: 'PID-BBMP-984210',
          registrationDeedNumber: 'DEED-2026-98124',
          transfereeName: 'Aarav Patel',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(authResult.success).toBe(true);
      expect(authResult.output!.mutationNoticeNumber).toContain('MUT-');
      expect(authResult.output!.status).toBe('OBJECTION_PERIOD_OPEN');
      expect(authResult.output!.objectionPeriodDays).toBe(30);
    });
  });

  // =========================================================================
  // 3. CIVIC & MUNICIPAL ADMINISTRATION CAPABILITIES
  // =========================================================================
  describe('Civic & Municipal Administration Capabilities', () => {
    it('civic.pay_property_tax: processes payment and updates municipal tax status', async () => {
      const result = await runCap(
        'civic.pay_property_tax',
        {
          citizenId: PRIYA_SHARMA_ID,
          propertyIdentifier: 'PID-BBMP-984210',
          assessmentYear: '2025-26',
          amountInr: 4500,
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(result.success).toBe(true);
      expect(result.output!.status).toBe('PAID');
      expect(result.output!.receiptNumber).toContain('BBPS-TAX-');
      expect(result.output!.updatedBalanceInr).toBe(0);
    });

    it('civic.update_utility_consumer: transfers consumer connection name', async () => {
      const result = await runCap(
        'civic.update_utility_consumer',
        {
          citizenId: PRIYA_SHARMA_ID,
          consumerNumber: 'WTR-PUN-891024',
          utilityType: 'WATER',
          newHolderName: 'Priya Sharma',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(result.success).toBe(true);
      expect(result.output!.status).toBe('ACTIVE');
      expect(result.output!.endorsementId).toContain('UTIL-END-');
      expect(result.output!.newConsumerName).toBe('Priya Sharma');
    });

    it('civic.verify_vital_record: verifies municipal birth extract under CRS', async () => {
      const result = await runCap(
        'civic.verify_vital_record',
        {
          citizenId: PRIYA_SHARMA_ID,
          registrationNumber: 'BR-1992-MUM-8910',
          eventType: 'BIRTH',
          year: 1992,
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(result.success).toBe(true);
      expect(result.output!.verified).toBe(true);
      expect(result.output!.personName).toBe('Priya Sharma');
      expect(result.output!.issuingAuthority).toContain('Chief Registrar of Births and Deaths');
    });
  });

  // =========================================================================
  // 4. AGRICULTURE & RURAL ENTITLEMENTS CAPABILITIES
  // =========================================================================
  describe('Agriculture & Rural Entitlements Capabilities', () => {
    it('agriculture.verify_pmkisan_status: verifies PM-KISAN DBT installment status', async () => {
      const result = await runCap(
        'agriculture.verify_pmkisan_status',
        {
          citizenId: PRIYA_SHARMA_ID,
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(result.success).toBe(true);
      expect(result.output!.program).toContain('PM-KISAN');
      expect(result.output!.totalInstallmentsReleased).toBe(16);
      expect(result.output!.lastInstallmentAmountInr).toBe(2000);
    });

    it('agriculture.fetch_soil_health_card: returns 12-parameter ICAR nutrient card', async () => {
      const result = await runCap(
        'agriculture.fetch_soil_health_card',
        {
          citizenId: PRIYA_SHARMA_ID,
          surveyNumber: 'SUR-412/A',
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(result.success).toBe(true);
      expect(result.output!.cardId).toContain('SHC-');
      expect(result.output!.macronutrients.nitrogenStatus).toBeDefined();
      expect(result.output!.recommendations.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 5. JUSTICE, GRIEVANCES & RTI CAPABILITIES
  // =========================================================================
  describe('Justice, Grievances & RTI Capabilities', () => {
    it('justice.file_cpgrams_grievance: lodges authenticated grievance petition', async () => {
      const result = await runCap(
        'justice.file_cpgrams_grievance',
        {
          citizenId: PRIYA_SHARMA_ID,
          ministryCode: 'MORTH',
          subject: 'Delay in High-Security Registration Plate (HSRP) endorsement',
          grievanceDetails: 'Application filed 45 days ago at Pune RTO, no physical inspection scheduled yet.',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(result.success).toBe(true);
      expect(result.output!.registrationNumber).toContain('PMOPG/E/');
      expect(result.output!.status).toBe('UNDER_PROCESS');
      expect(result.output!.expectedResolutionDays).toBe(30);
    });

    it('justice.check_rti_status: inquires RTI application status and PIO details', async () => {
      const result = await runCap(
        'justice.check_rti_status',
        {
          citizenId: PRIYA_SHARMA_ID,
          registrationNumber: 'RTI/2026/MEITY/09214',
        },
        { citizenId: PRIYA_SHARMA_ID }
      );

      expect(result.success).toBe(true);
      expect(result.output!.status).toBe('PENDING_PIO_RESPONSE');
      expect(result.output!.pioName).toBeDefined();
      expect(result.output!.statutoryDeadlineDate).toBeDefined();
    });
  });

  // =========================================================================
  // 6. FAMILY & EMERGENCY SECURITY CAPABILITIES
  // =========================================================================
  describe('Family & Emergency Security Capabilities', () => {
    it('family.endorse_kinship_nomination: endorses legal nominee across institutions', async () => {
      const result = await runCap(
        'family.endorse_kinship_nomination',
        {
          citizenId: PRIYA_SHARMA_ID,
          targetAccountType: 'EPFO',
          accountIdentifier: '101988219012',
          nomineeFullName: 'Aarav Patel',
          relation: 'SPOUSE',
          allocationPercentage: 100,
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(result.success).toBe(true);
      expect(result.output!.status).toBe('ENDORSED');
      expect(result.output!.nominationReferenceNumber).toContain('NOM-EPFO-');

      // Verify that citizenRelationships table was updated
      const db = await getDb();
      const relationships = await db
        .select()
        .from(schema.citizenRelationships)
        .where(eq(schema.citizenRelationships.citizenId, PRIYA_SHARMA_ID));

      const nominee = relationships.find((r) => r.fullName === 'Aarav Patel');
      expect(nominee?.isNomineeForEpfo).toBe(true);
    });

    it('security.freeze_compromised_account: issues emergency cybercrime debit freeze (1930 Helpline)', async () => {
      const result = await runCap(
        'security.freeze_compromised_account',
        {
          citizenId: PRIYA_SHARMA_ID,
          incidentBrief: 'Unauthorized UPI debit of Rs 25,000 detected on phishing portal',
        },
        { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true }
      );

      expect(result.success).toBe(true);
      expect(result.output!.accountLienStatus).toBe('DEBIT_FROZEN');
      expect(result.output!.acknowledgementNumber).toContain('NCCR-1930-');
      expect(result.output!.reportingChannel).toContain('1930');
      expect(result.output!.remedialNextSteps.length).toBeGreaterThan(0);
    });
  });
});
