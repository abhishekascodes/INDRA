import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. CITIZEN IDENTITY & CREDENTIALS
// ==========================================

export const citizens = pgTable('citizens', {
  id: uuid('id').primaryKey().defaultRandom(),
  primaryName: varchar('primary_name', { length: 255 }).notNull(),
  dateOfBirth: varchar('date_of_birth', { length: 20 }).notNull(),
  gender: varchar('gender', { length: 20 }).notNull(),
  primaryMobile: varchar('primary_mobile', { length: 20 }).notNull(),
  primaryEmail: varchar('primary_email', { length: 255 }).notNull(),
  currentCity: varchar('current_city', { length: 100 }).notNull(),
  currentState: varchar('current_state', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const citizenCredentials = pgTable('citizen_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  type: varchar('type', { length: 50 }).notNull(), // AADHAAR, PAN, VOTER_ID, PASSPORT, DRIVING_LICENCE, UAN, ABHA
  identifierMasked: varchar('identifier_masked', { length: 100 }).notNull(),
  identifierHash: varchar('identifier_hash', { length: 255 }).notNull(),
  issuedDate: varchar('issued_date', { length: 20 }),
  expiryDate: varchar('expiry_date', { length: 20 }),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, EXPIRED, SUSPENDED
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenAddresses = pgTable('citizen_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  type: varchar('type', { length: 50 }).notNull(), // PERMANENT, CURRENT
  line1: text('line1').notNull(),
  line2: text('line2'),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  isVerified: boolean('is_verified').default(true).notNull(),
  validSince: varchar('valid_since', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenDocuments = pgTable('citizen_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: varchar('document_type', { length: 100 }).notNull(), // AADHAAR_CARD, PAN_CARD, DEGREE_CERTIFICATE, DRIVING_LICENCE, etc.
  title: varchar('title', { length: 255 }).notNull(),
  issuer: varchar('issuer', { length: 255 }).notNull(),
  documentNumber: varchar('document_number', { length: 100 }),
  issueDate: varchar('issue_date', { length: 20 }),
  expiryDate: varchar('expiry_date', { length: 20 }),
  verificationStatus: varchar('verification_status', { length: 50 }).default('VERIFIED').notNull(),
  fileData: text('file_data'), // Base64 or synthetic file reference
  provenanceId: varchar('provenance_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 2. APPLICATIONS & PAYMENTS
// ==========================================

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  workflowRunId: uuid('workflow_run_id'),
  serviceCategory: varchar('service_category', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  referenceCode: varchar('reference_code', { length: 100 }).unique().notNull(),
  universalStatus: varchar('universal_status', { length: 50 }).default('SUBMITTED').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  timeline: jsonb('timeline').default([]).notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  applicationId: uuid('application_id'),
  amountInr: integer('amount_inr').notNull(),
  purpose: varchar('purpose', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, SUCCESS, FAILED, REFUNDED
  referenceNo: varchar('reference_no', { length: 100 }).unique().notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('UPI_BHARAT').notNull(),
  breakdown: jsonb('breakdown').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 3. WORKFLOW RUNTIME & CAPABILITIES
// ==========================================

export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowCode: varchar('workflow_code', { length: 100 }).notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  state: varchar('state', { length: 50 }).default('DRAFT').notNull(),
  currentStepId: varchar('current_step_id', { length: 100 }),
  contextData: jsonb('context_data').default({}).notNull(),
  errorDetails: jsonb('error_details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const capabilityRuns = pgTable('capability_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowRunId: uuid('workflow_run_id').references(() => workflowRuns.id, { onDelete: 'cascade' }),
  capabilityId: varchar('capability_id', { length: 100 }).notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique().notNull(),
  inputs: jsonb('inputs').default({}).notNull(),
  outputs: jsonb('outputs').default({}).notNull(),
  status: varchar('status', { length: 50 }).default('SUCCESS').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

// ==========================================
// 4. GOVERNMENT INBOX, CONSENT, PROVENANCE & AUDIT
// ==========================================

export const governmentInbox = pgTable('government_inbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  category: varchar('category', { length: 50 }).notNull(), // NOTICE, ACTION_REQUIRED, DEADLINE, UPDATE, PROACTIVE
  title: varchar('title', { length: 255 }).notNull(),
  whatHappened: text('what_happened').notNull(),
  whyItMatters: text('why_it_matters').notNull(),
  whatToDo: text('what_to_do').notNull(),
  byWhen: varchar('by_when', { length: 50 }),
  whatHappensNext: text('what_happens_next').notNull(),
  workflowCode: varchar('workflow_code', { length: 100 }),
  actionPayload: jsonb('action_payload').default({}),
  isRead: boolean('is_read').default(false).notNull(),
  isResolved: boolean('is_resolved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  purpose: varchar('purpose', { length: 255 }).notNull(),
  scope: jsonb('scope').default([]).notNull(),
  authorizedAction: text('authorized_action').notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
});

export const provenanceRecords = pgTable('provenance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // FACT, SYSTEM_OBSERVATION, USER_ASSERTION, INFERENCE, CONTRADICTION
  sourceAuthority: varchar('source_authority', { length: 255 }).notNull(),
  confidence: integer('confidence').default(100).notNull(), // 0-100
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id'),
  action: varchar('action', { length: 255 }).notNull(),
  actorType: varchar('actor_type', { length: 50 }).default('CITIZEN').notNull(),
  actorId: varchar('actor_id', { length: 100 }),
  requestPayload: jsonb('request_payload').default({}),
  resultStatus: varchar('result_status', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const systemEvents = pgTable('system_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  citizenId: uuid('citizen_id').notNull(),
  aggregateType: varchar('aggregate_type', { length: 50 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 100 }).notNull(),
  payload: jsonb('payload').default({}).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ==========================================
// 5. SYNTHETIC PUBLIC INFRASTRUCTURE (SPI) LEDGERS
// ==========================================

export const spiEpfoAccounts = pgTable('spi_epfo_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  uan: varchar('uan', { length: 50 }).notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  memberId: varchar('member_id', { length: 100 }).notNull(),
  establishmentName: varchar('establishment_name', { length: 255 }).notNull(),
  establishmentId: varchar('establishment_id', { length: 100 }).notNull(),
  joiningDate: varchar('joining_date', { length: 20 }).notNull(),
  exitDate: varchar('exit_date', { length: 20 }),
  pfBalance: integer('pf_balance').default(0).notNull(),
  pensionBalance: integer('pension_balance').default(0).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, DORMANT, TRANSFERRED
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiBusinessEntities = pgTable('spi_business_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // PRIVATE_LIMITED, LLP, PROPRIETORSHIP
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  pan: varchar('pan', { length: 20 }).notNull(),
  gstin: varchar('gstin', { length: 30 }),
  udyamNumber: varchar('udyam_number', { length: 50 }),
  incorporationDate: varchar('incorporation_date', { length: 20 }).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  registeredAddress: jsonb('registered_address').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiDrivingLicences = pgTable('spi_driving_licences', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenceNumber: varchar('licence_number', { length: 50 }).unique().notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  holderName: varchar('holder_name', { length: 255 }).notNull(),
  dob: varchar('dob', { length: 20 }).notNull(),
  issuedDate: varchar('issued_date', { length: 20 }).notNull(),
  validUntil: varchar('valid_until', { length: 20 }).notNull(),
  bloodGroup: varchar('blood_group', { length: 10 }).notNull(),
  rtoCode: varchar('rto_code', { length: 20 }).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  address: text('address').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiTelecomRecords = pgTable('spi_telecom_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  imei: varchar('imei', { length: 50 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 20 }).notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  operator: varchar('operator', { length: 50 }).notNull(),
  simImsi: varchar('sim_imsi', { length: 50 }).notNull(),
  deviceModel: varchar('device_model', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, BLOCKED, STOLEN
  reportedStolenAt: timestamp('reported_stolen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiLandParcels = pgTable('spi_land_parcels', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyNumber: varchar('survey_number', { length: 50 }).notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  taluk: varchar('taluk', { length: 100 }).notNull(),
  village: varchar('village', { length: 100 }).notNull(),
  areaAcres: varchar('area_acres', { length: 20 }).notNull(),
  cropType: varchar('crop_type', { length: 100 }).notNull(),
  irrigationStatus: varchar('irrigation_status', { length: 50 }).notNull(),
  soilHealthIndex: integer('soil_health_index').default(85).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiWelfareSchemes = pgTable('spi_welfare_schemes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  eligibilityCriteria: jsonb('eligibility_criteria').default({}).notNull(),
  benefitDescription: text('benefit_description').notNull(),
  annualBenefitInr: integer('annual_benefit_inr').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
