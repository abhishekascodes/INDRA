import { describe, it, expect, afterAll } from 'vitest';
import { getDb, closeDb, schema, eq } from '@indra/database';
import path from 'node:path';
import fs from 'node:fs';

describe('PGlite Persistence Across Process/Connection Restart', () => {
  const testDir = path.resolve(process.cwd(), '.data', 'test-pglite-restart');

  afterAll(async () => {
    await closeDb();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('preserves data on disk across full connection termination and restart', async () => {
    // 1. Ensure clean slate
    await closeDb();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // 2. Open First Session on disk directory
    const db1 = await getDb({ dataDir: testDir });
    const testCitizenId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    await db1.insert(schema.citizens).values({
      id: testCitizenId,
      primaryName: 'Rohan Verma',
      dateOfBirth: '1992-04-12',
      gender: 'MALE',
      primaryMobile: '+919988776655',
      primaryEmail: 'rohan.verma@example.gov.in',
      currentCity: 'Pune',
      currentState: 'Maharashtra',
    });

    // Verify row exists in Session 1
    const [c1] = await db1
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, testCitizenId));
    expect(c1).toBeDefined();
    expect(c1.primaryName).toBe('Rohan Verma');

    // 3. Terminate Session 1 (simulating process exit)
    await closeDb();

    // 4. Reopen Session 2 on the exact same disk directory (simulating process restart)
    const db2 = await getDb({ dataDir: testDir });

    // 5. Query data in Session 2
    const [c2] = await db2
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, testCitizenId));

    expect(c2).toBeDefined();
    expect(c2.primaryName).toBe('Rohan Verma');
    expect(c2.currentCity).toBe('Pune');
    expect(c2.primaryEmail).toBe('rohan.verma@example.gov.in');

    // Close session 2
    await closeDb();
  });
});
