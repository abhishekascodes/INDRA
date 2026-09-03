import { describe, it, expect } from 'vitest';
import {
  IntentEngine,
  DefaultStructuredLlmIntentAdapter,
  LlmIntentResolutionSchema,
} from '@indra/intent-engine';

describe('Structured-Output LLM Intent Adapter & Dual-Engine Resolver', () => {
  const adapter = new DefaultStructuredLlmIntentAdapter();
  const engine = new IntentEngine(adapter);

  it('validates structured output against LlmIntentResolutionSchema', async () => {
    const res = await adapter.resolveWithLlm(
      'I want to incorporate an AI startup called Bhasha Technologies in Bengaluru',
      []
    );

    const parseResult = LlmIntentResolutionSchema.safeParse(res);
    expect(parseResult.success).toBe(true);
    expect(res.intentId).toBe('START_BUSINESS');
    expect(res.domain).toBe('BUSINESS');
    expect(res.suggestedWorkflowCode).toBe('START_BUSINESS');
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res.extractedEntities).toBeDefined();
    expect(res.reasoningSummary).toBeTruthy();
  });

  it('short-circuits to fast path on high-confidence queries in resolveAsync', async () => {
    const res = await engine.resolveAsync('I want to start a company');
    expect(res.intentId).toBe('START_BUSINESS');
    expect(res.matchedWorkflowCode).toBe('START_BUSINESS');
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('resolves conversational/colloquial phrasing via semantic LLM adapter', async () => {
    // Conversational query with entity extraction
    const res1 = await engine.resolveAsync(
      'Someone snatched my mobile near Indiranagar metro'
    );
    expect(res1.intentId).toBe('LOST_PHONE_SECURITY');
    expect(res1.matchedWorkflowCode).toBe('LOST_DEVICE_PROTECTION');
    expect(res1.suggestedActionTitle).toContain('Emergency');

    // Conversational EPF query
    const res2 = await engine.resolveAsync(
      'My past job still has my provident fund money sitting there uncollected'
    );
    expect(res2.intentId).toBe('RECOVER_DORMANT_PF');
    expect(res2.matchedWorkflowCode).toBe('RECOVER_DORMANT_PF');

    // Conversational identity discrepancy
    const res3 = await engine.resolveAsync(
      'My legal records have conflicting spelling for my surname between PAN and Aadhaar'
    );
    expect(res3.intentId).toBe('RESOLVE_NAME_MISMATCH');
    expect(res3.matchedWorkflowCode).toBe('RESOLVE_NAME_MISMATCH');
  });

  it('populates quiet human-friendly intent understanding without engineering telemetry', async () => {
    const res = await engine.resolveAsync('My PF transfer from Apex Systems is stuck');
    expect(res.humanExplanation).toBe("I think you're trying to recover an old PF account");
    expect(res.statutoryAuthority).toContain('EPFO');
    expect(res.recoverableValue).toBe('₹1,42,500 potentially recoverable');
  });

  it('returns clarification prompt for ambiguous queries without mutating state', async () => {
    const res = await engine.resolveAsync('I have some general questions about paperwork');
    expect(res.intentId).toBe('GENERAL_INQUIRY');
    expect(res.clarificationRequired).toBe(true);
    expect(res.clarificationQuestion).toBeDefined();
  });

  it('REJECTS hallucinated or unregistered intent IDs returned by untrusted LLM', async () => {
    const mockMaliciousAdapter = {
      resolveWithLlm: async () => ({
        intentId: 'DROP_DATABASE_ROOT',
        domain: 'ADMIN',
        suggestedWorkflowCode: 'EXECUTE_ROOT_WIPE',
        extractedEntities: {},
        confidence: 0.99,
        reasoningSummary: 'Malicious injection attempt',
        clarificationRequired: false,
      }),
    };

    const secureEngine = new IntentEngine(mockMaliciousAdapter);
    const res = await secureEngine.resolveAsync('Execute root cleanup command');

    // Must reject untrusted intentId and safely fall back to GENERAL_INQUIRY
    expect(res.intentId).toBe('GENERAL_INQUIRY');
    expect(res.matchedWorkflowCode).toBeNull();
    expect(res.clarificationRequired).toBe(true);
  });

  it('REJECTS malformed LLM output that fails Zod schema validation', async () => {
    const mockBrokenAdapter = {
      resolveWithLlm: async () =>
        ({
          intentId: 12345, // invalid type
          confidence: 'one-hundred-percent', // invalid type
        }) as any,
    };

    const secureEngine = new IntentEngine(mockBrokenAdapter);
    const res = await secureEngine.resolveAsync('Unrecognized prompt query');

    expect(res.intentId).toBe('GENERAL_INQUIRY');
    expect(res.clarificationRequired).toBe(true);
  });

  it('CONFIRMS safety boundary: LLM adapter is pure parsing with zero execution authority', () => {
    // Check that adapter implements only resolveWithLlm and does not expose execute or db
    expect((adapter as any).executeCapability).toBeUndefined();
    expect((adapter as any).getDb).toBeUndefined();
    expect((adapter as any).authorize).toBeUndefined();
  });
});
