import { getDb, schema, eq, and } from '@indra/database';

export interface VerifyEncumbranceInput {
  citizenId: string;
  propertyIdentifier: string;
  searchYears?: number;
}

export interface VerifyEncumbranceOutput {
  success: boolean;
  propertyIdentifier: string;
  searchPeriodYears: number;
  encumbrancesFound: boolean;
  encumbrances: Array<{
    registrationDate: string;
    deedType: string;
    parties: string;
    amountInr: number;
    subRegistrarOffice: string;
  }>;
  isCleanTitle: boolean;
  clearanceCertificateNumber: string;
  issuingAuthority: string;
}

export interface FetchTitleDeedInput {
  citizenId: string;
  surveyNumber?: string;
  propertyIdentifier?: string;
  district?: string;
  taluk?: string;
}

export interface FetchTitleDeedOutput {
  success: boolean;
  deedRecordId: string;
  ownerName: string;
  identifier: string;
  propertyType: string;
  areaAcresOrSqft: string;
  state: string;
  district: string;
  isVerified: boolean;
  sourceRegistry: string;
}

export interface ApplyMutationInput {
  citizenId: string;
  propertyIdentifier: string;
  registrationDeedNumber: string;
  transfereeName: string;
}

export interface ApplyMutationOutput {
  success: boolean;
  mutationNoticeNumber: string;
  propertyIdentifier: string;
  transfereeName: string;
  status: 'OBJECTION_PERIOD_OPEN';
  objectionPeriodDays: number;
  expectedDisposalDays: number;
  filingDate: string;
  authority: string;
}

export class PropertySpiAdapter {
  private static instance: PropertySpiAdapter | null = null;
  private failNextRequest = false;
  private simulateOutage = false;
  private latencyMs = 0;

  public static getInstance(): PropertySpiAdapter {
    if (!PropertySpiAdapter.instance) {
      PropertySpiAdapter.instance = new PropertySpiAdapter();
    }
    return PropertySpiAdapter.instance;
  }

  public setSimulationMode(config: {
    failNextRequest?: boolean;
    simulateOutage?: boolean;
    latencyMs?: number;
  }) {
    if (config.failNextRequest !== undefined) this.failNextRequest = config.failNextRequest;
    if (config.simulateOutage !== undefined) this.simulateOutage = config.simulateOutage;
    if (config.latencyMs !== undefined) this.latencyMs = config.latencyMs;

    getDb()
      .then((db) => {
        db.insert(schema.syntheticOutageConfig)
          .values({
            id: 'GLOBAL_SIMULATION_CONFIG',
            failNextPropertyRequest: this.failNextRequest,
            simulatePropertyOutage: this.simulateOutage,
            injectDeedContradiction: true,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.syntheticOutageConfig.id,
            set: {
              failNextPropertyRequest: this.failNextRequest,
              simulatePropertyOutage: this.simulateOutage,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
      })
      .catch(() => {});
  }

  public getSimulationMode() {
    return {
      failNextRequest: this.failNextRequest,
      simulateOutage: this.simulateOutage,
      latencyMs: this.latencyMs,
    };
  }

  /**
   * Queries Sub-Registrar books for mortgages, liens, or court attachments (15-year search).
   */
  async verifyEncumbrance(input: VerifyEncumbranceInput): Promise<VerifyEncumbranceOutput> {
    const db = await getDb();

    // Check citizen legal records for encumbrance on this property
    const legalRecords = await db
      .select()
      .from(schema.citizenLegalRecords)
      .where(eq(schema.citizenLegalRecords.citizenId, input.citizenId));

    const relatedEncumbrances = legalRecords.filter(
      (r) =>
        r.isEncumbrance &&
        (r.relatedPropertyIdentifier === input.propertyIdentifier || !r.relatedPropertyIdentifier)
    );

    const encumbrancesFound = relatedEncumbrances.length > 0;
    const certNum = `EC-${Date.now().toString().slice(-6)}-${input.propertyIdentifier.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}`;

    return {
      success: true,
      propertyIdentifier: input.propertyIdentifier,
      searchPeriodYears: input.searchYears || 15,
      encumbrancesFound,
      encumbrances: relatedEncumbrances.map((r) => ({
        registrationDate: r.filingDate,
        deedType: r.caseType,
        parties: r.summary,
        amountInr: 0,
        subRegistrarOffice: 'Sub-Registrar Office Haveli / Pune',
      })),
      isCleanTitle: !encumbrancesFound,
      clearanceCertificateNumber: certNum,
      issuingAuthority: 'Department of Stamps and Registration, Maharashtra (IGR)',
    };
  }

  /**
   * Fetches official Record of Rights (RoR / 7/12 Extract / Patta / Khata).
   */
  async fetchTitleDeed(input: FetchTitleDeedInput): Promise<FetchTitleDeedOutput> {
    const db = await getDb();

    // Look in citizenProperties or spiLandParcels
    const properties = await db
      .select()
      .from(schema.citizenProperties)
      .where(eq(schema.citizenProperties.citizenId, input.citizenId));

    const matchedProp = properties.find(
      (p) => p.identifier === input.propertyIdentifier || p.identifier === input.surveyNumber
    ) || properties[0];

    const landParcels = await db
      .select()
      .from(schema.spiLandParcels)
      .where(eq(schema.spiLandParcels.citizenId, input.citizenId));

    const matchedLand = landParcels.find(
      (l) => l.surveyNumber === input.surveyNumber || l.surveyNumber === input.propertyIdentifier
    ) || landParcels[0];

    const citizens = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, input.citizenId));
    const ownerName = citizens[0]?.primaryName || 'Verified Citizen';

    if (matchedLand) {
      return {
        success: true,
        deedRecordId: `ROR-${matchedLand.surveyNumber}-${Date.now().toString().slice(-4)}`,
        ownerName,
        identifier: matchedLand.surveyNumber,
        propertyType: 'AGRICULTURAL_LAND',
        areaAcresOrSqft: `${matchedLand.areaAcres} Acres`,
        state: matchedLand.state,
        district: matchedLand.district,
        isVerified: true,
        sourceRegistry: 'State Land Records (Bhoomi / MahaBhulekh Portal)',
      };
    }

    const prop = matchedProp || {
      identifier: input.propertyIdentifier || 'PID-BBMP-984210',
      propertyType: 'RESIDENTIAL_FLAT',
      state: 'Maharashtra',
    };

    return {
      success: true,
      deedRecordId: `KHATA-${prop.identifier}-${Date.now().toString().slice(-4)}`,
      ownerName,
      identifier: prop.identifier,
      propertyType: prop.propertyType,
      areaAcresOrSqft: '1,250 Sq.Ft.',
      state: prop.state || 'Maharashtra',
      district: 'Pune',
      isVerified: true,
      sourceRegistry: 'Municipal Land & Property Tax Authority (E-Khata Registry)',
    };
  }

  /**
   * Applies for official title mutation following sale deed registration.
   * Supports deterministic fault injection (outage simulation and forward recovery).
   */
  async applyMutation(input: ApplyMutationInput): Promise<ApplyMutationOutput> {
    const db = await getDb();

    // Check DB outage config if set
    let isOutageSimulated = this.simulateOutage;
    let isFailNext = this.failNextRequest;
    try {
      const configs = await db
        .select()
        .from(schema.syntheticOutageConfig)
        .where(eq(schema.syntheticOutageConfig.id, 'GLOBAL_SIMULATION_CONFIG'));
      if (configs.length > 0) {
        if (configs[0].simulatePropertyOutage) isOutageSimulated = true;
        if (configs[0].failNextPropertyRequest) isFailNext = true;
      }
    } catch {
      // ignore
    }

    // 1. Induce deterministic failure if enabled
    if (isOutageSimulated || isFailNext) {
      if (isFailNext) {
        this.failNextRequest = false;
        try {
          await db
            .update(schema.syntheticOutageConfig)
            .set({ failNextPropertyRequest: false })
            .where(eq(schema.syntheticOutageConfig.id, 'GLOBAL_SIMULATION_CONFIG'));
        } catch {
          // ignore
        }
      }

      throw new Error(
        'INSTITUTIONAL_OUTAGE: Bhoomi / Kaveri Land Records Node 503 Gateway Timeout. Service temporarily unavailable (Database connection pool exhausted).'
      );
    }

    // 2. Simulate latency if configured
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const noticeNumber = `MUT-${Date.now().toString().slice(-6)}-REV`;

    // 3. Persist authoritative institutional records in Synthetic Public Infrastructure
    try {
      await db.insert(schema.citizenProperties).values({
        citizenId: input.citizenId,
        propertyType: 'AGRICULTURAL_LAND',
        identifier: input.propertyIdentifier,
        municipalBody: 'Devanahalli Taluk Revenue Sub-Division (Bhoomi)',
        address: `Survey No. ${input.propertyIdentifier}, Devanahalli Taluk, Bengaluru Rural - 562110`,
        state: 'Karnataka',
        annualTaxInr: 1250,
        taxPaymentStatus: 'PAID',
      });

      await db.insert(schema.spiLandParcels).values({
        citizenId: input.citizenId,
        surveyNumber: input.propertyIdentifier,
        state: 'Karnataka',
        district: 'Bengaluru Rural',
        taluk: 'Devanahalli',
        village: 'Devanahalli Kasaba',
        areaAcres: '1.25',
        cropType: 'RESIDENTIAL_PLOT',
        irrigationStatus: 'NON_IRRIGATED',
        soilHealthIndex: 92,
      });
    } catch (persistErr) {
      console.warn('[PropertySpiAdapter] Non-fatal note while recording mutation ledger:', persistErr);
    }

    return {
      success: true,
      mutationNoticeNumber: noticeNumber,
      propertyIdentifier: input.propertyIdentifier,
      transfereeName: input.transfereeName,
      status: 'OBJECTION_PERIOD_OPEN',
      objectionPeriodDays: 30,
      expectedDisposalDays: 45,
      filingDate: new Date().toISOString().split('T')[0],
      authority: 'Revenue Department / Tahsildar Office (Bhoomi Portal)',
    };
  }

  /**
   * Authoritative institutional lookup for post-transition reconciliation.
   */
  async getInstitutionalRecord(citizenId: string, propertyIdentifier: string) {
    const db = await getDb();
    const parcels = await db
      .select()
      .from(schema.spiLandParcels)
      .where(
        and(
          eq(schema.spiLandParcels.citizenId, citizenId),
          eq(schema.spiLandParcels.surveyNumber, propertyIdentifier)
        )
      );

    const properties = await db
      .select()
      .from(schema.citizenProperties)
      .where(
        and(
          eq(schema.citizenProperties.citizenId, citizenId),
          eq(schema.citizenProperties.identifier, propertyIdentifier)
        )
      );

    return {
      parcel: parcels[0] || null,
      property: properties[0] || null,
      existsInStateRegistry: parcels.length > 0 || properties.length > 0,
    };
  }

  /**
   * Inquires digital cadastral survey map and geo-fenced boundary coordinates (Bhoomi / Mahabhulekh).
   */
  async inquireCadastralSurvey(input: { citizenId: string; surveyNumber: string; village: string }) {
    const mapId = `CAD-MAP-${input.surveyNumber.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    return {
      success: true,
      surveyNumber: input.surveyNumber,
      cadastralMapId: mapId,
      boundaryCoordinates: 'POLYGON((18.5204 73.8567, 18.5215 73.8578, 18.5201 73.8590, 18.5190 73.8579, 18.5204 73.8567))',
      geoFencedAreaSqFt: 61850,
      disputeFlag: false,
      message: `Digital Cadastral Survey verified for parcel ${input.surveyNumber}, village ${input.village}. Boundary geo-coordinates validated with zero territorial overlapping.`,
    };
  }
}

