import { z } from 'zod';
import { CitizenProfileSchema, ProvenanceMetadataSchema } from './domain.js';

export const CitizenVehicleSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
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
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenVehicle = z.infer<typeof CitizenVehicleSchema>;

export const CitizenPropertySchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  propertyType: z.string(),
  identifier: z.string(),
  municipalBody: z.string(),
  address: z.string(),
  state: z.string(),
  annualTaxInr: z.number(),
  taxPaymentStatus: z.string(),
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenProperty = z.infer<typeof CitizenPropertySchema>;

export const CitizenRelationshipSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  relatedCitizenId: z.string().nullable().optional(),
  relationType: z.enum(['SPOUSE', 'CHILD', 'PARENT', 'GUARDIAN', 'SIBLING']),
  fullName: z.string(),
  dateOfBirth: z.string().nullable().optional(),
  isNomineeForEpfo: z.boolean(),
  isDependentForHealth: z.boolean(),
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenRelationship = z.infer<typeof CitizenRelationshipSchema>;

export const CitizenEmploymentSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  employerName: z.string(),
  designation: z.string().nullable().optional(),
  uan: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
  establishmentId: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean(),
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenEmployment = z.infer<typeof CitizenEmploymentSchema>;

export const CitizenEducationSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().nullable().optional(),
  institution: z.string(),
  boardOrUniversity: z.string(),
  passingYear: z.number(),
  rollNumber: z.string().nullable().optional(),
  apaarId: z.string().nullable().optional(),
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenEducation = z.infer<typeof CitizenEducationSchema>;

export const CitizenStatutoryObligationSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  obligationType: z.string(),
  title: z.string(),
  authority: z.string(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'SATISFIED', 'OVERDUE']),
  penaltyInrPerDay: z.number().optional(),
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenStatutoryObligation = z.infer<typeof CitizenStatutoryObligationSchema>;

export const CitizenBusinessSchema = z.object({
  id: z.string(),
  citizenId: z.string(),
  entityType: z.string(),
  legalName: z.string(),
  tradeName: z.string().nullable().optional(),
  pan: z.string(),
  gstin: z.string().nullable().optional(),
  udyamNumber: z.string().nullable().optional(),
  incorporationDate: z.string(),
  status: z.string(),
  provenance: ProvenanceMetadataSchema,
  createdAt: z.string(),
});

export type CitizenBusiness = z.infer<typeof CitizenBusinessSchema>;

export const CitizenWorldModelSchema = z.object({
  profile: CitizenProfileSchema,
  credentials: z.array(z.record(z.unknown())),
  addresses: z.array(z.record(z.unknown())),
  documents: z.array(z.record(z.unknown())),
  relationships: z.array(CitizenRelationshipSchema),
  vehicles: z.array(CitizenVehicleSchema),
  properties: z.array(CitizenPropertySchema),
  employments: z.array(CitizenEmploymentSchema),
  businesses: z.array(CitizenBusinessSchema),
  educations: z.array(CitizenEducationSchema),
  obligations: z.array(CitizenStatutoryObligationSchema),
  inboxUnresolvedCount: z.number(),
  activeApplicationsCount: z.number(),
});

export type CitizenWorldModel = z.infer<typeof CitizenWorldModelSchema>;
