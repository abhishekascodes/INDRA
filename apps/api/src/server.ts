import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { getDb, schema, seedDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import { eq, desc } from 'drizzle-orm';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import { WorkflowRegistry, WorkflowRunner, registerDefaultWorkflows } from '@indra/workflow-engine';
import { IntentEngine } from '@indra/intent-engine';
import { EventBus } from '@indra/event-bus';
import { synthesizeRelocationImpact } from '@indra/policy-engine';

const intentEngine = new IntentEngine();
const workflowRunner = new WorkflowRunner();
const eventBus = EventBus.getInstance();

export function getAuthenticatedCitizenId(request: any): string {
  const citizenIdHeader = request.headers['x-citizen-id'] as string;
  return citizenIdHeader || PRIYA_SHARMA_ID;
}

export async function buildApp() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await server.register(cors, {
    origin: true, // Allow frontend during development
    credentials: true,
  });

  // Initialize registries and database
  registerDefaultCapabilities();
  registerDefaultWorkflows();
  await seedDatabase();

  // 1. Health Check
  server.get('/api/health', async () => {
    const capList = CapabilityRegistry.getInstance().list();
    const wfList = WorkflowRegistry.getInstance().list();

    return {
      status: 'healthy',
      system: 'INDRA Universal Public Operating Layer',
      environment: 'synthetic-public-service-demonstration',
      disclaimer: 'This is an isolated synthetic evaluation environment. Not connected to live production government infrastructure.',
      database: 'connected (PostgreSQL-compatible PGlite)',
      registeredCapabilitiesCount: capList.length,
      registeredWorkflowsCount: wfList.length,
      capabilities: capList,
      workflows: wfList,
    };
  });

  // 2. Citizen Profile (Scoped to authenticated citizen)
  server.get('/api/citizen/me', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    const citizens = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, authCitizenId));

    if (citizens.length === 0) {
      return reply.status(404).send({ error: 'Citizen not found' });
    }

    const citizen = citizens[0];
    const credentials = await db
      .select()
      .from(schema.citizenCredentials)
      .where(eq(schema.citizenCredentials.citizenId, authCitizenId));

    const addresses = await db
      .select()
      .from(schema.citizenAddresses)
      .where(eq(schema.citizenAddresses.citizenId, authCitizenId));

    const epfo = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(eq(schema.spiEpfoAccounts.citizenId, authCitizenId));

    return {
      profile: citizen,
      citizen,
      credentials: credentials.map((c) => ({
        type: c.type,
        identifierMasked: c.identifierMasked,
        status: c.status,
        issuedDate: c.issuedDate,
        expiryDate: c.expiryDate,
        metadata: c.metadata,
      })),
      primaryAddress: addresses[0] || null,
      epfoAccounts: epfo.map((e) => ({
        memberId: e.memberId,
        establishmentName: e.establishmentName,
        status: e.status,
        pfBalance: e.pfBalance,
      })),
    };
  });

  // 3. Government Action Inbox (Scoped)
  server.get('/api/citizen/inbox', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    const items = await db
      .select()
      .from(schema.governmentInbox)
      .where(eq(schema.governmentInbox.citizenId, authCitizenId))
      .orderBy(desc(schema.governmentInbox.createdAt));

    return { items };
  });

  // 4. Verifiable Documents Vault (Scoped)
  server.get('/api/citizen/vault', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    const docs = await db
      .select()
      .from(schema.citizenDocuments)
      .where(eq(schema.citizenDocuments.citizenId, authCitizenId))
      .orderBy(desc(schema.citizenDocuments.createdAt));

    return { documents: docs };
  });

  // 5. Intent Understanding Endpoint (Async Dual-Path with LLM Fallback)
  server.post<{ Body: { query: string } }>('/api/intent/resolve', async (request, reply) => {
    const { query } = request.body || {};
    if (!query) {
      return reply.status(400).send({ error: 'Query is required' });
    }

    const resolved = await intentEngine.resolveAsync(query);
    return resolved;
  });

  // 5b. Citizen Applications Tracker
  server.get('/api/applications', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    const apps = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.citizenId, authCitizenId))
      .orderBy(desc(schema.applications.submittedAt));

    return { applications: apps };
  });

  // 5c. Trust & Privacy: Audit Logs
  server.get('/api/trust/audit-logs', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.citizenId, authCitizenId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(25);

    return { logs };
  });

  // 5d. Trust & Privacy: Consents
  server.get('/api/trust/consents', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    const userConsents = await db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.citizenId, authCitizenId))
      .orderBy(desc(schema.consents.grantedAt));

    return { consents: userConsents };
  });

  // 5e. Life-Event: Dynamic Relocation Impact Synthesis
  server.post<{
    Body: { destinationCity?: string; destinationState?: string };
  }>('/api/citizen/life-events/relocation-impact', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { destinationCity, destinationState } = request.body || {};

    try {
      const impact = await synthesizeRelocationImpact(
        authCitizenId,
        destinationCity || 'Bengaluru',
        destinationState || 'Karnataka'
      );
      return impact;
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: err.message || 'Failed to synthesize relocation impact' });
    }
  });

  // 5f. List available synthetic citizens for demonstration inspection
  server.get('/api/citizens/synthetic-list', async () => {
    const db = await getDb();
    const allCitizens = await db.select().from(schema.citizens);
    return {
      citizens: allCitizens.map((c) => ({
        id: c.id,
        primaryName: c.primaryName,
        currentCity: c.currentCity,
        currentState: c.currentState,
      })),
    };
  });

  // 6. Start Workflow (Enforcing citizen scoping)
  server.post<{
    Body: { workflowCode: string; citizenId?: string; initialContext?: Record<string, unknown> };
  }>('/api/workflows/start', async (request, reply) => {
    const { workflowCode, citizenId, initialContext } = request.body || {};
    if (!workflowCode) {
      return reply.status(400).send({ error: 'workflowCode is required' });
    }

    const authCitizenId = getAuthenticatedCitizenId(request);
    if (citizenId && citizenId !== authCitizenId) {
      return reply.status(403).send({ error: 'Forbidden: Cannot start workflow for another citizen' });
    }

    const targetCitizenId = citizenId || authCitizenId;
    try {
      const summary = await workflowRunner.startWorkflow({
        workflowCode,
        citizenId: targetCitizenId,
        initialContext: initialContext || {},
      });
      return summary;
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: err?.message || 'Failed to start workflow' });
    }
  });

  // 7. Get Workflow Run (Enforcing citizen scoping)
  server.get<{ Params: { id: string } }>('/api/workflows/:id', async (request, reply) => {
    const { id } = request.params;
    const summary = await workflowRunner.getWorkflowRun(id);
    if (!summary) {
      return reply.status(404).send({ error: 'Workflow run not found' });
    }

    const authCitizenId = getAuthenticatedCitizenId(request);
    if (summary.citizenId !== authCitizenId) {
      return reply.status(403).send({ error: 'Forbidden: Access to workflow run denied' });
    }

    return summary;
  });

  // 8. Resume Workflow (Enforcing citizen scoping)
  server.post<{
    Params: { id: string };
    Body: { input?: Record<string, unknown>; authorize?: boolean };
  }>('/api/workflows/:id/resume', async (request, reply) => {
    const { id } = request.params;
    const { input, authorize } = request.body || {};

    const existing = await workflowRunner.getWorkflowRun(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Workflow run not found' });
    }

    const authCitizenId = getAuthenticatedCitizenId(request);
    if (existing.citizenId !== authCitizenId) {
      return reply.status(403).send({ error: 'Forbidden: Cannot resume another citizen\'s workflow' });
    }

    if (existing.state === 'COMPLETED' || existing.state === 'FAILED') {
      return reply.status(409).send({
        error: `Conflict: Workflow run '${id}' is already in terminal state '${existing.state}'`,
      });
    }

    try {
      const summary = await workflowRunner.resumeWorkflow({
        workflowRunId: id,
        input,
        authorize,
      });
      return summary;
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: err?.message || 'Failed to resume workflow' });
    }
  });

  // 9. Server-Sent Events (SSE) Stream
  server.get('/api/events/stream', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    reply.raw.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE stream active' })}\n\n`);

    const unsubscribe = eventBus.subscribe('*', (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    request.raw.on('close', () => {
      unsubscribe();
    });
  });

  // 10. Serve built frontend web app if available
  let curr = process.cwd();
  let webDistPath = path.resolve(curr, 'apps', 'web', 'dist');
  if (!fs.existsSync(webDistPath)) {
    webDistPath = path.resolve(curr, '..', 'web', 'dist');
  }
  if (fs.existsSync(webDistPath)) {
    await server.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    });
    server.get('/*', async (request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return server;
}

// Auto-start server if executed directly
if (process.argv[1]?.includes('server')) {
  buildApp().then(async (app) => {
    const port = Number(process.env.PORT) || 4000;
    try {
      await app.listen({ port, host: '0.0.0.0' });
      console.log(`[INDRA API] Server live on http://localhost:${port}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
