import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildApp } from '../apps/api/src/server.js';
import { PRIYA_SHARMA_ID, resetDatabase } from '@indra/database';

describe('Fastify API Endpoint & Citizen-Scoping Integration Suite', () => {
  let app: any;
  const OTHER_CITIZEN_ID = '11111111-2222-3333-4444-555555555555';

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
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.profile.primaryName).toBe('Priya Sharma');
    expect(body.credentials.length).toBeGreaterThanOrEqual(5);
    expect(body.epfoAccounts.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/citizen/me returns 404 for unknown citizen', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/citizen/me',
      headers: { 'x-citizen-id': OTHER_CITIZEN_ID },
    });

    expect(res.statusCode).toBe(404);
  });

  it('GET /api/citizen/inbox returns government inbox action items', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/citizen/inbox',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
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

  it('POST /api/intent/resolve returns 400 when query is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/intent/resolve',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/workflows/start begins a stateful workflow', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
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

  it('POST /api/workflows/start returns 400 when workflowCode is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      payload: { citizenId: PRIYA_SHARMA_ID },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ENFORCES citizen-scoping boundary: blocks starting workflow for another citizen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      payload: {
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: OTHER_CITIZEN_ID, // Mismatched citizenId
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Forbidden');
  });

  it('ENFORCES citizen-scoping boundary: blocks viewing another citizen workflow run', async () => {
    // 1. Start workflow as Priya
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      payload: {
        workflowCode: 'RECOVER_DORMANT_PF',
      },
    });

    const runId = JSON.parse(startRes.body).id;

    // 2. Try to view as another citizen -> 403 Forbidden
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/workflows/${runId}`,
      headers: { 'x-citizen-id': OTHER_CITIZEN_ID },
    });

    expect(getRes.statusCode).toBe(403);
  });

  it('ENFORCES citizen-scoping boundary: blocks resuming another citizen workflow run', async () => {
    // 1. Start workflow as Priya
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/workflows/start',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      payload: {
        workflowCode: 'RECOVER_DORMANT_PF',
      },
    });

    const runId = JSON.parse(startRes.body).id;

    // 2. Try to resume as another citizen -> 403 Forbidden
    const resumeRes = await app.inject({
      method: 'POST',
      url: `/api/workflows/${runId}/resume`,
      headers: { 'x-citizen-id': OTHER_CITIZEN_ID },
      payload: { authorize: true },
    });

    expect(resumeRes.statusCode).toBe(403);
  });

  it('GET /api/workflows/:id returns 404 for non-existent run', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/workflows/00000000-0000-0000-0000-000000000000',
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });

    expect(res.statusCode).toBe(404);
  });
});
