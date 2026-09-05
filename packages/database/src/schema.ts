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

// ==========================================
// 6. CITIZEN WORLD MODEL (EXTENDED CIVIC GRAPH)
// ==========================================

export const citizenRelationships = pgTable('citizen_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  relatedCitizenId: uuid('related_citizen_id').references(() => citizens.id, { onDelete: 'set null' }),
  relationType: varchar('relation_type', { length: 50 }).notNull(), // SPOUSE, CHILD, PARENT, GUARDIAN, SIBLING
  fullName: varchar('full_name', { length: 255 }).notNull(),
  dateOfBirth: varchar('date_of_birth', { length: 20 }),
  isNomineeForEpfo: boolean('is_nominee_for_epfo').default(false).notNull(),
  isDependentForHealth: boolean('is_dependent_for_health').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenVehicles = pgTable('citizen_vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  registrationNumber: varchar('registration_number', { length: 50 }).unique().notNull(),
  chassisNumber: varchar('chassis_number', { length: 100 }).notNull(),
  vehicleClass: varchar('vehicle_class', { length: 50 }).notNull(), // MOTOR_CAR, TWO_WHEELER, COMMERCIAL_GOODS
  makerModel: varchar('maker_model', { length: 255 }).notNull(),
  rtoCode: varchar('rto_code', { length: 20 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  registrationDate: varchar('registration_date', { length: 20 }).notNull(),
  fitnessValidUntil: varchar('fitness_valid_until', { length: 20 }).notNull(),
  puccValidUntil: varchar('pucc_valid_until', { length: 20 }),
  hypothecatedTo: varchar('hypothecated_to', { length: 255 }),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenProperties = pgTable('citizen_properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  propertyType: varchar('property_type', { length: 50 }).notNull(), // RESIDENTIAL_FLAT, AGRICULTURAL_LAND, COMMERCIAL_PLOT
  identifier: varchar('identifier', { length: 100 }).notNull(), // PID, Khata Number, Survey Number
  municipalBody: varchar('municipal_body', { length: 255 }).notNull(), // BBMP, Pune Municipal Corp
  address: text('address').notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  annualTaxInr: integer('annual_tax_inr').default(0).notNull(),
  taxPaymentStatus: varchar('tax_payment_status', { length: 50 }).default('PAID').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenEmployments = pgTable('citizen_employments', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  employerName: varchar('employer_name', { length: 255 }).notNull(),
  designation: varchar('designation', { length: 100 }),
  uan: varchar('uan', { length: 50 }),
  memberId: varchar('member_id', { length: 100 }),
  establishmentId: varchar('establishment_id', { length: 100 }),
  startDate: varchar('start_date', { length: 20 }).notNull(),
  endDate: varchar('end_date', { length: 20 }),
  isCurrent: boolean('is_current').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenEducations = pgTable('citizen_educations', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  degree: varchar('degree', { length: 255 }).notNull(),
  fieldOfStudy: varchar('field_of_study', { length: 255 }),
  institution: varchar('institution', { length: 255 }).notNull(),
  boardOrUniversity: varchar('board_or_university', { length: 255 }).notNull(),
  passingYear: integer('passing_year').notNull(),
  rollNumber: varchar('roll_number', { length: 100 }),
  apaarId: varchar('apaar_id', { length: 50 }), // Academic Bank of Credits / APAAR ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citizenStatutoryObligations = pgTable('citizen_statutory_obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  obligationType: varchar('obligation_type', { length: 100 }).notNull(), // ITR_FILING, DL_RENEWAL, VEHICLE_FITNESS, PROPERTY_TAX
  title: varchar('title', { length: 255 }).notNull(),
  authority: varchar('authority', { length: 255 }).notNull(),
  dueDate: varchar('due_date', { length: 20 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, SATISFIED, OVERDUE
  penaltyInrPerDay: integer('penalty_inr_per_day').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 7. ACTION PLANS & CONSEQUENCE GRAPH (M3)
// ==========================================

export const actionPlans = pgTable('action_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  lifeEventCode: varchar('life_event_code', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  state: varchar('state', { length: 50 }).default('DISCOVERED').notNull(), // DISCOVERED, AWAITING_CITIZEN_REVIEW, IN_PROGRESS, COMPLETED, PARTIALLY_COMPLETED, CANCELLED
  totalTasks: integer('total_tasks').default(0).notNull(),
  completedTasks: integer('completed_tasks').default(0).notNull(),
  estimatedDaysToComplete: integer('estimated_days_to_complete').default(14).notNull(),
  estimatedStatutoryFeesInr: integer('estimated_statutory_fees_inr').default(0).notNull(),
  contextData: jsonb('context_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const actionPlanSteps = pgTable('action_plan_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .references(() => actionPlans.id, { onDelete: 'cascade' })
    .notNull(),
  stepKey: varchar('step_key', { length: 100 }).notNull(),
  capabilityId: varchar('capability_id', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  authority: varchar('authority', { length: 255 }).notNull(),
  phaseIndex: integer('phase_index').default(1).notNull(),
  dependencies: jsonb('dependencies').default([]).notNull(), // string[] of stepKeys that must be COMPLETED
  state: varchar('state', { length: 50 }).default('BLOCKED').notNull(), // BLOCKED, READY, IN_PROGRESS, COMPLETED, SKIPPED, FAILED
  executionMode: varchar('execution_mode', { length: 50 }).default('CITIZEN_REVIEW_REQUIRED').notNull(), // AUTOMATED_SAFE_READ, CITIZEN_REVIEW_REQUIRED, STATUTORY_AUTHORIZATION_REQUIRED
  workflowRunId: uuid('workflow_run_id'),
  outputPayload: jsonb('output_payload').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 8. PROACTIVE ENGINE FINDINGS (M3)
// ==========================================

export const proactiveFindings = pgTable('proactive_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  fingerprint: varchar('fingerprint', { length: 64 }).default('').notNull(),
  category: varchar('category', { length: 50 }).default('OBLIGATION_DEADLINE').notNull(),
  findingType: varchar('finding_type', { length: 50 }).notNull(), // CREDENTIAL_EXPIRY, DORMANT_ASSET, IDENTITY_DISCREPANCY, DEADLINE, BENEFIT_ELIGIBILITY, JURISDICTIONAL_CASCADE
  ruleCode: varchar('rule_code', { length: 100 }).default('RULE_GENERIC').notNull(),
  urgency: varchar('urgency', { length: 50 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  priorityScore: integer('priority_score').default(50).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, ACKNOWLEDGED, SNOOZED, IN_PROGRESS, RESOLVED, DISMISSED, OBSOLETE
  title: varchar('title', { length: 255 }).notNull(),
  explanation: text('explanation').notNull(),
  actionableRecommendation: text('actionable_recommendation').notNull(),
  structuredExplanation: jsonb('structured_explanation').default({}).notNull(),
  actionLink: jsonb('action_link').default({}).notNull(),
  recommendedWorkflowCode: varchar('recommended_workflow_code', { length: 100 }),
  recommendedActionPlanCode: varchar('recommended_action_plan_code', { length: 100 }),
  actionPayload: jsonb('action_payload').default({}).notNull(),
  provenanceData: jsonb('provenance_data').default({}).notNull(),
  policyProvenance: jsonb('policy_provenance').default({}).notNull(),
  snoozedUntil: timestamp('snoozed_until'),
  resolvedAt: timestamp('resolved_at'),
  resolvedByWorkflowRunId: uuid('resolved_by_workflow_run_id'),
  resolvedByActionPlanId: uuid('resolved_by_action_plan_id'),
  isDismissed: boolean('is_dismissed').default(false).notNull(),
  lastScannedAt: timestamp('last_scanned_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const proactiveScanHistory = pgTable('proactive_scan_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // EVENT_DRIVEN, TEMPORAL_SWEEP, MANUAL_REFRESH
  rulesEvaluatedCount: integer('rules_evaluated_count').default(0).notNull(),
  findingsGeneratedCount: integer('findings_generated_count').default(0).notNull(),
  findingsUpdatedCount: integer('findings_updated_count').default(0).notNull(),
  findingsResolvedCount: integer('findings_resolved_count').default(0).notNull(),
  scanDurationMs: integer('scan_duration_ms').default(0).notNull(),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
});

// =========================================================================
// PHASE 3.5: DEPA / ABDM / RBI AA CONSENT ARTIFACTS
// =========================================================================
export const consentArtifacts = pgTable('consent_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  ecosystem: varchar('ecosystem', { length: 50 }).notNull(), // ABDM, RBI_AA, DIGILOCKER
  consentManagerId: varchar('consent_manager_id', { length: 100 }).notNull(),
  purposeCode: varchar('purpose_code', { length: 100 }).notNull(),
  dataProviderId: varchar('data_provider_id', { length: 100 }).notNull(),
  dataConsumerId: varchar('data_consumer_id', { length: 100 }).notNull(),
  dataTypes: jsonb('data_types').default([]).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, EXPIRED, REVOKED
  signatureAlgorithm: varchar('signature_algorithm', { length: 50 }).default('ED25519_SHA256').notNull(),
  signatureDigest: text('signature_digest').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  provenanceData: jsonb('provenance_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================================================
// PHASE 3.5: RELATIONAL CITIZEN HEALTH RECORDS (ABDM)
// =========================================================================
export const citizenHealthRecords = pgTable('citizen_health_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  abhaAddress: varchar('abha_address', { length: 100 }).notNull(),
  hipName: varchar('hip_name', { length: 150 }).notNull(),
  recordType: varchar('record_type', { length: 100 }).notNull(),
  recordDate: varchar('record_date', { length: 50 }).notNull(),
  diagnosticSummary: text('diagnostic_summary').notNull(),
  provenanceData: jsonb('provenance_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================================================
// PHASE 3.5: RELATIONAL CITIZEN ACADEMIC RECORDS (APAAR / ABC)
// =========================================================================
export const citizenAcademicRecords = pgTable('citizen_academic_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  apaarId: varchar('apaar_id', { length: 50 }).notNull(),
  degreeName: varchar('degree_name', { length: 150 }).notNull(),
  institutionName: varchar('institution_name', { length: 200 }).notNull(),
  yearOfPassing: varchar('year_of_passing', { length: 20 }).notNull(),
  creditsTotal: integer('credits_total').default(0).notNull(),
  gradeOrCgpa: varchar('grade_or_cgpa', { length: 50 }).notNull(),
  verificationStatus: varchar('verification_status', { length: 50 }).default('VERIFIED').notNull(),
  provenanceData: jsonb('provenance_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================================================
// PHASE 3.5: RELATIONAL CITIZEN LEGAL RECORDS (ECOURTS / NJDG)
// =========================================================================
export const citizenLegalRecords = pgTable('citizen_legal_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  cnrNumber: varchar('cnr_number', { length: 50 }).notNull(),
  courtName: varchar('court_name', { length: 200 }).notNull(),
  caseType: varchar('case_type', { length: 100 }).notNull(),
  filingDate: varchar('filing_date', { length: 50 }).notNull(),
  caseStatus: varchar('case_status', { length: 50 }).notNull(),
  summary: text('summary').notNull(),
  relatedPropertyIdentifier: varchar('related_property_identifier', { length: 100 }),
  isEncumbrance: boolean('is_encumbrance').default(false).notNull(),
  provenanceData: jsonb('provenance_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================================================
// PHASE 3.5: RELATIONAL CITIZEN BANK ACCOUNTS (RBI AA / FIP)
// =========================================================================
export const citizenBankAccounts = pgTable('citizen_bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  fipId: varchar('fip_id', { length: 100 }).notNull(), // e.g. FIP_HDFC_BANK, FIP_SBI
  bankName: varchar('bank_name', { length: 150 }).notNull(),
  accountMasked: varchar('account_masked', { length: 50 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).default('SAVINGS').notNull(),
  ifscCode: varchar('ifsc_code', { length: 20 }).notNull(),
  closingBalanceInr: integer('closing_balance_inr').notNull(),
  aggregateCreditsInr: integer('aggregate_credits_inr').notNull(),
  aggregateDebitsInr: integer('aggregate_debits_inr').notNull(),
  verifiedTdsCount: integer('verified_tds_count').default(0).notNull(),
  statementPeriod: varchar('statement_period', { length: 100 }).notNull(),
  provenanceData: jsonb('provenance_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================================================
// WAVE 2: RELATIONAL SYNTHETIC PUBLIC INFRASTRUCTURE (SPI) LEDGERS
// =========================================================================

export const spiTrafficChallans = pgTable('spi_traffic_challans', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  vehicleRegNo: varchar('vehicle_reg_no', { length: 50 }).notNull(),
  challanNo: varchar('challan_no', { length: 100 }).unique().notNull(),
  violationDate: varchar('violation_date', { length: 50 }).notNull(),
  offense: varchar('offense', { length: 255 }).notNull(),
  amountInr: integer('amount_inr').notNull(),
  status: varchar('status', { length: 50 }).default('UNPAID').notNull(), // UNPAID, PAID, DISPUTED
  location: varchar('location', { length: 255 }).notNull(),
  evidenceUrl: text('evidence_url'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiRationCards = pgTable('spi_ration_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  rationCardNo: varchar('ration_card_no', { length: 50 }).unique().notNull(),
  schemeType: varchar('scheme_type', { length: 50 }).notNull(), // PHH, AAY, BPL
  membersCount: integer('members_count').default(1).notNull(),
  monthlyWheatKg: integer('monthly_wheat_kg').default(10).notNull(),
  monthlyRiceKg: integer('monthly_rice_kg').default(15).notNull(),
  allocatedFpsName: varchar('allocated_fps_name', { length: 255 }).notNull(),
  lastLiftedDate: varchar('last_lifted_date', { length: 50 }),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiCropInsurances = pgTable('spi_crop_insurances', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  policyNumber: varchar('policy_number', { length: 100 }).unique().notNull(),
  surveyNumber: varchar('survey_number', { length: 50 }).notNull(),
  season: varchar('season', { length: 50 }).notNull(), // KHARIF, RABI
  cropName: varchar('crop_name', { length: 100 }).notNull(),
  areaHectares: varchar('area_hectares', { length: 50 }).notNull(),
  sumInsuredInr: integer('sum_insured_inr').notNull(),
  farmerPremiumInr: integer('farmer_premium_inr').notNull(),
  governmentSubsidyInr: integer('government_subsidy_inr').notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, SETTLED, EXPIRED
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiMunicipalServices = pgTable('spi_municipal_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  serviceType: varchar('service_type', { length: 100 }).notNull(), // WATER_CONNECTION, TRADE_LICENSE
  identifier: varchar('identifier', { length: 100 }).notNull(), // RR Number or Trade License Number
  title: varchar('title', { length: 255 }).notNull(),
  propertyIdentifier: varchar('property_identifier', { length: 100 }),
  municipalBody: varchar('municipal_body', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiDisabilities = pgTable('spi_disabilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  udidEnrollmentNo: varchar('udid_enrollment_no', { length: 100 }).unique().notNull(),
  disabilityType: varchar('disability_type', { length: 100 }).notNull(),
  disabilityPercentage: integer('disability_percentage').notNull(),
  medicalHospitalName: varchar('medical_hospital_name', { length: 255 }).notNull(),
  medicalBoardSlot: varchar('medical_board_slot', { length: 100 }),
  status: varchar('status', { length: 50 }).default('CERTIFIED').notNull(), // ENROLLED, MEDICAL_SCHEDULED, CERTIFIED
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiDisasterRelief = pgTable('spi_disaster_relief', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  reliefClaimNo: varchar('relief_claim_no', { length: 100 }).unique().notNull(),
  disasterType: varchar('disaster_type', { length: 50 }).notNull(), // FLOOD, CYCLONE, DROUGHT, EARTHQUAKE
  lossDescription: text('loss_description').notNull(),
  assessedAssistanceInr: integer('assessed_assistance_inr').notNull(),
  status: varchar('status', { length: 50 }).default('APPROVED').notNull(),
  disbursementSchedule: varchar('disbursement_schedule', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiPoliceClearances = pgTable('spi_police_clearances', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  recordType: varchar('record_type', { length: 50 }).notNull(), // PCC, FIR
  referenceNumber: varchar('reference_number', { length: 100 }).unique().notNull(),
  policeStation: varchar('police_station', { length: 255 }).notNull(),
  incidentOrPurpose: text('incident_or_purpose').notNull(),
  status: varchar('status', { length: 50 }).default('CLEARED').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spiCyberComplaints = pgTable('spi_cyber_complaints', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  complaintAckNo: varchar('complaint_ack_no', { length: 100 }).unique().notNull(),
  incidentDate: varchar('incident_date', { length: 50 }).notNull(),
  fraudAmountInr: integer('fraud_amount_inr').notNull(),
  suspectAccountOrPhone: varchar('suspect_account_or_phone', { length: 100 }).notNull(),
  transactionRefNumber: varchar('transaction_ref_number', { length: 100 }).notNull(),
  assignedCyberCell: varchar('assigned_cyber_cell', { length: 255 }).notNull(),
  freezeRequestSentToBanks: boolean('freeze_request_sent_to_banks').default(true).notNull(),
  portal1930Status: varchar('portal_1930_status', { length: 50 }).default('FREEZE_IN_PROGRESS').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================================================
// UNIVERSAL CITIZEN REVIEW & AUTHORIZATION LAYER
// =========================================================================
export const reviewSessions = pgTable('review_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowRunId: uuid('workflow_run_id')
    .references(() => workflowRuns.id, { onDelete: 'cascade' })
    .notNull(),
  stepId: varchar('step_id', { length: 100 }).notNull(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  capabilityId: varchar('capability_id', { length: 100 }).notNull(),
  version: integer('version').default(1).notNull(),
  supersededBySessionId: uuid('superseded_by_session_id'),
  supersededAt: timestamp('superseded_at'),
  reviewMode: varchar('review_mode', { length: 50 }).notNull(), // READ_ONLY, REVERSIBLE, FEDERATED_CONSENT, IRREVERSIBLE
  status: varchar('status', { length: 50 }).default('PREPARED').notNull(), // PREPARED, VALIDATED, REVIEWED, AUTHORIZED, EXECUTED, SUPERSEDED, EXPIRED

  // Authoritative Review Content
  previewTitle: varchar('preview_title', { length: 255 }).notNull(),
  previewSummary: text('preview_summary').notNull(),
  authority: varchar('authority', { length: 255 }).notNull(),
  resolvedInputs: jsonb('resolved_inputs').default({}).notNull(),
  dataProvenanceMatrix: jsonb('data_provenance_matrix').default([]).notNull(),
  disclosures: jsonb('disclosures').default([]).notNull(),
  statutoryDeclarations: jsonb('statutory_declarations').default([]).notNull(),
  preconditions: jsonb('preconditions').default([]).notNull(),
  consequences: jsonb('consequences').default({}).notNull(),
  feeBreakdown: jsonb('fee_breakdown').default({}).notNull(),

  // Cryptographic Binding & Execution Guard
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  authorizationToken: text('authorization_token'),
  authorizedAt: timestamp('authorized_at'),
  expiresAt: timestamp('expires_at').notNull(),
  executedAt: timestamp('executed_at'),
  reconciliationSummary: jsonb('reconciliation_summary').default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =========================================================================
// CITIZEN STATE-TRANSITION ENGINE
// =========================================================================

export const citizenStateTransitions = pgTable('citizen_state_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizenId: uuid('citizen_id')
    .references(() => citizens.id, { onDelete: 'cascade' })
    .notNull(),
  initiatingQuery: text('initiating_query').notNull(),
  lifeEventCode: varchar('life_event_code', { length: 100 }).notNull(),
  targetOutcome: text('target_outcome').notNull(),
  state: varchar('state', { length: 50 }).default('ANALYZING').notNull(),
  currentStepKey: varchar('current_step_key', { length: 100 }),
  preTransitionWorldState: jsonb('pre_transition_world_state').default({}).notNull(),
  consequenceGraph: jsonb('consequence_graph').default({}).notNull(),
  contradictions: jsonb('contradictions').default([]).notNull(),
  proposedPlan: jsonb('proposed_plan').default({}).notNull(),
  reviewSessionId: uuid('review_session_id'),
  authorizationToken: text('authorization_token'),
  authorizedAt: timestamp('authorized_at'),
  executionCheckpoints: jsonb('execution_checkpoints').default({}).notNull(),
  reconciliationState: jsonb('reconciliation_state'),
  finalOutcome: jsonb('final_outcome'),
  timeline: jsonb('timeline').default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const syntheticOutageConfig = pgTable('synthetic_outage_config', {
  id: varchar('id', { length: 50 }).primaryKey(),
  failNextPropertyRequest: boolean('fail_next_property_request').default(false).notNull(),
  simulatePropertyOutage: boolean('simulate_property_outage').default(false).notNull(),
  injectDeedContradiction: boolean('inject_deed_contradiction').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
