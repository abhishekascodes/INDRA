import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { TransportSpiAdapter } from '@indra/spi-adapters';
import { CitizenWorldModelService } from '@indra/policy-engine';

const transportAdapter = new TransportSpiAdapter();

export const TransportInquireVehicleRcCapability: CapabilityContract<
  {
    citizenId: string;
    registrationNumber: string;
  },
  any
> = {
  id: 'transport.inquire_vehicle_rc',
  version: '1.0.0',
  domain: 'TRANSPORT',
  humanName: 'Inquire Vehicle Registration Certificate',
  description: 'Retrieves official vehicle RC record, fitness certificate, and hypothecation details from MoRTH Vahan.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    registrationNumber: z.string().min(4),
  }),
  outputSchema: z.object({
    registrationNumber: z.string(),
    chassisNumber: z.string(),
    vehicleClass: z.string(),
    makerModel: z.string(),
    rtoCode: z.string(),
    state: z.string(),
    registrationDate: z.string(),
    fitnessValidUntil: z.string(),
    puccValidUntil: z.string().nullable().optional(),
    hypothecatedTo: z.string().nullable().optional(),
    status: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    const wmService = CitizenWorldModelService.getInstance();
    const hasVehicle = await wmService.hasVehicle(input.citizenId);

    if (!hasVehicle) {
      throw new Error(
        `Precondition Failed: Citizen '${input.citizenId}' has no motor vehicles registered in Vahan.`
      );
    }

    const vehicle = await transportAdapter.getVehicleByRegistration(
      input.citizenId,
      input.registrationNumber
    );

    if (!vehicle) {
      throw new Error(
        `Precondition Failed: Vehicle '${input.registrationNumber}' not found for citizen '${input.citizenId}'.`
      );
    }

    return vehicle;
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'VEHICLE_RC',
      entityId: input.registrationNumber,
      sourceType: 'FACT',
      sourceAuthority: 'Ministry of Road Transport and Highways (MoRTH)',
      confidence: 100,
    },
  ],
};

export const TransportTransferVehicleRcCapability: CapabilityContract<
  {
    citizenId: string;
    registrationNumber: string;
    destinationState: string;
    destinationRto: string;
    destinationAddress: string;
  },
  any
> = {
  id: 'transport.transfer_vehicle_rc',
  version: '1.0.0',
  domain: 'TRANSPORT',
  humanName: 'Transfer Vehicle Registration to New Jurisdiction',
  description: 'Endorses inter-state transfer and assignment of new RTO jurisdiction in MoRTH Vahan National Register.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['TRANSPORT_WRITE', 'VAHAN_UPDATE'],
  inputSchema: z.object({
    citizenId: z.string(),
    registrationNumber: z.string(),
    destinationState: z.string(),
    destinationRto: z.string(),
    destinationAddress: z.string(),
  }),
  outputSchema: z.object({
    transferred: z.boolean(),
    registrationNumber: z.string(),
    previousRto: z.string(),
    newRtoCode: z.string(),
    newState: z.string(),
    endorsedAt: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    const wmService = CitizenWorldModelService.getInstance();
    const hasVehicle = await wmService.hasVehicle(input.citizenId);

    if (!hasVehicle) {
      throw new Error(
        `Precondition Failed: Citizen '${input.citizenId}' holds no registered motor vehicles. Cannot transfer RC.`
      );
    }

    return transportAdapter.transferVehicleRc(input);
  },
  compensate: async (input) => {
    // Reverse transfer back to previous RTO if subsequent workflow step fails
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'VEHICLE_RC_TRANSFER',
      entityId: input.registrationNumber,
      sourceType: 'FACT',
      sourceAuthority: `State Transport Authority (${input.destinationState})`,
      confidence: 100,
    },
  ],
};

export const TransportEndorseDlAddressCapability: CapabilityContract<
  {
    citizenId: string;
    newAddress: string;
    destinationState: string;
    destinationRto: string;
  },
  any
> = {
  id: 'transport.endorse_dl_address',
  version: '1.0.0',
  domain: 'TRANSPORT',
  humanName: 'Update Driving Licence Residential Address',
  description: 'Endorses new residential address on Driving Licence in MoRTH Sarathi portal.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['SARATHI_UPDATE', 'IDENTITY_SYNC'],
  inputSchema: z.object({
    citizenId: z.string(),
    newAddress: z.string().min(5),
    destinationState: z.string(),
    destinationRto: z.string(),
  }),
  outputSchema: z.object({
    endorsed: z.boolean(),
    licenceNumber: z.string(),
    holderName: z.string(),
    updatedAddress: z.string(),
    rtoCode: z.string(),
    endorsedAt: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    const wmService = CitizenWorldModelService.getInstance();
    const hasDl = await wmService.hasDrivingLicence(input.citizenId);

    if (!hasDl) {
      throw new Error(
        `Precondition Failed: Citizen '${input.citizenId}' does not possess a valid Driving Licence in Sarathi.`
      );
    }

    return transportAdapter.endorseDlAddress(input);
  },
  compensate: async (input) => {
    // Reversal logic for Sarathi address rollback
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'DRIVING_LICENCE_ENDORSEMENT',
      entityId: input.citizenId,
      sourceType: 'FACT',
      sourceAuthority: 'MoRTH Sarathi National Register',
      confidence: 100,
    },
  ],
};

export const TransportInquireEchallanCapability: CapabilityContract<any, any> = {
  id: 'transport.inquire_echallan',
  version: '1.0.0',
  domain: 'TRANSPORT',
  humanName: 'Inquire Traffic Violations & Pending e-Challans',
  description: 'Searches Parivahan and State Traffic Police cameras for unpaid violations, photographic evidence, and fine amounts.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    vehicleRegNo: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    vehicleRegNo: z.string(),
    totalPendingChallans: z.number(),
    totalFineAmountInr: z.number(),
    challans: z.array(
      z.object({
        challanNo: z.string(),
        violationDate: z.string(),
        offense: z.string(),
        amountInr: z.number(),
        status: z.string(),
        location: z.string(),
      })
    ),
    message: z.string(),
  }),
  execute: async (input) => {
    return transportAdapter.inquireEchallan(input.citizenId, input.vehicleRegNo);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'TRAFFIC_ECHALLAN_RECORD',
      entityId: input.vehicleRegNo,
      sourceType: 'FACT',
      sourceAuthority: 'Ministry of Road Transport and Highways (Parivahan e-Challan)',
      confidence: 100,
    },
  ],
};

export const TransportRenewDrivingLicenseCapability: CapabilityContract<any, any> = {
  id: 'transport.renew_driving_license',
  version: '1.0.0',
  domain: 'TRANSPORT',
  humanName: 'Renew Expiring Driving Licence',
  description: 'Submits statutory renewal application under Section 15 of the Motor Vehicles Act with medical fitness self-declaration.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Driving Licence Renewal',
    summary: 'Submit formal Sarathi DL renewal application and statutory medical declaration.',
    consequencesNotice: 'Renews license validity for 10 years upon statutory fee reconciliation.',
    confirmationLabel: 'Renew Driving Licence',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    dlNumber: z.string(),
    medicalFitnessSelfDeclared: z.boolean().optional(),
    currentAddressUpdate: z.boolean().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    dlNumber: z.string(),
    renewedValidUntil: z.string(),
    rtoOffice: z.string(),
    applicationNumber: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return transportAdapter.renewDrivingLicense({
      ...input,
      medicalFitnessSelfDeclared: input.medicalFitnessSelfDeclared ?? true,
    });
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'DRIVING_LICENCE_RENEWAL',
      entityId: output.dlNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'MoRTH Sarathi Portal (RTO Administration)',
      confidence: 100,
    },
  ],
};

