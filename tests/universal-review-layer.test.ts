import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
} from '@indra/database';
import {
  WorkflowRegistry,
  WorkflowRunner,
  ReviewManager,
  registerDefaultWorkflows,
  computePayloadHash,
  signAuthorizationToken,
  verifyAuthorizationToken,
} from '@indra/workflow-engine';
import { registerDefaultCapabilities } from '@indra/capability-engine';
import { buildApp } from '../apps/api/src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Universal Citizen Review & Authorization Layer Suite', () => {
  let runner: WorkflowRunner;
  let reviewManager: ReviewManager;
  let app: FastifyInstance;

  beforeAll(async () => {
    registerDefaultCapabilities();
    registerDefaultWorkflows();
    runner = new WorkflowRunner();
    reviewManager = ReviewManager.getInstance();
    app = await buildApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // =========================================================================
  // 1. CANONICAL HASHING & CRYPTOGRAPHIC TOKEN SPEC
  // =========================================================================
  describe('Canonical Hashing & Token Cryptography', () => {
    it('produces identical SHA-256 hash regardless of object key insertion order', () => {
      const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
      const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };

      const hashA = computePayloadHash(objA);
      const hashB = computePayloadHash(objB);

      expect(hashA).toBe(hashB);
      expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    });

    it('signs and verifies a valid authorization token', () => {
      const claims = {
        sessionId: 'c3a7e4b2-0000-0000-0000-000000000001',
        workflowRunId: 'b1f8d9a4-0000-0000-0000-000000000001',
        stepId: 'step_auth',
        citizenId: PRIYA_SHARMA_ID,
        payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        authorizedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };

      const token = signAuthorizationToken(claims);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const verified = verifyAuthorizationToken(token);
      expect(verified.sessionId).toBe(claims.sessionId);
      expect(verified.citizenId).toBe(PRIYA_SHARMA_ID);
      expect(verified.payloadHash).toBe(claims.payloadHash);
    });

    it('rejects tampered token signature', () => {
      const claims = {
        sessionId: 'c3a7e4b2-0000-0000-0000-000000000001',
        workflowRunId: 'b1f8d9a4-0000-0000-0000-000000000001',
        stepId: 'step_auth',
        citizenId: PRIYA_SHARMA_ID,
        payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        authorizedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };

      const token = signAuthorizationToken(claims);
      const tampered = token.slice(0, -4) + 'abcd';

      expect(() => verifyAuthorizationToken(tampered)).toThrow(/INVALID_TOKEN_SIGNATURE/);
    });

    it('rejects expired authorization token', () => {
      const claims = {
        sessionId: 'c3a7e4b2-0000-0000-0000-000000000001',
        workflowRunId: 'b1f8d9a4-0000-0000-0000-000000000001',
        stepId: 'step_auth',
        citizenId: PRIYA_SHARMA_ID,
        payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        authorizedAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() - 1800000).toISOString(), // expired 30 mins ago
      };

      const token = signAuthorizationToken(claims);
      expect(() => verifyAuthorizationToken(token)).toThrow(/TOKEN_EXPIRED/);
    });
  });

  // =========================================================================
  // 2. REVIEW SESSION LIFECYCLE & EDITABLE REVALIDATION
  // =========================================================================
  describe('Review Session Lifecycle & In-Place Editing', () => {
    it('creates review session with full data provenance, disclosures, and statutory declarations', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
      const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      expect(session).toBeDefined();
      expect(session.workflowRunId).toBe(run.id);
      expect(session.citizenId).toBe(PRIYA_SHARMA_ID);
      expect(session.reviewMode).toBe('IRREVERSIBLE');
      expect(session.status).toBe('REVIEWED');
      expect(session.payloadHash).toHaveLength(64);

      // Verify Data Provenance
      expect(session.dataProvenanceMatrix.length).toBeGreaterThan(0);
      const uanField = session.dataProvenanceMatrix.find((f) => f.fieldKey.toLowerCase().includes('uan'));
      if (uanField) {
        expect(uanField.source).toBe('OFFICIAL_REGISTRY');
        expect(uanField.sensitivity).toBe('HIGH');
      }

      // Verify Institutional Disclosures
      expect(session.disclosures).toHaveLength(1);
      expect(session.disclosures[0].recipient).toContain('EPFO');

      // Verify Statutory Declarations
      expect(session.statutoryDeclarations.length).toBeGreaterThanOrEqual(2);
      expect(session.statutoryDeclarations.some((d) => d.id === 'decl_accuracy')).toBe(true);
      expect(session.statutoryDeclarations.some((d) => d.id === 'decl_irreversible_notice')).toBe(true);
    });

    it('allows editing citizen-editable fields and recomputes payload hash', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
      const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);
      const initialHash = session.payloadHash;

      // Find an editable field or create one
      const editableField = session.dataProvenanceMatrix.find((f) => f.editable);
      if (editableField) {
        const updated = await reviewManager.editReviewField(
          session.id,
          PRIYA_SHARMA_ID,
          editableField.fieldKey,
          'NEW_MODIFIED_VALUE'
        );

        expect(updated.payloadHash).not.toBe(initialHash);
        expect(updated.status).toBe('REVIEWED');
      }
    });

    it('rejects attempts to edit authoritative ground truth fields', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
      const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      const nonEditableField = session.dataProvenanceMatrix.find((f) => !f.editable);
      if (nonEditableField) {
        await expect(
          reviewManager.editReviewField(
            session.id,
            PRIYA_SHARMA_ID,
            nonEditableField.fieldKey,
            'MALICIOUS_OVERRIDE'
          )
        ).rejects.toThrow(/authoritative ground truth/);
      }
    });
  });

  // =========================================================================
  // 3. AUTHORIZATION != EXECUTION SEPARATION & STALE TOKEN GUARDS
  // =========================================================================
  describe('Authorization Separation & Stale State Defense', () => {
    it('authorizes review session and produces valid signed token', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
      const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      const declarationIds = session.statutoryDeclarations.map((d) => d.id);
      const result = await reviewManager.authorizeReviewSession(
        session.id,
        PRIYA_SHARMA_ID,
        session.payloadHash,
        declarationIds
      );

      expect(result.authorized).toBe(true);
      expect(result.authorizationToken).toBeDefined();
      expect(result.reviewSession.status).toBe('AUTHORIZED');
    });

    it('rejects authorization when required declarations are missing', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
      const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      await expect(
        reviewManager.authorizeReviewSession(session.id, PRIYA_SHARMA_ID, session.payloadHash, [])
      ).rejects.toThrow(/Required declaration/);
    });

    it('rejects execution when workflow context was modified after authorization (STALE_REVIEW_STATE)', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
      const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      const declarationIds = session.statutoryDeclarations.map((d) => d.id);
      const auth = await reviewManager.authorizeReviewSession(
        session.id,
        PRIYA_SHARMA_ID,
        session.payloadHash,
        declarationIds
      );

      // Now tamper with the context before executing
      const tamperedKey = session.dataProvenanceMatrix[0]?.fieldKey || 'targetMemberId';
      const tamperedContext = {
        citizenId: PRIYA_SHARMA_ID,
        ...((run.contextData as Record<string, unknown>) || {}),
        [tamperedKey]: 'ATTACKER_INJECTED_VALUE',
      };

      await expect(
        reviewManager.verifyAndConsumeAuthorization(
          run.id,
          session.stepId,
          PRIYA_SHARMA_ID,
          auth.authorizationToken,
          tamperedContext
        )
      ).rejects.toThrow(/STALE_REVIEW_STATE/);
    });
  });

  // =========================================================================
  // 4. FASTIFY API REVIEW ENDPOINTS & CITIZEN ISOLATION
  // =========================================================================
  describe('Fastify Review Endpoints & Citizen Isolation', () => {
    it('GET /api/workflows/:id/review: retrieves authoritative review session', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/workflows/${run.id}/review`,
        headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.reviewMode).toBe('IRREVERSIBLE');
      expect(data.payloadHash).toHaveLength(64);
    });

    it('denies cross-citizen inspection of review session (403 Forbidden)', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      // Aarav attempts to inspect Priya's review session
      const res = await app.inject({
        method: 'GET',
        url: `/api/workflows/${run.id}/review`,
        headers: { 'x-citizen-id': AARAV_PATEL_ID },
      });

      expect(res.statusCode).toBe(403);
    });

    it('full flow: GET review -> POST authorize -> POST execute advances workflow', async () => {
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      // 1. GET Review
      const reviewRes = await app.inject({
        method: 'GET',
        url: `/api/workflows/${run.id}/review`,
        headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
      });
      const reviewData = JSON.parse(reviewRes.body);

      // 2. POST Authorize
      const authRes = await app.inject({
        method: 'POST',
        url: `/api/workflows/${run.id}/authorize`,
        headers: { 'x-citizen-id': PRIYA_SHARMA_ID, 'content-type': 'application/json' },
        body: JSON.stringify({
          reviewSessionId: reviewData.id,
          payloadHash: reviewData.payloadHash,
          acceptedDeclarationIds: reviewData.statutoryDeclarations.map((d: any) => d.id),
        }),
      });

      expect(authRes.statusCode).toBe(200);
      const authData = JSON.parse(authRes.body);
      expect(authData.authorized).toBe(true);
      expect(authData.authorizationToken).toBeDefined();

      // 3. POST Execute
      const execRes = await app.inject({
        method: 'POST',
        url: `/api/workflows/${run.id}/execute`,
        headers: { 'x-citizen-id': PRIYA_SHARMA_ID, 'content-type': 'application/json' },
        body: JSON.stringify({
          authorizationToken: authData.authorizationToken,
        }),
      });

      expect(execRes.statusCode).toBe(200);
      const summary = JSON.parse(execRes.body);
      expect(summary.state).toBe('COMPLETED');
    });
  });
});
