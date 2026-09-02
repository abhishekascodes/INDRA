import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';

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
}
