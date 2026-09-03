import {
  type StructuredIntent,
  type CapabilityDomain,
} from '@indra/contracts';
import {
  type StructuredLlmIntentAdapter,
  type IntentCatalogItem,
  DefaultStructuredLlmIntentAdapter,
  LlmIntentResolutionSchema,
} from './llm-adapter.js';

export * from './llm-adapter.js';

export interface IntentRule {
  intentId: string;
  category: string;
  workflowCode?: string;
  actionTitle: string;
  actionDescription: string;
  humanExplanation: string;
  statutoryAuthority: string;
  recoverableValue?: string;
  patterns: RegExp[];
  extractEntities?: (query: string) => Record<string, unknown>;
}

export class IntentEngine {
  private llmAdapter: StructuredLlmIntentAdapter;

  constructor(llmAdapter?: StructuredLlmIntentAdapter) {
    this.llmAdapter = llmAdapter || new DefaultStructuredLlmIntentAdapter();
  }

  private rules: IntentRule[] = [
    {
      intentId: 'START_BUSINESS',
      category: 'BUSINESS',
      workflowCode: 'START_BUSINESS',
      actionTitle: 'Incorporate Enterprise',
      actionDescription: 'Establish your company, reserve trade name, and obtain PAN, GSTIN & Udyam registration.',
      humanExplanation: "I think you're looking to establish a registered business enterprise",
      statutoryAuthority: 'Ministry of Corporate Affairs (MCA) & MSME',
      patterns: [
        /start\s+.*(company|business|startup|firm|pvt\s+ltd|enterprise)/i,
        /incoorp?erat(e|ion)/i,
        /incorporat(e|ion)/i,
        /open\s+.*(company|business|firm|startup|pvt\s+ltd|enterprise)/i,
        /register\s+.*(company|business|firm|startup|pvt\s+ltd)/i,
        /create\s+.*(company|business|firm|startup)/i,
        /formation\s+of\s+.*(company|business)/i,
        /how\s+do\s+i\s+incorporate\s+(a\s+)?startup/i,
        /need\s+to\s+set\s+up\s+a\s+business/i,
        /set\s+up\s+a\s+business/i,
      ],
      extractEntities: (q) => {
        const match = q.match(/(?:called|named)\s+([A-Za-z0-9\s]+)/i);
        return match ? { proposedName: match[1].trim() } : {};
      },
    },
    {
      intentId: 'RECOVER_DORMANT_PF',
      category: 'EMPLOYMENT',
      workflowCode: 'RECOVER_DORMANT_PF',
      actionTitle: 'Recover Inactive Provident Fund',
      actionDescription: 'Identify unlinked EPFO member accounts and consolidate funds into your active account.',
      humanExplanation: "I think you're trying to recover an old PF account",
      statutoryAuthority: "Employees' Provident Fund Organisation (EPFO)",
      recoverableValue: '₹1,42,500 potentially recoverable',
      patterns: [
        /pf\s+(transfer|stuck|missing|dormant|claim|balance|consolidation)/i,
        /epfo\s+(transfer|claim|passbook|balance|account)/i,
        /provident\s+fund/i,
        /pf\s+.*(stuck|missing|dormant|unlinked|sitting\s+there)/i,
        /pf\s+transfer\s+.*(stuck|old\s+company|previous)/i,
        /old\s+employer('s)?\s+pf\s+(hasn't\s+moved|stuck)/i,
        /find\s+my\s+old\s+pf/i,
        /old\s+pf/i,
        /recover\s+my\s+old\s+pf/i,
        /my\s+pf\s+is\s+just\s+sitting\s+there/i,
        /dormant\s+(pf|epf|provident)/i,
        /consolidate\s+.*(pf|epf|provident\s+fund)/i,
        /unlinked\s+(pf|epfo|provident)/i,
        /bro\s+.*pf.*stuck/i,
      ],
    },
    {
      intentId: 'TRANSFER_ACTIVE_PF',
      category: 'EMPLOYMENT',
      workflowCode: 'RECOVER_DORMANT_PF',
      actionTitle: 'Transfer Active Provident Fund',
      actionDescription: 'Submit an EPFO Form 13 online transfer from your previous employer to your current employer.',
      humanExplanation: "I think you're looking to transfer your active PF from your previous employer to your current employer",
      statutoryAuthority: "Employees' Provident Fund Organisation (EPFO - Form 13)",
      patterns: [
        /transfer\s+(my\s+)?(pf|epf)\s+(to|between|into)\s+(my\s+)?(new|current|present)\s+(employer|company|job)/i,
        /form\s+13\s+(online\s+)?transfer/i,
        /switch\s+pf\s+to\s+new\s+job/i,
      ],
    },
    {
      intentId: 'LOST_PHONE_SECURITY',
      category: 'SECURITY',
      workflowCode: 'LOST_DEVICE_PROTECTION',
      actionTitle: 'Emergency Handset & SIM Protection',
      actionDescription: 'Blacklist device IMEI across all Indian networks and initiate emergency SIM freeze.',
      humanExplanation: 'Emergency handset blacklisting and cellular protection',
      statutoryAuthority: 'Central Equipment Identity Register (CEIR & DoT)',
      patterns: [
        /(lost|stolen|steln)\s+(my\s+)?(phone|mobile|device|handset|phne)/i,
        /(phone|mobile|device|handset|phne)\s+(was\s+)?(stolen|lost|steln)/i,
        /block\s+.*(phone|sim|imei|handset)/i,
        /ceir\s+(block|blacklist)/i,
        /blacklist\s+.*(imei|phone|handset)/i,
        /stolen\s+imei/i,
        /mobile\s+theft/i,
        /lost\s+device/i,
        /phone\s+gone\s+sim\s+gone/i,
        /handset\s+disappeared/i,
        /snatched\s+(my\s+)?(phone|mobile|handset)/i,
      ],
    },
    {
      intentId: 'RESOLVE_NAME_MISMATCH',
      category: 'IDENTITY',
      workflowCode: 'RESOLVE_NAME_MISMATCH',
      actionTitle: 'Harmonize Identity Records',
      actionDescription: 'Resolve name variations between PAN and Aadhaar using verified government ground truth.',
      humanExplanation: 'Harmonize name discrepancies across identity documents',
      statutoryAuthority: 'Income Tax Department & UIDAI',
      patterns: [
        /name\s+mismatch/i,
        /name\s+on\s+pan\s+(is\s+)?wrong/i,
        /fix\s+name/i,
        /differen(ce|t)\s+name/i,
        /name\s+differen(ce|t)/i,
        /pan\s+.*aadhaar.*(name|mismatch|link|differen)/i,
        /aadhaar\s+.*pan.*(name|mismatch|link|differen)/i,
        /why\s+is\s+my\s+name\s+different\s+on\s+pan/i,
        /fix\s+my\s+identity\s+records/i,
        /(aadhaar|pan)\s+and\s+(pan|aadhaar)\s+names\s+don't\s+match/i,
        /harmonize\s+name/i,
        /spelling\s+mistake\s+in\s+pan/i,
      ],
    },
    {
      intentId: 'EVALUATE_BENEFITS',
      category: 'BENEFITS',
      actionTitle: 'Check Benefit Eligibility',
      actionDescription: 'Evaluate your socio-economic indicators against central and state welfare programmes.',
      humanExplanation: 'Screen your profile against central and state welfare schemes',
      statutoryAuthority: 'National Welfare Registry (DBT)',
      recoverableValue: '3 programmes available',
      patterns: [
        /what\s+benefits/i,
        /eligible\s+for/i,
        /government\s+schemes/i,
        /scholarship(s)?/i,
        /subsid(y|ies)/i,
        /welfare\s+benefits/i,
        /find\s+benefits\s+for\s+me/i,
      ],
    },
    {
      intentId: 'RENEW_PASSPORT',
      category: 'TRAVEL',
      actionTitle: 'Renew Indian Passport',
      actionDescription: 'Prepare passport reissue, verify police station jurisdiction, and schedule PSK slot.',
      humanExplanation: 'Prepare passport reissue and verify police jurisdiction',
      statutoryAuthority: 'Passport Seva (Ministry of External Affairs)',
      patterns: [
        /renew\s+(my\s+)?passport/i,
        /passport\s+expire(d|s)?/i,
        /passport\s+expiring\s+soon/i,
        /travelling\s+abroad.*passport.*expir/i,
        /new\s+passport/i,
        /passport\s+reissue/i,
        /passport\s+appointment/i,
      ],
    },
    {
      intentId: 'LIFE_EVENT_MOVING',
      category: 'LIFE_EVENT',
      actionTitle: 'Relocation & Address Harmonization',
      actionDescription: 'Update current residence and harmonize downstream driving licence and voter records.',
      humanExplanation: 'I can help with that. I found multiple registrations to update for your move',
      statutoryAuthority: 'Multi-Registry Synchronization (Transport & Election Commission)',
      patterns: [
        /moved\s+to\s+([A-Za-z\s]+)/i,
        /relocat(ed|ing)\s+to/i,
        /change\s+(my\s+)?address/i,
        /shifted\s+to/i,
        /update\s+(my\s+)?address/i,
        /shifted\s+cities/i,
        /moved\s+house/i,
        /bro\s+moved\s+.*need\s+all\s+govt\s+things\s+fixed/i,
      ],
      extractEntities: (q) => {
        const match = q.match(/(?:moved|shifted|relocated)\s+to\s+([A-Za-z\s]+)/i);
        return match ? { targetCity: match[1].trim() } : {};
      },
    },
    {
      intentId: 'LIFE_EVENT_MARRIAGE',
      category: 'LIFE_EVENT',
      actionTitle: 'Post-Marriage Document & Status Harmonization',
      actionDescription: 'Harmonize marital status and optional legal surname updates across UIDAI, Income Tax, and Passport.',
      humanExplanation: 'I can help with that. INDRA can harmonize your marital status and legal documents after marriage',
      statutoryAuthority: 'Multi-Registry Public Records (Registrar of Marriages, UIDAI, Income Tax)',
      patterns: [
        /after\s+getting\s+married/i,
        /got\s+married/i,
        /post[- ]marriage/i,
        /marriage\s+update/i,
      ],
    },
  ];

  public isMaliciousQuery(query: string): boolean {
    const trimmed = query.trim();
    return (
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i.test(trimmed) ||
      /system\s+prompt/i.test(trimmed) ||
      /system\s*:\s*/i.test(trimmed) ||
      /drop\s+table/i.test(trimmed) ||
      /delete\s+(from|root|all|user)/i.test(trimmed) ||
      /override\s+security/i.test(trimmed) ||
      /grant\s+admin/i.test(trimmed) ||
      /rm\s+-rf/i.test(trimmed) ||
      /export\s+secret/i.test(trimmed)
    );
  }

  /**
   * Synchronous fast-path deterministic resolver.
   */
  resolve(query: string): StructuredIntent {
    const trimmed = query.trim();

    // Adversarial Defense: Detect Prompt Injection / Command Execution Attempts
    if (this.isMaliciousQuery(trimmed)) {
      return {
        intentId: 'GENERAL_INQUIRY',
        intentCategory: 'GENERAL',
        confidence: 0.99,
        userQuery: trimmed.slice(0, 100),
        matchedWorkflowCode: null,
        suggestedActionTitle: 'Sovereign Public Interface Guardrail',
        suggestedActionDescription:
          'INDRA is the citizen operating layer for public services. Commands attempting to manipulate internal instructions or security policies are rejected.',
        humanExplanation: 'Please describe the public statutory service you need assistance with',
        statutoryAuthority: 'INDRA Universal Interface',
        extractedEntities: {},
        clarificationRequired: true,
        clarificationQuestion: 'What public statutory service would you like to get done?',
      };
    }

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          const extractedEntities = rule.extractEntities ? rule.extractEntities(trimmed) : {};
          return {
            intentId: rule.intentId,
            intentCategory: rule.category,
            confidence: 0.96,
            userQuery: trimmed,
            matchedWorkflowCode: rule.workflowCode || null,
            suggestedActionTitle: rule.actionTitle,
            suggestedActionDescription: rule.actionDescription,
            humanExplanation: rule.humanExplanation,
            statutoryAuthority: rule.statutoryAuthority,
            recoverableValue: rule.recoverableValue,
            extractedEntities,
            clarificationRequired: false,
          };
        }
      }
    }

    // Default conversational fallback
    return {
      intentId: 'GENERAL_INQUIRY',
      intentCategory: 'GENERAL',
      confidence: 0.4,
      userQuery: trimmed.slice(0, 300),
      matchedWorkflowCode: null,
      suggestedActionTitle: 'Tell INDRA what you need',
      suggestedActionDescription:
        'INDRA can assist you with business incorporation, EPF recovery, lost device protection, identity discrepancies, passport renewal, and welfare benefits.',
      humanExplanation: 'Tell me what public matter you need to handle',
      statutoryAuthority: 'INDRA Universal Interface',
      extractedEntities: {},
      clarificationRequired: true,
      clarificationQuestion:
        'Could you tell me a little more about what you want to get done? For example: "I want to start a company", "My PF transfer is stuck", or "My phone was stolen".',
    };
  }

  /**
   * Dual-mode resolver:
   * 1. Fast-path deterministic rule engine (0ms, zero tokens).
   * 2. If no canonical rule matches: calls StructuredLlmIntentAdapter.
   * 3. SAFETY BOUNDARY:
   *    - The LLM is an untrusted parser.
   *    - Its output MUST pass Zod validation AND Catalog validation.
   *    - If LLM returns an unknown intentId or invalid workflow, it is REJECTED.
   *    - Model confidence is NEVER used to authorize or execute actions.
   */
  async resolveAsync(query: string): Promise<StructuredIntent> {
    const fastResult = this.resolve(query);
    if (fastResult.confidence >= 0.9) {
      return fastResult;
    }

    const catalog: IntentCatalogItem[] = this.rules.map((r) => ({
      intentId: r.intentId,
      category: r.category,
      workflowCode: r.workflowCode,
      actionTitle: r.actionTitle,
      actionDescription: r.actionDescription,
    }));

    try {
      const rawLlm = await this.llmAdapter.resolveWithLlm(query, catalog);

      // 1. Zod Schema Validation
      const parsed = LlmIntentResolutionSchema.safeParse(rawLlm);
      if (!parsed.success) {
        console.warn('[IntentEngine] LLM output failed Zod schema validation:', parsed.error);
        return this.resolve(query); // Safe fallback
      }

      const llmResult = parsed.data;

      // 2. Deterministic Catalog Validation
      // The intentId MUST exist in our registered catalog
      const matchingRule = this.rules.find((r) => r.intentId === llmResult.intentId);
      if (!matchingRule && llmResult.intentId !== 'GENERAL_INQUIRY') {
        console.warn(
          `[IntentEngine Security Guardrail] Untrusted LLM returned unregistered intent '${llmResult.intentId}'. Safely rejecting.`
        );
        return this.resolve(query);
      }

      // 3. Workflow Validation
      let matchedWorkflowCode: string | null = null;
      if (matchingRule?.workflowCode) {
        matchedWorkflowCode = matchingRule.workflowCode;
      }

      return {
        intentId: matchingRule ? matchingRule.intentId : 'GENERAL_INQUIRY',
        intentCategory: matchingRule ? matchingRule.category : 'GENERAL',
        confidence: llmResult.confidence,
        userQuery: query.trim(),
        matchedWorkflowCode,
        suggestedActionTitle: matchingRule?.actionTitle || 'Tell INDRA what you need',
        suggestedActionDescription: llmResult.reasoningSummary || matchingRule?.actionDescription || '',
        humanExplanation: matchingRule?.humanExplanation || 'Tell me what public matter you need to handle',
        statutoryAuthority: matchingRule?.statutoryAuthority || 'INDRA Universal Interface',
        recoverableValue: matchingRule?.recoverableValue,
        extractedEntities: llmResult.extractedEntities || {},
        clarificationRequired: matchingRule ? false : true,
        clarificationQuestion: llmResult.clarificationQuestion,
      };
    } catch (err) {
      console.error('[IntentEngine] Error during LLM resolution fallback:', err);
      return this.resolve(query);
    }
  }
}
