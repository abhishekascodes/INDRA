import { getDb, schema, eq } from '@indra/database';

export interface PayPropertyTaxInput {
  citizenId: string;
  propertyIdentifier: string;
  assessmentYear: string;
  amountInr: number;
}

export interface PayPropertyTaxOutput {
  success: boolean;
  receiptNumber: string;
  propertyIdentifier: string;
  assessmentYear: string;
  paidAmountInr: number;
  paymentDate: string;
  updatedBalanceInr: number;
  status: 'PAID';
  treasuryHead: string;
  municipalBody: string;
}

export interface UpdateUtilityConsumerInput {
  citizenId: string;
  consumerNumber: string;
  utilityType: 'WATER' | 'ELECTRICITY';
  newHolderName: string;
}

export interface UpdateUtilityConsumerOutput {
  success: boolean;
  endorsementId: string;
  consumerNumber: string;
  utilityType: 'WATER' | 'ELECTRICITY';
  newConsumerName: string;
  status: 'ACTIVE';
  effectiveDate: string;
  issuingBoard: string;
}

export interface VerifyVitalRecordInput {
  citizenId: string;
  registrationNumber: string;
  eventType: 'BIRTH' | 'DEATH';
  year: number;
}

export interface VerifyVitalRecordOutput {
  success: boolean;
  verified: boolean;
  registrationNumber: string;
  eventType: 'BIRTH' | 'DEATH';
  personName: string;
  eventDate: string;
  placeOfEvent: string;
  registrationDate: string;
  issuingAuthority: string;
}

export class CivicSpiAdapter {
  private static instance: CivicSpiAdapter | null = null;

  public static getInstance(): CivicSpiAdapter {
    if (!CivicSpiAdapter.instance) {
      CivicSpiAdapter.instance = new CivicSpiAdapter();
    }
    return CivicSpiAdapter.instance;
  }

  /**
   * Assesses and processes civic property tax payment to Municipal Corporation.
   */
  async payPropertyTax(input: PayPropertyTaxInput): Promise<PayPropertyTaxOutput> {
    const db = await getDb();

    // Update tax status in citizenProperties if exists
    const properties = await db
      .select()
      .from(schema.citizenProperties)
      .where(eq(schema.citizenProperties.citizenId, input.citizenId));

    const matched = properties.find((p) => p.identifier === input.propertyIdentifier);
    if (matched) {
      await db
        .update(schema.citizenProperties)
        .set({ taxPaymentStatus: 'PAID' })
        .where(eq(schema.citizenProperties.id, matched.id));
    }

    const receiptNo = `BBPS-TAX-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      receiptNumber: receiptNo,
      propertyIdentifier: input.propertyIdentifier,
      assessmentYear: input.assessmentYear || '2025-26',
      paidAmountInr: input.amountInr,
      paymentDate: new Date().toISOString().split('T')[0],
      updatedBalanceInr: 0,
      status: 'PAID',
      treasuryHead: '0029-Land Revenue / 8443-Civil Deposits',
      municipalBody: matched?.municipalBody || 'Pune Municipal Corporation (PMC)',
    };
  }

  /**
   * Endorses utility consumer account name transfer (water / power supply).
   */
  async updateUtilityConsumer(input: UpdateUtilityConsumerInput): Promise<UpdateUtilityConsumerOutput> {
    const endorsementId = `UTIL-END-${Date.now().toString().slice(-6)}`;
    const board =
      input.utilityType === 'WATER'
        ? 'Municipal Water Supply and Sewerage Board (BWSSB / PMC Water)'
        : 'State Electricity Distribution Company (MSEDCL / BESCOM)';

    return {
      success: true,
      endorsementId,
      consumerNumber: input.consumerNumber,
      utilityType: input.utilityType,
      newConsumerName: input.newHolderName,
      status: 'ACTIVE',
      effectiveDate: new Date().toISOString().split('T')[0],
      issuingBoard: board,
    };
  }

  /**
   * Verifies municipal birth or death certificate records under Civil Registration System (CRS).
   */
  async verifyVitalRecord(input: VerifyVitalRecordInput): Promise<VerifyVitalRecordOutput> {
    const db = await getDb();
    const citizens = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, input.citizenId));

    const citizen = citizens[0];
    const personName = citizen?.primaryName || 'Priya Sharma';

    return {
      success: true,
      verified: true,
      registrationNumber: input.registrationNumber,
      eventType: input.eventType,
      personName,
      eventDate: citizen?.dateOfBirth || '1992-08-15',
      placeOfEvent: `${citizen?.currentCity || 'Pune'}, Maharashtra`,
      registrationDate: `${input.year}-09-01`,
      issuingAuthority: 'Office of the Chief Registrar of Births and Deaths, Maharashtra',
    };
  }

  /**
   * Applies for municipal piped water and underground sewerage meter connection.
   */
  async applyWaterSewerageConnection(input: {
    citizenId: string;
    propertyIdentifier: string;
    connectionType: 'DOMESTIC' | 'NON_DOMESTIC';
    pipeDiameterMm: number;
  }) {
    const db = await getDb();
    const consumerRr = `WTR-BLR-${Math.floor(100000 + Math.random() * 900000)}`;
    const scheduledDate = '2026-03-25';

    await db.insert(schema.spiMunicipalServices).values({
      citizenId: input.citizenId,
      serviceType: 'WATER_CONNECTION',
      identifier: consumerRr,
      title: `${input.connectionType} Water Connection (${input.pipeDiameterMm}mm)`,
      propertyIdentifier: input.propertyIdentifier,
      municipalBody: 'Bangalore Water Supply and Sewerage Board (BWSSB)',
      status: 'INSPECTION_SCHEDULED',
      metadata: { connectionType: input.connectionType, pipeDiameterMm: input.pipeDiameterMm },
    });

    return {
      success: true,
      consumerRrNumber: consumerRr,
      inspectionScheduledDate: scheduledDate,
      status: 'INSPECTION_SCHEDULED',
      message: `Municipal water meter sanction request registered under RR No. ${consumerRr}. Physical site inspection scheduled on ${scheduledDate}.`,
    };
  }

  /**
   * Registers/renews municipal commercial trade license.
   */
  async registerTradeLicense(input: {
    citizenId: string;
    tradeName: string;
    commercialAddress: string;
    category: string;
    premisesSqFt: number;
  }) {
    const db = await getDb();
    const licenseNo = `TL-BBMP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const validUntil = `${new Date().getFullYear() + 1}-03-31`;

    await db.insert(schema.spiMunicipalServices).values({
      citizenId: input.citizenId,
      serviceType: 'TRADE_LICENSE',
      identifier: licenseNo,
      title: `Trade License: ${input.tradeName}`,
      municipalBody: 'Bruhat Bengaluru Mahanagara Palike',
      status: 'ACTIVE',
      metadata: { tradeCategory: input.category, premisesSqFt: input.premisesSqFt, validUntil },
    });

    return {
      success: true,
      licenseNumber: licenseNo,
      tradeName: input.tradeName,
      validUntil,
      status: 'ISSUED_ACTIVE',
      message: `Municipal Trade License ${licenseNo} issued for '${input.tradeName}'. Valid until ${validUntil}.`,
    };
  }
}

