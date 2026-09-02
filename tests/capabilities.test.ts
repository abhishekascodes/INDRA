import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getDb, seedDatabase, resetDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import {
  CapabilityRegistry,
  CapabilityExecutor,
  registerDefaultCapabilities,
} from '@indra/capability-engine';

describe('Foundational Capability Safety & Execution Runtime', () => {
  const executor = new CapabilityExecutor();

  beforeAll(async () => {
    registerDefaultCapabilities();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('verifies registered capabilities catalog', () => {
    const registry = CapabilityRegistry.getInstance();
    expect(registry.has('epfo.inquire_accounts')).toBe(true);
    expect(registry.has('epfo.transfer_claim')).toBe(true);
    expect(registry.has('business.incorporate')).toBe(true);
    expect(registry.has('telecom.block_stolen_device')).toBe(true);
    expect(registry.has('payments.process_fee')).toBe(true);
  });

  it('rejects invalid schema inputs', async () => {
    const res = await executor.execute({
      capabilityId: 'payments.process_fee',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        amountInr: -50, // Invalid: must be >= 1
        purpose: 'Test',
      },
      context: { citizenId: PRIYA_SHARMA_ID },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Input validation failed');
  });

  it('BLOCKS sensitive irreversible actions when authorization is missing', async () => {
    const res = await executor.execute({
      capabilityId: 'payments.process_fee',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        amountInr: 1000,
        purpose: 'MCA Filing Fee',
      },
      context: {
        citizenId: PRIYA_SHARMA_ID,
        authorizationGranted: false, // NOT AUTHORIZED
      },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('requires explicit citizen authorization before execution');
  });

  it('BLOCKS actions when required consent is missing', async () => {
    const res = await executor.execute({
      capabilityId: 'epfo.transfer_claim',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        sourceMemberId: 'MHBAN0018274000004928',
        targetMemberId: 'KNBLR0049281000010928',
      },
      context: {
        citizenId: PRIYA_SHARMA_ID,
        authorizationGranted: false,
      },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Consent required for');
  });

  it('allows safe read-only capabilities without human authorization', async () => {
    const res = await executor.execute<{ accounts: any[]; dormantFound: boolean }>({
      capabilityId: 'epfo.inquire_accounts',
      input: { citizenId: PRIYA_SHARMA_ID },
      context: { citizenId: PRIYA_SHARMA_ID },
    });

    expect(res.success).toBe(true);
    expect(res.output?.accounts.length).toBeGreaterThanOrEqual(2);
    expect(res.output?.dormantFound).toBe(true);
  });

  it('enforces idempotency when repeating an identical capability execution', async () => {
    const idempotencyKey = `test-idempotency-${Date.now()}`;

    const res1 = await executor.execute<{ available: boolean }>({
      capabilityId: 'business.reserve_name',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        proposedName: 'Indra Innovations Tech Private Limited',
        entityType: 'PRIVATE_LIMITED',
      },
      context: {
        citizenId: PRIYA_SHARMA_ID,
        idempotencyKey,
      },
    });

    expect(res1.success).toBe(true);
    expect(res1.idempotencyHit).toBe(false);

    // Repeated call with same idempotency key
    const res2 = await executor.execute<{ available: boolean }>({
      capabilityId: 'business.reserve_name',
      input: {
        citizenId: PRIYA_SHARMA_ID,
        proposedName: 'Indra Innovations Tech Private Limited',
        entityType: 'PRIVATE_LIMITED',
      },
      context: {
        citizenId: PRIYA_SHARMA_ID,
        idempotencyKey,
      },
    });

    expect(res2.success).toBe(true);
    expect(res2.idempotencyHit).toBe(true);
  });
});
