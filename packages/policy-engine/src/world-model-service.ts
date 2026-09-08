import { getDb, schema } from '@indra/database';
import { eq, and, ne } from 'drizzle-orm';
import type {
  CitizenWorldModel,
  CitizenVehicle,
  CitizenProperty,
  CitizenRelationship,
  CitizenEmployment,
  CitizenEducation,
  CitizenStatutoryObligation,
  CitizenBusiness,
  ProvenanceMetadata,
} from '@indra/contracts';

export class CitizenWorldModelService {
  private static instance: CitizenWorldModelService;

  public static getInstance(): CitizenWorldModelService {
    if (!CitizenWorldModelService.instance) {
      CitizenWorldModelService.instance = new CitizenWorldModelService();
    }
    return CitizenWorldModelService.instance;
  }

  /**
   * Aggregates the full normalized relational graph into a coherent, typed CitizenWorldModel.
   * Every sub-entity is annotated with strict provenance metadata distinguishing
   * statutory FACT records from SYSTEM_OBSERVATION, USER_ASSERTION, and INFERENCE.
   */
  async getWorldModel(citizenId: string): Promise<CitizenWorldModel> {
    const db = await getDb();

    // 1. Profile
    const [citizen] = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, citizenId));

    if (!citizen) {
      throw new Error(`Citizen with ID '${citizenId}' does not exist.`);
    }

    // 2. Credentials
    const rawCredentials = await db
      .select()
      .from(schema.citizenCredentials)
      .where(eq(schema.citizenCredentials.citizenId, citizenId));

    const credentials = rawCredentials.map((c) => ({
      ...c,
      provenance: {
        source: `SPI_${c.type}`,
        authority: this.getAuthorityForCredentialType(c.type),
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: c.createdAt.toISOString(),
        confidence: null, // Statutory facts are authoritative, not probabilistic
      } as ProvenanceMetadata,
    }));

    // 3. Addresses
    const rawAddresses = await db
      .select()
      .from(schema.citizenAddresses)
      .where(eq(schema.citizenAddresses.citizenId, citizenId));

    const addresses = rawAddresses.map((a) => ({
      ...a,
      provenance: {
        source: 'SPI_UIDAI_RESIDENTIAL_LEDGER',
        authority: 'Unique Identification Authority of India (UIDAI)',
        provenanceType: 'FACT',
        verificationStatus: a.isVerified ? 'VERIFIED' : 'SELF_DECLARED',
        lastVerifiedAt: a.createdAt.toISOString(),
        confidence: null,
      } as ProvenanceMetadata,
    }));

    // 4. Documents
    const documents = await db
      .select()
      .from(schema.citizenDocuments)
      .where(eq(schema.citizenDocuments.citizenId, citizenId));

    // 5. Relationships
    const rawRelationships = await db
      .select()
      .from(schema.citizenRelationships)
      .where(eq(schema.citizenRelationships.citizenId, citizenId));

    const relationships: CitizenRelationship[] = rawRelationships.map((r) => ({
      id: r.id,
      citizenId: r.citizenId,
      relatedCitizenId: r.relatedCitizenId,
      relationType: r.relationType as any,
      fullName: r.fullName,
      dateOfBirth: r.dateOfBirth,
      isNomineeForEpfo: r.isNomineeForEpfo,
      isDependentForHealth: r.isDependentForHealth,
      provenance: {
        source: 'SPI_CIVIL_REGISTRATION',
        authority: 'Registrar General and Census Commissioner of India',
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: r.createdAt.toISOString(),
        confidence: null,
      },
      createdAt: r.createdAt.toISOString(),
    }));

    // 6. Vehicles
    const rawVehicles = await db
      .select()
      .from(schema.citizenVehicles)
      .where(eq(schema.citizenVehicles.citizenId, citizenId));

    const vehicles: CitizenVehicle[] = rawVehicles.map((v) => ({
      id: v.id,
      citizenId: v.citizenId,
      registrationNumber: v.registrationNumber,
      chassisNumber: v.chassisNumber,
      vehicleClass: v.vehicleClass,
      makerModel: v.makerModel,
      rtoCode: v.rtoCode,
      state: v.state,
      registrationDate: v.registrationDate,
      fitnessValidUntil: v.fitnessValidUntil,
      puccValidUntil: v.puccValidUntil,
      hypothecatedTo: v.hypothecatedTo,
      status: v.status,
      provenance: {
        source: 'SPI_VAHAN_NATIONAL_REGISTER',
        authority: 'Ministry of Road Transport and Highways (MoRTH)',
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: v.createdAt.toISOString(),
        confidence: null,
      },
      createdAt: v.createdAt.toISOString(),
    }));

    // 7. Properties
    const rawProperties = await db
      .select()
      .from(schema.citizenProperties)
      .where(eq(schema.citizenProperties.citizenId, citizenId));

    const properties: CitizenProperty[] = rawProperties.map((p) => ({
      id: p.id,
      citizenId: p.citizenId,
      propertyType: p.propertyType,
      identifier: p.identifier,
      municipalBody: p.municipalBody,
      address: p.address,
      state: p.state,
      annualTaxInr: p.annualTaxInr,
      taxPaymentStatus: p.taxPaymentStatus,
      provenance: {
        source: 'SPI_MUNICIPAL_PROPERTY_LEDGER',
        authority: p.municipalBody,
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: p.createdAt.toISOString(),
        confidence: null,
      },
      createdAt: p.createdAt.toISOString(),
    }));

    // 8. Employments
    const rawEmployments = await db
      .select()
      .from(schema.citizenEmployments)
      .where(eq(schema.citizenEmployments.citizenId, citizenId));

    const employments: CitizenEmployment[] = rawEmployments.map((e) => ({
      id: e.id,
      citizenId: e.citizenId,
      employerName: e.employerName,
      designation: e.designation,
      uan: e.uan,
      memberId: e.memberId,
      establishmentId: e.establishmentId,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      provenance: {
        source: 'SPI_EPFO_ESTABLISHMENT_LEDGER',
        authority: "Employees' Provident Fund Organisation (EPFO)",
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: e.createdAt.toISOString(),
        confidence: null,
      },
      createdAt: e.createdAt.toISOString(),
    }));

    // 9. Businesses
    const rawBusinesses = await db
      .select()
      .from(schema.spiBusinessEntities)
      .where(eq(schema.spiBusinessEntities.citizenId, citizenId));

    const businesses: CitizenBusiness[] = rawBusinesses.map((b) => ({
      id: b.id,
      citizenId: b.citizenId,
      entityType: b.entityType,
      legalName: b.legalName,
      tradeName: b.tradeName,
      pan: b.pan,
      gstin: b.gstin,
      udyamNumber: b.udyamNumber,
      incorporationDate: b.incorporationDate,
      status: b.status,
      provenance: {
        source: 'SPI_MCA_PORTAL_REGISTRY',
        authority: 'Ministry of Corporate Affairs (MCA)',
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: b.createdAt.toISOString(),
        confidence: null,
      },
      createdAt: b.createdAt.toISOString(),
    }));

    // 10. Educations
    const rawEducations = await db
      .select()
      .from(schema.citizenEducations)
      .where(eq(schema.citizenEducations.citizenId, citizenId));

    const educations: CitizenEducation[] = rawEducations.map((ed) => ({
      id: ed.id,
      citizenId: ed.citizenId,
      degree: ed.degree,
      fieldOfStudy: ed.fieldOfStudy,
      institution: ed.institution,
      boardOrUniversity: ed.boardOrUniversity,
      passingYear: ed.passingYear,
      rollNumber: ed.rollNumber,
      apaarId: ed.apaarId,
      provenance: {
        source: 'SPI_ACADEMIC_BANK_OF_CREDITS',
        authority: 'Ministry of Education (DigiLocker NAD/ABC)',
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: ed.createdAt.toISOString(),
        confidence: null,
      },
      createdAt: ed.createdAt.toISOString(),
    }));

    // 11. Obligations
    const rawObligations = await db
      .select()
      .from(schema.citizenStatutoryObligations)
      .where(eq(schema.citizenStatutoryObligations.citizenId, citizenId));

    const obligations: CitizenStatutoryObligation[] = rawObligations.map((o) => ({
      id: o.id,
      citizenId: o.citizenId,
      obligationType: o.obligationType,
      title: o.title,
      authority: o.authority,
      dueDate: o.dueDate,
      status: o.status as any,
      penaltyInrPerDay: o.penaltyInrPerDay || 0,
      provenance: {
        source: 'SPI_STATUTORY_COMPLIANCE_MONITOR',
        authority: o.authority,
        provenanceType: 'SYSTEM_OBSERVATION',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: o.createdAt.toISOString(),
        confidence: 100,
      },
      createdAt: o.createdAt.toISOString(),
    }));

    // 12. Inbox & Applications Counts
    const unresolvedInbox = await db
      .select()
      .from(schema.governmentInbox)
      .where(
        and(
          eq(schema.governmentInbox.citizenId, citizenId),
          eq(schema.governmentInbox.isResolved, false)
        )
      );

    const activeApps = await db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.citizenId, citizenId),
          ne(schema.applications.universalStatus, 'COMPLETED')
        )
      );

    return {
      profile: {
        id: citizen.id,
        fullName: citizen.primaryName,
        dateOfBirth: citizen.dateOfBirth,
        gender: citizen.gender,
        primaryMobile: citizen.primaryMobile,
        primaryEmail: citizen.primaryEmail,
        currentCity: citizen.currentCity,
        currentState: citizen.currentState,
      },
      credentials,
      addresses,
      documents,
      relationships,
      vehicles,
      properties,
      employments,
      businesses,
      educations,
      obligations,
      inboxUnresolvedCount: unresolvedInbox.length,
      activeApplicationsCount: activeApps.length,
    };
  }

  // =========================================================================
  // REUSABLE DETERMINISTIC DOMAIN ACCESS PRIMITIVES
  // (Consumed by Life Event Engine, Proactive Engine, and Action Center)
  // =========================================================================

  async hasVehicle(citizenId: string): Promise<boolean> {
    const db = await getDb();
    const rows = await db
      .select({ id: schema.citizenVehicles.id })
      .from(schema.citizenVehicles)
      .where(eq(schema.citizenVehicles.citizenId, citizenId));
    return rows.length > 0;
  }

  async getVehicles(citizenId: string): Promise<CitizenVehicle[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.vehicles;
  }

  async getCurrentResidence(citizenId: string): Promise<{
    city: string;
    state: string;
    line1: string;
    pincode: string;
  }> {
    const db = await getDb();
    const addresses = await db
      .select()
      .from(schema.citizenAddresses)
      .where(eq(schema.citizenAddresses.citizenId, citizenId));

    const current = addresses.find((a) => a.type === 'CURRENT') || addresses[0];
    if (current) {
      return {
        city: current.city,
        state: current.state,
        line1: current.line1,
        pincode: current.pincode,
      };
    }

    const [citizen] = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, citizenId));

    return {
      city: citizen?.currentCity || 'Unknown City',
      state: citizen?.currentState || 'Unknown State',
      line1: 'Not recorded',
      pincode: '000000',
    };
  }

  async hasDrivingLicence(citizenId: string): Promise<boolean> {
    const db = await getDb();
    const creds = await db
      .select()
      .from(schema.citizenCredentials)
      .where(
        and(
          eq(schema.citizenCredentials.citizenId, citizenId),
          eq(schema.citizenCredentials.type, 'DRIVING_LICENCE')
        )
      );
    return creds.length > 0;
  }

  async getDrivingLicence(citizenId: string): Promise<any | null> {
    const db = await getDb();
    const creds = await db
      .select()
      .from(schema.citizenCredentials)
      .where(
        and(
          eq(schema.citizenCredentials.citizenId, citizenId),
          eq(schema.citizenCredentials.type, 'DRIVING_LICENCE')
        )
      );
    return creds[0] || null;
  }

  async getProperties(citizenId: string): Promise<CitizenProperty[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.properties;
  }

  async hasProperty(citizenId: string): Promise<boolean> {
    const db = await getDb();
    const rows = await db
      .select({ id: schema.citizenProperties.id })
      .from(schema.citizenProperties)
      .where(eq(schema.citizenProperties.citizenId, citizenId));
    return rows.length > 0;
  }

  async getBusinesses(citizenId: string): Promise<CitizenBusiness[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.businesses;
  }

  async hasBusiness(citizenId: string): Promise<boolean> {
    const db = await getDb();
    const rows = await db
      .select({ id: schema.spiBusinessEntities.id })
      .from(schema.spiBusinessEntities)
      .where(eq(schema.spiBusinessEntities.citizenId, citizenId));
    return rows.length > 0;
  }

  async getSpouse(citizenId: string): Promise<CitizenRelationship | null> {
    const wm = await this.getWorldModel(citizenId);
    return wm.relationships.find((r) => r.relationType === 'SPOUSE') || null;
  }

  async getDependents(citizenId: string): Promise<CitizenRelationship[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.relationships.filter(
      (r) => r.relationType === 'CHILD' || r.relationType === 'PARENT' || r.isDependentForHealth
    );
  }

  async getEmploymentHistory(citizenId: string): Promise<CitizenEmployment[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.employments;
  }

  async getCurrentEmployment(citizenId: string): Promise<CitizenEmployment | null> {
    const wm = await this.getWorldModel(citizenId);
    return wm.employments.find((e) => e.isCurrent) || null;
  }

  async getDiscrepancies(citizenId: string): Promise<
    Array<{ type: string; details: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }>
  > {
    const db = await getDb();
    const creds = await db
      .select()
      .from(schema.citizenCredentials)
      .where(eq(schema.citizenCredentials.citizenId, citizenId));

    const discrepancies: Array<{ type: string; details: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }> = [];

    const aadhaar = creds.find((c) => c.type === 'AADHAAR');
    const pan = creds.find((c) => c.type === 'PAN');

    if (aadhaar && pan) {
      const aadhaarName = (aadhaar.metadata as any)?.holderName || '';
      const panName = (pan.metadata as any)?.holderName || '';
      if (aadhaarName && panName && aadhaarName.toLowerCase() !== panName.toLowerCase()) {
        discrepancies.push({
          type: 'PAN_AADHAAR_NAME_MISMATCH',
          details: `Aadhaar records name as '${aadhaarName}', while Income Tax Department PAN records name as '${panName}'`,
          severity: 'HIGH',
        });
      }
    }

    return discrepancies;
  }

  async getStatutoryObligations(citizenId: string): Promise<CitizenStatutoryObligation[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.obligations;
  }

  async getPendingObligations(citizenId: string): Promise<CitizenStatutoryObligation[]> {
    const wm = await this.getWorldModel(citizenId);
    return wm.obligations.filter((o) => o.status === 'PENDING' || o.status === 'OVERDUE');
  }

  async getActiveApplications(citizenId: string): Promise<any[]> {
    const db = await getDb();
    return db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.citizenId, citizenId),
          ne(schema.applications.universalStatus, 'COMPLETED')
        )
      );
  }

  private getAuthorityForCredentialType(type: string): string {
    switch (type) {
      case 'AADHAAR':
        return 'Unique Identification Authority of India (UIDAI)';
      case 'PAN':
        return 'Income Tax Department (ITD)';
      case 'DRIVING_LICENCE':
        return 'Ministry of Road Transport and Highways (MoRTH / Sarathi)';
      case 'UAN':
        return "Employees' Provident Fund Organisation (EPFO)";
      case 'VOTER_ID':
        return 'Election Commission of India (ECI)';
      case 'PASSPORT':
        return 'Ministry of External Affairs (Consular, Passport & Visa Division)';
      case 'ABHA':
        return 'National Health Authority (NHA / Ayushman Bharat)';
      default:
        return 'Official Public Registry';
    }
  }
}
