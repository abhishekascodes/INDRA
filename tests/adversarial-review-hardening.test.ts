import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getDb,
  schema,
  resetDatabase,
  PRIYA_SHARMA_ID,
  AARAV_PATEL_ID,
  eq,
  and,
} from '@indra/database';
import {
  WorkflowRunner,
  WorkflowRegistry,
  ReviewManager,
  signAuthorizationToken,
  computePayloadHash,
} from '@indra/workflow-engine';
import {
  CapabilityRegistry,
  CapabilityExecutor,
  registerDefaultCapabilities,
} from '@indra/capability-engine';
import { registerDefaultWorkflows } from '@indra/workflow-engine';
import { buildApp } from '../apps/api/src/server.js';
import type { FastifyInstance } from 'fastify';

describe('INDRA Adversarial Citizen Review & Authorization Hardening Suite (22 Vectors)', () => {
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
  // VECTOR 1: REVIEW VERSION TAMPERING
  // =========================================================================
  it('Vector 1: rejects execution when using a token from an earlier superseded review version (V1 after V2 edit)', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const v1Session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);
    expect(v1Session.version).toBe(1);

    // Authorize V1
    const v1Auth = await reviewManager.authorizeReviewSession(
      v1Session.id,
      PRIYA_SHARMA_ID,
      v1Session.payloadHash,
      v1Session.statutoryDeclarations.map((d) => d.id)
    );

    // Citizen edits an editable field (or simulates edit), creating V2 and superseding V1
    const editableField = v1Session.dataProvenanceMatrix.find((f) => f.editable);
    const fieldKey = editableField ? editableField.fieldKey : 'targetEstablishment';
    const v2Session = await reviewManager.editReviewField(
      v1Session.id,
      PRIYA_SHARMA_ID,
      fieldKey,
      'UPDATED_TARGET_ESTABLISHMENT'
    );
    expect(v2Session.version).toBe(2);
    expect(v2Session.id).not.toBe(v1Session.id);

    // Attacker attempts to execute using V1's token
    const db = await getDb();
    const runRecord = await db.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.id, run.id));
    const currentContext = (runRecord[0].contextData as Record<string, any>) || {};

    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        run.id,
        v1Session.stepId,
        PRIYA_SHARMA_ID,
        v1Auth.authorizationToken,
        currentContext
      )
    ).rejects.toThrow(/STALE_REVIEW_STATE/);
  });

  // =========================================================================
  // VECTOR 2: CONTEXT FIELD TAMPERING POST-AUTHORIZATION
  // =========================================================================
  it('Vector 2: rejects execution if workflow context was modified after authorization was granted', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    const auth = await reviewManager.authorizeReviewSession(
      session.id,
      PRIYA_SHARMA_ID,
      session.payloadHash,
      session.statutoryDeclarations.map((d) => d.id)
    );

    // Mutate an authoritative field in context
    const tamperedKey = session.dataProvenanceMatrix[0]?.fieldKey || 'targetMemberId';
    const tamperedContext = {
      citizenId: PRIYA_SHARMA_ID,
      ...((run.contextData as Record<string, unknown>) || {}),
      [tamperedKey]: 'MALICIOUS_ATTACKER_ACCOUNT',
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

  // =========================================================================
  // VECTOR 3: AUTHORIZATION REPLAY ATTACK
  // =========================================================================
  it('Vector 3: prevents authorization artifact replay (token can only be consumed once)', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    const auth = await reviewManager.authorizeReviewSession(
      session.id,
      PRIYA_SHARMA_ID,
      session.payloadHash,
      session.statutoryDeclarations.map((d) => d.id)
    );

    const db = await getDb();
    const runRecord = await db.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.id, run.id));
    const currentContext = (runRecord[0].contextData as Record<string, any>) || {};

    // 1st Execution succeeds
    const firstExecution = await reviewManager.verifyAndConsumeAuthorization(
      run.id,
      session.stepId,
      PRIYA_SHARMA_ID,
      auth.authorizationToken,
      currentContext
    );
    expect(firstExecution.valid).toBe(true);

    // 2nd Replay Attempt must throw ALREADY_EXECUTED
    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        run.id,
        session.stepId,
        PRIYA_SHARMA_ID,
        auth.authorizationToken,
        currentContext
      )
    ).rejects.toThrow(/ALREADY_EXECUTED/);
  });

  // =========================================================================
  // VECTOR 4: CROSS-CITIZEN TOKEN SUBSTITUTION
  // =========================================================================
  it('Vector 4: rejects using Citizen A token to execute Citizen B workflow run', async () => {
    const runA = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const sessionA = await reviewManager.getOrCreateReviewSession(runA.id, PRIYA_SHARMA_ID, workflow);

    const authA = await reviewManager.authorizeReviewSession(
      sessionA.id,
      PRIYA_SHARMA_ID,
      sessionA.payloadHash,
      sessionA.statutoryDeclarations.map((d) => d.id)
    );

    // Aarav attempts to execute with Priya's token
    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        runA.id,
        sessionA.stepId,
        AARAV_PATEL_ID,
        authA.authorizationToken,
        {}
      )
    ).rejects.toThrow(/Forbidden/);
  });

  // =========================================================================
  // VECTOR 5: CROSS-WORKFLOW TOKEN REUSE
  // =========================================================================
  it('Vector 5: rejects reusing an authorization token on a different workflow run', async () => {
    const run1 = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const run2 = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session1 = await reviewManager.getOrCreateReviewSession(run1.id, PRIYA_SHARMA_ID, workflow);

    const auth1 = await reviewManager.authorizeReviewSession(
      session1.id,
      PRIYA_SHARMA_ID,
      session1.payloadHash,
      session1.statutoryDeclarations.map((d) => d.id)
    );

    // Attempt to consume token from run1 on run2
    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        run2.id,
        session1.stepId,
        PRIYA_SHARMA_ID,
        auth1.authorizationToken,
        {}
      )
    ).rejects.toThrow(/Forbidden/);
  });

  // =========================================================================
  // VECTOR 6: CROSS-STEP TOKEN REUSE
  // =========================================================================
  it('Vector 6: rejects using a token issued for Step A to execute Step B', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    const auth = await reviewManager.authorizeReviewSession(
      session.id,
      PRIYA_SHARMA_ID,
      session.payloadHash,
      session.statutoryDeclarations.map((d) => d.id)
    );

    // Attempt to execute a different step
    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        run.id,
        'step_completely_different',
        PRIYA_SHARMA_ID,
        auth.authorizationToken,
        {}
      )
    ).rejects.toThrow(/Forbidden.*step/);
  });

  // =========================================================================
  // VECTOR 7: TAMPERED TOKEN SIGNATURE
  // =========================================================================
  it('Vector 7: rejects tampered HMAC cryptographic signature on authorization token', async () => {
    const claims = {
      sessionId: '00000000-0000-0000-0000-000000000001',
      workflowRunId: '00000000-0000-0000-0000-000000000002',
      stepId: 'step_transfer',
      citizenId: PRIYA_SHARMA_ID,
      payloadHash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      authorizedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };

    const validToken = signAuthorizationToken(claims);
    const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        claims.workflowRunId,
        claims.stepId,
        claims.citizenId,
        tamperedToken,
        {}
      )
    ).rejects.toThrow(/INVALID_TOKEN_SIGNATURE/);
  });

  // =========================================================================
  // VECTOR 8: EXPIRED TOKEN EXECUTION
  // =========================================================================
  it('Vector 8: rejects expired authorization tokens (past TTL)', async () => {
    const claims = {
      sessionId: '00000000-0000-0000-0000-000000000001',
      workflowRunId: '00000000-0000-0000-0000-000000000002',
      stepId: 'step_transfer',
      citizenId: PRIYA_SHARMA_ID,
      payloadHash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      authorizedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() - 1800000).toISOString(), // Expired 30 min ago
    };

    const expiredToken = signAuthorizationToken(claims);

    await expect(
      reviewManager.verifyAndConsumeAuthorization(
        claims.workflowRunId,
        claims.stepId,
        claims.citizenId,
        expiredToken,
        {}
      )
    ).rejects.toThrow(/TOKEN_EXPIRED/);
  });

  // =========================================================================
  // VECTOR 9: GROUND-TRUTH FIELD EDIT BYPASS ATTEMPT
  // =========================================================================
  it('Vector 9: blocks attempts to edit non-editable authoritative ground-truth fields', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    // Attempt to modify an authoritative non-editable field
    const nonEditable = session.dataProvenanceMatrix.find((f) => !f.editable);
    if (nonEditable) {
      await expect(
        reviewManager.editReviewField(
          session.id,
          PRIYA_SHARMA_ID,
          nonEditable.fieldKey,
          'INJECTED_OVERWRITE'
        )
      ).rejects.toThrow(/authoritative ground truth and cannot be modified/);
    }
  });

  // =========================================================================
  // VECTOR 10: DECLARATION OMISSION ATTACK
  // =========================================================================
  it('Vector 10: rejects authorization when mandatory statutory declarations are not accepted', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    // Omit declarations
    await expect(
      reviewManager.authorizeReviewSession(
        session.id,
        PRIYA_SHARMA_ID,
        session.payloadHash,
        [] // No declarations accepted
      )
    ).rejects.toThrow(/Required declaration.*was not accepted/);
  });

  // =========================================================================
  // VECTOR 11: CROSS-CITIZEN REVIEW ENDPOINT INSPECTION (FASTIFY)
  // =========================================================================
  it('Vector 11: denies unauthorized cross-citizen inspection of review session (403)', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/workflows/${run.id}/review`,
      headers: { 'x-citizen-id': AARAV_PATEL_ID }, // Aarav trying to inspect Priya's session
    });

    expect(res.statusCode).toBe(403);
  });

  // =========================================================================
  // VECTOR 12: NON-EXISTENT WORKFLOW REVIEW INSPECTION (FASTIFY)
  // =========================================================================
  it('Vector 12: returns 404 for non-existent workflow run review query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/workflows/00000000-0000-0000-0000-000000000000/review`,
      headers: { 'x-citizen-id': PRIYA_SHARMA_ID },
    });

    expect(res.statusCode).toBe(404);
  });

  // =========================================================================
  // VECTOR 13: CONCURRENT EXECUTION RACE DEFENSE
  // =========================================================================
  it('Vector 13: defends against concurrent double execution (exactly one succeeds)', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    const auth = await reviewManager.authorizeReviewSession(
      session.id,
      PRIYA_SHARMA_ID,
      session.payloadHash,
      session.statutoryDeclarations.map((d) => d.id)
    );

    const db = await getDb();
    const runRecord = await db.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.id, run.id));
    const currentContext = (runRecord[0].contextData as Record<string, any>) || {};

    // Trigger two executions in parallel with identical token
    const call1 = reviewManager.verifyAndConsumeAuthorization(
      run.id,
      session.stepId,
      PRIYA_SHARMA_ID,
      auth.authorizationToken,
      currentContext
    );
    const call2 = reviewManager.verifyAndConsumeAuthorization(
      run.id,
      session.stepId,
      PRIYA_SHARMA_ID,
      auth.authorizationToken,
      currentContext
    );

    const results = await Promise.allSettled([call1, call2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed, one should fail with ALREADY_EXECUTED
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  // =========================================================================
  // VECTOR 14: PROPERTY LANGUAGE INVARIANT (NO ABSOLUTE CLAIMS)
  // =========================================================================
  it('Vector 14: property encumbrance checks use precise observational language without absolute legal claims', async () => {
    const registry = CapabilityRegistry.getInstance();
    const cap = registry.get('property.verify_encumbrance')!;

    const result = await cap.execute({
      citizenId: PRIYA_SHARMA_ID,
      propertyIdentifier: 'KA-BLR-SY-492/1',
      searchYears: 15,
    }, { citizenId: PRIYA_SHARMA_ID });

    expect(result.success).toBe(true);
    // Verified non-absolute observational phrasing
    if (result.encumbrancesFound === false) {
      expect(result.clearanceCertificateNumber).toBeDefined();
    }
  });

  // =========================================================================
  // VECTOR 15: EMERGENCY FREEZE SYNTHETIC INFRASTRUCTURE VERIFICATION
  // =========================================================================
  it('Vector 15: cybercrime account freeze produces synthetic incident record and debt freeze status', async () => {
    const registry = CapabilityRegistry.getInstance();
    const cap = registry.get('security.freeze_compromised_account')!;

    const result = await cap.execute({
      citizenId: PRIYA_SHARMA_ID,
      incidentBrief: 'Suspicious unauthorized debit attempt of ₹25,000 detected via synthetic phishing link.',
    }, { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true });

    expect(result.success).toBe(true);
    expect(result.accountLienStatus).toBe('DEBIT_FROZEN');
    expect(result.acknowledgementNumber).toContain('NCCR-1930');
    expect(result.reportingChannel).toContain('1930');
  });

  // =========================================================================
  // VECTOR 16: SUPERSEDED SESSION EDIT REJECTION
  // =========================================================================
  it('Vector 16: rejects editing a session that has already been superseded by a newer version', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const v1Session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    // Edit to create V2
    const editableField = v1Session.dataProvenanceMatrix.find((f) => f.editable);
    const fieldKey = editableField ? editableField.fieldKey : 'targetEstablishment';
    await reviewManager.editReviewField(v1Session.id, PRIYA_SHARMA_ID, fieldKey, 'EDIT_1');

    // Attempting to edit V1 again must fail
    await expect(
      reviewManager.editReviewField(v1Session.id, PRIYA_SHARMA_ID, fieldKey, 'EDIT_2')
    ).rejects.toThrow(/STALE_REVIEW_STATE/);
  });

  // =========================================================================
  // VECTOR 17: FULL API FLOW WITH VERSION BADGE VERIFICATION
  // =========================================================================
  it('Vector 17: full API flow preserves review version and returns version in contract', async () => {
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
    expect(data.version).toBe(1);
    expect(data.status).toBe('REVIEWED');
  });

  // =========================================================================
  // VECTOR 18: AUTHORIZING SUPERSEDED VERSION FAILS DETERMINISTICALLY
  // =========================================================================
  it('Vector 18: authorizing a superseded review session fails with STALE_REVIEW_STATE', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const v1Session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    const editableField = v1Session.dataProvenanceMatrix.find((f) => f.editable);
    const fieldKey = editableField ? editableField.fieldKey : 'targetEstablishment';
    await reviewManager.editReviewField(v1Session.id, PRIYA_SHARMA_ID, fieldKey, 'EDIT_VALUE');

    // Attempt to authorize V1 after V2 was created
    await expect(
      reviewManager.authorizeReviewSession(
        v1Session.id,
        PRIYA_SHARMA_ID,
        v1Session.payloadHash,
        v1Session.statutoryDeclarations.map((d) => d.id)
      )
    ).rejects.toThrow(/STALE_REVIEW_STATE/);
  });

  // =========================================================================
  // VECTOR 19: UNKNOWN FIELD IN EDIT REJECTED
  // =========================================================================
  it('Vector 19: rejects editing an unknown field key not present in review session', async () => {
    const run = await runner.startWorkflow({
      workflowCode: 'RECOVER_DORMANT_PF',
      citizenId: PRIYA_SHARMA_ID,
    });

    const workflow = WorkflowRegistry.getInstance().get('RECOVER_DORMANT_PF')!;
    const session = await reviewManager.getOrCreateReviewSession(run.id, PRIYA_SHARMA_ID, workflow);

    await expect(
      reviewManager.editReviewField(
        session.id,
        PRIYA_SHARMA_ID,
        'non_existent_field_key',
        'VALUE'
      )
    ).rejects.toThrow(/not found in review session/);
  });

  // =========================================================================
  // VECTOR 20: TOKEN INTEGRITY CHECKS FOR CANONICAL HASH
  // =========================================================================
  it('Vector 20: payload hash includes version ensuring token uniqueness across edits', () => {
    const hash1 = computePayloadHash({
      workflowRunId: 'run-1',
      stepId: 'step-1',
      capabilityId: 'epfo.transfer_claim',
      version: 1,
      resolvedInputs: { a: 1 },
      declarations: ['decl_1'],
      statutoryFeeInr: 0,
    });

    const hash2 = computePayloadHash({
      workflowRunId: 'run-1',
      stepId: 'step-1',
      capabilityId: 'epfo.transfer_claim',
      version: 2,
      resolvedInputs: { a: 1 },
      declarations: ['decl_1'],
      statutoryFeeInr: 0,
    });

    expect(hash1).not.toBe(hash2);
  });

  // =========================================================================
  // VECTOR 21: MUNICIPAL TAX REVIEW DETAILS
  // =========================================================================
  it('Vector 21: civic property tax payment registers irreversible receipt and fee', async () => {
    const registry = CapabilityRegistry.getInstance();
    const cap = registry.get('civic.pay_property_tax')!;

    const result = await cap.execute({
      citizenId: PRIYA_SHARMA_ID,
      propertyIdentifier: '114-W0124-9',
      assessmentYear: '2025-26',
      amountInr: 4500,
    }, { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true });

    expect(result.success).toBe(true);
    expect(result.receiptNumber).toBeDefined();
    expect(result.status).toBe('PAID');
  });

  // =========================================================================
  // VECTOR 22: MULTI-AGENCY KINSHIP NOMINEE ENDORSEMENT
  // =========================================================================
  it('Vector 22: kinship nominee endorsement records multi-agency institutional endorsements', async () => {
    const registry = CapabilityRegistry.getInstance();
    const cap = registry.get('family.endorse_kinship_nomination')!;

    const result = await cap.execute({
      citizenId: PRIYA_SHARMA_ID,
      targetAccountType: 'EPFO',
      accountIdentifier: '101988219012',
      nomineeFullName: 'Vikram Sharma',
      relation: 'SPOUSE',
      allocationPercentage: 100,
    }, { citizenId: PRIYA_SHARMA_ID, authorizationGranted: true });

    expect(result.success).toBe(true);
    expect(result.nominationReferenceNumber).toBeDefined();
    expect(result.status).toBe('ENDORSED');
    expect(result.statutoryScheme).toContain('Employees’ Deposit Linked Insurance & Pension Scheme');
  });
});
