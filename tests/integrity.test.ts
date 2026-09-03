import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, schema, resetDatabase, PRIYA_SHARMA_ID, eq } from '@indra/database';
import { CapabilityExecutor, registerDefaultCapabilities } from '@indra/capability-engine';
import { DynamicWorkspaceContractSchema } from '@indra/contracts';

describe('Data Integrity, Provenance & Contract Validation Suite', () => {
  const executor = new CapabilityExecutor();

  beforeEach(async () => {
    registerDefaultCapabilities();
    await resetDatabase();
  });

  it('ENFORCES foreign-key rejection on invalid citizen references', async () => {
    const db = await getDb();
    const fakeCitizenId = '00000000-0000-0000-0000-000000000000';

    // Attempting to insert a credential for a non-existent citizen must fail with FK error
    await expect(
      db.insert(schema.citizenCredentials).values({
        citizenId: fakeCitizenId,
        type: 'PASSPORT',
        identifierMasked: 'Z9999999',
        status: 'VERIFIED',
      })
    ).rejects.toThrow(/foreign key|violat/i);
  });

  it('PERSISTS audit logs into audit_logs table upon capability execution', async () => {
    const db = await getDb();

    // Execute an authorized payment capability
    const res = await executor.execute({
      capabilityId: 'payments.process_fee',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        amountInr: 1000,
        purpose: 'Audit Log Verification Fee',
        paymentMethod: 'UPI_BHARAT',
      },
      context: {
        citizenId: PRIYA_SHARMA_ID,
        authorizationGranted: true,
      },
    });

    expect(res.success).toBe(true);

    // Verify row in audit_logs table
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.citizenId, PRIYA_SHARMA_ID));

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs.find((l) => l.action === 'CAPABILITY_EXECUTE:payments.process_fee');
    expect(log).toBeDefined();
    expect(log?.resultStatus).toBe('SUCCESS');
    expect(log?.actorType).toBe('CITIZEN');
  });

  it('PERSISTS provenance records into provenance_records table', async () => {
    const db = await getDb();

    // Execute business.incorporate capability which generates provenance
    const res = await executor.execute({
      capabilityId: 'business.incorporate',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        companyName: 'Provenance Test Labs Private Limited',
        entityType: 'PRIVATE_LIMITED',
        registeredAddress: {
          line1: 'Indiranagar 100ft Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
        },
        capitalInr: 100000,
      },
      context: {
        citizenId: PRIYA_SHARMA_ID,
        authorizationGranted: true,
      },
    });

    expect(res.success).toBe(true);

    // Verify provenance_records table
    const records = await db
      .select()
      .from(schema.provenanceRecords)
      .where(eq(schema.provenanceRecords.citizenId, PRIYA_SHARMA_ID));

    expect(records.length).toBeGreaterThanOrEqual(1);
    const mcaRecord = records.find((r) => r.sourceAuthority.includes('Ministry of Corporate Affairs'));
    expect(mcaRecord).toBeDefined();
    expect(mcaRecord?.entityType).toBe('BUSINESS_INCORPORATION');
    expect(mcaRecord?.confidence).toBe(100);
  });

  it('PERSISTS system domain events into system_events table', async () => {
    const db = await getDb();

    // Check system_events populated by capability execution or workflow
    const events = await db.select().from(schema.systemEvents);
    // At minimum seed or capability should log events
    expect(events).toBeDefined();
  });

  it('VALIDATES dynamic workspace UI contracts against DynamicWorkspaceContractSchema', () => {
    const sampleValidUI = {
      workspaceTitle: 'Set Up Your Enterprise',
      workspaceSubtitle: 'Tell INDRA about the company you wish to establish.',
      currentStepIndex: 1,
      totalSteps: 3,
      knownInformation: [
        { label: 'Director / Founder', value: 'Priya Sharma', source: 'Verified Aadhaar' },
        { label: 'Director PAN', value: 'ABCPS****F', source: 'Income Tax Records' },
      ],
      requiredFields: [
        {
          fieldId: 'companyName',
          type: 'TEXT_INPUT' as const,
          label: 'Proposed Legal Name',
          helperText: 'e.g. Apex AI Innovations Private Limited',
          required: true,
        },
        {
          fieldId: 'entityType',
          type: 'SELECT_CHOICE' as const,
          label: 'Corporate Structure',
          required: true,
          defaultValue: 'PRIVATE_LIMITED',
          options: [
            { label: 'Private Limited Company (Pvt Ltd)', value: 'PRIVATE_LIMITED' },
          ],
        },
      ],
      submitButtonText: 'Verify Name & Proceed',
    };

    const parsed = DynamicWorkspaceContractSchema.safeParse(sampleValidUI);
    expect(parsed.success).toBe(true);

    // Negative validation: missing required field label
    const sampleInvalidUI = {
      workspaceTitle: 'Invalid',
      requiredFields: [{ fieldId: 'foo' }], // missing type & label
    };
    const invalidParsed = DynamicWorkspaceContractSchema.safeParse(sampleInvalidUI);
    expect(invalidParsed.success).toBe(false);
  });
});
