import { getDb, schema } from '@indra/database';
import { eq, and, desc, gt } from 'drizzle-orm';
import { CapabilityRegistry } from '@indra/capability-engine';
import {
  type ReviewSessionContract,
  type ReviewMode,
  type DataProvenanceField,
  type InstitutionalDisclosure,
  type StatutoryDeclaration,
  type PreconditionStatus,
  type ConsequenceSummary,
  type FeeBreakdown,
  type OperationPreview,
} from '@indra/contracts';
import {
  computePayloadHash,
  signAuthorizationToken,
  verifyAuthorizationToken,
  TokenClaims,
} from './canonical.js';

export class ReviewManager {
  private static instance: ReviewManager;
  private capabilityRegistry = CapabilityRegistry.getInstance();

  private constructor() {}

  public static getInstance(): ReviewManager {
    if (!ReviewManager.instance) {
      ReviewManager.instance = new ReviewManager();
    }
    return ReviewManager.instance;
  }

  /**
   * Retrieves or provisions the authoritative review session for the current step.
   */
  async getOrCreateReviewSession(
    workflowRunId: string,
    citizenId: string,
    workflow: any
  ): Promise<ReviewSessionContract> {
    const db = await getDb();

    // 1. Fetch workflow run
    const runs = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, workflowRunId));

    if (runs.length === 0) {
      throw new Error(`Workflow run '${workflowRunId}' not found`);
    }

    const run = runs[0];
    if (run.citizenId !== citizenId) {
      throw new Error('Forbidden: Citizen does not own this workflow run');
    }

    if (!run.currentStepId) {
      throw new Error('Workflow has no active step requiring review');
    }

    const stepId = run.currentStepId;
    const stepDef = workflow.steps[stepId];
    if (!stepDef) {
      throw new Error(`Step '${stepId}' not found in workflow '${run.workflowCode}'`);
    }

    // 2. Check for an active review session for this run and step (highest version)
    const existing = await db
      .select()
      .from(schema.reviewSessions)
      .where(
        and(
          eq(schema.reviewSessions.workflowRunId, workflowRunId),
          eq(schema.reviewSessions.stepId, stepId),
          eq(schema.reviewSessions.citizenId, citizenId)
        )
      )
      .orderBy(desc(schema.reviewSessions.version), desc(schema.reviewSessions.createdAt))
      .limit(1);

    if (existing.length > 0) {
      const activeSession = existing[0];
      if (
        activeSession.status === 'PREPARED' ||
        activeSession.status === 'VALIDATED' ||
        activeSession.status === 'REVIEWED' ||
        activeSession.status === 'AUTHORIZED'
      ) {
        return this.mapSessionRecordToContract(activeSession);
      }
    }

    // 3. Build and insert a fresh review session
    return this.buildAndPersistSession(run, stepId, stepDef, workflow);
  }

  /**
   * Builds full review data, calculates canonical payload hash, and persists it.
   */
  private async buildAndPersistSession(
    run: any,
    stepId: string,
    stepDef: any,
    workflow: any
  ): Promise<ReviewSessionContract> {
    const db = await getDb();
    const citizenId = run.citizenId;
    const capability = this.capabilityRegistry.get(stepDef.capabilityId);

    const context: Record<string, any> = {
      citizenId,
      ...((run.contextData as Record<string, unknown>) || {}),
    };

    // 1. Resolve Operation Preview
    const operationPreview: OperationPreview = {
      title: capability?.humanName || stepDef.title || 'Statutory Action',
      summary:
        capability?.description ||
        `Official statutory submission for step '${stepId}' in ${workflow.title}`,
      authority: this.resolveAuthority(stepDef.capabilityId, capability),
      category: workflow.category || 'CIVIC_GOVERNANCE',
    };

    // 2. Resolve Review Mode
    let reviewMode: ReviewMode = 'REVERSIBLE';
    if (capability?.sideEffectClass === 'READ_ONLY') {
      reviewMode = 'READ_ONLY';
    } else if (
      capability?.sideEffectClass === 'IRREVERSIBLE' ||
      stepDef.capabilityId.includes('transfer') ||
      stepDef.capabilityId.includes('mutation') ||
      stepDef.capabilityId.includes('tax') ||
      stepDef.capabilityId.includes('freeze')
    ) {
      reviewMode = 'IRREVERSIBLE';
    } else if (
      stepDef.capabilityId.includes('health') ||
      stepDef.capabilityId.includes('banking') ||
      stepDef.capabilityId.includes('consent')
    ) {
      reviewMode = 'FEDERATED_CONSENT';
    }

    // 3. Check for declarative review metadata on capability
    const meta = capability?.reviewMetadata;

    // 4. Assemble Data Provenance Matrix
    const dataProvenanceMatrix = meta?.fieldProvenanceMap
      ? this.buildMatrixFromMetadata(meta.fieldProvenanceMap, context)
      : this.buildDataProvenanceMatrix(stepDef, context);

    // 5. Institutional Disclosures
    const disclosures: InstitutionalDisclosure[] =
      meta?.disclosures && meta.disclosures.length > 0
        ? meta.disclosures
        : [
            {
              recipient: operationPreview.authority,
              role: 'Designated Statutory Authority & Public Registrar',
              categories: this.inferDataCategories(dataProvenanceMatrix),
              purpose: capability?.description || `Statutory execution of ${operationPreview.title}`,
              retention: 'Statutory record retention under Public Records Act, 1993',
            },
          ];

    // 6. Statutory Declarations
    const statutoryDeclarations =
      meta?.statutoryDeclarations && meta.statutoryDeclarations.length > 0
        ? meta.statutoryDeclarations
        : this.buildDeclarations(capability, operationPreview.title, reviewMode);

    // 7. Precondition Evaluation
    const preconditions =
      meta?.preconditions && meta.preconditions.length > 0
        ? await this.evaluateCustomPreconditions(meta.preconditions, context)
        : await this.evaluatePreconditions(capability, context);

    // 8. Consequences & Impact
    const consequences = meta?.consequences
      ? meta.consequences
      : this.buildConsequences(capability, operationPreview.title, reviewMode);

    // 9. Fee Breakdown
    const feeBreakdown = meta?.feeCalculator
      ? meta.feeCalculator(context, context)
      : this.resolveFeeBreakdown(stepDef.capabilityId, context);

    // 10. Normalized inputs for hash calculation
    const resolvedInputs: Record<string, any> = {};
    for (const field of dataProvenanceMatrix) {
      resolvedInputs[field.fieldKey] = field.value;
    }

    // 11. Canonical Payload Hash (Version 1)
    const payloadHash = computePayloadHash({
      workflowRunId: run.id,
      stepId,
      capabilityId: stepDef.capabilityId,
      version: 1,
      resolvedInputs,
      declarations: statutoryDeclarations.map((d) => d.id),
      statutoryFeeInr: feeBreakdown.totalInr,
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min window

    const inserted = await db
      .insert(schema.reviewSessions)
      .values({
        workflowRunId: run.id,
        stepId,
        citizenId,
        capabilityId: stepDef.capabilityId,
        version: 1,
        reviewMode,
        status: 'REVIEWED',
        previewTitle: operationPreview.title,
        previewSummary: operationPreview.summary,
        authority: operationPreview.authority,
        resolvedInputs,
        dataProvenanceMatrix,
        disclosures,
        statutoryDeclarations,
        preconditions,
        consequences,
        feeBreakdown,
        payloadHash,
        expiresAt: new Date(expiresAt),
      })
      .returning();

    return this.mapSessionRecordToContract(inserted[0]);
  }

  /**
   * Citizen edits an editable field directly in the review screen.
   * Updates workflow context, recomputes canonical hash, and invalidates prior authorization.
   */
  async editReviewField(
    reviewSessionId: string,
    citizenId: string,
    fieldKey: string,
    newValue: any
  ): Promise<ReviewSessionContract> {
    const db = await getDb();

    const existing = await db
      .select()
      .from(schema.reviewSessions)
      .where(
        and(
          eq(schema.reviewSessions.id, reviewSessionId),
          eq(schema.reviewSessions.citizenId, citizenId)
        )
      );

    if (existing.length === 0) {
      throw new Error(`Review session '${reviewSessionId}' not found or unauthorized`);
    }

    const session = existing[0];
    if (session.status === 'EXECUTED') {
      throw new Error('Cannot edit an already executed review session');
    }
    if (session.status === 'SUPERSEDED') {
      throw new Error(
        'STALE_REVIEW_STATE: Cannot edit a superseded review version. Please edit the active review session.'
      );
    }

    const matrix = (session.dataProvenanceMatrix as DataProvenanceField[]) || [];
    const targetFieldIndex = matrix.findIndex((f) => f.fieldKey === fieldKey);

    if (targetFieldIndex === -1) {
      throw new Error(`Field '${fieldKey}' not found in review session`);
    }

    if (!matrix[targetFieldIndex].editable) {
      throw new Error(`Field '${fieldKey}' is authoritative ground truth and cannot be modified`);
    }

    // Update field value
    matrix[targetFieldIndex].value = newValue;
    const updatedInputs = {
      ...((session.resolvedInputs as Record<string, any>) || {}),
      [fieldKey]: newValue,
    };

    // Update workflow contextData
    const runs = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, session.workflowRunId));

    if (runs.length > 0) {
      const currentContext = (runs[0].contextData as Record<string, any>) || {};
      const updatedContext = { ...currentContext, [fieldKey]: newValue };
      await db
        .update(schema.workflowRuns)
        .set({ contextData: updatedContext, updatedAt: new Date() })
        .where(eq(schema.workflowRuns.id, session.workflowRunId));
    }

    // Versioning: advance to next version
    const currentVersion = session.version || 1;
    const newVersion = currentVersion + 1;

    // Reset declarations so citizen must re-affirm them on edit
    const declarations = ((session.statutoryDeclarations as StatutoryDeclaration[]) || []).map((d) => ({
      ...d,
      accepted: false,
    }));
    const feeBreakdown = (session.feeBreakdown as FeeBreakdown) || { totalInr: 0 };
    const newPayloadHash = computePayloadHash({
      workflowRunId: session.workflowRunId,
      stepId: session.stepId,
      capabilityId: session.capabilityId,
      version: newVersion,
      resolvedInputs: updatedInputs,
      declarations: declarations.map((d) => d.id),
      statutoryFeeInr: feeBreakdown.totalInr,
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Insert new version of review session
    const inserted = await db
      .insert(schema.reviewSessions)
      .values({
        workflowRunId: session.workflowRunId,
        stepId: session.stepId,
        citizenId: session.citizenId,
        capabilityId: session.capabilityId,
        version: newVersion,
        reviewMode: session.reviewMode,
        status: 'REVIEWED',
        previewTitle: session.previewTitle,
        previewSummary: session.previewSummary,
        authority: session.authority,
        resolvedInputs: updatedInputs,
        dataProvenanceMatrix: matrix,
        disclosures: session.disclosures,
        statutoryDeclarations: declarations,
        preconditions: session.preconditions,
        consequences: session.consequences,
        feeBreakdown: session.feeBreakdown,
        payloadHash: newPayloadHash,
        expiresAt,
      })
      .returning();

    const newSession = inserted[0];

    // Mark previous session as SUPERSEDED
    await db
      .update(schema.reviewSessions)
      .set({
        status: 'SUPERSEDED',
        supersededBySessionId: newSession.id,
        supersededAt: new Date(),
        authorizationToken: null, // Prior authorization invalidated
        authorizedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.reviewSessions.id, session.id));

    return this.mapSessionRecordToContract(newSession);
  }

  /**
   * Citizen authorizes the review session.
   * Validates payload hash consistency and issues a signed cryptographic Authorization Artifact.
   */
  async authorizeReviewSession(
    reviewSessionId: string,
    citizenId: string,
    submittedPayloadHash: string,
    acceptedDeclarationIds: string[]
  ): Promise<{ authorized: boolean; authorizationToken: string; reviewSession: ReviewSessionContract }> {
    const db = await getDb();

    const existing = await db
      .select()
      .from(schema.reviewSessions)
      .where(
        and(
          eq(schema.reviewSessions.id, reviewSessionId),
          eq(schema.reviewSessions.citizenId, citizenId)
        )
      );

    if (existing.length === 0) {
      throw new Error(`Review session '${reviewSessionId}' not found or unauthorized`);
    }

    const session = existing[0];

    if (session.status === 'SUPERSEDED') {
      throw new Error(
        'STALE_REVIEW_STATE: This review version has been superseded by a newer version. Please inspect and authorize the latest version.'
      );
    }

    if (session.status !== 'REVIEWED') {
      throw new Error(`Cannot authorize review session in status '${session.status}'`);
    }

    // Check payload hash integrity
    if (session.payloadHash !== submittedPayloadHash) {
      throw new Error(
        'STALE_REVIEW_STATE: The review payload has changed or is out of date. Please inspect and re-authorize the latest version.'
      );
    }

    // Verify all required declarations are accepted
    const declarations = (session.statutoryDeclarations as StatutoryDeclaration[]) || [];
    for (const decl of declarations) {
      if (decl.required && !acceptedDeclarationIds.includes(decl.id)) {
        throw new Error(`Required declaration '${decl.id}' was not accepted`);
      }
      decl.accepted = acceptedDeclarationIds.includes(decl.id);
    }

    const authorizedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minute token validity

    const tokenClaims: TokenClaims = {
      sessionId: session.id,
      workflowRunId: session.workflowRunId,
      stepId: session.stepId,
      version: session.version || 1,
      citizenId,
      payloadHash: session.payloadHash,
      authorizedAt,
      expiresAt,
    };

    const authorizationToken = signAuthorizationToken(tokenClaims);

    const updated = await db
      .update(schema.reviewSessions)
      .set({
        status: 'AUTHORIZED',
        statutoryDeclarations: declarations,
        authorizationToken,
        authorizedAt: new Date(authorizedAt),
        expiresAt: new Date(expiresAt),
        updatedAt: new Date(),
      })
      .where(eq(schema.reviewSessions.id, reviewSessionId))
      .returning();

    return {
      authorized: true,
      authorizationToken,
      reviewSession: this.mapSessionRecordToContract(updated[0]),
    };
  }

  /**
   * Execution Guard: Validates artifact authenticity and verifies that authoritative context matches the artifact's payload hash and version.
   */
  async verifyAndConsumeAuthorization(
    workflowRunId: string,
    stepId: string,
    citizenId: string,
    authorizationToken: string,
    currentContext: Record<string, any>
  ): Promise<{ valid: boolean; reviewSessionId: string }> {
    const claims = verifyAuthorizationToken(authorizationToken);

    if (claims.citizenId !== citizenId) {
      throw new Error('Forbidden: Authorization artifact does not match authenticated citizen');
    }
    if (claims.workflowRunId !== workflowRunId) {
      throw new Error('Forbidden: Authorization artifact was not issued for this workflow run');
    }
    if (claims.stepId !== stepId) {
      throw new Error(`Forbidden: Authorization artifact was issued for step '${claims.stepId}', not '${stepId}'`);
    }

    const db = await getDb();
    const existing = await db
      .select()
      .from(schema.reviewSessions)
      .where(eq(schema.reviewSessions.id, claims.sessionId));

    if (existing.length === 0) {
      throw new Error('Review session referenced by authorization artifact not found');
    }

    const session = existing[0];

    if (session.status === 'SUPERSEDED') {
      throw new Error(
        'STALE_REVIEW_STATE: The authorization artifact was issued for a superseded review version. A newer version exists.'
      );
    }

    if (session.status === 'EXECUTED') {
      throw new Error('ALREADY_EXECUTED: This authorization artifact has already been consumed');
    }

    // Check if any newer version exists for this run and step
    const newer = await db
      .select()
      .from(schema.reviewSessions)
      .where(
        and(
          eq(schema.reviewSessions.workflowRunId, workflowRunId),
          eq(schema.reviewSessions.stepId, stepId),
          gt(schema.reviewSessions.version, session.version || 1)
        )
      );

    if (newer.length > 0) {
      throw new Error(
        'STALE_REVIEW_STATE: A newer review version has been created since this authorization was issued. Execution aborted for citizen safety.'
      );
    }

    // Verify current context hash matches token hash
    const declarations = (session.statutoryDeclarations as StatutoryDeclaration[]) || [];
    const feeBreakdown = (session.feeBreakdown as FeeBreakdown) || { totalInr: 0 };
    const resolvedInputs: Record<string, any> = {};
    const matrix = (session.dataProvenanceMatrix as DataProvenanceField[]) || [];
    for (const field of matrix) {
      resolvedInputs[field.fieldKey] = currentContext[field.fieldKey] ?? field.value;
    }

    const currentPayloadHash = computePayloadHash({
      workflowRunId,
      stepId,
      capabilityId: session.capabilityId,
      version: session.version || 1,
      resolvedInputs,
      declarations: declarations.map((d) => d.id),
      statutoryFeeInr: feeBreakdown.totalInr,
    });

    if (claims.payloadHash !== currentPayloadHash) {
      throw new Error(
        'STALE_REVIEW_STATE: The authoritative workflow context was modified after authorization was granted. Execution aborted for citizen safety.'
      );
    }

    // Consume artifact atomically: only update if status is currently 'AUTHORIZED'
    const updated = await db
      .update(schema.reviewSessions)
      .set({
        status: 'EXECUTED',
        executedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.reviewSessions.id, claims.sessionId),
          eq(schema.reviewSessions.status, 'AUTHORIZED')
        )
      )
      .returning();

    if (updated.length === 0) {
      throw new Error('ALREADY_EXECUTED: This authorization artifact has already been consumed');
    }

    return { valid: true, reviewSessionId: claims.sessionId };
  }

  // -------------------------------------------------------------------------
  // PRIVATE DOMAIN HELPERS
  // -------------------------------------------------------------------------

  private resolveAuthority(capabilityId: string, capability?: any): string {
    if (capabilityId.startsWith('epfo.')) return "Employees' Provident Fund Organisation (EPFO)";
    if (capabilityId.startsWith('transport.')) return 'Ministry of Road Transport and Highways (MoRTH / State RTO)';
    if (capabilityId.startsWith('identity.')) return 'Unique Identification Authority of India (UIDAI) / Income Tax Dept';
    if (capabilityId.startsWith('tax.')) return 'Income Tax Department (Central Processing Centre, Bengaluru)';
    if (capabilityId.startsWith('business.')) return 'Ministry of Corporate Affairs (MCA21)';
    if (capabilityId.startsWith('health.')) return 'National Health Authority (Ayushman Bharat Digital Mission)';
    if (capabilityId.startsWith('banking.')) return 'Reserve Bank of India (Account Aggregator Ecosystem)';
    if (capabilityId.startsWith('education.')) return 'Ministry of Education (APAAR / Academic Bank of Credits)';
    if (capabilityId.startsWith('judiciary.')) return 'National Judicial Data Grid / eCourts Services';
    if (capabilityId.startsWith('telecom.')) return 'Department of Telecommunications (CEIR Portal)';
    if (capabilityId.startsWith('welfare.')) return 'Direct Benefit Transfer (DBT) Bharat Mission';
    if (capabilityId.startsWith('payments.')) return 'Bharat Bill Payment System (BBPS) / Public Treasury';
    if (capabilityId.startsWith('property.')) return 'Department of Stamps & Registration / Land Revenue Registry';
    if (capabilityId.startsWith('civic.')) return 'Urban Local Body / Municipal Revenue Corporation';
    if (capabilityId.startsWith('agriculture.')) return 'Ministry of Agriculture & Farmers Welfare (PM-KISAN)';
    if (capabilityId.startsWith('justice.')) return 'Department of Administrative Reforms (CPGRAMS / RTI Online)';
    if (capabilityId.startsWith('security.')) return 'Indian Cyber Crime Coordination Centre (I4C / 1930)';
    if (capabilityId.startsWith('family.')) return 'Public Credential & Kinship Registry';
    return 'Public Government Operating Authority';
  }

  private buildDataProvenanceMatrix(stepDef: any, context: Record<string, any>): DataProvenanceField[] {
    const fields: DataProvenanceField[] = [];

    // Keys in context relevant to this step
    const knownKeys = Object.keys(context).filter(
      (k) => k !== 'citizenId' && k !== 'authorizationGranted' && k !== 'authorizedAt'
    );

    for (const key of knownKeys) {
      const val = context[key];
      if (val === undefined || val === null || typeof val === 'object') continue;

      let source: DataProvenanceField['source'] = 'CITIZEN_INPUT';
      let sourceLabel = 'Citizen Provided';
      let sensitivity: DataProvenanceField['sensitivity'] = 'LOW';
      let editable = true;

      if (key.includes('aadhaar') || key.includes('Aadhaar')) {
        source = 'UIDAI_GROUND_TRUTH';
        sourceLabel = 'UIDAI National Identity Registry';
        sensitivity = 'CRITICAL';
        editable = false;
      } else if (key.includes('pan') || key.includes('Pan')) {
        source = 'OFFICIAL_REGISTRY';
        sourceLabel = 'Income Tax Department (TRACES)';
        sensitivity = 'HIGH';
        editable = false;
      } else if (key.includes('uan') || key.includes('memberId')) {
        source = 'OFFICIAL_REGISTRY';
        sourceLabel = 'EPFO Unified Member Portal';
        sensitivity = 'HIGH';
        editable = false;
      } else if (key.includes('reg') || key.includes('chassis') || key.includes('rto')) {
        source = 'VAULT';
        sourceLabel = 'Vahan 4.0 Digital RC';
        sensitivity = 'MEDIUM';
        editable = false;
      } else if (key.includes('address') || key.includes('City') || key.includes('State')) {
        source = 'UIDAI_GROUND_TRUTH';
        sourceLabel = 'Verified Ground Truth Address';
        sensitivity = 'MEDIUM';
        editable = true;
      }

      fields.push({
        fieldKey: key,
        label: this.formatFieldLabel(key),
        value: val,
        source,
        sourceLabel,
        sensitivity,
        editable,
      });
    }

    if (fields.length === 0) {
      fields.push({
        fieldKey: 'citizenConfirmation',
        label: 'Citizen Verification',
        value: 'Verified Ground Truth Profile',
        source: 'UIDAI_GROUND_TRUTH',
        sourceLabel: 'UIDAI Registered Profile',
        sensitivity: 'LOW',
        editable: false,
      });
    }

    return fields;
  }

  private inferDataCategories(matrix: DataProvenanceField[]): string[] {
    const cats = new Set<string>();
    for (const f of matrix) {
      if (f.sensitivity === 'CRITICAL') cats.add('BIOMETRIC_IDENTIFIER');
      else if (f.sensitivity === 'HIGH') cats.add('FINANCIAL_IDENTIFIER');
      else if (f.fieldKey.toLowerCase().includes('address')) cats.add('RESIDENTIAL_LOCATION');
      else cats.add('CIVIC_RECORD_ATTRIBUTES');
    }
    return Array.from(cats);
  }

  private buildDeclarations(
    capability: any,
    title: string,
    mode: ReviewMode
  ): StatutoryDeclaration[] {
    const decls: StatutoryDeclaration[] = [
      {
        id: 'decl_accuracy',
        text: `I solemnly affirm and declare that the particulars provided for '${title}' are true, correct, and complete under Section 191/193 of the Indian Penal Code.`,
        required: true,
        accepted: false,
      },
    ];

    if (mode === 'IRREVERSIBLE') {
      decls.push({
        id: 'decl_irreversible_notice',
        text: 'I understand that this statutory action is final, legally binding, and cannot be rolled back or reversed online once submitted to the designated authority.',
        required: true,
        accepted: false,
      });
    } else if (mode === 'FEDERATED_CONSENT') {
      decls.push({
        id: 'decl_depa_consent',
        text: 'I grant explicit electronic consent under MeitY DEPA and Section 6 of the DPDP Act, 2023, retaining the statutory right to revoke access at any time.',
        required: true,
        accepted: false,
      });
    }

    return decls;
  }

  private async evaluatePreconditions(
    capability: any,
    context: Record<string, any>
  ): Promise<PreconditionStatus[]> {
    const results: PreconditionStatus[] = [
      {
        code: 'PRE_ACTIVE_CITIZEN',
        label: 'Authenticated Citizen Identity Anchor',
        passed: Boolean(context.citizenId),
      },
    ];

    if (capability?.preconditions) {
      try {
        const val = await capability.preconditions(context as any, context as any);
        results.push({
          code: 'PRE_CAPABILITY_SPECIFIC',
          label: `${capability.humanName} Statutory Preconditions`,
          passed: val.valid,
          details: val.errors ? val.errors.map((e: any) => e.message).join('; ') : 'Preconditions satisfied',
        });
      } catch (err: any) {
        results.push({
          code: 'PRE_CAPABILITY_SPECIFIC',
          label: `${capability.humanName} Statutory Preconditions`,
          passed: false,
          details: err.message || 'Precondition evaluation failed',
        });
      }
    }

    return results;
  }

  private buildConsequences(
    capability: any,
    title: string,
    mode: ReviewMode
  ): ConsequenceSummary {
    const isIrreversible = mode === 'IRREVERSIBLE';
    const downstream: string[] = [
      'Official statutory transaction recorded in Sovereign Citizen Audit Ledger',
      'Universal civic application status updated to reflect authoritative progress',
    ];

    if (isIrreversible) {
      downstream.push('Registry state modified permanently in official public database');
    }

    return {
      isIrreversible,
      severity: isIrreversible ? 'CRITICAL' : mode === 'FEDERATED_CONSENT' ? 'HIGH' : 'LOW',
      warning: isIrreversible
        ? `Warning: '${title}' has irreversible statutory consequences. Ensure all details are strictly accurate before final authorization.`
        : `This action will submit instructions to the authority. You can track progress in your Action Center.`,
      downstreamUpdates: downstream,
      compensationAvailable: capability?.failurePolicy?.compensationSupported ?? !isIrreversible,
    };
  }

  private resolveFeeBreakdown(capabilityId: string, context: Record<string, any>): FeeBreakdown {
    if (capabilityId === 'transport.transfer_vehicle_rc') {
      return { statutoryFeeInr: 530, convenienceFeeInr: 0, totalInr: 530, paymentRequired: true, paymentMethod: 'UPI_BHARAT' };
    }
    if (capabilityId === 'business.reserve_name') {
      return { statutoryFeeInr: 1000, convenienceFeeInr: 0, totalInr: 1000, paymentRequired: true, paymentMethod: 'NTRP_BHARATKOSH' };
    }
    if (capabilityId === 'business.incorporate') {
      return { statutoryFeeInr: 1000, convenienceFeeInr: 0, totalInr: 1000, paymentRequired: true, paymentMethod: 'NTRP_BHARATKOSH' };
    }
    if (capabilityId === 'payments.process_fee') {
      const amt = Number(context.amountInr) || 500;
      return { statutoryFeeInr: amt, convenienceFeeInr: 0, totalInr: amt, paymentRequired: true, paymentMethod: 'UPI_BHARAT' };
    }
    return { statutoryFeeInr: 0, convenienceFeeInr: 0, totalInr: 0, paymentRequired: false };
  }

  private formatFieldLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  private buildMatrixFromMetadata(
    map: Record<string, any>,
    context: Record<string, any>
  ): DataProvenanceField[] {
    const fields: DataProvenanceField[] = [];
    for (const key of Object.keys(map)) {
      const cfg = map[key];
      const val = context[key] ?? null;
      fields.push({
        fieldKey: key,
        label: this.formatFieldLabel(key),
        value: val,
        source: cfg.source,
        sourceLabel: cfg.sourceLabel,
        sensitivity: cfg.sensitivity,
        editable: Boolean(cfg.editable),
      });
    }
    return fields;
  }

  private async evaluateCustomPreconditions(
    preconditions: Array<{ code: string; label: string; evaluator: (input: any, ctx: any) => any }>,
    context: Record<string, any>
  ): Promise<PreconditionStatus[]> {
    const results: PreconditionStatus[] = [];
    for (const p of preconditions) {
      try {
        const passed = await p.evaluator(context, context);
        results.push({
          code: p.code,
          label: p.label,
          passed: Boolean(passed),
        });
      } catch (err: any) {
        results.push({
          code: p.code,
          label: p.label,
          passed: false,
          details: err?.message,
        });
      }
    }
    return results;
  }

  private mapSessionRecordToContract(record: any): ReviewSessionContract {
    return {
      id: record.id,
      workflowRunId: record.workflowRunId,
      stepId: record.stepId,
      citizenId: record.citizenId,
      capabilityId: record.capabilityId,
      version: record.version || 1,
      supersededBySessionId: record.supersededBySessionId || undefined,
      supersededAt: record.supersededAt ? record.supersededAt.toISOString() : undefined,
      reviewMode: record.reviewMode,
      status: record.status,
      payloadHash: record.payloadHash,
      operationPreview: {
        title: record.previewTitle,
        summary: record.previewSummary,
        authority: record.authority,
      },
      dataProvenanceMatrix: (record.dataProvenanceMatrix as DataProvenanceField[]) || [],
      disclosures: (record.disclosures as InstitutionalDisclosure[]) || [],
      statutoryDeclarations: (record.statutoryDeclarations as StatutoryDeclaration[]) || [],
      preconditions: (record.preconditions as PreconditionStatus[]) || [],
      consequences: record.consequences as ConsequenceSummary,
      feeBreakdown: record.feeBreakdown as FeeBreakdown,
      authorizationToken: record.authorizationToken || undefined,
      authorizedAt: record.authorizedAt ? record.authorizedAt.toISOString() : undefined,
      expiresAt: record.expiresAt.toISOString(),
      executedAt: record.executedAt ? record.executedAt.toISOString() : undefined,
      reconciliationSummary: (record.reconciliationSummary as Record<string, any>) || undefined,
    };
  }
}
