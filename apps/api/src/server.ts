import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getDb, schema, seedDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import { eq, desc } from 'drizzle-orm';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import { WorkflowRegistry, WorkflowRunner, registerDefaultWorkflows } from '@indra/workflow-engine';
import { IntentEngine } from '@indra/intent-engine';
import { EventBus } from '@indra/event-bus';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const intentEngine = new IntentEngine();
const workflowRunner = new WorkflowRunner();
const eventBus = EventBus.getInstance();

export async function buildApp() {
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
    const db = await getDb();
    const capList = CapabilityRegistry.getInstance().list();
    const wfList = WorkflowRegistry.getInstance().list();

    return {
      status: 'healthy',
      system: 'INDRA Universal Public Operating Layer',
      database: 'connected (PostgreSQL-compatible PGlite)',
      registeredCapabilitiesCount: capList.length,
      registeredWorkflowsCount: wfList.length,
      capabilities: capList,
      workflows: wfList,
    };
  });

  // 2. Citizen Profile (Priya Sharma)
  server.get('/api/citizen/me', async () => {
    const db = await getDb();
    const citizens = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, PRIYA_SHARMA_ID));

    if (citizens.length === 0) {
      return { error: 'Citizen not found' };
    }

    const citizen = citizens[0];
    const credentials = await db
      .select()
      .from(schema.citizenCredentials)
      .where(eq(schema.citizenCredentials.citizenId, PRIYA_SHARMA_ID));

    const addresses = await db
      .select()
      .from(schema.citizenAddresses)
      .where(eq(schema.citizenAddresses.citizenId, PRIYA_SHARMA_ID));

    const epfo = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(eq(schema.spiEpfoAccounts.citizenId, PRIYA_SHARMA_ID));

    return {
      profile: citizen,
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

  // 3. Government Action Inbox
  server.get('/api/citizen/inbox', async () => {
    const db = await getDb();
    const items = await db
      .select()
      .from(schema.governmentInbox)
      .where(eq(schema.governmentInbox.citizenId, PRIYA_SHARMA_ID))
      .orderBy(desc(schema.governmentInbox.createdAt));

    return { items };
  });

  // 4. Verifiable Documents Vault
  server.get('/api/citizen/vault', async () => {
    const db = await getDb();
    const docs = await db
      .select()
      .from(schema.citizenDocuments)
      .where(eq(schema.citizenDocuments.citizenId, PRIYA_SHARMA_ID))
      .orderBy(desc(schema.citizenDocuments.createdAt));

    return { documents: docs };
  });

  // 5. Intent Understanding Endpoint
  server.post<{ Body: { query: string } }>('/api/intent/resolve', async (request, reply) => {
    const { query } = request.body || {};
    if (!query) {
      return reply.status(400).send({ error: 'Query is required' });
    }

    const resolved = intentEngine.resolve(query);
    return resolved;
  });

  // 6. Start Workflow
  server.post<{
    Body: { workflowCode: string; citizenId?: string; initialContext?: Record<string, unknown> };
  }>('/api/workflows/start', async (request, reply) => {
    const { workflowCode, citizenId, initialContext } = request.body || {};
    if (!workflowCode) {
      return reply.status(400).send({ error: 'workflowCode is required' });
    }

    const targetCitizenId = citizenId || PRIYA_SHARMA_ID;
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

  // 7. Get Workflow Run
  server.get<{ Params: { id: string } }>('/api/workflows/:id', async (request, reply) => {
    const { id } = request.params;
    const summary = await workflowRunner.getWorkflowRun(id);
    if (!summary) {
      return reply.status(404).send({ error: 'Workflow run not found' });
    }
    return summary;
  });

  // 8. Resume Workflow (Submit input or Authorize)
  server.post<{
    Params: { id: string };
    Body: { input?: Record<string, unknown>; authorize?: boolean };
  }>('/api/workflows/:id/resume', async (request, reply) => {
    const { id } = request.params;
    const { input, authorize } = request.body || {};

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
