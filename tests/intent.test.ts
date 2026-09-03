import { describe, it, expect } from 'vitest';
import { IntentEngine } from '@indra/intent-engine';

describe('Intent Engine Dual-Mode 50+ Phrase Benchmark Suite', () => {
  const engine = new IntentEngine();

  const cases = [
    // 1. Business Incorporation (10 phrasing variations)
    { query: 'I want to start a company', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Open a private limited business in Bengaluru', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Register a startup named NeuralFlow', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Incorporate a new enterprise for AI development', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Register a company named Vistara Health', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Create a pvt ltd company', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Open a business firm in Karnataka', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Start my own startup', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Formation of business enterprise', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },
    { query: 'Register a new startup firm', expectedIntent: 'START_BUSINESS', expectedWorkflow: 'START_BUSINESS' },

    // 2. EPFO & Provident Fund (9 phrasing variations)
    { query: 'My PF transfer is stuck', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Find my old PF from previous company', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'I need to check my provident fund claim', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Consolidate my dormant pf accounts', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Check my epfo passbook and transfer', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Unlinked pf account from previous job', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Old pf money from Apex Systems', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Provident fund balance consolidation', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },
    { query: 'Consolidate my epf balance', expectedIntent: 'RECOVER_DORMANT_PF', expectedWorkflow: 'RECOVER_DORMANT_PF' },

    // 3. Lost Phone & Telecom CEIR Security (9 phrasing variations)
    { query: 'I lost my phone in the train', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'My mobile was stolen', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'Block my phone and SIM immediately', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'Stolen handset emergency protection', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'My device was lost at the airport', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'CEIR block my phone imei', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'Blacklist my stolen imei', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'Block my sim card right now', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },
    { query: 'Mobile theft in metro station', expectedIntent: 'LOST_PHONE_SECURITY', expectedWorkflow: 'LOST_DEVICE_PROTECTION' },

    // 4. Identity & Name Mismatch (8 phrasing variations)
    { query: 'Fix name mismatch between PAN and Aadhaar', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'My name on PAN is wrong', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'Fix name difference on my documents', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'PAN and Aadhaar name mismatch resolution', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'Spelling mistake in PAN card name', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'Harmonize name across identity documents', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'Aadhaar and PAN link has name difference', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },
    { query: 'Different name in my government records', expectedIntent: 'RESOLVE_NAME_MISMATCH', expectedWorkflow: 'RESOLVE_NAME_MISMATCH' },

    // 5. Welfare & Benefits (6 phrasing variations)
    { query: 'What benefits am I eligible for?', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'Check government schemes for women', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'Are there any scholarships available?', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'Am I eligible for startup subsidies?', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'Check welfare benefits for urban professionals', expectedIntent: 'EVALUATE_BENEFITS' },
    { query: 'What government schemes can I apply for?', expectedIntent: 'EVALUATE_BENEFITS' },

    // 6. Passport Reissue & Renewal (5 phrasing variations)
    { query: 'I need to renew my passport', expectedIntent: 'RENEW_PASSPORT' },
    { query: 'My passport expires soon', expectedIntent: 'RENEW_PASSPORT' },
    { query: 'Apply for a new passport reissue', expectedIntent: 'RENEW_PASSPORT' },
    { query: 'Book a passport appointment', expectedIntent: 'RENEW_PASSPORT' },
    { query: 'Passport expired last month', expectedIntent: 'RENEW_PASSPORT' },

    // 7. Relocation & Address Harmonization (5 phrasing variations)
    { query: 'I moved to Bengaluru', expectedIntent: 'LIFE_EVENT_MOVING' },
    { query: 'I shifted to Mumbai last week', expectedIntent: 'LIFE_EVENT_MOVING' },
    { query: 'Relocating to Hyderabad for employment', expectedIntent: 'LIFE_EVENT_MOVING' },
    { query: 'Change my address in government records', expectedIntent: 'LIFE_EVENT_MOVING' },
    { query: 'Update my address across driving licence', expectedIntent: 'LIFE_EVENT_MOVING' },
  ];

  for (const testCase of cases) {
    it(`resolves [${testCase.expectedIntent}]: "${testCase.query}"`, () => {
      const res = engine.resolve(testCase.query);
      expect(res.intentId).toBe(testCase.expectedIntent);
      if (testCase.expectedWorkflow) {
        expect(res.matchedWorkflowCode).toBe(testCase.expectedWorkflow);
      }
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.suggestedActionTitle).toBeTruthy();
    });
  }

  it('handles conversational generic inquiries with clarification prompt', () => {
    const res = engine.resolve('hello there how does government work');
    expect(res.intentId).toBe('GENERAL_INQUIRY');
    expect(res.clarificationRequired).toBe(true);
    expect(res.clarificationQuestion).toBeDefined();
  });

  it('handles underspecified vague inputs with helpful prompts', () => {
    const res = engine.resolve('help me with paperwork');
    expect(res.intentId).toBe('GENERAL_INQUIRY');
    expect(res.clarificationRequired).toBe(true);
  });
});
