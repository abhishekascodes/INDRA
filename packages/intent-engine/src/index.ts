import type { StructuredIntent } from '@indra/contracts';

interface IntentRule {
  intentId: string;
  category: string;
  workflowCode?: string;
  actionTitle: string;
  actionDescription: string;
  patterns: RegExp[];
  extractEntities?: (query: string) => Record<string, unknown>;
}

export class IntentEngine {
  private rules: IntentRule[] = [
    {
      intentId: 'START_BUSINESS',
      category: 'BUSINESS',
      workflowCode: 'START_BUSINESS',
      actionTitle: 'Incorporate Enterprise',
      actionDescription: 'Establish your company, reserve trade name, and obtain PAN, GSTIN & Udyam registration.',
      patterns: [
        /start\s+.*(company|business|startup|firm|pvt\s+ltd)/i,
        /incorporat(e|ion)/i,
        /open\s+.*(company|business|firm|startup|pvt\s+ltd)/i,
        /register\s+.*(company|business|firm|startup)/i,
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
      patterns: [
        /pf\s+(transfer|stuck|missing|dormant|claim)/i,
        /epfo\s+(transfer|claim|passbook)/i,
        /provident\s+fund/i,
        /find\s+my\s+old\s+pf/i,
        /old\s+pf/i,
      ],
    },
    {
      intentId: 'LOST_PHONE_SECURITY',
      category: 'SECURITY',
      workflowCode: 'LOST_DEVICE_PROTECTION',
      actionTitle: 'Emergency Handset & SIM Protection',
      actionDescription: 'Blacklist device IMEI across all Indian networks and initiate emergency SIM freeze.',
      patterns: [
        /(lost|stolen)\s+(my\s+)?(phone|mobile|device|handset)/i,
        /(phone|mobile|device|handset)\s+(was\s+)?(stolen|lost)/i,
        /block\s+(my\s+)?(phone|sim|imei)/i,
        /mobile\s+theft/i,
      ],
    },
    {
      intentId: 'RESOLVE_NAME_MISMATCH',
      category: 'IDENTITY',
      workflowCode: 'RESOLVE_NAME_MISMATCH',
      actionTitle: 'Harmonize Identity Records',
      actionDescription: 'Resolve name variations between PAN and Aadhaar using verified government ground truth.',
      patterns: [
        /name\s+mismatch/i,
        /name\s+on\s+pan\s+is\s+wrong/i,
        /fix\s+name/i,
        /differen(ce|t)\s+name/i,
        /pan\s+aadhaar\s+link/i,
      ],
    },
    {
      intentId: 'EVALUATE_BENEFITS',
      category: 'BENEFITS',
      actionTitle: 'Check Benefit Eligibility',
      actionDescription: 'Evaluate your socio-economic indicators against central and state welfare programmes.',
      patterns: [
        /what\s+benefits\s+am\s+i\s+eligible/i,
        /eligible\s+for/i,
        /government\s+schemes/i,
        /scholarship(s)?/i,
        /subsid(y|ies)/i,
      ],
    },
    {
      intentId: 'RENEW_PASSPORT',
      category: 'TRAVEL',
      actionTitle: 'Renew Indian Passport',
      actionDescription: 'Prepare passport reissue, verify police station jurisdiction, and schedule PSK slot.',
      patterns: [
        /renew\s+(my\s+)?passport/i,
        /passport\s+expire(d|s)?/i,
        /new\s+passport/i,
        /passport\s+appointment/i,
      ],
    },
    {
      intentId: 'LIFE_EVENT_MOVING',
      category: 'LIFE_EVENT',
      actionTitle: 'Relocation & Address Harmonization',
      actionDescription: 'Update current residence and harmonize downstream driving licence and voter records.',
      patterns: [
        /moved\s+to\s+([A-Za-z\s]+)/i,
        /relocat(ed|ing)\s+to/i,
        /change\s+(my\s+)?address/i,
        /shifted\s+to/i,
      ],
      extractEntities: (q) => {
        const match = q.match(/(?:moved|shifted|relocated)\s+to\s+([A-Za-z\s]+)/i);
        return match ? { targetCity: match[1].trim() } : {};
      },
    },
  ];

  resolve(query: string): StructuredIntent {
    const trimmed = query.trim();

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
      userQuery: trimmed,
      matchedWorkflowCode: null,
      suggestedActionTitle: 'Tell INDRA what you need',
      suggestedActionDescription: 'INDRA can assist you with business incorporation, EPF recovery, lost device protection, identity discrepancies, passport renewal, and welfare benefits.',
      extractedEntities: {},
      clarificationRequired: true,
      clarificationQuestion: 'Could you tell me a little more about what you want to get done? For example: "I want to start a company", "My PF transfer is stuck", or "My phone was stolen".',
    };
  }
}
