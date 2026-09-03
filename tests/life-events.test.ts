import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase, PRIYA_SHARMA_ID, AARAV_PATEL_ID } from '@indra/database';
import { synthesizeRelocationImpact } from '@indra/policy-engine';

describe('Audit 13: Dynamic Life-Event Synthesis (Derived from Citizen State)', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('synthesizes relocation consequences dynamically based on citizen records', async () => {
    // 1. Test Priya Sharma relocating within Karnataka or inter-state
    const priyaImpact = await synthesizeRelocationImpact(
      PRIYA_SHARMA_ID,
      'Mumbai',
      'Maharashtra'
    );

    expect(priyaImpact.citizenId).toBe(PRIYA_SHARMA_ID);
    expect(priyaImpact.originCity).toBe('Bengaluru');
    expect(priyaImpact.originState).toBe('Karnataka');
    expect(priyaImpact.destinationCity).toBe('Mumbai');
    expect(priyaImpact.destinationState).toBe('Maharashtra');

    // Priya has a vehicle RC in documents -> Must include vehicle RC registration
    const priyaVehicleReg = priyaImpact.registrations.find((r) => r.id === 'reg_vehicle_rc');
    expect(priyaVehicleReg).toBeDefined();
    expect(priyaVehicleReg?.actionRequired).toContain('No Objection Certificate');

    // Driving licence should indicate inter-state endorsement
    const priyaDl = priyaImpact.registrations.find((r) => r.id === 'reg_dl');
    expect(priyaDl?.isInterState).toBe(true);
  });

  it('omits vehicle registration when citizen holds no vehicle records (Aarav Patel)', async () => {
    // 2. Test Aarav Patel (Pune, Maharashtra) moving to Bengaluru
    const aaravImpact = await synthesizeRelocationImpact(
      AARAV_PATEL_ID,
      'Bengaluru',
      'Karnataka'
    );

    expect(aaravImpact.citizenId).toBe(AARAV_PATEL_ID);
    expect(aaravImpact.originCity).toBe('Pune');
    expect(aaravImpact.originState).toBe('Maharashtra');

    // Aarav has NO vehicle document in DB -> Must NOT include vehicle RC!
    const aaravVehicleReg = aaravImpact.registrations.find((r) => r.id === 'reg_vehicle_rc');
    expect(aaravVehicleReg).toBeUndefined();

    // Voter registration constituency transfer should reference Pune to Bengaluru
    const aaravVoter = aaravImpact.registrations.find((r) => r.id === 'reg_voter');
    expect(aaravVoter?.actionRequired).toContain('Pune to Bengaluru');
  });
});
