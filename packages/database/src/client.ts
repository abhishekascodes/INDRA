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
  `);
}
