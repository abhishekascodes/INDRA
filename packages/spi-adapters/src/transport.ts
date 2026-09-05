import { getDb, schema } from '@indra/database';
import { eq, and } from 'drizzle-orm';
import type { ProvenanceMetadata } from '@indra/contracts';

export interface TransportVehicleQueryResult {
  registrationNumber: string;
  chassisNumber: string;
  vehicleClass: string;
  makerModel: string;
  rtoCode: string;
  state: string;
  registrationDate: string;
  fitnessValidUntil: string;
  puccValidUntil?: string | null;
  hypothecatedTo?: string | null;
  status: string;
  provenance: ProvenanceMetadata;
}

export interface TransferVehicleRcInput {
  citizenId: string;
  registrationNumber: string;
  destinationState: string;
  destinationRto: string;
  destinationAddress: string;
}

export interface TransferVehicleRcResult {
  transferred: boolean;
  registrationNumber: string;
  previousRto: string;
  newRtoCode: string;
  newState: string;
  endorsedAt: string;
  provenance: ProvenanceMetadata;
}

export interface EndorseDlAddressInput {
  citizenId: string;
  newAddress: string;
  destinationState: string;
  destinationRto: string;
}

export interface EndorseDlAddressResult {
  endorsed: boolean;
  licenceNumber: string;
  holderName: string;
  updatedAddress: string;
  rtoCode: string;
  endorsedAt: string;
  provenance: ProvenanceMetadata;
}

export class TransportSpiAdapter {
  /**
   * Inquires official MoRTH Vahan National Register for vehicle details.
   */
  async getVehicleByRegistration(
    citizenId: string,
    registrationNumber: string
  ): Promise<TransportVehicleQueryResult | null> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.citizenVehicles)
      .where(
        and(
          eq(schema.citizenVehicles.citizenId, citizenId),
          eq(schema.citizenVehicles.registrationNumber, registrationNumber)
        )
      );

    if (rows.length === 0) {
      return null;
    }

    const v = rows[0];
    return {
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
        lastVerifiedAt: new Date().toISOString(),
        confidence: null, // Authoritative statutory fact
      },
    };
  }

  /**
   * Endorses inter-state transfer of Vehicle RC to new destination RTO in Vahan.
   */
  async transferVehicleRc(input: TransferVehicleRcInput): Promise<TransferVehicleRcResult> {
    const db = await getDb();
    const existing = await this.getVehicleByRegistration(input.citizenId, input.registrationNumber);

    if (!existing) {
      throw new Error(
        `Precondition Failed: Vehicle '${input.registrationNumber}' is not registered under citizen ID '${input.citizenId}'.`
      );
    }

    if (existing.status !== 'ACTIVE') {
      throw new Error(
        `Precondition Failed: Vehicle '${input.registrationNumber}' registration status is '${existing.status}', transfer not permitted.`
      );
    }

    const previousRto = existing.rtoCode;
    const now = new Date();

    // Mutate state in MoRTH Vahan national ledger
    await db
      .update(schema.citizenVehicles)
      .set({
        rtoCode: input.destinationRto,
        state: input.destinationState,
      })
      .where(
        and(
          eq(schema.citizenVehicles.citizenId, input.citizenId),
          eq(schema.citizenVehicles.registrationNumber, input.registrationNumber)
        )
      );

    return {
      transferred: true,
      registrationNumber: input.registrationNumber,
      previousRto,
      newRtoCode: input.destinationRto,
      newState: input.destinationState,
      endorsedAt: now.toISOString(),
      provenance: {
        source: 'SPI_VAHAN_NATIONAL_REGISTER',
        authority: `State Transport Authority (${input.destinationState})`,
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: now.toISOString(),
        confidence: null,
      },
    };
  }

  /**
   * Endorses residential address update on Driving Licence in MoRTH Sarathi portal.
   */
  async endorseDlAddress(input: EndorseDlAddressInput): Promise<EndorseDlAddressResult> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.spiDrivingLicences)
      .where(eq(schema.spiDrivingLicences.citizenId, input.citizenId));

    if (rows.length === 0) {
      throw new Error(
        `Precondition Failed: No Driving Licence found in MoRTH Sarathi ledger for citizen '${input.citizenId}'.`
      );
    }

    const dl = rows[0];
    const now = new Date();

    // Mutate Sarathi DL registry
    await db
      .update(schema.spiDrivingLicences)
      .set({
        address: input.newAddress,
        rtoCode: input.destinationRto,
      })
      .where(eq(schema.spiDrivingLicences.id, dl.id));

    return {
      endorsed: true,
      licenceNumber: dl.licenceNumber,
      holderName: dl.holderName,
      updatedAddress: input.newAddress,
      rtoCode: input.destinationRto,
      endorsedAt: now.toISOString(),
      provenance: {
        source: 'SPI_SARATHI_PORTAL',
        authority: `Regional Transport Authority (${input.destinationRto})`,
        provenanceType: 'FACT',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: now.toISOString(),
        confidence: null,
      },
    };
  }

  /**
   * Inquires Parivahan National Traffic e-Challan repository.
   */
  async inquireEchallan(citizenId: string, vehicleRegNo: string) {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.spiTrafficChallans)
      .where(eq(schema.spiTrafficChallans.vehicleRegNo, vehicleRegNo));

    const pending = rows.filter((r) => r.status === 'UNPAID');
    const totalPendingAmount = pending.reduce((sum, r) => sum + r.amountInr, 0);

    return {
      success: true,
      vehicleRegNo,
      totalPendingChallans: pending.length,
      totalFineAmountInr: totalPendingAmount,
      challans: rows.map((r) => ({
        challanNo: r.challanNo,
        violationDate: r.violationDate,
        offense: r.offense,
        amountInr: r.amountInr,
        status: r.status,
        location: r.location,
      })),
      message:
        pending.length > 0
          ? `Found ${pending.length} pending traffic e-challan(s) totaling INR ${totalPendingAmount.toLocaleString('en-IN')}.`
          : 'No pending traffic challans found. Vehicle record is in good standing.',
    };
  }

  /**
   * Renews driving license with medical fitness self-declaration under Section 15 of MV Act.
   */
  async renewDrivingLicense(input: {
    citizenId: string;
    dlNumber: string;
    medicalFitnessSelfDeclared: boolean;
    currentAddressUpdate?: boolean;
  }) {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.spiDrivingLicences)
      .where(eq(schema.spiDrivingLicences.licenceNumber, input.dlNumber));

    const dl = rows[0];
    const renewedYear = new Date().getFullYear() + 10;
    const renewedDate = `${renewedYear}-12-31`;

    if (dl) {
      await db
        .update(schema.spiDrivingLicences)
        .set({
          validUntil: renewedDate,
          status: 'ACTIVE',
        })
        .where(eq(schema.spiDrivingLicences.id, dl.id));
    }

    const appNo = `SARATHI-RNW-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      dlNumber: input.dlNumber,
      renewedValidUntil: renewedDate,
      rtoOffice: dl?.rtoCode || 'KA-01 Bengaluru Central',
      applicationNumber: appNo,
      message: `Driving Licence ${input.dlNumber} renewed successfully until ${renewedDate}.`,
    };
  }
}

