import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getDb, schema, seedDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import { eq, desc, and } from 'drizzle-orm';
import {
  CapabilityRegistry,
  CapabilityExecutor,
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import {
  WorkflowRegistry,
  WorkflowRunner,
  ReviewManager,
  TransitionExecutor,
  registerDefaultWorkflows,
} from '@indra/workflow-engine';
import { PropertySpiAdapter } from '@indra/spi-adapters';
import { IntentEngine } from '@indra/intent-engine';
import { EventBus } from '@indra/event-bus';
import {
  synthesizeRelocationImpact,
  CitizenWorldModelService,
  ActionPlanEngine,
  ProactiveCitizenEngine,
  ActionCenterService,
} from '@indra/policy-engine';


const intentEngine = new IntentEngine();
const workflowRunner = new WorkflowRunner();
const capabilityExecutor = new CapabilityExecutor();
const transitionExecutor = TransitionExecutor.getInstance();
const propertySpiAdapter = PropertySpiAdapter.getInstance();
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
  ActionPlanEngine.getInstance().setStepExecutor(capabilityExecutor);
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

  // 4b. Aggregated Citizen World Model (Scoped)
  server.get('/api/citizen/world-model', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    try {
      const worldModel = await CitizenWorldModelService.getInstance().getWorldModel(authCitizenId);
      return { success: true, worldModel };
    } catch (err: any) {
      if (err.message?.includes('does not exist')) {
        return reply.status(404).send({ error: err.message });
      }
      throw err;
    }
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

  // 8c. Get Active Review Session for Workflow Step
  server.get<{ Params: { id: string } }>('/api/workflows/:id/review', async (request, reply) => {
    const { id } = request.params;
    const authCitizenId = getAuthenticatedCitizenId(request);

    const existing = await workflowRunner.getWorkflowRun(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Workflow run not found' });
    }

    if (existing.citizenId !== authCitizenId) {
      return reply.status(403).send({ error: 'Forbidden: Access to workflow run denied' });
    }

    const workflow = WorkflowRegistry.getInstance().get(existing.workflowCode);
    if (!workflow) {
      return reply.status(404).send({ error: `Workflow '${existing.workflowCode}' not registered` });
    }

    try {
      const reviewSession = await ReviewManager.getInstance().getOrCreateReviewSession(
        id,
        authCitizenId,
        workflow
      );
      return reviewSession;
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: err?.message || 'Failed to retrieve review session' });
    }
  });

  // 8d. Edit Review Session Field (Revalidation & Dependency Recomputation)
  server.post<{
    Params: { id: string };
    Body: { reviewSessionId: string; fieldKey: string; newValue: any };
  }>('/api/workflows/:id/review/edit', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { reviewSessionId, fieldKey, newValue } = request.body || {};

    if (!reviewSessionId || !fieldKey) {
      return reply.status(400).send({ error: 'reviewSessionId and fieldKey are required' });
    }

    try {
      const updated = await ReviewManager.getInstance().editReviewField(
        reviewSessionId,
        authCitizenId,
        fieldKey,
        newValue
      );
      return updated;
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: err.message });
      }
      if (err.message?.includes('Forbidden') || err.message?.includes('unauthorized')) {
        return reply.status(403).send({ error: err.message });
      }
      return reply.status(400).send({ error: err?.message || 'Failed to edit review field' });
    }
  });

  // 8e. Authorize Review Session (Generates Cryptographic Authorization Token)
  server.post<{
    Params: { id: string };
    Body: { reviewSessionId: string; payloadHash: string; acceptedDeclarationIds?: string[] };
  }>('/api/workflows/:id/authorize', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { reviewSessionId, payloadHash, acceptedDeclarationIds } = request.body || {};

    if (!reviewSessionId || !payloadHash) {
      return reply.status(400).send({ error: 'reviewSessionId and payloadHash are required' });
    }

    try {
      const result = await ReviewManager.getInstance().authorizeReviewSession(
        reviewSessionId,
        authCitizenId,
        payloadHash,
        acceptedDeclarationIds || []
      );
      return result;
    } catch (err: any) {
      if (err.message?.includes('STALE_REVIEW_STATE')) {
        return reply.status(409).send({ error: err.message, code: 'STALE_REVIEW_STATE' });
      }
      if (err.message?.includes('unauthorized') || err.message?.includes('Forbidden')) {
        return reply.status(403).send({ error: err.message });
      }
      return reply.status(400).send({ error: err?.message || 'Authorization failed' });
    }
  });

  // 8f. Execute Authorized Step (Verifies Payload Hash & Consumes Authorization Token)
  server.post<{
    Params: { id: string };
    Body: { authorizationToken: string };
  }>('/api/workflows/:id/execute', async (request, reply) => {
    const { id } = request.params;
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { authorizationToken } = request.body || {};

    if (!authorizationToken) {
      return reply.status(400).send({ error: 'authorizationToken is required' });
    }

    const existing = await workflowRunner.getWorkflowRun(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Workflow run not found' });
    }

    if (existing.citizenId !== authCitizenId) {
      return reply.status(403).send({ error: 'Forbidden: Access to workflow run denied' });
    }

    try {
      const summary = await workflowRunner.resumeWorkflow({
        workflowRunId: id,
        authorizationToken,
      });
      return summary;
    } catch (err: any) {
      if (err.message?.includes('STALE_REVIEW_STATE')) {
        return reply.status(409).send({ error: err.message, code: 'STALE_REVIEW_STATE' });
      }
      if (err.message?.includes('INVALID_TOKEN') || err.message?.includes('TOKEN_EXPIRED')) {
        return reply.status(401).send({ error: err.message, code: 'INVALID_TOKEN' });
      }
      if (err.message?.includes('Forbidden') || err.message?.includes('unauthorized')) {
        return reply.status(403).send({ error: err.message });
      }
      return reply.status(400).send({ error: err?.message || 'Execution failed' });
    }
  });

  // 8g. Capabilities Catalog (Universe Inspection)
  server.get('/api/capabilities', async () => {
    const registry = CapabilityRegistry.getInstance();
    const list = registry.getAll().map((c) => ({
      id: c.id,
      version: c.version,
      domain: c.domain,
      humanName: c.humanName,
      description: c.description,
      sideEffectClass: c.sideEffectClass,
      requiresHumanAuthorization: c.requiresHumanAuthorization,
      requiredPermissions: c.requiredPermissions || [],
    }));
    return { count: list.length, capabilities: list };
  });

  // 8c. Execute Capability Directly (Scoped with Safety Boundaries)
  server.post<{
    Body: { capabilityId: string; input: Record<string, unknown>; authorize?: boolean };
  }>('/api/capabilities/execute', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { capabilityId, input, authorize } = request.body || {};

    if (!capabilityId) {
      return reply.status(400).send({ error: 'capabilityId is required' });
    }

    const result = await capabilityExecutor.execute({
      capabilityId,
      input: { ...input, citizenId: authCitizenId },
      context: {
        citizenId: authCitizenId,
        authorizationGranted: authorize ?? false,
      },
    });

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return result;
  });

  // 8d. Action Plans - List for Citizen
  server.get('/api/citizen/action-plans', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const plans = await ActionPlanEngine.getInstance().listActionPlans(authCitizenId);
    return { count: plans.length, plans };
  });

  // 8e. Action Plans - Get Plan Detail by ID
  server.get<{ Params: { id: string } }>('/api/citizen/action-plans/:id', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    try {
      const plan = await ActionPlanEngine.getInstance().getActionPlan(id, authCitizenId);
      if (!plan) {
        return reply.status(404).send({ error: 'Action plan not found' });
      }
      return { success: true, plan };
    } catch (err: any) {
      return reply.status(403).send({ error: err?.message || 'Access denied' });
    }
  });

  // 8f. Action Plans - Generate Plan for Life Event
  server.post<{
    Body: {
      lifeEventCode: string;
      context?: Record<string, unknown>;
      omittedStepKeys?: string[];
      forceRecreate?: boolean;
    };
  }>('/api/citizen/action-plans/generate', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { lifeEventCode, context, omittedStepKeys, forceRecreate } = request.body || {};

    if (!lifeEventCode) {
      return reply.status(400).send({ error: 'lifeEventCode is required' });
    }

    try {
      const plan = await ActionPlanEngine.getInstance().generateActionPlan(
        authCitizenId,
        lifeEventCode as any,
        context || {},
        { omittedStepKeys, forceRecreate }
      );
      return { success: true, plan };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to generate action plan' });
    }
  });

  // 8g. Action Plans - Execute Step
  server.post<{
    Params: { id: string };
    Body: { stepKey: string; authorize?: boolean; overrideInput?: Record<string, unknown> };
  }>('/api/citizen/action-plans/:id/execute-step', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { stepKey, authorize, overrideInput } = request.body || {};

    if (!stepKey) {
      return reply.status(400).send({ error: 'stepKey is required' });
    }

    try {
      const result = await ActionPlanEngine.getInstance().executeStep({
        planId: id,
        stepKey,
        citizenId: authCitizenId,
        authorize: authorize ?? false,
        overrideInput,
      });

      if (!result.success) {
        return reply.status(400).send({ error: result.error, plan: result.actionPlan, step: result.executedStep });
      }

      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to execute plan step' });
    }
  });

  // 8h. Action Plans - Skip/Omit Step (Partial Plan Customization)
  server.post<{
    Params: { id: string };
    Body: { stepKey: string; reason?: string };
  }>('/api/citizen/action-plans/:id/skip-step', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { stepKey, reason } = request.body || {};

    if (!stepKey) {
      return reply.status(400).send({ error: 'stepKey is required' });
    }

    try {
      const result = await ActionPlanEngine.getInstance().skipStep({
        planId: id,
        stepKey,
        citizenId: authCitizenId,
        reason,
      });
      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to skip step' });
    }
  });

  // 8i. Action Plans - Compensate/Rollback Plan
  server.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>('/api/citizen/action-plans/:id/compensate', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { reason } = request.body || {};

    try {
      const result = await ActionPlanEngine.getInstance().compensatePlan({
        planId: id,
        citizenId: authCitizenId,
        reason: reason || 'Citizen requested plan rollback',
      });
      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to compensate plan' });
    }
  });

  // 8h. Proactive Findings - List
  server.get<{
    Querystring: { status?: string; category?: string };
  }>('/api/citizen/proactive-findings', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { status, category } = request.query || {};
    const proactiveEngine = ProactiveCitizenEngine.getInstance();

    await proactiveEngine.scanCitizen(authCitizenId, 'MANUAL_REFRESH');
    const findings = await proactiveEngine.listFindings(authCitizenId, {
      status: (status as any) || 'ACTIVE',
      category: category as any,
    });

    const criticalCount = findings.filter((f) => f.urgency === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.urgency === 'HIGH').length;
    const mediumCount = findings.filter((f) => f.urgency === 'MEDIUM').length;
    const lowCount = findings.filter((f) => f.urgency === 'LOW').length;

    return {
      count: findings.length,
      summary: { criticalCount, highCount, mediumCount, lowCount },
      findings,
    };
  });

  // Alias /api/citizen/proactive/findings
  server.get<{
    Querystring: { status?: string; category?: string };
  }>('/api/citizen/proactive/findings', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { status, category } = request.query || {};
    const proactiveEngine = ProactiveCitizenEngine.getInstance();

    await proactiveEngine.scanCitizen(authCitizenId, 'MANUAL_REFRESH');
    const findings = await proactiveEngine.listFindings(authCitizenId, {
      status: (status as any) || 'ACTIVE',
      category: category as any,
    });

    const criticalCount = findings.filter((f) => f.urgency === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.urgency === 'HIGH').length;
    const mediumCount = findings.filter((f) => f.urgency === 'MEDIUM').length;
    const lowCount = findings.filter((f) => f.urgency === 'LOW').length;

    return {
      count: findings.length,
      summary: { criticalCount, highCount, mediumCount, lowCount },
      findings,
    };
  });

  // 8i. Proactive Findings - Dismiss
  server.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>('/api/citizen/proactive-findings/:id/dismiss', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { reason } = request.body || {};
    const dismissed = await ProactiveCitizenEngine.getInstance().dismissFinding(id, authCitizenId, reason);
    if (dismissed) {
      eventBus.publish({
        eventId: crypto.randomUUID(),
        eventType: 'GOVERNMENT_INBOX_UPDATED',
        citizenId: authCitizenId,
        aggregateType: 'CITIZEN',
        aggregateId: id,
        payload: { findingId: id, action: 'DISMISSED' },
        provenance: {
          source: 'AUTOMATED_RULE',
          correlationId: crypto.randomUUID(),
        },
        timestamp: new Date().toISOString(),
      });
    }
    return { success: dismissed };
  });

  // 8j. Proactive Findings - Snooze
  server.post<{
    Params: { id: string };
    Body: { days?: number };
  }>('/api/citizen/proactive-findings/:id/snooze', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { days } = request.body || {};
    const snoozed = await ProactiveCitizenEngine.getInstance().snoozeFinding(id, authCitizenId, days ?? 7);
    if (snoozed) {
      eventBus.publish({
        eventId: crypto.randomUUID(),
        eventType: 'GOVERNMENT_INBOX_UPDATED',
        citizenId: authCitizenId,
        aggregateType: 'CITIZEN',
        aggregateId: id,
        payload: { findingId: id, days: days ?? 7, action: 'SNOOZED' },
        provenance: {
          source: 'AUTOMATED_RULE',
          correlationId: crypto.randomUUID(),
        },
        timestamp: new Date().toISOString(),
      });
    }
    return { success: snoozed };
  });

  // 8k. Proactive Findings - Manual Trigger Scan
  server.post('/api/citizen/proactive-findings/scan', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const summary = await ProactiveCitizenEngine.getInstance().scanCitizen(authCitizenId, 'MANUAL_REFRESH');
    eventBus.publish({
      eventId: crypto.randomUUID(),
      eventType: 'GOVERNMENT_INBOX_UPDATED',
      citizenId: authCitizenId,
      aggregateType: 'CITIZEN',
      aggregateId: authCitizenId,
      payload: { summary },
      provenance: {
        source: 'AUTOMATED_RULE',
        correlationId: crypto.randomUUID(),
      },
      timestamp: new Date().toISOString(),
    });
    return summary;
  });

  // 8l. Proactive Findings - Launch Authoritative Action
  server.post<{ Params: { id: string } }>(
    '/api/citizen/proactive-findings/:id/launch',
    async (request, reply) => {
      const authCitizenId = getAuthenticatedCitizenId(request);
      const { id } = request.params;
      try {
        const result = await ProactiveCitizenEngine.getInstance().launchFindingAction(
          id,
          authCitizenId
        );
        eventBus.publish({
          eventId: crypto.randomUUID(),
          eventType: 'GOVERNMENT_INBOX_UPDATED',
          citizenId: authCitizenId,
          aggregateType: 'CITIZEN',
          aggregateId: id,
          payload: { findingId: id, action: 'LAUNCHED', actionLink: result.actionLink },
          provenance: {
            source: 'AUTOMATED_RULE',
            correlationId: crypto.randomUUID(),
          },
          timestamp: new Date().toISOString(),
        });
        return result;
      } catch (err: any) {
        return reply.status(400).send({ error: err?.message || 'Failed to launch finding action' });
      }
    }
  );

  // 8m. Action Center Feed (Phase 3.5)
  server.get('/api/citizen/action-center', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    return ActionCenterService.getInstance().getActionCenterFeed(authCitizenId);
  });

  // 8n. Consent Artifacts - List (Phase 3.5)
  server.get('/api/citizen/consent-artifacts', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const db = await getDb();
    return db
      .select()
      .from(schema.consentArtifacts)
      .where(eq(schema.consentArtifacts.citizenId, authCitizenId))
      .orderBy(desc(schema.consentArtifacts.createdAt));
  });

  // 8o. Consent Artifacts - Revoke (Phase 3.5)
  server.post<{ Params: { id: string } }>(
    '/api/citizen/consent-artifacts/:id/revoke',
    async (request, reply) => {
      const authCitizenId = getAuthenticatedCitizenId(request);
      const { id } = request.params;
      const db = await getDb();

      const existing = await db
        .select()
        .from(schema.consentArtifacts)
        .where(
          and(
            eq(schema.consentArtifacts.id, id),
            eq(schema.consentArtifacts.citizenId, authCitizenId)
          )
        );

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Consent artifact not found or unauthorized' });
      }

      await db
        .update(schema.consentArtifacts)
        .set({
          status: 'REVOKED',
          revokedAt: new Date(),
        })
        .where(eq(schema.consentArtifacts.id, id));

      eventBus.publish({
        eventId: crypto.randomUUID(),
        eventType: 'GOVERNMENT_INBOX_UPDATED',
        citizenId: authCitizenId,
        aggregateType: 'CITIZEN',
        aggregateId: id,
        payload: { consentArtifactId: id, status: 'REVOKED' },
        provenance: {
          source: 'USER_ACTION',
          correlationId: crypto.randomUUID(),
        },
        timestamp: new Date().toISOString(),
      });


      return {
        success: true,
        consentArtifactId: id,
        status: 'REVOKED',
        message: 'Consent artifact successfully revoked under DPDP Act provisions.',
      };
    }
  );

  // =========================================================================
  // CITIZEN STATE-TRANSITION ENGINE API
  // =========================================================================

  // 1. Initiate State Transition
  server.post<{
    Body: { query: string; context?: Record<string, any> };
  }>('/api/transitions/initiate', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { query, context } = request.body || {};
    if (!query) {
      return reply.status(400).send({ error: 'Query is required to initiate state transition' });
    }

    try {
      const transition = await transitionExecutor.initiateTransition({
        citizenId: authCitizenId,
        query,
        context,
      });
      return { success: true, transition };
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: err?.message || 'Failed to initiate transition' });
    }
  });

  // 2. Get State Transition
  server.get<{ Params: { id: string } }>('/api/transitions/:id', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const transition = await transitionExecutor.getTransition(id, authCitizenId);
    if (!transition) {
      return reply.status(404).send({ error: 'State transition not found' });
    }
    return { success: true, transition };
  });

  // 3. List Citizen State Transitions
  server.get('/api/citizen/transitions', async (request) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const transitions = await transitionExecutor.listTransitions(authCitizenId);
    return { count: transitions.length, transitions };
  });

  // 4. Authorize Transition Plan
  server.post<{
    Params: { id: string };
    Body: { token?: string };
  }>('/api/transitions/:id/authorize', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { token } = request.body || {};

    try {
      const updated = await transitionExecutor.authorizeTransition(id, authCitizenId, token);
      return { success: true, transition: updated };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to authorize transition' });
    }
  });

  // 5. Execute Transition Loop
  server.post<{ Params: { id: string } }>('/api/transitions/:id/execute', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;

    try {
      const updated = await transitionExecutor.executeTransitionLoop(id, authCitizenId);
      return { success: true, transition: updated };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to execute transition loop' });
    }
  });

  // 6. Resume Suspended Transition
  server.post<{ Params: { id: string } }>('/api/transitions/:id/resume', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;

    try {
      const updated = await transitionExecutor.resumeTransition(id, authCitizenId);
      return { success: true, transition: updated };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to resume transition' });
    }
  });

  // 7. Resolve Contradiction
  server.post<{
    Params: { id: string };
    Body: { contradictionId: string; action?: 'RESOLVE' | 'OVERRIDE' };
  }>('/api/transitions/:id/resolve-contradiction', async (request, reply) => {
    const authCitizenId = getAuthenticatedCitizenId(request);
    const { id } = request.params;
    const { contradictionId, action } = request.body || {};

    if (!contradictionId) {
      return reply.status(400).send({ error: 'contradictionId is required' });
    }

    try {
      const updated = await transitionExecutor.resolveContradiction(
        id,
        authCitizenId,
        contradictionId,
        action || 'RESOLVE'
      );
      return { success: true, transition: updated };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message || 'Failed to resolve contradiction' });
    }
  });

  // 8. Simulation Fault Injection Controls
  server.post<{
    Body: {
      failNextPropertyRequest?: boolean;
      simulatePropertyOutage?: boolean;
      injectDeedContradiction?: boolean;
      reset?: boolean;
    };
  }>('/api/simulation/fault-injection', async (request) => {
    const { failNextPropertyRequest, simulatePropertyOutage, injectDeedContradiction, reset } =
      request.body || {};

    const db = await getDb();

    let failNext = failNextPropertyRequest ?? false;
    let simOutage = simulatePropertyOutage ?? false;
    let injectContra = injectDeedContradiction ?? true;

    if (reset) {
      failNext = false;
      simOutage = false;
      injectContra = true;
    }

    propertySpiAdapter.setSimulationMode({
      failNextRequest: failNext,
      simulateOutage: simOutage,
    });

    try {
      await db
        .insert(schema.syntheticOutageConfig)
        .values({
          id: 'GLOBAL_SIMULATION_CONFIG',
          failNextPropertyRequest: failNext,
          simulatePropertyOutage: simOutage,
          injectDeedContradiction: injectContra,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.syntheticOutageConfig.id,
          set: {
            failNextPropertyRequest: failNext,
            simulatePropertyOutage: simOutage,
            injectDeedContradiction: injectContra,
            updatedAt: new Date(),
          },
        });
    } catch {
      // ignore
    }

    return {
      success: true,
      simulationConfig: {
        failNextPropertyRequest: failNext,
        simulatePropertyOutage: simOutage,
        injectDeedContradiction: injectContra,
      },
      message: reset
        ? 'Simulation fault injection reset to baseline nominal state.'
        : `Fault injection updated. Outage: ${simOutage}, FailNext: ${failNext}, Contradiction: ${injectContra}`,
    };
  });

  // 9. Simulation Status
  server.get('/api/simulation/status', async () => {
    const mode = propertySpiAdapter.getSimulationMode();
    const db = await getDb();
    let injectContra = true;
    try {
      const configs = await db
        .select()
        .from(schema.syntheticOutageConfig)
        .where(eq(schema.syntheticOutageConfig.id, 'GLOBAL_SIMULATION_CONFIG'));
      if (configs.length > 0) {
        injectContra = configs[0].injectDeedContradiction;
      }
    } catch {
      // ignore
    }

    return {
      failNextPropertyRequest: mode.failNextRequest,
      simulatePropertyOutage: mode.simulateOutage,
      injectDeedContradiction: injectContra,
      status: mode.simulateOutage
        ? 'OUTAGE_SIMULATED_ACTIVE'
        : mode.failNextRequest
        ? 'FAIL_NEXT_REQUEST_ARMED'
        : 'NOMINAL',
    };
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
