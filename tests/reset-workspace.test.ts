import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildApp } from '../apps/api/src/server.js';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  eq,
} from '@indra/database';
import { SESSION_COOKIE_NAME, resetRateLimit } from '../apps/api/src/auth/session.js';

describe('SYNTHETIC CITIZEN WORKSPACE RESET & EVALUATION BASELINE SUITE', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    resetRateLimit('login:127.0.0.1');
    resetRateLimit('signup:127.0.0.1');
    await resetDatabase();
  });

  async function loginAsAarav() {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'aarav.patel@example.in',
        password: 'Password123!',
      },
    });
    const cookie = res.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME);
    return { token: cookie?.value, body: JSON.parse(res.body) };
  }

  async function loginAsPriya() {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'priya.sharma@example.in',
        password: 'Password123!',
      },
    });
    const cookie = res.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME);
    return { token: cookie?.value, body: JSON.parse(res.body) };
  }

  it('1. Successfully resets Aarav workspace to clean baseline without invalidating session or account', async () => {
    const { token } = await loginAsAarav();
    expect(token).toBeDefined();

    // 1a. Mutate Aarav state: initiate a transition
    const initRes = await app.inject({
      method: 'POST',
      url: '/api/transitions/initiate',
      cookies: { [SESSION_COOKIE_NAME]: token },
      payload: {
        query: 'I moved to Bangalore and bought a plot in Devanahalli.',
      },
    });
    expect(initRes.statusCode).toBe(200);

    // Also mutate citizen city
    const db = await getDb();
    await db
      .update(schema.citizens)
      .set({ currentCity: 'Bengaluru', currentState: 'Karnataka' })
      .where(eq(schema.citizens.id, AARAV_PATEL_ID));

    // Verify mutated state
    const mutatedProf = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      cookies: { [SESSION_COOKIE_NAME]: token },
    });
    expect(JSON.parse(mutatedProf.body).citizen.currentCity).toBe('Bengaluru');

    // 1b. Call reset-workspace
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/citizen/reset-workspace',
      cookies: { [SESSION_COOKIE_NAME]: token },
    });
    expect(resetRes.statusCode).toBe(200);
    const resetData = JSON.parse(resetRes.body);
    expect(resetData.success).toBe(true);
    expect(resetData.citizenId).toBe(AARAV_PATEL_ID);

    // 1c. Verify Aarav is back to baseline: Pune, Maharashtra
    const baselineProf = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      cookies: { [SESSION_COOKIE_NAME]: token },
    });
    expect(baselineProf.statusCode).toBe(200);
    const profData = JSON.parse(baselineProf.body);
    expect(profData.citizen.currentCity).toBe('Pune');
    expect(profData.citizen.currentState).toBe('Maharashtra');

    // Transitions table should have 0 records for Aarav
    const transitions = await db
      .select()
      .from(schema.citizenStateTransitions)
      .where(eq(schema.citizenStateTransitions.citizenId, AARAV_PATEL_ID));
    expect(transitions.length).toBe(0);

    // Account remains active and password still works
    const reLogin = await loginAsAarav();
    expect(reLogin.token).toBeDefined();
  });

  it('2. Resetting Aarav leaves Priya completely untouched', async () => {
    const aaravAuth = await loginAsAarav();
    const priyaAuth = await loginAsPriya();

    // Verify Priya initial state
    const priyaProfBefore = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      cookies: { [SESSION_COOKIE_NAME]: priyaAuth.token },
    });
    const priyaBeforeData = JSON.parse(priyaProfBefore.body);
    expect(priyaBeforeData.citizen.primaryName).toBe('Priya Sharma');
    expect(priyaBeforeData.citizen.currentCity).toBe('Bengaluru');

    // Reset Aarav
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/citizen/reset-workspace',
      cookies: { [SESSION_COOKIE_NAME]: aaravAuth.token },
    });
    expect(resetRes.statusCode).toBe(200);

    // Verify Priya is completely intact
    const priyaProfAfter = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      cookies: { [SESSION_COOKIE_NAME]: priyaAuth.token },
    });
    const priyaAfterData = JSON.parse(priyaProfAfter.body);
    expect(priyaAfterData.citizen.primaryName).toBe('Priya Sharma');
    expect(priyaAfterData.citizen.currentCity).toBe('Bengaluru');
    expect(priyaAfterData.credentials.length).toBeGreaterThanOrEqual(4);
  });

  it('3. Cross-citizen boundary: Aarav cannot pass Priya citizenId to reset', async () => {
    const aaravAuth = await loginAsAarav();

    // Tampering attempt
    const tamperedRes = await app.inject({
      method: 'POST',
      url: '/api/citizen/reset-workspace',
      cookies: { [SESSION_COOKIE_NAME]: aaravAuth.token },
      payload: {
        citizenId: PRIYA_SHARMA_ID,
      },
    });

    expect(tamperedRes.statusCode).toBe(403);
    const body = JSON.parse(tamperedRes.body);
    expect(body.code).toBe('TENANT_BOUNDARY_VIOLATION');
  });

  it('4. Successfully resets Priya workspace to clean baseline', async () => {
    const { token } = await loginAsPriya();

    // Mutate Priya city
    const db = await getDb();
    await db
      .update(schema.citizens)
      .set({ currentCity: 'Mumbai', currentState: 'Maharashtra' })
      .where(eq(schema.citizens.id, PRIYA_SHARMA_ID));

    // Reset Priya
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/citizen/reset-workspace',
      cookies: { [SESSION_COOKIE_NAME]: token },
    });
    expect(resetRes.statusCode).toBe(200);

    // Verify Priya is back to Bengaluru
    const profRes = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      cookies: { [SESSION_COOKIE_NAME]: token },
    });
    const prof = JSON.parse(profRes.body);
    expect(prof.citizen.currentCity).toBe('Bengaluru');
    expect(prof.citizen.currentState).toBe('Karnataka');
  });
});
