import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema.js';
import path from 'node:path';
import fs from 'node:fs';

let pgliteInstance: PGlite | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export interface GetDbOptions {
  dataDir?: string;
  inMemory?: boolean;
}

function getProjectDataDir(): string {
  let curr = process.cwd();
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
      return path.join(curr, '.data', 'indra-pglite');
    }
    curr = path.dirname(curr);
  }
  return path.resolve(process.cwd(), '.data', 'indra-pglite');
}

export async function getDb(options: GetDbOptions = {}) {
  if (dbInstance) {
    return dbInstance;
  }

  let client: PGlite;
  if (options.inMemory || (process.env.VITEST && !options.dataDir)) {
    client = new PGlite();
  } else {
    const dataDir =
      options.dataDir ||
      process.env.DATABASE_DIR ||
      getProjectDataDir();

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    } else {
      // Auto-clean stale lock files from previous process terminations
      const pidFile = path.join(dataDir, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        try { fs.unlinkSync(pidFile); } catch (e) {}
      }
      const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
      if (fs.existsSync(lockFile)) {
        try { fs.unlinkSync(lockFile); } catch (e) {}
      }
    }
    client = new PGlite(dataDir);
  }

  await client.waitReady;
  pgliteInstance = client;
  dbInstance = drizzle(client, { schema });

  // Ensure tables are created automatically if using embedded PGlite
  await initSchema(client);

  return dbInstance;
}

export async function closeDb() {
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
    dbInstance = null;
  }
}

async function initSchema(client: PGlite) {
  // Execute CREATE TABLE IF NOT EXISTS scripts for all entities
  await client.exec(`
    CREATE TABLE IF NOT EXISTS citizens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      primary_name VARCHAR(255) NOT NULL,
      date_of_birth VARCHAR(20) NOT NULL,
      gender VARCHAR(20) NOT NULL,
      primary_mobile VARCHAR(20) NOT NULL,
      primary_email VARCHAR(255) NOT NULL,
      current_city VARCHAR(100) NOT NULL,
      current_state VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      identifier_masked VARCHAR(100) NOT NULL,
      identifier_hash VARCHAR(255) NOT NULL,
      issued_date VARCHAR(20),
      expiry_date VARCHAR(20),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      line1 TEXT NOT NULL,
      line2 TEXT,
      city VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(10) NOT NULL,
      is_verified BOOLEAN NOT NULL DEFAULT TRUE,
      valid_since VARCHAR(20),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      document_type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      issuer VARCHAR(255) NOT NULL,
      document_number VARCHAR(100),
      issue_date VARCHAR(20),
      expiry_date VARCHAR(20),
      verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
      file_data TEXT,
      provenance_id VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_code VARCHAR(100) NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      state VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      current_step_id VARCHAR(100),
      context_data JSONB NOT NULL DEFAULT '{}',
      error_details JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS capability_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
      capability_id VARCHAR(100) NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      idempotency_key VARCHAR(255) UNIQUE NOT NULL,
      inputs JSONB NOT NULL DEFAULT '{}',
      outputs JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      workflow_run_id UUID,
      service_category VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      reference_code VARCHAR(100) UNIQUE NOT NULL,
      universal_status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
      submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      timeline JSONB NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      application_id UUID,
      amount_inr INTEGER NOT NULL,
      purpose VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      reference_no VARCHAR(100) UNIQUE NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI_BHARAT',
      breakdown JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS government_inbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      what_happened TEXT NOT NULL,
      why_it_matters TEXT NOT NULL,
      what_to_do TEXT NOT NULL,
      by_when VARCHAR(50),
      what_happens_next TEXT NOT NULL,
      workflow_code VARCHAR(100),
      action_payload JSONB DEFAULT '{}',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS consents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      purpose VARCHAR(255) NOT NULL,
      scope JSONB NOT NULL DEFAULT '[]',
      authorized_action TEXT NOT NULL,
      granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP,
      revoked_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS provenance_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      source_type VARCHAR(50) NOT NULL,
      source_authority VARCHAR(255) NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 100,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID,
      action VARCHAR(255) NOT NULL,
      actor_type VARCHAR(50) NOT NULL DEFAULT 'CITIZEN',
      actor_id VARCHAR(100),
      request_payload JSONB DEFAULT '{}',
      result_status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(100) NOT NULL,
      citizen_id UUID NOT NULL,
      aggregate_type VARCHAR(50) NOT NULL,
      aggregate_id VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_epfo_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      uan VARCHAR(50) NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      member_id VARCHAR(100) NOT NULL,
      establishment_name VARCHAR(255) NOT NULL,
      establishment_id VARCHAR(100) NOT NULL,
      joining_date VARCHAR(20) NOT NULL,
      exit_date VARCHAR(20),
      pf_balance INTEGER NOT NULL DEFAULT 0,
      pension_balance INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_business_entities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      entity_type VARCHAR(50) NOT NULL,
      legal_name VARCHAR(255) NOT NULL,
      trade_name VARCHAR(255),
      pan VARCHAR(20) NOT NULL,
      gstin VARCHAR(30),
      udyam_number VARCHAR(50),
      incorporation_date VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      registered_address JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_driving_licences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      licence_number VARCHAR(50) UNIQUE NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      holder_name VARCHAR(255) NOT NULL,
      dob VARCHAR(20) NOT NULL,
      issued_date VARCHAR(20) NOT NULL,
      valid_until VARCHAR(20) NOT NULL,
      blood_group VARCHAR(10) NOT NULL,
      rto_code VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      address TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_telecom_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      imei VARCHAR(50) NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      operator VARCHAR(50) NOT NULL,
      sim_imsi VARCHAR(50) NOT NULL,
      device_model VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      reported_stolen_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_land_parcels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_number VARCHAR(50) NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      state VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      taluk VARCHAR(100) NOT NULL,
      village VARCHAR(100) NOT NULL,
      area_acres VARCHAR(20) NOT NULL,
      crop_type VARCHAR(100) NOT NULL,
      irrigation_status VARCHAR(50) NOT NULL,
      soil_health_index INTEGER NOT NULL DEFAULT 85,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_welfare_schemes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      eligibility_criteria JSONB NOT NULL DEFAULT '{}',
      benefit_description TEXT NOT NULL,
      annual_benefit_inr INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      related_citizen_id UUID REFERENCES citizens(id) ON DELETE SET NULL,
      relation_type VARCHAR(50) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      date_of_birth VARCHAR(20),
      is_nominee_for_epfo BOOLEAN NOT NULL DEFAULT FALSE,
      is_dependent_for_health BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      registration_number VARCHAR(50) UNIQUE NOT NULL,
      chassis_number VARCHAR(100) NOT NULL,
      vehicle_class VARCHAR(50) NOT NULL,
      maker_model VARCHAR(255) NOT NULL,
      rto_code VARCHAR(20) NOT NULL,
      state VARCHAR(100) NOT NULL,
      registration_date VARCHAR(20) NOT NULL,
      fitness_valid_until VARCHAR(20) NOT NULL,
      pucc_valid_until VARCHAR(20),
      hypothecated_to VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_properties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      property_type VARCHAR(50) NOT NULL,
      identifier VARCHAR(100) NOT NULL,
      municipal_body VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      state VARCHAR(100) NOT NULL,
      annual_tax_inr INTEGER NOT NULL DEFAULT 0,
      tax_payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_employments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      employer_name VARCHAR(255) NOT NULL,
      designation VARCHAR(100),
      uan VARCHAR(50),
      member_id VARCHAR(100),
      establishment_id VARCHAR(100),
      start_date VARCHAR(20) NOT NULL,
      end_date VARCHAR(20),
      is_current BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_educations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      degree VARCHAR(255) NOT NULL,
      field_of_study VARCHAR(255),
      institution VARCHAR(255) NOT NULL,
      board_or_university VARCHAR(255) NOT NULL,
      passing_year INTEGER NOT NULL,
      roll_number VARCHAR(100),
      apaar_id VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_statutory_obligations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      obligation_type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      authority VARCHAR(255) NOT NULL,
      due_date VARCHAR(20),
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      penalty_inr_per_day INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS action_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      life_event_code VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      summary TEXT NOT NULL,
      state VARCHAR(50) NOT NULL DEFAULT 'DISCOVERED',
      total_tasks INTEGER NOT NULL DEFAULT 0,
      completed_tasks INTEGER NOT NULL DEFAULT 0,
      estimated_days_to_complete INTEGER NOT NULL DEFAULT 14,
      estimated_statutory_fees_inr INTEGER NOT NULL DEFAULT 0,
      context_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS action_plan_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
      step_key VARCHAR(100) NOT NULL,
      capability_id VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      authority VARCHAR(255) NOT NULL,
      phase_index INTEGER NOT NULL DEFAULT 1,
      dependencies JSONB NOT NULL DEFAULT '[]',
      state VARCHAR(50) NOT NULL DEFAULT 'BLOCKED',
      execution_mode VARCHAR(50) NOT NULL DEFAULT 'CITIZEN_REVIEW_REQUIRED',
      workflow_run_id UUID,
      output_payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS proactive_findings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      fingerprint VARCHAR(64) DEFAULT '' NOT NULL,
      category VARCHAR(50) DEFAULT 'OBLIGATION_DEADLINE' NOT NULL,
      finding_type VARCHAR(50) NOT NULL,
      rule_code VARCHAR(100) DEFAULT 'RULE_GENERIC' NOT NULL,
      urgency VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
      priority_score INTEGER NOT NULL DEFAULT 50,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      title VARCHAR(255) NOT NULL,
      explanation TEXT NOT NULL,
      actionable_recommendation TEXT NOT NULL,
      structured_explanation JSONB NOT NULL DEFAULT '{}',
      action_link JSONB NOT NULL DEFAULT '{}',
      recommended_workflow_code VARCHAR(100),
      recommended_action_plan_code VARCHAR(100),
      action_payload JSONB NOT NULL DEFAULT '{}',
      provenance_data JSONB NOT NULL DEFAULT '{}',
      policy_provenance JSONB NOT NULL DEFAULT '{}',
      snoozed_until TIMESTAMP,
      resolved_at TIMESTAMP,
      resolved_by_workflow_run_id UUID REFERENCES workflow_runs(id),
      resolved_by_action_plan_id UUID REFERENCES action_plans(id),
      is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
      last_scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Safe migration for existing proactive_findings tables
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64) DEFAULT '' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'OBLIGATION_DEADLINE' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS rule_code VARCHAR(100) DEFAULT 'RULE_GENERIC' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50 NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS structured_explanation JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS action_link JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS provenance_data JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS policy_provenance JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS resolved_by_workflow_run_id UUID REFERENCES workflow_runs(id);
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS resolved_by_action_plan_id UUID REFERENCES action_plans(id);
    ALTER TABLE proactive_findings ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP DEFAULT NOW() NOT NULL;
    DELETE FROM proactive_findings WHERE fingerprint = '' OR fingerprint IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_proactive_findings_citizen_fingerprint ON proactive_findings(citizen_id, fingerprint);

    CREATE TABLE IF NOT EXISTS proactive_scan_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      trigger_type VARCHAR(50) NOT NULL,
      rules_evaluated_count INTEGER NOT NULL DEFAULT 0,
      findings_generated_count INTEGER NOT NULL DEFAULT 0,
      findings_updated_count INTEGER NOT NULL DEFAULT 0,
      findings_resolved_count INTEGER NOT NULL DEFAULT 0,
      scan_duration_ms INTEGER NOT NULL DEFAULT 0,
      scanned_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS consent_artifacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      ecosystem VARCHAR(50) NOT NULL,
      consent_manager_id VARCHAR(100) NOT NULL,
      purpose_code VARCHAR(100) NOT NULL,
      data_provider_id VARCHAR(100) NOT NULL,
      data_consumer_id VARCHAR(100) NOT NULL,
      data_types JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      signature_algorithm VARCHAR(50) NOT NULL DEFAULT 'ED25519_SHA256',
      signature_digest TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      provenance_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_health_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      abha_address VARCHAR(100) NOT NULL,
      hip_name VARCHAR(150) NOT NULL,
      record_type VARCHAR(100) NOT NULL,
      record_date VARCHAR(50) NOT NULL,
      diagnostic_summary TEXT NOT NULL,
      provenance_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_academic_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      apaar_id VARCHAR(50) NOT NULL,
      degree_name VARCHAR(150) NOT NULL,
      institution_name VARCHAR(200) NOT NULL,
      year_of_passing VARCHAR(20) NOT NULL,
      credits_total INTEGER NOT NULL DEFAULT 0,
      grade_or_cgpa VARCHAR(50) NOT NULL,
      verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
      provenance_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_legal_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      cnr_number VARCHAR(50) NOT NULL,
      court_name VARCHAR(200) NOT NULL,
      case_type VARCHAR(100) NOT NULL,
      filing_date VARCHAR(50) NOT NULL,
      case_status VARCHAR(50) NOT NULL,
      summary TEXT NOT NULL,
      related_property_identifier VARCHAR(100),
      is_encumbrance BOOLEAN NOT NULL DEFAULT FALSE,
      provenance_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizen_bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      fip_id VARCHAR(100) NOT NULL,
      bank_name VARCHAR(150) NOT NULL,
      account_masked VARCHAR(50) NOT NULL,
      account_type VARCHAR(50) NOT NULL DEFAULT 'SAVINGS',
      ifsc_code VARCHAR(20) NOT NULL,
      closing_balance_inr INTEGER NOT NULL,
      aggregate_credits_inr INTEGER NOT NULL,
      aggregate_debits_inr INTEGER NOT NULL,
      verified_tds_count INTEGER NOT NULL DEFAULT 0,
      statement_period VARCHAR(100) NOT NULL,
      provenance_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_traffic_challans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      vehicle_reg_no VARCHAR(50) NOT NULL,
      challan_no VARCHAR(100) UNIQUE NOT NULL,
      violation_date VARCHAR(50) NOT NULL,
      offense VARCHAR(255) NOT NULL,
      amount_inr INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
      location VARCHAR(255) NOT NULL,
      evidence_url TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_ration_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      ration_card_no VARCHAR(50) UNIQUE NOT NULL,
      scheme_type VARCHAR(50) NOT NULL,
      members_count INTEGER NOT NULL DEFAULT 1,
      monthly_wheat_kg INTEGER NOT NULL DEFAULT 10,
      monthly_rice_kg INTEGER NOT NULL DEFAULT 15,
      allocated_fps_name VARCHAR(255) NOT NULL,
      last_lifted_date VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_crop_insurances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      policy_number VARCHAR(100) UNIQUE NOT NULL,
      survey_number VARCHAR(50) NOT NULL,
      season VARCHAR(50) NOT NULL,
      crop_name VARCHAR(100) NOT NULL,
      area_hectares VARCHAR(50) NOT NULL,
      sum_insured_inr INTEGER NOT NULL,
      farmer_premium_inr INTEGER NOT NULL,
      government_subsidy_inr INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_municipal_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      service_type VARCHAR(100) NOT NULL,
      identifier VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      property_identifier VARCHAR(100),
      municipal_body VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_disabilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      udid_enrollment_no VARCHAR(100) UNIQUE NOT NULL,
      disability_type VARCHAR(100) NOT NULL,
      disability_percentage INTEGER NOT NULL,
      medical_hospital_name VARCHAR(255) NOT NULL,
      medical_board_slot VARCHAR(100),
      status VARCHAR(50) NOT NULL DEFAULT 'CERTIFIED',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_disaster_relief (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      relief_claim_no VARCHAR(100) UNIQUE NOT NULL,
      disaster_type VARCHAR(50) NOT NULL,
      loss_description TEXT NOT NULL,
      assessed_assistance_inr INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
      disbursement_schedule VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_police_clearances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      record_type VARCHAR(50) NOT NULL,
      reference_number VARCHAR(100) UNIQUE NOT NULL,
      police_station VARCHAR(255) NOT NULL,
      incident_or_purpose TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'CLEARED',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spi_cyber_complaints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      complaint_ack_no VARCHAR(100) UNIQUE NOT NULL,
      incident_date VARCHAR(50) NOT NULL,
      fraud_amount_inr INTEGER NOT NULL,
      suspect_account_or_phone VARCHAR(100) NOT NULL,
      transaction_ref_number VARCHAR(100) NOT NULL,
      assigned_cyber_cell VARCHAR(255) NOT NULL,
      freeze_request_sent_to_banks BOOLEAN NOT NULL DEFAULT TRUE,
      portal_1930_status VARCHAR(50) NOT NULL DEFAULT 'FREEZE_IN_PROGRESS',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS review_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
      step_id VARCHAR(100) NOT NULL,
      citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
      capability_id VARCHAR(100) NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      superseded_by_session_id UUID,
      superseded_at TIMESTAMP,
      review_mode VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PREPARED',
      preview_title VARCHAR(255) NOT NULL,
      preview_summary TEXT NOT NULL,
      authority VARCHAR(255) NOT NULL,
      resolved_inputs JSONB NOT NULL DEFAULT '{}',
      data_provenance_matrix JSONB NOT NULL DEFAULT '[]',
      disclosures JSONB NOT NULL DEFAULT '[]',
      statutory_declarations JSONB NOT NULL DEFAULT '[]',
      preconditions JSONB NOT NULL DEFAULT '[]',
      consequences JSONB NOT NULL DEFAULT '{}',
      fee_breakdown JSONB NOT NULL DEFAULT '{}',
      payload_hash VARCHAR(64) NOT NULL,
      authorization_token TEXT,
      authorized_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      executed_at TIMESTAMP,
      reconciliation_summary JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Ensure schema evolution columns exist if table was created previously
    ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS superseded_by_session_id UUID;
    ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP;
  `);
}

