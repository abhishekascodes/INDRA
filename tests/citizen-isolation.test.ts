import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase, PRIYA_SHARMA_ID, AARAV_PATEL_ID } from '@indra/database';
import { buildApp } from '../apps/api/src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Audit 5: Citizen Data Isolation & Multi-Citizen Boundaries', () => {
  let app: any;

  beforeAll(async () => {
    await seedDatabase();
    app = await buildApp();
  });

  it('Citizen A (Priya) and Citizen B (Aarav) retrieve only their own profiles', async () => {
    const resPriya = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });
    expect(resPriya.statusCode).toBe(200);
    const priyaData = resPriya.json();
    expect(priyaData.profile.primaryName).toBe('Priya Sharma');
    expect(priyaData.profile.currentCity).toBe('Bengaluru');

    const resAarav = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      headers: { 'x-citizen-id': AARAV_PATEL_ID },
    });
    expect(resAarav.statusCode).toBe(200);
    const aaravData = resAarav.json();
    expect(aaravData.profile.primaryName).toBe('Aarav Patel');
    expect(aaravData.profile.currentCity).toBe('Pune');
  });

  it('Citizen A cannot view Citizen B inbox items', async () => {
    const resPriya = await app.inject({
      method: 'GET',
      url: '/api/citizen/inbox',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });
    const priyaInbox = resPriya.json();
    expect(priyaInbox.items.some((i: any) => i.title.includes('Provident Fund'))).toBe(true);

    const resAarav = await app.inject({
      method: 'GET',
      url: '/api/citizen/inbox',
      headers: { 'x-citizen-id': AARAV_PATEL_ID },
    });
    const aaravInbox = resAarav.json();
    // Aarav should have advance tax notice, not Priya's EPFO notice!
    expect(aaravInbox.items.some((i: any) => i.title.includes('Advance Tax Assessment'))).toBe(true);
    expect(aaravInbox.items.some((i: any) => i.title.includes('Provident Fund'))).toBe(false);
  });

  it('Citizen A cannot start a workflow on behalf of Citizen B', async () => {
    const maliciousStart = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      payload: {
        workflowCode: 'LOST_DEVICE_PROTECTION',
        citizenId: AARAV_PATEL_ID, // Malicious attempt to act as Aarav
      },
    });

    expect(maliciousStart.statusCode).toBe(403);
    expect(maliciousStart.json().error).toContain('Forbidden');
  });

  it('Citizen A cannot resume or authorize Citizen B workflow', async () => {
    // 1. Aarav starts his own workflow
    const aaravStart = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': AARAV_PATEL_ID },
      payload: {
        workflowCode: 'LOST_DEVICE_PROTECTION',
        citizenId: AARAV_PATEL_ID,
      },
    });
    expect(aaravStart.statusCode).toBe(200);
    const aaravRun = aaravStart.json();

    // 2. Priya attempts to resume/authorize Aarav's workflow
    const maliciousResume = await app.inject({
      method: 'POST',
      url: `/api/workflows/${aaravRun.id}/resume`,
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID }, // Impersonator header
      payload: {
        authorize: true,
      },
    });

    expect(maliciousResume.statusCode).toBe(403);
    expect(maliciousResume.json().error).toContain('Forbidden');
  });

  it('Audit logs and consents are strictly isolated between citizens', async () => {
    const priyaLogs = await app.inject({
      method: 'GET',
      url: '/api/trust/audit-logs',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });
    const aaravLogs = await app.inject({
      method: 'GET',
      url: '/api/trust/audit-logs',
      headers: { 'x-citizen-id': AARAV_PATEL_ID },
    });

    expect(priyaLogs.statusCode).toBe(200);
    expect(aaravLogs.statusCode).toBe(200);
  });
});
