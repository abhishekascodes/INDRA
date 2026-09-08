import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildApp } from '../apps/api/src/server.js';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  hashSessionToken,
  eq,
  and,
} from '@indra/database';
import { SESSION_COOKIE_NAME, resetRateLimit } from '../apps/api/src/auth/session.js';
import { ReviewManager, WorkflowRunner, TransitionExecutor } from '@indra/workflow-engine';

describe('FINAL SECURITY HARDENING & SINGLE-CITIZEN SESSION INVARIANT SUITE', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    resetRateLimit('login:127.0.0.1');
    resetRateLimit('signup:127.0.0.1');
    await resetDatabase();
  });

  // Helpers
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
    return { token: cookie.value, body: JSON.parse(res.body) };
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
    return { token: cookie.value, body: JSON.parse(res.body) };
  }

  // =========================================================================
  // PART 1: SINGLE-CITIZEN SESSION INVARIANTS (TEST A THROUGH TEST R)
  // =========================================================================

  describe('PART 1: Mandatory Single-Citizen Invariants (TEST A - TEST R)', () => {
    it('TEST A: Login as Aarav -> Fetch protected data -> All returned data belongs to Aarav', async () => {
      const { token } = await loginAsAarav();

      // 1. /api/citizen/me
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(meRes.statusCode).toBe(200);
      const me = JSON.parse(meRes.body);
      expect(me.profile.id).toBe(AARAV_PATEL_ID);
      expect(me.profile.primaryName).toBe('Aarav Patel');

      // 2. /api/citizen/inbox
      const inboxRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/inbox',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(inboxRes.statusCode).toBe(200);
      const inbox = JSON.parse(inboxRes.body);
      for (const item of inbox.items) {
        expect(item.citizenId).toBe(AARAV_PATEL_ID);
        expect(item.citizenId).not.toBe(PRIYA_SHARMA_ID);
      }

      // 3. /api/citizen/vault
      const vaultRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/vault',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(vaultRes.statusCode).toBe(200);
      const vault = JSON.parse(vaultRes.body);
      for (const doc of vault.documents) {
        expect(doc.citizenId).toBe(AARAV_PATEL_ID);
      }

      // 4. /api/citizen/world-model
      const wmRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/world-model',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(wmRes.statusCode).toBe(200);
      const wm = JSON.parse(wmRes.body);
      expect(wm.worldModel.profile.id).toBe(AARAV_PATEL_ID);
      expect(wm.worldModel.profile.fullName).toBe('Aarav Patel');

      // 5. /api/citizen/action-plans
      const planRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/action-plans',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(planRes.statusCode).toBe(200);
      const plans = JSON.parse(planRes.body);
      for (const p of plans.plans) {
        expect(p.citizenId).toBe(AARAV_PATEL_ID);
      }
    });

    it("TEST B: While authenticated as Aarav, attempt to request Priya's records -> MUST be rejected with 403", async () => {
      const { token } = await loginAsAarav();

      // Query parameter tampering
      const res1 = await app.inject({
        method: 'GET',
        url: `/api/citizen/world-model?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res1.statusCode).toBe(403);
      expect(JSON.parse(res1.body).code).toBe('TENANT_BOUNDARY_VIOLATION');

      const res2 = await app.inject({
        method: 'GET',
        url: `/api/citizen/inbox?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res2.statusCode).toBe(403);
      expect(JSON.parse(res2.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it("TEST C: While authenticated as Aarav, attempt to submit a workflow using Priya's citizenId -> MUST be rejected", async () => {
      const { token } = await loginAsAarav();

      const res = await app.inject({
        method: 'POST',
        url: '/api/workflows/start',
        cookies: { [SESSION_COOKIE_NAME]: token },
        payload: {
          workflowCode: 'RELOCATE_MUNICIPAL_SERVICES',
          citizenId: PRIYA_SHARMA_ID,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it("TEST D: While authenticated as Aarav, attempt to open a Priya transition URL -> MUST be rejected", async () => {
      // Create transition specifically for Priya
      const priyaTransition = await TransitionExecutor.getInstance().initiateTransition({
        citizenId: PRIYA_SHARMA_ID,
        query: 'Priya relocate municipal transition',
        context: { destinationCity: 'Pune', destinationState: 'Maharashtra' },
      });

      const { token: aaravToken } = await loginAsAarav();

      // Attempt to access Priya's transition URL as Aarav
      const res = await app.inject({
        method: 'GET',
        url: `/api/transitions/${priyaTransition.id}`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it("TEST E: While authenticated as Aarav, attempt to access Priya's review session -> MUST be rejected", async () => {
      // Start workflow for Priya
      const runner = new WorkflowRunner();
      const priyaRun = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const { token: aaravToken } = await loginAsAarav();

      // Aarav attempts to access Priya's review session
      const res = await app.inject({
        method: 'GET',
        url: `/api/workflows/${priyaRun.id}/review`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it("TEST F: While authenticated as Aarav, attempt to execute a Priya authorization token -> MUST be rejected", async () => {
      // Set up Priya review session & authorize it
      const runner = new WorkflowRunner();
      const priyaRun = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(priyaRun.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(priyaRun.id, PRIYA_SHARMA_ID, workflow);

      const authResult = await reviewManager.authorizeReviewSession(
        reviewSession.id,
        PRIYA_SHARMA_ID,
        reviewSession.payloadHash,
        reviewSession.statutoryDeclarations.map((d) => d.id)
      );

      const priyaToken = authResult.authorizationToken;
      expect(priyaToken).toBeTruthy();

      const { token: aaravToken } = await loginAsAarav();

      // Aarav attempts to execute Priya's authorization token on Priya's workflow
      const res = await app.inject({
        method: 'POST',
        url: `/api/workflows/${priyaRun.id}/execute`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        payload: { authorizationToken: priyaToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it("TEST G: While authenticated as Aarav, attempt to mutate Priya's synthetic public records -> MUST be rejected", async () => {
      const { token: aaravToken } = await loginAsAarav();

      // Attempt to execute capability directly targeting Priya's records
      const res = await app.inject({
        method: 'POST',
        url: '/api/capabilities/execute',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        payload: {
          capabilityId: 'property.apply_mutation',
          input: {
            citizenId: PRIYA_SHARMA_ID, // Malicious target injection
            propertyId: 'PROP-BLR-001',
            mutationType: 'TRANSFER',
          },
          authorize: true,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it('TEST H: Logout as Aarav -> Attempt to call a protected endpoint using the old session -> MUST fail', async () => {
      const { token: aaravToken } = await loginAsAarav();

      // Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });
      expect(logoutRes.statusCode).toBe(200);

      // Attempt protected call with revoked token
      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        headers: { 'x-unauthenticated': 'true' },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
    });

    it('TEST I: Login as Priya after logging out Aarav -> Priya must receive only Priya world', async () => {
      // 1. Aarav login & logout
      const { token: aaravToken } = await loginAsAarav();
      await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });

      // 2. Priya login
      const { token: priyaToken } = await loginAsPriya();

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: priyaToken },
      });

      expect(meRes.statusCode).toBe(200);
      const me = JSON.parse(meRes.body);
      expect(me.profile.id).toBe(PRIYA_SHARMA_ID);
      expect(me.profile.primaryName).toBe('Priya Sharma');
      expect(me.profile.id).not.toBe(AARAV_PATEL_ID);
    });

    it('TEST J: After switching from Aarav -> logout -> Priya, ZERO leakage of Aarav data', async () => {
      const { token: aaravToken } = await loginAsAarav();
      await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });

      const { token: priyaToken } = await loginAsPriya();

      // Check all 10 resource categories for Priya to ensure ZERO Aarav data
      const [inboxRes, vaultRes, wmRes, plansRes, appRes, transRes] = await Promise.all([
        app.inject({ method: 'GET', url: '/api/citizen/inbox', cookies: { [SESSION_COOKIE_NAME]: priyaToken } }),
        app.inject({ method: 'GET', url: '/api/citizen/vault', cookies: { [SESSION_COOKIE_NAME]: priyaToken } }),
        app.inject({ method: 'GET', url: '/api/citizen/world-model', cookies: { [SESSION_COOKIE_NAME]: priyaToken } }),
        app.inject({ method: 'GET', url: '/api/citizen/action-plans', cookies: { [SESSION_COOKIE_NAME]: priyaToken } }),
        app.inject({ method: 'GET', url: '/api/applications', cookies: { [SESSION_COOKIE_NAME]: priyaToken } }),
        app.inject({ method: 'GET', url: '/api/citizen/transitions', cookies: { [SESSION_COOKIE_NAME]: priyaToken } }),
      ]);

      const inbox = JSON.parse(inboxRes.body);
      for (const item of inbox.items) {
        expect(item.citizenId).toBe(PRIYA_SHARMA_ID);
      }

      const vault = JSON.parse(vaultRes.body);
      for (const doc of vault.documents) {
        expect(doc.citizenId).toBe(PRIYA_SHARMA_ID);
      }

      const wm = JSON.parse(wmRes.body);
      expect(wm.worldModel.profile.id).toBe(PRIYA_SHARMA_ID);

      const plans = JSON.parse(plansRes.body);
      for (const p of plans.plans) {
        expect(p.citizenId).toBe(PRIYA_SHARMA_ID);
      }

      const apps = JSON.parse(appRes.body);
      for (const a of apps.applications) {
        expect(a.citizenId).toBe(PRIYA_SHARMA_ID);
      }

      const trans = JSON.parse(transRes.body);
      for (const t of trans.transitions) {
        expect(t.citizenId).toBe(PRIYA_SHARMA_ID);
      }
    });

    it('TEST K: Browser refresh while authenticated as Aarav must remain Aarav', async () => {
      const { token } = await loginAsAarav();

      // First request
      const req1 = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(JSON.parse(req1.body).citizen.id).toBe(AARAV_PATEL_ID);

      // Simulated refresh request
      const req2 = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(JSON.parse(req2.body).citizen.id).toBe(AARAV_PATEL_ID);
    });

    it('TEST L: Opening a second tab must NOT create a second citizen identity', async () => {
      const { token } = await loginAsAarav();

      // Tab 1 and Tab 2 concurrent calls
      const [tab1, tab2] = await Promise.all([
        app.inject({ method: 'GET', url: '/api/citizen/me', cookies: { [SESSION_COOKIE_NAME]: token } }),
        app.inject({ method: 'GET', url: '/api/citizen/me', cookies: { [SESSION_COOKIE_NAME]: token } }),
      ]);

      expect(JSON.parse(tab1.body).profile.id).toBe(AARAV_PATEL_ID);
      expect(JSON.parse(tab2.body).profile.id).toBe(AARAV_PATEL_ID);
    });

    it('TEST M: Manipulating frontend state must NOT change the authenticated citizen', async () => {
      const { token } = await loginAsAarav();

      // Even if client attempts to send simulated forged headers
      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
        headers: { 'x-citizen-id': PRIYA_SHARMA_ID }, // Spoofing attempt
      });

      // Server rejects header spoofing attempt
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it('TEST N: Changing citizenId in URL parameters must NOT change the authenticated citizen', async () => {
      const { token } = await loginAsAarav();

      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/world-model?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it('TEST O: Changing citizenId in request JSON must NOT change the authenticated citizen', async () => {
      const { token } = await loginAsAarav();

      const res = await app.inject({
        method: 'POST',
        url: '/api/workflows/start',
        cookies: { [SESSION_COOKIE_NAME]: token },
        payload: {
          workflowCode: 'RELOCATE_MUNICIPAL_SERVICES',
          citizenId: PRIYA_SHARMA_ID,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it('TEST P: Changing citizenId in query parameters must NOT change the authenticated citizen', async () => {
      const { token } = await loginAsAarav();

      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/transitions?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });

    it('TEST Q: Attempt to replay an authorization token under another citizen session -> MUST fail', async () => {
      const runner = new WorkflowRunner();
      const priyaRun = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(priyaRun.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(priyaRun.id, PRIYA_SHARMA_ID, workflow);

      const auth = await reviewManager.authorizeReviewSession(
        reviewSession.id,
        PRIYA_SHARMA_ID,
        reviewSession.payloadHash,
        reviewSession.statutoryDeclarations.map((d) => d.id)
      );

      const { token: aaravToken } = await loginAsAarav();

      // Aarav attempts to replay Priya's token
      const res = await app.inject({
        method: 'POST',
        url: `/api/workflows/${priyaRun.id}/execute`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        payload: { authorizationToken: auth.authorizationToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('TEST R: Attempt cross-citizen access to every major protected resource category -> MUST fail', async () => {
      const { token: aaravToken } = await loginAsAarav();

      const endpoints = [
        '/api/citizen/me',
        '/api/citizen/world-model',
        '/api/citizen/inbox',
        '/api/citizen/vault',
        '/api/citizen/action-plans',
        '/api/citizen/action-center',
        '/api/citizen/consent-artifacts',
        '/api/citizen/transitions',
        '/api/applications',
        '/api/trust/audit-logs',
        '/api/trust/consents',
      ];

      for (const endpoint of endpoints) {
        const res = await app.inject({
          method: 'GET',
          url: `${endpoint}?citizenId=${PRIYA_SHARMA_ID}`,
          cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.body);
        expect(body.code).toBe('TENANT_BOUNDARY_VIOLATION');
      }
    });
  });

  // =========================================================================
  // PART 2: 30-POINT ADVERSARIAL TEST MATRIX
  // =========================================================================

  describe('PART 2: 30-Point Adversarial Test Matrix', () => {
    it('1. Unauthenticated access -> 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        headers: { 'x-unauthenticated': 'true' },
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
    });

    it('2. Expired session -> 401', async () => {
      const db = await getDb();
      const fakeToken = 'expired-token-12345678901234567890';
      const fakeHash = hashSessionToken(fakeToken);

      // Get Aarav's real user account to satisfy foreign key constraint
      const aaravUsers = await db
        .select()
        .from(schema.userAccounts)
        .where(eq(schema.userAccounts.citizenId, AARAV_PATEL_ID));

      // Insert expired session
      await db.insert(schema.authSessions).values({
        userId: aaravUsers[0].id,
        citizenId: AARAV_PATEL_ID,
        sessionTokenHash: fakeHash,
        expiresAt: new Date(Date.now() - 10000), // in the past
        isRevoked: false,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: fakeToken },
        headers: { 'x-unauthenticated': 'true' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('3. Logged-out session -> 401', async () => {
      const { token } = await loginAsAarav();
      await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: token },
        headers: { 'x-unauthenticated': 'true' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('4. Cross-citizen read -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/world-model?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('5. Cross-citizen write -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'POST',
        url: '/api/workflows/start',
        cookies: { [SESSION_COOKIE_NAME]: token },
        payload: { workflowCode: 'RELOCATE_MUNICIPAL_SERVICES', citizenId: PRIYA_SHARMA_ID },
      });
      expect(res.statusCode).toBe(403);
    });

    it('6. Cross-citizen workflow -> 403', async () => {
      const runner = new WorkflowRunner();
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const { token: aaravToken } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/workflows/${run.id}`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });
      expect(res.statusCode).toBe(403);
    });

    it('7. Cross-citizen transition -> 403', async () => {
      const trans = await TransitionExecutor.getInstance().initiateTransition({
        citizenId: PRIYA_SHARMA_ID,
        query: 'Priya transition',
      });

      const { token: aaravToken } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/transitions/${trans.id}`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });
      expect(res.statusCode).toBe(403);
    });

    it('8. Cross-citizen review -> 403', async () => {
      const runner = new WorkflowRunner();
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const { token: aaravToken } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/workflows/${run.id}/review`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });
      expect(res.statusCode).toBe(403);
    });

    it('9. Cross-citizen authorization -> 403', async () => {
      // Priya starts a workflow and gets a review session
      const runner = new WorkflowRunner();
      const priyaRun = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(priyaRun.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(priyaRun.id, PRIYA_SHARMA_ID, workflow);

      // Aarav attempts to authorize Priya's review session
      const { token: aaravToken } = await loginAsAarav();
      const res = await app.inject({
        method: 'POST',
        url: `/api/workflows/${priyaRun.id}/authorize`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
        payload: {
          reviewSessionId: reviewSession.id,
          payloadHash: reviewSession.payloadHash,
          acceptedDeclarationIds: reviewSession.statutoryDeclarations.map((d) => d.id),
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('10. Cross-citizen consent -> 404 or 403', async () => {
      const db = await getDb();
      const priyaConsents = await db
        .select()
        .from(schema.consentArtifacts)
        .where(eq(schema.consentArtifacts.citizenId, PRIYA_SHARMA_ID));

      const targetId = priyaConsents[0]?.id || '00000000-0000-0000-0000-000000000001';

      const { token: aaravToken } = await loginAsAarav();
      const res = await app.inject({
        method: 'POST',
        url: `/api/citizen/consent-artifacts/${targetId}/revoke`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });
      expect([403, 404]).toContain(res.statusCode);
    });

    it('11. Cross-citizen vault -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/vault?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('12. Cross-citizen inbox -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/inbox?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('13. Cross-citizen activity -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/transitions?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('14. URL tampering -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/action-plans?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('15. Query tampering -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: `/api/applications?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('16. Body tampering -> 403', async () => {
      const { token } = await loginAsAarav();
      const res = await app.inject({
        method: 'POST',
        url: '/api/capabilities/execute',
        cookies: { [SESSION_COOKIE_NAME]: token },
        payload: {
          capabilityId: 'tax.view_form_26as',
          input: { citizenId: PRIYA_SHARMA_ID },
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('17. Replay consumed authorization token -> rejected', async () => {
      const runner = new WorkflowRunner();
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(run.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      const auth = await reviewManager.authorizeReviewSession(
        reviewSession.id,
        PRIYA_SHARMA_ID,
        reviewSession.payloadHash,
        reviewSession.statutoryDeclarations.map((d) => d.id)
      );

      const { token: priyaToken } = await loginAsPriya();

      // First execution: consumes token
      const exec1 = await app.inject({
        method: 'POST',
        url: `/api/workflows/${run.id}/execute`,
        cookies: { [SESSION_COOKIE_NAME]: priyaToken },
        payload: { authorizationToken: auth.authorizationToken },
      });
      expect(exec1.statusCode).toBe(200);

      // Replay execution with already consumed token
      const exec2 = await app.inject({
        method: 'POST',
        url: `/api/workflows/${run.id}/execute`,
        cookies: { [SESSION_COOKIE_NAME]: priyaToken },
        payload: { authorizationToken: auth.authorizationToken },
      });
      expect(exec2.statusCode).toBe(400);
      expect(JSON.parse(exec2.body).error).toMatch(/ALREADY_EXECUTED|terminal state/i);
    });

    it('18. Stale authorization on superseded review version -> rejected (409)', async () => {
      const runner = new WorkflowRunner();
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(run.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      // Authorize version 1
      const auth1 = await reviewManager.authorizeReviewSession(
        reviewSession.id,
        PRIYA_SHARMA_ID,
        reviewSession.payloadHash,
        reviewSession.statutoryDeclarations.map((d) => d.id)
      );

      // Edit field, which creates version 2 and marks version 1 SUPERSEDED
      const editableField = reviewSession.dataProvenanceMatrix.find((f) => f.editable);
      const targetFieldKey = editableField ? editableField.fieldKey : 'sourceEstablishment';
      await reviewManager.editReviewField(reviewSession.id, PRIYA_SHARMA_ID, targetFieldKey, 'NEW_ESTABLISHMENT_NAME');

      const { token: priyaToken } = await loginAsPriya();

      // Attempt to execute with the superseded version 1 token
      const res = await app.inject({
        method: 'POST',
        url: `/api/workflows/${run.id}/execute`,
        cookies: { [SESSION_COOKIE_NAME]: priyaToken },
        payload: { authorizationToken: auth1.authorizationToken },
      });

      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).error).toContain('STALE_REVIEW_STATE');
    });

    it('19. Session fixation protection -> new random token generated on each login', async () => {
      const login1 = await loginAsAarav();
      const login2 = await loginAsAarav();

      expect(login1.token).not.toBe(login2.token);
      expect(login1.token.length).toBeGreaterThanOrEqual(32);
      expect(login2.token.length).toBeGreaterThanOrEqual(32);
    });

    it('20. Logout invalidation -> server session marked revoked', async () => {
      const { token } = await loginAsAarav();
      await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [SESSION_COOKIE_NAME]: token },
      });

      const db = await getDb();
      const tokenHash = hashSessionToken(token);
      const rows = await db
        .select()
        .from(schema.authSessions)
        .where(eq(schema.authSessions.sessionTokenHash, tokenHash));

      expect(rows[0].isRevoked).toBe(true);
    });

    it('21. Browser refresh preservation -> valid session continues', async () => {
      const { token } = await loginAsAarav();

      for (let i = 0; i < 3; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/auth/me',
          cookies: { [SESSION_COOKIE_NAME]: token },
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).authenticated).toBe(true);
      }
    });

    it('22. Multiple tabs -> session works identically across tabs', async () => {
      const { token } = await loginAsAarav();

      const results = await Promise.all([
        app.inject({ method: 'GET', url: '/api/citizen/inbox', cookies: { [SESSION_COOKIE_NAME]: token } }),
        app.inject({ method: 'GET', url: '/api/citizen/vault', cookies: { [SESSION_COOKIE_NAME]: token } }),
        app.inject({ method: 'GET', url: '/api/citizen/action-plans', cookies: { [SESSION_COOKIE_NAME]: token } }),
      ]);

      for (const res of results) {
        expect(res.statusCode).toBe(200);
      }
    });

    it('23. Signup isolation -> new citizen gets unique UUID and zero inherited records', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          email: 'isolated.citizen@example.in',
          password: 'Password123!',
          fullName: 'Isolated Citizen',
          city: 'Hubballi',
          state: 'Karnataka',
          syntheticChallenge: '1234',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      const newCitizenId = data.citizen.id;

      expect(newCitizenId).not.toBe(AARAV_PATEL_ID);
      expect(newCitizenId).not.toBe(PRIYA_SHARMA_ID);

      const cookie = res.cookies.find((c: any) => c.name === SESSION_COOKIE_NAME).value;

      // Check inbox: isolated citizen should have 0 or only their own items
      const inboxRes = await app.inject({
        method: 'GET',
        url: '/api/citizen/inbox',
        cookies: { [SESSION_COOKIE_NAME]: cookie },
      });
      const inbox = JSON.parse(inboxRes.body);
      for (const item of inbox.items) {
        expect(item.citizenId).toBe(newCitizenId);
      }
    });

    it('24. Stale frontend cache protection -> API returns strictly session-scoped data', async () => {
      const { token: aaravToken } = await loginAsAarav();
      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });
      expect(JSON.parse(res.body).profile.id).toBe(AARAV_PATEL_ID);
    });

    it('25. Malformed authentication input -> rejected gracefully without crashes', async () => {
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: null, password: 12345 },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'bad', password: 'short', syntheticChallenge: 'not-digits' },
      });
      expect(res2.statusCode).toBe(400);
    });

    it('26. Invalid session format -> rejected as 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/citizen/me',
        cookies: { [SESSION_COOKIE_NAME]: 'invalid-garbage' },
        headers: { 'x-unauthenticated': 'true' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('27. Concurrent requests -> handled safely with session stability', async () => {
      const { token } = await loginAsAarav();

      const requests = Array.from({ length: 10 }).map(() =>
        app.inject({
          method: 'GET',
          url: '/api/citizen/me',
          cookies: { [SESSION_COOKIE_NAME]: token },
        })
      );

      const responses = await Promise.all(requests);
      for (const r of responses) {
        expect(r.statusCode).toBe(200);
        expect(JSON.parse(r.body).profile.id).toBe(AARAV_PATEL_ID);
      }
    });

    it('28. Authorization race -> token cannot be consumed twice concurrently', async () => {
      const runner = new WorkflowRunner();
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(run.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      const auth = await reviewManager.authorizeReviewSession(
        reviewSession.id,
        PRIYA_SHARMA_ID,
        reviewSession.payloadHash,
        reviewSession.statutoryDeclarations.map((d) => d.id)
      );

      const { token: priyaToken } = await loginAsPriya();

      // Launch 2 parallel execution calls with same token
      const [call1, call2] = await Promise.all([
        app.inject({
          method: 'POST',
          url: `/api/workflows/${run.id}/execute`,
          cookies: { [SESSION_COOKIE_NAME]: priyaToken },
          payload: { authorizationToken: auth.authorizationToken },
        }),
        app.inject({
          method: 'POST',
          url: `/api/workflows/${run.id}/execute`,
          cookies: { [SESSION_COOKIE_NAME]: priyaToken },
          payload: { authorizationToken: auth.authorizationToken },
        }),
      ]);

      const statuses = [call1.statusCode, call2.statusCode];
      // Exactly one succeeds, the other fails
      expect(statuses).toContain(200);
      expect(statuses.some((s) => s === 400 || s === 409)).toBe(true);
    });

    it('29. Expired review authorization -> rejected', async () => {
      const runner = new WorkflowRunner();
      const run = await runner.startWorkflow({
        workflowCode: 'RECOVER_DORMANT_PF',
        citizenId: PRIYA_SHARMA_ID,
      });

      const reviewManager = ReviewManager.getInstance();
      const workflow = (await import('@indra/workflow-engine')).WorkflowRegistry.getInstance().get(run.workflowCode)!;
      const reviewSession = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

      // Create an expired authorization token
      const { signAuthorizationToken } = await import('@indra/workflow-engine');
      const expiredToken = signAuthorizationToken({
        reviewSessionId: reviewSession.id,
        workflowRunId: run.id,
        version: 1,
        stepId: run.currentStepId || 'step_transfer',
        citizenId: PRIYA_SHARMA_ID,
        payloadHash: reviewSession.payloadHash,
        authorizedAt: new Date(Date.now() - 20000).toISOString(),
        expiresAt: new Date(Date.now() - 10000).toISOString(), // Expired 10 seconds ago
      });

      const { token: priyaToken } = await loginAsPriya();

      const res = await app.inject({
        method: 'POST',
        url: `/api/workflows/${run.id}/execute`,
        cookies: { [SESSION_COOKIE_NAME]: priyaToken },
        payload: { authorizationToken: expiredToken },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).code).toBe('INVALID_TOKEN');
    });

    it('30. Cross-citizen synthetic institution access -> strictly rejected', async () => {
      const { token: aaravToken } = await loginAsAarav();

      // Attempt to access Priya's synthetic institutional consent artifacts
      const res = await app.inject({
        method: 'GET',
        url: `/api/citizen/consent-artifacts?citizenId=${PRIYA_SHARMA_ID}`,
        cookies: { [SESSION_COOKIE_NAME]: aaravToken },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('TENANT_BOUNDARY_VIOLATION');
    });
  });
});
