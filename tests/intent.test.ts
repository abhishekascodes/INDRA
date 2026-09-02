import { describe, it, expect } from 'vitest';
import { IntentEngine } from '@indra/intent-engine';

describe('Intent Engine Dual-Mode Benchmark Suite', () => {
  const engine = new IntentEngine();

  const cases = [
    // Business
    { query: 'I want to start a company', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Open a private limited business in Bengaluru', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Register a startup named NeuralFlow', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },

    // EPFO
    { query: 'My PF transfer is stuck', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Find my old PF from previous company', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'I need to check my provident fund claim', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },

    // Lost Phone / Security
    { query: 'I lost my phone in the train', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'My mobile was stolen', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'Block my phone and SIM immediately', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },

    // Identity Mismatch
    { query: 'Fix name mismatch between PAN and Aadhaar', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'My name on PAN is wrong', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },

    // Welfare Benefits
    { query: 'What benefits am I eligible for?', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'Check government schemes for women', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'Are there any scholarships available?', expectedIntent: 'EVALUATE_BENEFITS' },

    // Passport
    { query: 'I need to renew my passport', expectedIntent: 'RENEW_PASSPORT' },
    { query: 'My passport expires soon', expectedIntent: 'RENEW_PASSPORT' },

    // Moving
    { query: 'I moved to Bengaluru', expectedIntent: 'LIFE_EVENT_MOVING' },
    { query: 'I shifted to Mumbai last week', expectedIntent: 'LIFE_EVENT_MOVING' },
  ];

  for (const testCase of cases) {
    it(`resolves: "${testCase.query}" -> ${testCase.expectedIntent}`, () => {
      const res = engine.resolve(testCase.query);
      expect(res.intentId).toBe(testCase.expectedIntent);
      if (testCase.expectedWorkflow) {
        expect(res.matchedWorkflowCode).toBe(testCase.expectedWorkflow);
      }
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.suggestedActionTitle).toBeTruthy();
    });
  }

  it('handles unknown or underspecified queries with clear clarification prompt', () => {
    const res = engine.resolve('hello there how does government work');
    expect(res.intentId).toBe('GENERAL_INQUIRY');
    expect(res.clarificationRequired).toBe(true);
    expect(res.clarificationQuestion).toBeDefined();
  });
});
