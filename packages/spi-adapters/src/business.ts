import { getDb, schema } from '@indra/database';
import { eq, and, desc } from 'drizzle-orm';

export interface ReserveCompanyNameInput {
  citizenId: string;
  proposedName: string;
  entityType: 'PRIVATE_LIMITED' | 'LLP' | 'PROPRIETORSHIP';
}

export interface IncorporateCompanyInput {
  citizenId: string;
  companyName: string;
  entityType: 'PRIVATE_LIMITED' | 'LLP' | 'PROPRIETORSHIP';
  registeredAddress: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  capitalInr: number;
}

export interface IncorporateCompanyResult {
  cinOrId: string;
  legalName: string;
  pan: string;
  gstin: string;
  udyamNumber: string;
  incorporationDate: string;
  status: string;
}

export class BusinessSpiAdapter {
  async checkNameAvailability(
    input: ReserveCompanyNameInput
  ): Promise<{ available: boolean; reservationCode: string }> {
    const reservationCode = `MCA-RES-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      available: true,
      reservationCode,
    };
  }

  async incorporateCompany(
    input: IncorporateCompanyInput
  ): Promise<IncorporateCompanyResult> {
    const db = await getDb();

    // Generate realistic synthetic government credentials for the new company
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const pan = `AABCI${randomDigits}K`;
    const gstin = `29${pan}1Z5`;
    const udyamNumber = `UDYAM-KR-03-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const today = new Date().toISOString().split('T')[0];

    const inserted = await db
      .insert(schema.spiBusinessEntities)
      .values({
        citizenId: input.citizenId,
        entityType: input.entityType,
        legalName: input.companyName,
        tradeName: input.companyName,
        pan,
        gstin,
        udyamNumber,
        incorporationDate: today,
        status: 'ACTIVE',
        registeredAddress: input.registeredAddress,
      })
      .returning();

    const entity = inserted[0];

    // Issue synthetic certificate into citizen documents
    await db.insert(schema.citizenDocuments).values({
      citizenId: input.citizenId,
      documentType: 'CERTIFICATE_OF_INCORPORATION',
      title: `Certificate of Incorporation - ${input.companyName}`,
      issuer: 'Ministry of Corporate Affairs, Registrar of Companies',
      documentNumber: entity.id,
      issueDate: today,
      verificationStatus: 'VERIFIED',
      provenanceId: `prov_mca_${entity.id}`,
    });

    return {
      cinOrId: entity.id,
      legalName: entity.legalName,
      pan: entity.pan,
      gstin: entity.gstin || '',
      udyamNumber: entity.udyamNumber || '',
      incorporationDate: entity.incorporationDate,
      status: entity.status,
    };
  }

  /**
   * Registers GSTIN on GST Common Portal for an existing incorporated enterprise.
   */
  async registerGstin(input: {
    citizenId: string;
    entityId: string;
    stateCode: string;
  }) {
    const db = await getDb();
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let entity: any = null;

    if (input.entityId && UUID_REGEX.test(input.entityId)) {
      const rows = await db
        .select()
        .from(schema.spiBusinessEntities)
        .where(
          and(
            eq(schema.spiBusinessEntities.citizenId, input.citizenId),
            eq(schema.spiBusinessEntities.id, input.entityId)
          )
        );
      if (rows.length > 0) {
        entity = rows[0];
      }
    }

    if (!entity) {
      // Fallback: search for active/latest business entity belonging to citizen
      const rows = await db
        .select()
        .from(schema.spiBusinessEntities)
        .where(eq(schema.spiBusinessEntities.citizenId, input.citizenId))
        .orderBy(desc(schema.spiBusinessEntities.createdAt))
        .limit(1);
      if (rows.length > 0) {
        entity = rows[0];
      }
    }

    if (!entity) {
      throw new Error(
        `Precondition Failed: No incorporated business entity found for citizen '${input.citizenId}'. Please complete company incorporation first.`
      );
    }

    const gstin = `${input.stateCode}${entity.pan}1Z8`;
    const today = new Date().toISOString().split('T')[0];

    await db
      .update(schema.spiBusinessEntities)
      .set({ gstin })
      .where(eq(schema.spiBusinessEntities.id, entity.id));

    return {
      gstin,
      legalName: entity.legalName,
      stateCode: input.stateCode,
      registrationDate: today,
      provenance: {
        source: 'SPI_GST_COMMON_PORTAL',
        authority: 'Goods and Services Tax Network (GSTN)',
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: new Date().toISOString(),
        confidence: null,
      },
    };
  }

  /**
   * Registers MSME Udyam certificate for an active enterprise.
   */
  async registerUdyam(input: {
    citizenId: string;
    entityId: string;
    enterpriseType: 'MICRO' | 'SMALL' | 'MEDIUM';
    majorActivity: 'SERVICES' | 'MANUFACTURING';
  }) {
    const db = await getDb();
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let entity: any = null;

    if (input.entityId && UUID_REGEX.test(input.entityId)) {
      const rows = await db
        .select()
        .from(schema.spiBusinessEntities)
        .where(
          and(
            eq(schema.spiBusinessEntities.citizenId, input.citizenId),
            eq(schema.spiBusinessEntities.id, input.entityId)
          )
        );
      if (rows.length > 0) {
        entity = rows[0];
      }
    }

    if (!entity) {
      // Fallback: search for active/latest business entity belonging to citizen
      const rows = await db
        .select()
        .from(schema.spiBusinessEntities)
        .where(eq(schema.spiBusinessEntities.citizenId, input.citizenId))
        .orderBy(desc(schema.spiBusinessEntities.createdAt))
        .limit(1);
      if (rows.length > 0) {
        entity = rows[0];
      }
    }

    if (!entity) {
      throw new Error(
        `Precondition Failed: No incorporated business entity found for citizen '${input.citizenId}'. Please complete company incorporation first.`
      );
    }

    const udyamNumber = `UDYAM-KR-03-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const today = new Date().toISOString().split('T')[0];

    await db
      .update(schema.spiBusinessEntities)
      .set({ udyamNumber })
      .where(eq(schema.spiBusinessEntities.id, entity.id));

    return {
      udyamNumber,
      enterpriseType: input.enterpriseType,
      legalName: entity.legalName,
      issuedAt: today,
      provenance: {
        source: 'SPI_MSME_UDYAM_REGISTRATION_PORTAL',
        authority: 'Ministry of Micro, Small and Medium Enterprises',
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: new Date().toISOString(),
        confidence: null,
      },
    };
  }

  /**
   * Files annual corporate return (Form AOC-4 Financial Statements / MGT-7 Annual Return) on MCA-21 portal.
   */
  async fileAnnualRocReturn(input: {
    citizenId: string;
    cin: string;
    financialYear?: string;
    formType?: 'AOC-4' | 'MGT-7';
  }) {
    const srn = `MCA-${input.formType || 'AOC-4'}-${Date.now().toString().slice(-8)}`;
    const now = new Date().toISOString();

    return {
      success: true,
      cin: input.cin,
      formType: input.formType || 'AOC-4',
      srnNumber: srn,
      filingTimestamp: now,
      status: 'FILED_AND_APPROVED',
      message: `Ministry of Corporate Affairs MCA-21 e-Form ${input.formType || 'AOC-4'} approved for CIN ${input.cin} under SRN ${srn}. Statutory compliance maintained.`,
    };
  }
}

