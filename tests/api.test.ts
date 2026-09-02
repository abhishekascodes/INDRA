import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildApp } from '../apps/api/src/server.js';
import { PRIYA_SHARMA_ID, resetDatabase } from '@indra/database';

describe('Fastify API Endpoint Integration', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('GET /api/health returns healthy system status and catalog count', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body.registeredCapabilitiesCount).toBeGreaterThanOrEqual(8);
    expect(body.registeredWorkflowsCount).toBeGreaterThanOrEqual(4);
  });

  it('GET /api/citizen/me returns Priya Sharma profile and credentials', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.profile.primaryName).toBe('Priya Sharma');
    expect(body.credentials.length).toBeGreaterThanOrEqual(5);
    expect(body.epfoAccounts.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/citizen/inbox returns government inbox action items', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/citizen/inbox',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeGreaterThanOrEqual(2);
    expect(body.items[0].whatHappened).toBeDefined();
    expect(body.items[0].whatToDo).toBeDefined();
  });

  it('POST /api/intent/resolve returns structured intent and matching workflow', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/intent/resolve',
      payload: {
        query: 'I want to start a company',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.intentId).toBe('START_BUSINESS');
    expect(body.matchedWorkflowCode).toBe('START_BUSINESS');
  });

  it('POST /api/workflows/start begins a stateful workflow', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      payload: {
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.workflowCode).toBe('RECOVER_DORMANT_PF');
    expect(body.state).toBe('AWAITING_AUTHORIZATION');
  });
});
