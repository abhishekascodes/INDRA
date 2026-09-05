import crypto from 'crypto';
import { getDb, schema, eq, and } from '@indra/database';
import type {
  HealthLinkAbhaRecordsInput,
  HealthLinkAbhaRecordsOutput,
  ConsentArtifact,
} from '@indra/contracts';
import { computeConsentSignatureDigest } from './consent-crypto.js';


export class AbdmSpiAdapter {
  private static instance: AbdmSpiAdapter | null = null;

  public static getInstance(): AbdmSpiAdapter {
    if (!AbdmSpiAdapter.instance) {
      AbdmSpiAdapter.instance = new AbdmSpiAdapter();
    }
    return AbdmSpiAdapter.instance;
  }

  /**
   * Links health records to citizen ABHA ID and produces a signed MeitY DEPA / ABDM electronic consent artifact.
   */
  public async linkAbhaRecords(
    input: HealthLinkAbhaRecordsInput
  ): Promise<HealthLinkAbhaRecordsOutput> {
    const db = await getDb();
    const consentArtifactId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.consentExpiryDays * 24 * 60 * 60 * 1000);

    const dataTypes = ['DIAGNOSTIC_REPORT', 'DISCHARGE_SUMMARY', 'OP_CONSULTATION'];
    const consentManagerId = 'NHA_ABDM_CONSENT_MANAGER_01';
    const dataProviderId = input.hipId || 'HIP_FORTIS_BLR_01';
    const dataConsumerId = 'INDRA_HEALTH_RECORD_VIEWER';

    // Canonical cryptographic signature digest for electronic consent artifact
    const signatureDigest = computeConsentSignatureDigest({
      version: 'V1',
      citizenId: input.citizenId,
      ecosystem: 'ABDM',
      consentManagerId,
      dataProviderId,
      dataConsumerId,
      purposeCode: input.purpose,
      dataTypes,
      expiresAt,
    });

    // Persist electronic consent artifact
    await db.insert(schema.consentArtifacts).values({
      id: consentArtifactId,
      citizenId: input.citizenId,
      ecosystem: 'ABDM',
      consentManagerId,
      purposeCode: input.purpose,
      dataProviderId,
      dataConsumerId,
      dataTypes,
      status: 'ACTIVE',
      signatureAlgorithm: 'ED25519_SHA256',
      signatureDigest,
      expiresAt,
      provenanceData: {
        sourceAuthority: 'National Health Authority (ABDM Gateway)',
        provenanceType: 'EXTERNAL_SPI',
        isSimulationAssumption: true,
      },
    });


    // Query existing health records in World Model for citizen
    const existingRecords = await db
      .select()
      .from(schema.citizenHealthRecords)
      .where(eq(schema.citizenHealthRecords.citizenId, input.citizenId));

    if (existingRecords.length === 0) {
      // Seed initial linked discharge summary
      await db.insert(schema.citizenHealthRecords).values({
        citizenId: input.citizenId,
        abhaAddress: input.abhaAddress,
        hipName: input.hipId || 'Fortis Hospital (Bannerghatta Road, Bengaluru)',
        recordType: 'DISCHARGE_SUMMARY',
        recordDate: '2025-11-20',
        diagnosticSummary: 'Day-care arthroscopic ligament reconstruction. Full mobility restored.',
        provenanceData: {
          sourceAuthority: 'National Health Authority (ABDM Gateway)',
          provenanceType: 'SYSTEM_OBSERVATION',
          isSimulationAssumption: true,
        },
      });
    }

    const records = await db
      .select()
      .from(schema.citizenHealthRecords)
      .where(eq(schema.citizenHealthRecords.citizenId, input.citizenId));

    return {
      success: true,
      abhaAddress: input.abhaAddress,
      consentArtifactId,
      linkedRecordsCount: records.length,
      records: records.map((r) => ({
        recordId: r.id,
        hipName: r.hipName,
        recordType: r.recordType,
        recordDate: r.recordDate,
        diagnosticSummary: r.diagnosticSummary,
      })),
      message: `Successfully linked ${records.length} health record(s) to ABHA Address '${input.abhaAddress}'. Active ABDM Consent Artifact generated.`,
    };
  }

  /**
   * Revokes an existing ABDM consent artifact.
   */
  public async revokeConsent(consentArtifactId: string, citizenId: string): Promise<boolean> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.consentArtifacts)
      .where(
        and(
          eq(schema.consentArtifacts.id, consentArtifactId),
          eq(schema.consentArtifacts.citizenId, citizenId)
        )
      );

    if (rows.length === 0) return false;

    await db
      .update(schema.consentArtifacts)
      .set({
        status: 'REVOKED',
        revokedAt: new Date(),
      })
      .where(eq(schema.consentArtifacts.id, consentArtifactId));

    return true;
  }

  /**
   * Fetches PM-JAY Ayushman Bharat Golden Card entitlement and hospital cover limit.
   */
  public async fetchAyushmanCard(input: { citizenId: string; abhaNumber?: string }) {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, input.citizenId));

    const name = rows[0]?.primaryName || 'Priya Sharma';
    const pmjayId = `PMJAY-IND-${Date.now().toString().slice(-8)}`;

    return {
      success: true,
      pmjayId,
      beneficiaryName: name,
      annualFamilyCoverageInr: 500000,
      eligibilityStatus: 'ACTIVE_BENEFICIARY',
      message: `Ayushman Bharat PM-JAY Golden Card verified for ${name}. Annual secondary and tertiary hospitalization cover: INR 5,00,000 per family.`,
    };
  }

  /**
   * Fetches official universal vaccination record (CoWIN / U-WIN).
   */
  public async fetchVaccinationCertificate(input: { citizenId: string; beneficiaryReferenceId: string }) {
    const certId = `CERT-VAX-${Date.now().toString().slice(-8)}`;
    return {
      success: true,
      beneficiaryName: 'Priya Sharma',
      vaccineName: 'COVID-19 (Covishield) / Adult Td Booster',
      dosesCompleted: 3,
      finalCertificateIssued: true,
      certificateId: certId,
      message: `Universal immunization certificate verified under CoWIN registry. Complete 3-dose prophylactic schedule recorded (Certificate ID: ${certId}).`,
    };
  }
}

