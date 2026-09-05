import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  seedDatabase,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  closeDb,
} from '@indra/database';
import { buildApp } from '../apps/api/src/server.js';
import { CitizenWorldModelService } from '@indra/policy-engine';
import path from 'node:path';
import fs from 'node:fs';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Phase 3.1: Citizen World Model & Relational Civic Graph Suite', () => {
  let app: FastifyInstance;
  let service: CitizenWorldModelService;

  beforeAll(async () => {
    app = await buildApp();
    service = CitizenWorldModelService.getInstance();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // 1. Relational Integrity & Schema Validation
  it('1. Enforces foreign-key integrity across all world model tables', async () => {
    const db = await getDb();
    const FAKE_CITIZEN_ID = '00000000-0000-0000-0000-000000000000';

    // Inserting a vehicle for a non-existent citizen MUST fail foreign-key constraint
    await expect(
      db.insert(schema.citizenVehicles).values({
        citizenId: FAKE_CITIZEN_ID,
        registrationNumber: 'DL-01-AB-1234',
        chassisNumber: 'CHASSIS99999',
        vehicleClass: 'MOTOR_CAR',
        makerModel: 'Maruti Suzuki Swift',
        rtoCode: 'DL-01',
        state: 'Delhi',
        registrationDate: '2023-01-01',
        fitnessValidUntil: '2038-01-01',
        status: 'ACTIVE',
      })
    ).rejects.toThrow();

    // Inserting a relationship for a non-existent citizen MUST fail
    await expect(
      db.insert(schema.citizenRelationships).values({
        citizenId: FAKE_CITIZEN_ID,
        relationType: 'SPOUSE',
        fullName: 'Jane Doe',
      })
    ).rejects.toThrow();

    // Inserting a property for a non-existent citizen MUST fail
    await expect(
      db.insert(schema.citizenProperties).values({
        citizenId: FAKE_CITIZEN_ID,
        propertyType: 'RESIDENTIAL_FLAT',
        identifier: 'PROP-999',
        municipalBody: 'MCD Delhi',
        address: '123 Fake Street, Delhi',
        state: 'Delhi',
      })
    ).rejects.toThrow();
  });

  // 2. Priya's Comprehensive World Model
  it("2. Aggregates Priya Sharma's complete relational public-service world", async () => {
    const wm = await service.getWorldModel(PRIYA_SHARMA_ID);

    expect(wm.profile.fullName).toBe('Priya Sharma');
    expect(wm.profile.currentCity).toBe('Bengaluru');
    expect(wm.profile.currentState).toBe('Karnataka');

    // Vehicles: Holds Ather 450X
    expect(wm.vehicles.length).toBe(1);
    expect(wm.vehicles[0].registrationNumber).toBe('KA-01-EQ-4921');
    expect(wm.vehicles[0].makerModel).toContain('Ather 450X');
    expect(wm.vehicles[0].rtoCode).toBe('KA-01');

    // Properties: Flat in Indiranagar / HAL 2nd Stage
    expect(wm.properties.length).toBe(1);
    expect(wm.properties[0].identifier).toBe('114-W0124-9');
    expect(wm.properties[0].municipalBody).toContain('BBMP');
    expect(wm.properties[0].taxPaymentStatus).toBe('PAID');

    // Relationships: Spouse Vikram Sharma
    expect(wm.relationships.length).toBe(1);
    expect(wm.relationships[0].relationType).toBe('SPOUSE');
    expect(wm.relationships[0].fullName).toBe('Vikram Sharma');
    expect(wm.relationships[0].isNomineeForEpfo).toBe(true);

    // Employment: Current software role + past Apex role
    expect(wm.employments.length).toBe(2);
    const currentEmp = wm.employments.find((e) => e.isCurrent);
    expect(currentEmp?.employerName).toContain('TechSolutions Bengaluru');

    // Educations: B.E. Computer Science from VTU
    expect(wm.educations.length).toBe(1);
    expect(wm.educations[0].boardOrUniversity).toContain('VTU');

    // Statutory Obligations: ITR + BBMP Tax
    expect(wm.obligations.length).toBe(2);
    const itr = wm.obligations.find((o) => o.obligationType === 'ITR_FILING');
    expect(itr?.status).toBe('SATISFIED');
  });

  // 3. Aarav's World Model (Absence of Vehicle & Independent State)
  it("3. Verifies Aarav Patel's independent state and strict absence of vehicle records", async () => {
    const wm = await service.getWorldModel(AARAV_PATEL_ID);

    expect(wm.profile.fullName).toBe('Aarav Patel');
    expect(wm.profile.currentCity).toBe('Pune');
    expect(wm.profile.currentState).toBe('Maharashtra');

    // Critical Invariant: Aarav owns NO vehicle!
    expect(wm.vehicles.length).toBe(0);

    // Properties: Agricultural land in Satara, MH
    expect(wm.properties.length).toBe(1);
    expect(wm.properties[0].propertyType).toBe('AGRICULTURAL_LAND');
    expect(wm.properties[0].identifier).toContain('142/3');
    expect(wm.properties[0].state).toBe('Maharashtra');

    // Relationships: Parent Sunita Patel
    expect(wm.relationships.length).toBe(1);
    expect(wm.relationships[0].relationType).toBe('PARENT');
    expect(wm.relationships[0].fullName).toBe('Sunita Patel');

    // Employment: TechCorp India Pune Pvt Ltd
    expect(wm.employments.length).toBe(1);
    expect(wm.employments[0].employerName).toContain('TechCorp India Pune');

    // Obligations: Pending ITR-2 with penalty
    const pendingItr = wm.obligations.find((o) => o.obligationType === 'ITR_FILING');
    expect(pendingItr?.status).toBe('PENDING');
    expect(pendingItr?.penaltyInrPerDay).toBe(50);
  });

  // 4. Provenance Correctness & Distinguishing Fact vs Probabilistic Inference
  it('4. Attaches auditable provenance distinguishing FACT from probabilistic observations', async () => {
    const wm = await service.getWorldModel(PRIYA_SHARMA_ID);

    // Vehicle record is a statutory FACT from MoRTH Vahan: confidence must be null (authoritative, not probabilistic)
    const vehicle = wm.vehicles[0];
    expect(vehicle.provenance.provenanceType).toBe('FACT');
    expect(vehicle.provenance.source).toBe('SPI_VAHAN_NATIONAL_REGISTER');
    expect(vehicle.provenance.authority).toContain('MoRTH');
    expect(vehicle.provenance.verificationStatus).toBe('VERIFIED');
    expect(vehicle.provenance.confidence).toBeNull();

    // Property record is a statutory FACT from Municipal Authority: confidence must be null
    const prop = wm.properties[0];
    expect(prop.provenance.provenanceType).toBe('FACT');
    expect(prop.provenance.authority).toContain('BBMP');
    expect(prop.provenance.confidence).toBeNull();

    // System obligations can carry confidence:
    const obligation = wm.obligations[0];
    expect(obligation.provenance.provenanceType).toBe('SYSTEM_OBSERVATION');
    expect(obligation.provenance.confidence).toBe(100);
  });

  // 5. Reusable Domain Access Primitives (Without Raw DB Queries)
  it('5. Evaluates domain queries deterministically via reusable access primitives', async () => {
    // 5a. hasVehicle
    expect(await service.hasVehicle(PRIYA_SHARMA_ID)).toBe(true);
    expect(await service.hasVehicle(AARAV_PATEL_ID)).toBe(false);

    // 5b. getCurrentResidence
    const priyaResidence = await service.getCurrentResidence(PRIYA_SHARMA_ID);
    expect(priyaResidence.city).toBe('Bengaluru');
    expect(priyaResidence.state).toBe('Karnataka');

    const aaravResidence = await service.getCurrentResidence(AARAV_PATEL_ID);
    expect(aaravResidence.city).toBe('Pune');
    expect(aaravResidence.state).toBe('Maharashtra');

    // 5c. hasDrivingLicence
    expect(await service.hasDrivingLicence(PRIYA_SHARMA_ID)).toBe(true);
    expect(await service.hasDrivingLicence(AARAV_PATEL_ID)).toBe(true);

    // 5d. getSpouse
    const priyaSpouse = await service.getSpouse(PRIYA_SHARMA_ID);
    expect(priyaSpouse?.fullName).toBe('Vikram Sharma');

    const aaravSpouse = await service.getSpouse(AARAV_PATEL_ID);
    expect(aaravSpouse).toBeNull();

    // 5e. getDependents
    const aaravDependents = await service.getDependents(AARAV_PATEL_ID);
    expect(aaravDependents.length).toBe(1);
    expect(aaravDependents[0].fullName).toBe('Sunita Patel');

    // 5f. getDiscrepancies: Priya has PAN-Aadhaar discrepancy seeded
    const discrepancies = await service.getDiscrepancies(PRIYA_SHARMA_ID);
    expect(discrepancies.some((d) => d.type === 'PAN_AADHAAR_NAME_MISMATCH')).toBe(true);

    // 5g. getPendingObligations: Aarav has 1 pending obligation, Priya has 0
    const aaravPending = await service.getPendingObligations(AARAV_PATEL_ID);
    expect(aaravPending.length).toBe(1);

    const priyaPending = await service.getPendingObligations(PRIYA_SHARMA_ID);
    expect(priyaPending.length).toBe(0);
  });

  // 6. State Mutation Reflected in World Model
  it('6. Proves that mutating persisted database state updates the aggregated world model', async () => {
    const db = await getDb();

    // Initially Aarav has no vehicle
    expect(await service.hasVehicle(AARAV_PATEL_ID)).toBe(false);

    // Aarav purchases a vehicle (Simulated new Vahan registration)
    await db.insert(schema.citizenVehicles).values({
      citizenId: AARAV_PATEL_ID,
      registrationNumber: 'MH-12-TR-9001',
      chassisNumber: 'CHASSIS_AARAV_9001',
      vehicleClass: 'MOTOR_CAR',
      makerModel: 'Tata Nexon EV (Empowered Oxide)',
      rtoCode: 'MH-12',
      state: 'Maharashtra',
      registrationDate: '2026-09-03',
      fitnessValidUntil: '2041-09-02',
      status: 'ACTIVE',
    });

    // World model MUST immediately reflect the new vehicle!
    expect(await service.hasVehicle(AARAV_PATEL_ID)).toBe(true);
    const updatedWm = await service.getWorldModel(AARAV_PATEL_ID);
    expect(updatedWm.vehicles.length).toBe(1);
    expect(updatedWm.vehicles[0].registrationNumber).toBe('MH-12-TR-9001');
  });

  // 7. API Security & Scoping Isolation
  it('7. Enforces strict citizen scoping over GET /api/citizen/world-model', async () => {
    // 7a. Priya fetches her world model
    const resPriya = await app.inject({
      method: 'GET',
      url: '/api/citizen/world-model',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });

    expect(resPriya.statusCode).toBe(200);
    const bodyPriya = resPriya.json();
    expect(bodyPriya.worldModel.profile.fullName).toBe('Priya Sharma');
    expect(bodyPriya.worldModel.vehicles.length).toBe(1);

    // 7b. Aarav fetches his world model
    const resAarav = await app.inject({
      method: 'GET',
      url: '/api/citizen/world-model',
      headers: { 'x-citizen-id': AARAV_PATEL_ID },
    });

    expect(resAarav.statusCode).toBe(200);
    const bodyAarav = resAarav.json();
    expect(bodyAarav.worldModel.profile.fullName).toBe('Aarav Patel');
    expect(bodyAarav.worldModel.vehicles.length).toBe(0);

    // 7c. Non-existent citizen returns 404
    const resFake = await app.inject({
      method: 'GET',
      url: '/api/citizen/world-model',
      headers: { 'x-citizen-id': '00000000-0000-0000-0000-000000000000' },
    });
    expect(resFake.statusCode).toBe(404);
  });

  // 8. Relational World Model Persistence Across Connection Closure
  it('8. Preserves relational world model data across complete connection close and reload', async () => {
    const testDir = path.resolve(process.cwd(), '.data', 'test-wm-restart');
    await closeDb();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // 8a. Open on disk and seed Priya
    const diskDb = await getDb({ dataDir: testDir });
    await resetDatabase(diskDb);

    const wmBefore = await service.getWorldModel(PRIYA_SHARMA_ID);
    expect(wmBefore.vehicles.length).toBe(1);
    expect(wmBefore.properties.length).toBe(1);

    // 8b. Close database connection cleanly
    await closeDb();

    // 8c. Reopen on same disk directory (simulating process restart)
    await getDb({ dataDir: testDir });
    const wmAfter = await service.getWorldModel(PRIYA_SHARMA_ID);
    expect(wmAfter.profile.fullName).toBe('Priya Sharma');
    expect(wmAfter.vehicles.length).toBe(1);
    expect(wmAfter.vehicles[0].registrationNumber).toBe('KA-01-EQ-4921');
    expect(wmAfter.properties[0].identifier).toBe('114-W0124-9');
    expect(wmAfter.relationships[0].fullName).toBe('Vikram Sharma');

    // Clean up
    await closeDb();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
